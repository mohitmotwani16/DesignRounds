import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  addEdge, Background, BackgroundVariant, ConnectionLineType, ConnectionMode, Controls, MiniMap, ReactFlow,
  ReactFlowProvider, SelectionMode, useEdgesState, useNodesState, useReactFlow,
} from "@xyflow/react";
import {
  ArrowLeft, ChevronDown, ChevronRight, CircleCheck, Command, FileText, Keyboard, LayoutPanelLeft, LoaderCircle, Magnet,
  Map as MapIcon, MessageSquare, MousePointer2, Network, Plus, Redo2, RotateCcw, SquareDashed, StickyNote, Type, Undo2, Upload,
} from "lucide-react";
import { api } from "../api.js";
import { findPrompt } from "../data/prompts.js";
import { Brand, FullPageMessage, UserMenu } from "../components/ui.jsx";
import { openReportProblem } from "../components/ReportProblem.jsx";
import { navigate } from "../router.js";
import { getItem } from "./catalog.jsx";
import { createNode, decorateEdge, hydrateDiagram, newId, serializeDiagram } from "./diagram.js";
import { EdgeInspector, MultiInspector, NodeInspector } from "./Inspector.jsx";
import { CanvasActions, nodeTypes, RENAME_EVENT } from "./nodes.jsx";
import { DRAG_TYPE, Palette } from "./Palette.jsx";
import { CanvasTour, canvasTourSeen, canvasTourSteps, markCanvasTourSeen } from "./CanvasTour.jsx";
import { PromptModal, ShortcutsDialog, SidePanel } from "./Panels.jsx";
import { PanelResizer } from "./PanelResizer.jsx";
import { useInterview } from "./useInterview.js";
import { useAuth } from "../auth.jsx";
import { useTheme } from "../theme.js";

const SAVE_DELAY_MS = 800;
const RETRY_DELAY_MS = 5000;
const HISTORY_LIMIT = 80;
const minimapColors = { blue: "#cfe0fb", violet: "#e2dcfb", green: "#cdeedd", orange: "#fbe5c8", teal: "#cbede9", rose: "#fad6db", slate: "#e1e6ee" };

export default function WorkspaceRoute({ sessionId }) {
  const [state, setState] = useState({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    setState({ status: "loading" });
    api.getSession(sessionId)
      .then(({ session }) => { if (!cancelled) setState({ status: "ready", session }); })
      .catch((error) => { if (!cancelled) setState({ status: "error", error }); });
    return () => { cancelled = true; };
  }, [sessionId]);

  if (state.status === "loading") return <FullPageMessage title="Opening your round…"><LoaderCircle size={18} className="spin" /></FullPageMessage>;
  if (state.status === "error") {
    return (
      <FullPageMessage title={state.error.status === 404 ? "Round not found" : "Couldn't open this round"} action={<button className="button button-dark" onClick={() => navigate("/library")}>Back to library</button>}>
        {state.error.status === 404 ? "It may have been deleted, or it belongs to a different account." : state.error.message}
      </FullPageMessage>
    );
  }
  // The detailed brief arrives with the session (Plus rounds' briefs exist only there).
  const base = findPrompt(state.session.promptId);
  const prompt = base && { ...base, ...(state.session.brief ?? {}) };
  if (!prompt) return <FullPageMessage title="This design round is no longer available" action={<button className="button button-dark" onClick={() => navigate("/profile")}>Back to profile</button>} />;
  return (
    <ReactFlowProvider>
      <Workspace key={state.session.id} session={state.session} prompt={prompt} />
    </ReactFlowProvider>
  );
}

// Per-tab flags (sessionStorage); storage can be unavailable, which just means "unset".
function readSessionFlag(key) {
  try { return window.sessionStorage.getItem(key); } catch { return null; }
}
function writeSessionFlag(key, value) {
  try { window.sessionStorage.setItem(key, value); } catch { /* preference only */ }
}

function Workspace({ session, prompt }) {
  const initial = useMemo(() => hydrateDiagram(session.diagram), [session]);
  const [nodes, setNodes, onNodesChange] = useNodesState(initial.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initial.edges);
  const [status, setStatus] = useState(session.status);
  const [saveState, setSaveState] = useState("saved");
  const [panelOpen, setPanelOpen] = useState(() => readPreference("designrounds:interviewer-open", "true") !== "false");
  const { status: authStatus, user } = useAuth();
  const plan = user?.plan;
  // An active round opens on the Interviewer tab for everyone: free learners see the
  // free interviewer round offer (or what Plus adds) there. A finished round opens on Review.
  const [panelTab, setPanelTab] = useState(() => (session.status === "completed" ? "review" : "interviewer"));
  const [paletteOpen, setPaletteOpen] = useState(() => window.innerWidth > 760);
  // Side panel widths the learner dragged to (null: the CSS default), kept per browser.
  const [paletteWidth, setPaletteWidth] = usePanelWidth("designrounds:palette-width", PALETTE_WIDTH);
  const [panelWidth, setPanelWidth] = usePanelWidth("designrounds:panel-width", SIDE_PANEL_WIDTH);
  const [showPrompt, setShowPrompt] = useState(() => initial.nodes.length === 0 && session.diagramVersion === 0);
  const [snap, setSnap] = useState(true);
  // Designing on a phone is cramped; say so once per visit (dismissible).
  const [smallScreenNotice, setSmallScreenNotice] = useState(() => window.innerWidth < 760 && readSessionFlag("designrounds:small-screen-dismissed") !== "1");
  const [showMinimap, setShowMinimap] = useState(() => window.innerWidth > 760);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [tourOn, setTourOn] = useState(false);
  const [focusEdgeLabel, setFocusEdgeLabel] = useState(0);
  const [legacy, setLegacy] = useState(() => (initial.nodes.length || session.diagramVersion > 0 ? null : readLegacyCanvas(prompt.id)));
  const reactFlow = useReactFlow();
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const canvasRef = useRef(null);
  const readOnly = status !== "in_progress";

  // Latest values for stable callbacks.
  const nodesRef = useRef(nodes);
  const edgesRef = useRef(edges);
  const readOnlyRef = useRef(readOnly);
  nodesRef.current = nodes;
  edgesRef.current = edges;
  readOnlyRef.current = readOnly;

  // ---- Undo / redo -------------------------------------------------------
  const history = useRef({ past: [], future: [] });
  const record = useCallback(() => {
    const stack = history.current;
    stack.past.push({ nodes: nodesRef.current, edges: edgesRef.current });
    if (stack.past.length > HISTORY_LIMIT) stack.past.shift();
    stack.future = [];
  }, []);
  const undo = useCallback(() => {
    const stack = history.current;
    if (readOnlyRef.current || !stack.past.length) return;
    stack.future.push({ nodes: nodesRef.current, edges: edgesRef.current });
    const previous = stack.past.pop();
    setNodes(previous.nodes);
    setEdges(previous.edges);
  }, [setNodes, setEdges]);
  const redo = useCallback(() => {
    const stack = history.current;
    if (readOnlyRef.current || !stack.future.length) return;
    stack.past.push({ nodes: nodesRef.current, edges: edgesRef.current });
    const next = stack.future.pop();
    setNodes(next.nodes);
    setEdges(next.edges);
  }, [setNodes, setEdges]);

  // ---- Autosave ----------------------------------------------------------
  const save = useRef({ version: session.diagramVersion, lastJson: JSON.stringify(serializeDiagram(initial.nodes, initial.edges)), timer: 0, inFlight: false, queued: false, blocked: false });
  const flush = useCallback(async () => {
    const ref = save.current;
    window.clearTimeout(ref.timer);
    if (ref.blocked || readOnlyRef.current) return;
    if (ref.inFlight) { ref.queued = true; return; }
    const diagram = serializeDiagram(nodesRef.current, edgesRef.current);
    const json = JSON.stringify(diagram);
    if (json === ref.lastJson) { setSaveState((current) => (current === "error" ? "saved" : current)); return; }
    ref.inFlight = true;
    setSaveState("saving");
    try {
      const result = await api.saveDiagram(session.id, ref.version, diagram);
      ref.version = result.version;
      ref.lastJson = json;
      setSaveState("saved");
    } catch (error) {
      if (error.code === "VERSION_CONFLICT" || error.code === "ROUND_COMPLETED") {
        ref.blocked = true;
        setSaveState("conflict");
      } else if (error.status === 401) {
        ref.blocked = true;
        setSaveState("signed-out");
      } else {
        setSaveState("error");
        ref.timer = window.setTimeout(() => flush(), RETRY_DELAY_MS);
      }
    } finally {
      ref.inFlight = false;
      if (ref.queued) { ref.queued = false; flush(); }
    }
  }, [session.id]);

  // Resolves once the latest edits are saved, so the AI sees what the learner sees.
  const settleSave = useCallback(async () => {
    await flush();
    for (let waited = 0; save.current.inFlight && waited < 3000; waited += 100) await new Promise((resolve) => setTimeout(resolve, 100));
  }, [flush]);

  useEffect(() => {
    if (readOnly) return undefined;
    const ref = save.current;
    window.clearTimeout(ref.timer);
    ref.timer = window.setTimeout(() => flush(), SAVE_DELAY_MS);
    return () => window.clearTimeout(ref.timer);
  }, [nodes, edges, readOnly, flush]);

  useEffect(() => {
    const onBeforeUnload = (event) => {
      const ref = save.current;
      if (!readOnlyRef.current && !ref.blocked && (ref.inFlight || JSON.stringify(serializeDiagram(nodesRef.current, edgesRef.current)) !== ref.lastJson)) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, []);

  // ---- Editing actions ---------------------------------------------------
  const addItem = useCallback((item, at) => {
    if (readOnlyRef.current) return;
    let position = at;
    if (!position) {
      const bounds = canvasRef.current?.getBoundingClientRect();
      const center = reactFlow.screenToFlowPosition({
        x: bounds ? bounds.left + bounds.width / 2 : window.innerWidth / 2,
        y: bounds ? bounds.top + bounds.height / 2 : window.innerHeight / 2,
      });
      position = findFreeSpot(nodesRef.current, { x: center.x - 89, y: center.y - 32 });
    }
    const node = createNode(item.kind, position);
    if (node.type === "groupNode" && !at) node.position = { x: position.x - 105, y: position.y - 95 };
    record();
    setNodes((current) => [...current.map((entry) => (entry.selected ? { ...entry, selected: false } : entry)), { ...node, selected: true }]);
    setEdges((current) => (current.some((edge) => edge.selected) ? current.map((edge) => (edge.selected ? { ...edge, selected: false } : edge)) : current));
  }, [reactFlow, record, setNodes, setEdges]);

  const updateNodeData = useCallback((id, patch) => {
    if (readOnlyRef.current) return;
    setNodes((current) => current.map((node) => (node.id === id ? { ...node, data: { ...node.data, ...patch } } : node)));
  }, [setNodes]);

  const commitNodeData = useCallback((id, patch) => {
    if (readOnlyRef.current) return;
    record();
    updateNodeData(id, patch);
  }, [record, updateNodeData]);

  const updateEdge = useCallback((id, patch) => {
    if (readOnlyRef.current) return;
    setEdges((current) => current.map((edge) => (edge.id === id
      ? decorateEdge({ ...edge, ...patch, data: patch.data ? { ...edge.data, ...patch.data } : edge.data })
      : edge)));
  }, [setEdges]);

  const reverseEdge = useCallback((id) => {
    if (readOnlyRef.current) return;
    record();
    setEdges((current) => current.map((edge) => (edge.id === id
      ? { ...edge, source: edge.target, target: edge.source, sourceHandle: edge.targetHandle, targetHandle: edge.sourceHandle }
      : edge)));
  }, [record, setEdges]);

  const clipboard = useRef(null);
  const selectionSnapshot = () => {
    const selected = nodesRef.current.filter((node) => node.selected);
    const ids = new Set(selected.map((node) => node.id));
    return { nodes: selected, edges: edgesRef.current.filter((edge) => ids.has(edge.source) && ids.has(edge.target)) };
  };
  const insertCopy = useCallback((source, offset = 32) => {
    if (readOnlyRef.current || !source?.nodes.length) return null;
    record();
    const idMap = new Map();
    const copies = source.nodes.map((node) => {
      const id = newId(node.data.kind);
      idMap.set(node.id, id);
      return { ...node, id, position: { x: node.position.x + offset, y: node.position.y + offset }, selected: true, dragging: false };
    });
    const edgeCopies = source.edges.map((edge) => ({ ...edge, id: newId("edge"), source: idMap.get(edge.source), target: idMap.get(edge.target), selected: false }));
    setNodes((current) => [...current.map((node) => (node.selected ? { ...node, selected: false } : node)), ...copies]);
    setEdges((current) => [...current.map((edge) => (edge.selected ? { ...edge, selected: false } : edge)), ...edgeCopies]);
    return { nodes: copies, edges: edgeCopies };
  }, [record, setNodes, setEdges]);

  const duplicateSelection = useCallback(() => { insertCopy(selectionSnapshot()); }, [insertCopy]);
  const copySelection = useCallback(() => {
    const snapshot = selectionSnapshot();
    if (snapshot.nodes.length) clipboard.current = snapshot;
  }, []);
  const paste = useCallback(() => {
    const inserted = insertCopy(clipboard.current);
    if (inserted) clipboard.current = inserted;
  }, [insertCopy]);

  const deleteSelection = useCallback(() => {
    if (readOnlyRef.current) return;
    reactFlow.deleteElements({ nodes: nodesRef.current.filter((node) => node.selected), edges: edgesRef.current.filter((edge) => edge.selected) });
  }, [reactFlow]);

  const clearSelection = useCallback(() => {
    setNodes((current) => current.map((node) => (node.selected ? { ...node, selected: false } : node)));
    setEdges((current) => current.map((edge) => (edge.selected ? { ...edge, selected: false } : edge)));
  }, [setNodes, setEdges]);

  const focusNode = useCallback((id) => {
    const node = nodesRef.current.find((entry) => entry.id === id);
    if (!node) return;
    setNodes((current) => current.map((entry) => (entry.selected !== (entry.id === id) ? { ...entry, selected: entry.id === id } : entry)));
    const width = node.measured?.width ?? node.width ?? 170;
    const height = node.measured?.height ?? node.height ?? 60;
    reactFlow.setCenter(node.position.x + width / 2, node.position.y + height / 2, { zoom: Math.max(reactFlow.getZoom(), 1), duration: 300 });
  }, [reactFlow, setNodes]);

  // The details panel opens on a click (press and release without moving), not on the
  // press that starts a drag. Selections made without the pointer (keyboard, outline,
  // newly added components) open it straight away; see the effect below.
  const [inspectedId, setInspectedId] = useState(null);
  const pointerDown = useRef(false);
  const [boxSelecting, setBoxSelecting] = useState(false);
  useEffect(() => {
    const release = () => { pointerDown.current = false; setBoxSelecting(false); };
    window.addEventListener("pointerup", release);
    window.addEventListener("pointercancel", release);
    return () => { window.removeEventListener("pointerup", release); window.removeEventListener("pointercancel", release); };
  }, []);
  const onNodeClick = useCallback((_event, node) => setInspectedId(node.id), []);

  // Dragging a zone carries the components that sit inside it.
  const groupDrag = useRef(null);
  const onNodeDragStart = useCallback((_event, node, dragged) => {
    setInspectedId(null);
    record();
    groupDrag.current = null;
    if (node.type !== "groupNode" || dragged.length !== 1) return;
    const width = node.width ?? node.measured?.width ?? 0;
    const height = node.height ?? node.measured?.height ?? 0;
    const children = nodesRef.current.filter((entry) => {
      if (entry.id === node.id) return false;
      const w = entry.measured?.width ?? entry.width ?? 0;
      const h = entry.measured?.height ?? entry.height ?? 0;
      return entry.position.x >= node.position.x && entry.position.y >= node.position.y
        && entry.position.x + w <= node.position.x + width && entry.position.y + h <= node.position.y + height;
    });
    if (children.length) groupDrag.current = { start: node.position, children: new Map(children.map((entry) => [entry.id, entry.position])) };
  }, [record]);
  const onNodeDrag = useCallback((_event, node) => {
    const drag = groupDrag.current;
    if (!drag) return;
    const dx = node.position.x - drag.start.x;
    const dy = node.position.y - drag.start.y;
    setNodes((current) => current.map((entry) => {
      const origin = drag.children.get(entry.id);
      return origin ? { ...entry, position: { x: origin.x + dx, y: origin.y + dy } } : entry;
    }));
  }, [setNodes]);
  const onNodeDragStop = useCallback(() => { groupDrag.current = null; }, []);

  const onConnect = useCallback((connection) => {
    if (readOnlyRef.current) return;
    record();
    setEdges((current) => addEdge(decorateEdge({ ...connection, id: newId("edge"), data: {} }), current));
  }, [record, setEdges]);

  const onBeforeDelete = useCallback(async () => {
    if (readOnlyRef.current) return false;
    record();
    return true;
  }, [record]);

  const onDrop = useCallback((event) => {
    event.preventDefault();
    const item = getItem(event.dataTransfer.getData(DRAG_TYPE));
    if (!item) return;
    const point = reactFlow.screenToFlowPosition({ x: event.clientX, y: event.clientY });
    const isGroup = item.nodeType === "groupNode";
    addItem(item, { x: point.x - (isGroup ? 190 : 85), y: point.y - (isGroup ? 125 : 30) });
  }, [reactFlow, addItem]);

  const onDragOver = useCallback((event) => { event.preventDefault(); event.dataTransfer.dropEffect = "copy"; }, []);

  const onEdgeDoubleClick = useCallback((_event, edge) => {
    setEdges((current) => current.map((entry) => ({ ...entry, selected: entry.id === edge.id })));
    setNodes((current) => current.map((node) => (node.selected ? { ...node, selected: false } : node)));
    setFocusEdgeLabel((value) => value + 1);
  }, [setEdges, setNodes]);

  const selectedNodes = nodes.filter((node) => node.selected);
  const selectedComponent = selectedNodes.length === 1 && selectedNodes[0].type === "systemNode" ? selectedNodes[0] : null;
  const selectedEdges = edges.filter((edge) => edge.selected);
  const selectionCount = selectedNodes.length + selectedEdges.length;
  const singleNode = selectionCount === 1 ? selectedNodes[0] : null;
  useEffect(() => {
    if (singleNode && !pointerDown.current) setInspectedId(singleNode.id);
  }, [singleNode?.id]);
  const singleEdge = selectionCount === 1 ? selectedEdges[0] : null;

  // ---- Keyboard shortcuts --------------------------------------------------
  // The list shown to learners is in shortcuts.js.
  const lastNudge = useRef(0);
  const nudgeSelection = (dx, dy) => {
    if (readOnlyRef.current || !nodesRef.current.some((node) => node.selected)) return;
    // One undo step per burst of arrow presses.
    if (Date.now() - lastNudge.current > 800) record();
    lastNudge.current = Date.now();
    setNodes((current) => current.map((node) => (node.selected ? { ...node, position: { x: node.position.x + dx, y: node.position.y + dy } } : node)));
  };
  const selectAll = () => {
    setNodes((current) => current.map((node) => (node.selected ? node : { ...node, selected: true })));
    setEdges((current) => current.map((edge) => (edge.selected ? edge : { ...edge, selected: true })));
  };
  const focusComponentSearch = () => {
    setPaletteOpen(true);
    window.setTimeout(() => document.querySelector(".palette-search input")?.focus(), 30);
  };
  const shortcuts = useRef({});
  shortcuts.current = {
    undo, redo, duplicateSelection, copySelection, paste, deleteSelection, clearSelection, nudgeSelection, selectAll,
    focusComponentSearch, togglePanel, flush, addItem, reactFlow,
    modalOpen: showPrompt || showShortcuts || tourOn,
    singleNodeId: singleNode?.id,
  };
  useEffect(() => {
    const onKeyDown = (event) => {
      const target = event.target;
      if (target instanceof HTMLElement && (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))) return;
      const actions = shortcuts.current;
      if (actions.modalOpen) return;
      const mod = event.ctrlKey || event.metaKey;
      const key = event.key.toLowerCase();
      const run = (action) => { event.preventDefault(); action(); };

      if (mod) {
        if (key === "z") run(event.shiftKey ? actions.redo : actions.undo);
        else if (key === "y") run(actions.redo);
        else if (key === "d") run(actions.duplicateSelection);
        else if (key === "c") actions.copySelection();
        else if (key === "x") run(() => { actions.copySelection(); actions.deleteSelection(); });
        else if (key === "v") run(actions.paste);
        else if (key === "a") run(actions.selectAll);
        else if (key === "s") run(actions.flush);
        return;
      }
      if (event.altKey) return;

      const arrows = { arrowup: [0, -1], arrowdown: [0, 1], arrowleft: [-1, 0], arrowright: [1, 0] };
      if (arrows[key]) {
        // A focused node is moved by React Flow itself; only record the undo step.
        if (target instanceof HTMLElement && target.closest(".react-flow__node")) { actions.nudgeSelection(0, 0); return; }
        const step = event.shiftKey ? 40 : 8;
        run(() => actions.nudgeSelection(arrows[key][0] * step, arrows[key][1] * step));
        return;
      }
      switch (event.key) {
        case "?": run(() => setShowShortcuts(true)); break;
        case "/": run(actions.focusComponentSearch); break;
        case "Escape": actions.clearSelection(); break;
        case "Enter":
        case "F2":
          if (actions.singleNodeId) run(() => window.dispatchEvent(new CustomEvent(RENAME_EVENT, { detail: actions.singleNodeId })));
          break;
        case "+":
        case "=": run(() => actions.reactFlow.zoomIn({ duration: 150 })); break;
        case "-":
        case "_": run(() => actions.reactFlow.zoomOut({ duration: 150 })); break;
        case "0": run(() => actions.reactFlow.zoomTo(1, { duration: 150 })); break;
        default:
          switch (key) {
            case "f": run(() => actions.reactFlow.fitView({ padding: 0.25, duration: 250 })); break;
            case "p": run(() => setShowPrompt(true)); break;
            case "b": run(() => setPaletteOpen((value) => !value)); break;
            case "i": run(actions.togglePanel); break;
            case "m": run(() => setShowMinimap((value) => !value)); break;
            case "s": run(() => actions.addItem(getItem("service"))); break;
            case "g": run(() => actions.addItem(getItem("group"))); break;
            case "t": run(() => actions.addItem(getItem("text"))); break;
            case "n": run(() => actions.addItem(getItem("note"))); break;
            default:
          }
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  // ---- Round lifecycle -----------------------------------------------------
  async function exitRound() {
    await flush();
    navigate("/library");
  }

  async function finishRound() {
    if (!window.confirm("Finish this round? Your design will be saved and become read-only, and you can then request its review. You can reopen it later to keep editing.")) return;
    await flush();
    try {
      await api.updateSession(session.id, { status: "completed" });
      setStatus("completed");
      clearSelection();
      setPanelTab("review");
      setPanelOpen(true);
    } catch (error) {
      window.alert(error.message);
    }
  }

  async function reopenRound() {
    try {
      await api.updateSession(session.id, { status: "in_progress" });
      setStatus("in_progress");
      save.current.blocked = false;
      setSaveState("saved");
    } catch (error) {
      window.alert(error.message);
    }
  }

  function importLegacy() {
    const restored = hydrateDiagram(legacy);
    record();
    setNodes(restored.nodes);
    setEdges(restored.edges);
    try { window.localStorage.removeItem(`designrounds:canvas:${prompt.id}`); } catch { /* ignore */ }
    setLegacy(null);
    window.setTimeout(() => reactFlow.fitView({ padding: 0.25, duration: 300 }), 60);
  }

  function togglePanel() {
    setPanelOpen((open) => {
      writePreference("designrounds:interviewer-open", String(!open));
      return !open;
    });
  }

  // ---- Interviewer -------------------------------------------------------------
  // Opens the conversation with the selected component attached and the composer focused.
  function askAboutSelection() {
    setDetachedId(null);
    setPanelTab("interviewer");
    setPanelOpen(true);
    writePreference("designrounds:interviewer-open", "true");
    window.setTimeout(() => document.querySelector(".compose-box textarea")?.focus(), 80);
  }

  const [detachedId, setDetachedId] = useState(null);
  const attached = selectedComponent && selectedComponent.id !== detachedId ? { id: selectedComponent.id, label: selectedComponent.data.label || "Component" } : null;
  const selectedIdRef = useRef(null);
  selectedIdRef.current = attached?.id ?? null;
  // Structural changes only: moving things around never wakes the interviewer.
  const structureKey = nodes.map((node) => `${node.id}:${node.data.kind}:${node.data.note ? 1 : 0}`).join(",") + "|" + edges.map((edge) => `${edge.source}>${edge.target}`).join(",");
  const [unread, setUnread] = useState(0);
  const panelView = useRef({ panelOpen, panelTab });
  panelView.current = { panelOpen, panelTab };
  const onProactiveTurn = useCallback(() => {
    if (!panelView.current.panelOpen || panelView.current.panelTab !== "interviewer") setUnread((count) => count + 1);
  }, []);
  const interview = useInterview({ sessionId: session.id, plan, roundActive: !readOnly, structureKey, settleSave, selectedIdRef, onProactiveTurn });
  useEffect(() => { if (panelOpen && panelTab === "interviewer") setUnread(0); }, [panelOpen, panelTab]);

  // ---- Derived view state --------------------------------------------------

  const outlineKey = nodes.map((node) => `${node.id}\u0001${node.data.kind}\u0001${node.data.label}`).join("\u0002");
  const outline = useMemo(() => nodesRef.current.map((node) => ({ id: node.id, kind: node.data.kind, label: node.data.label })), [outlineKey]);
  const selectedKey = selectedNodes.map((node) => node.id).join(",");
  const selectedIds = useMemo(() => new Set(selectedKey ? selectedKey.split(",") : []), [selectedKey]);
  const canvasActions = useMemo(() => ({ commitNodeData, readOnly }), [commitNodeData, readOnly]);
  const labelFor = (id) => nodes.find((node) => node.id === id)?.data.label || "Component";

  const saveLabel = readOnly ? "Read-only" : { saved: "Saved", saving: "Saving…", error: "Offline, retrying", conflict: "Not saved", "signed-out": "Signed out" }[saveState];

  // First canvas visit for this signed-in account. The brief (when a round is new)
  // finishes first, then the walkthrough runs once and stays dismissed.
  const tourSteps = useMemo(() => canvasTourSteps(readOnly), [readOnly]);
  const tourLayout = useRef(null);
  const layoutNow = useRef({ paletteOpen, panelOpen, panelTab });
  layoutNow.current = { paletteOpen, panelOpen, panelTab };
  const userIdRef = useRef(user?.id);
  userIdRef.current = user?.id;
  useEffect(() => {
    if (tourOn || authStatus !== "signed-in" || !user?.id) return undefined;
    if (showPrompt || showShortcuts) return undefined;
    if (canvasTourSeen(user.id)) return undefined;
    const timer = window.setTimeout(() => setTourOn(true), 400);
    return () => window.clearTimeout(timer);
  }, [authStatus, user?.id, showPrompt, showShortcuts, tourOn]);
  const onTourStep = useCallback((step) => {
    if (!tourLayout.current) tourLayout.current = { ...layoutNow.current };
    if (step.targets?.includes("library")) setPaletteOpen(true);
    if (step.tab) {
      setPanelOpen(true);
      setPanelTab(step.tab);
    }
  }, []);
  const closeTour = useCallback(() => {
    if (userIdRef.current) markCanvasTourSeen(userIdRef.current);
    const previous = tourLayout.current;
    if (previous) {
      setPaletteOpen(previous.paletteOpen);
      setPanelOpen(previous.panelOpen);
      setPanelTab(previous.panelTab);
    }
    setTourOn(false);
  }, []);

  return (
    <main className="workspace-shell">
      <header className="workspace-header">
        <Brand className="workspace-brand" onClick={exitRound} />
        <div className="workspace-divider" />
        <button className="workspace-round-name" onClick={() => setShowPrompt(true)}><span className="round-name-kicker">PRACTICE ROUND</span><span>{prompt.title}<ChevronDown size={14} /></span></button>
        <div className="workspace-header-right">
          <span className={`save-indicator ${readOnly ? "readonly" : saveState}`} role="status"><span />{saveLabel}</span>
          <span className="header-v-divider" />
          {readOnly
            ? <button className="workspace-exit" data-tour="finish" onClick={reopenRound}><RotateCcw size={13} /> Reopen round</button>
            : <button className="workspace-exit" data-tour="finish" onClick={finishRound}><CircleCheck size={13} /> Finish round</button>}
          <button className="workspace-exit" onClick={exitRound}><ArrowLeft size={13} /> Exit</button>
          <UserMenu compact />
        </div>
      </header>

      {saveState === "conflict" && <div className="workspace-banner error">This design was changed in another tab or the round was finished elsewhere, so recent edits weren't saved. <button onClick={() => window.location.reload()}>Reload latest</button></div>}
      {saveState === "signed-out" && <div className="workspace-banner error">Your session ended, so changes aren't being saved. <button onClick={() => navigate(`/signin?next=${encodeURIComponent(`/workspace/${session.id}`)}`)}>Sign in again</button></div>}
      {readOnly && <div className="workspace-banner">This round is completed and read-only. <button onClick={reopenRound}>Reopen to keep editing</button></div>}
      {smallScreenNotice && <div className="workspace-banner info">Designing works best on a laptop or tablet. Your work saves automatically, so you can switch devices anytime. <button onClick={() => { setSmallScreenNotice(false); writeSessionFlag("designrounds:small-screen-dismissed", "1"); }}>Got it</button></div>}
      {legacy && !readOnly && <div className="workspace-banner info"><Upload size={14} /> We found a design for this round saved in this browser before accounts existed. <button onClick={importLegacy}>Import it</button><button className="banner-dismiss" onClick={() => setLegacy(null)}>Dismiss</button></div>}

      <div className="workspace-body" style={{
        ...(paletteWidth ? { "--palette-width": `${paletteWidth}px` } : {}),
        ...(panelWidth ? { "--panel-width": `${panelWidth}px` } : {}),
      }}>
        <aside className="tool-rail" aria-label="Canvas tools" data-tour="rail">
          <button className={`rail-tool ${paletteOpen ? "active" : ""}`} title="Toggle component library (B)" aria-label="Toggle component library" aria-pressed={paletteOpen} onClick={() => setPaletteOpen((value) => !value)}><LayoutPanelLeft size={17} /></button>
          <span className="rail-separator" />
          <button className="rail-tool" title="Add a service (S)" aria-label="Add a service" disabled={readOnly} onClick={() => addItem(getItem("service"))}><Plus size={19} /></button>
          <button className="rail-tool" title="Add a zone / boundary (G)" aria-label="Add a zone" disabled={readOnly} onClick={() => addItem(getItem("group"))}><SquareDashed size={17} /></button>
          <button className="rail-tool" title="Add text (T)" aria-label="Add text" disabled={readOnly} onClick={() => addItem(getItem("text"))}><Type size={17} /></button>
          <button className="rail-tool" title="Add a decision note (N)" aria-label="Add a decision note" disabled={readOnly} onClick={() => addItem(getItem("note"))}><StickyNote size={17} /></button>
          <span className="rail-separator" />
          <button className="rail-tool" title="Undo (Ctrl+Z)" aria-label="Undo" disabled={readOnly} onClick={undo}><Undo2 size={16} /></button>
          <button className="rail-tool" title="Redo (Ctrl+Shift+Z)" aria-label="Redo" disabled={readOnly} onClick={redo}><Redo2 size={16} /></button>
          <div className="rail-bottom">
            <button className={`rail-tool ${snap ? "active" : ""}`} title="Snap to grid" aria-label="Snap to grid" aria-pressed={snap} onClick={() => setSnap((value) => !value)}><Magnet size={16} /></button>
            <button className={`rail-tool ${showMinimap ? "active" : ""}`} title="Minimap (M)" aria-label="Toggle minimap" aria-pressed={showMinimap} onClick={() => setShowMinimap((value) => !value)}><MapIcon size={16} /></button>
          </div>
        </aside>

        {paletteOpen && <Palette onAdd={addItem} disabled={readOnly} outline={outline} selectedIds={selectedIds} onFocusNode={focusNode} />}
        {paletteOpen && <PanelResizer side="left" label="Resize component library" width={paletteWidth} onResize={setPaletteWidth} {...PALETTE_WIDTH} />}

        <section className="canvas-column" aria-label="System design canvas">
          <div className="canvas-topbar">
            <div className="canvas-topbar-left"><span className="canvas-breadcrumb">Design</span><ChevronRight size={13} /><span className="canvas-breadcrumb-current">{prompt.title}</span></div>
            <div className="canvas-topbar-actions">
              <button className="topbar-action prompt-action" onClick={() => setShowPrompt(true)} title="Open the brief (P)"><FileText size={14} /> Brief</button>
              <button className="topbar-action shortcuts-action" onClick={() => setShowShortcuts(true)} title="Keyboard shortcuts (?)"><Keyboard size={15} /> Shortcuts <kbd>?</kbd></button>
              <span className="canvas-action-divider" />
              <button className="topbar-action" onClick={() => reactFlow.fitView({ padding: 0.25, duration: 250 })}>Fit to view</button>
              {!panelOpen && <button className="topbar-action button-chat-reopen" onClick={togglePanel}><MessageSquare size={13} /> {panelTab === "review" ? "Review" : "Interviewer"}{unread > 0 && <span className="tab-badge">{unread}</span>}</button>}
            </div>
          </div>
          <div className="canvas-content" data-tour="canvas" ref={canvasRef} onPointerDownCapture={() => { pointerDown.current = true; }}>
            <CanvasActions.Provider value={canvasActions}>
              <ReactFlow
                nodes={nodes}
                edges={edges}
                nodeTypes={nodeTypes}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                onBeforeDelete={onBeforeDelete}
                onNodeClick={onNodeClick}
                onNodeDragStart={onNodeDragStart}
                onSelectionStart={() => setBoxSelecting(true)}
                nodeClickDistance={4}
                onNodeDrag={onNodeDrag}
                onNodeDragStop={onNodeDragStop}
                onEdgeDoubleClick={onEdgeDoubleClick}
                onDrop={onDrop}
                onDragOver={onDragOver}
                isValidConnection={(connection) => connection.source !== connection.target}
                connectionMode={ConnectionMode.Loose}
                connectionLineType={ConnectionLineType.SmoothStep}
                connectionLineStyle={{ stroke: "#6672d7", strokeWidth: 1.6 }}
                connectionRadius={28}
                fitView
                fitViewOptions={{ padding: 0.25, maxZoom: 1 }}
                minZoom={0.15}
                maxZoom={2.5}
                snapToGrid={snap}
                snapGrid={[8, 8]}
                selectionKeyCode="Shift"
                selectionMode={SelectionMode.Partial}
                panOnDrag
                multiSelectionKeyCode={["Shift", "Meta", "Control"]}
                deleteKeyCode={readOnly ? null : ["Backspace", "Delete"]}
                nodesDraggable={!readOnly}
                nodesConnectable={!readOnly}
                elevateNodesOnSelect={false}
                onlyRenderVisibleElements={nodes.length > 150}
                colorMode={isDark ? "dark" : "light"}
              >
                <Background variant={BackgroundVariant.Dots} color={isDark ? "#363c49" : "#cfd6e0"} gap={18} size={1.3} />
                <Controls showInteractive={false} position="bottom-left" />
                {showMinimap && <MiniMap position="bottom-right" zoomable pannable nodeStrokeWidth={0} nodeColor={(node) => minimapColors[node.data.color || getItem(node.data.kind)?.color] || minimapColors.slate} maskColor={isDark ? "rgba(20,23,29,0.72)" : "rgba(248,249,251,0.72)"} />}
              </ReactFlow>
            </CanvasActions.Provider>

            {nodes.length === 0 && !legacy && (
              <div className="empty-canvas" data-tour="connect">
                <span className="empty-canvas-icon"><Network size={22} /></span>
                <h3>A clean slate.</h3>
                <p>{readOnly ? "This round was finished without any components." : <>Click or drag components from the library.<br />Connect them by dragging from a node's edge dot.</>}</p>
                {!readOnly && <button className="button button-outline button-small" onClick={() => addItem(getItem("client"))}><Plus size={14} /> Add a client to start</button>}
              </div>
            )}

            {singleNode && inspectedId === singleNode.id && (
              <NodeInspector id={singleNode.id} type={singleNode.type} data={singleNode.data} readOnly={readOnly}
                onBegin={record} onChange={updateNodeData} onDuplicate={duplicateSelection} onDelete={deleteSelection} onClose={clearSelection}
                ask={interview.access !== "full" ? "plus" : status !== "in_progress" ? "finished" : "available"} onAsk={askAboutSelection} />
            )}
            {singleEdge && (
              <EdgeInspector edge={singleEdge} sourceLabel={labelFor(singleEdge.source)} targetLabel={labelFor(singleEdge.target)} readOnly={readOnly} focusLabel={focusEdgeLabel}
                onBegin={record} onChange={updateEdge} onReverse={() => reverseEdge(singleEdge.id)} onDelete={deleteSelection} onClose={clearSelection} />
            )}
            {selectionCount > 1 && !boxSelecting && <MultiInspector count={selectionCount} readOnly={readOnly} onDuplicate={duplicateSelection} onDelete={deleteSelection} onClose={clearSelection} />}

            <div className="canvas-session-label"><span className="session-pulse" /> {nodes.length} components <span>·</span> {edges.length} connections</div>
          </div>
          <div className="canvas-footer">
            <span><MousePointer2 size={13} /> Drag to move around · Shift + drag to select several · Double-click to rename</span>
            <span><Command size={12} /> Press <kbd>?</kbd> for keyboard shortcuts <span aria-hidden="true">·</span> <button type="button" className="canvas-footer-link" onClick={openReportProblem}>Report a problem</button></span>
          </div>
        </section>

        {panelOpen && <PanelResizer side="right" label={`Resize ${panelTab === "review" ? "review" : "interviewer"} panel`} width={panelWidth} onResize={setPanelWidth}
          {...SIDE_PANEL_WIDTH} defaultWidth={panelTab === "review" ? SIDE_PANEL_WIDTH.reviewWidth : SIDE_PANEL_WIDTH.defaultWidth} />}
        {panelOpen && (
          <SidePanel tab={panelTab} onTab={setPanelTab} onClose={togglePanel} interview={interview} unread={unread}
            selected={attached} onClearSelected={() => setDetachedId(selectedComponent?.id ?? null)} sessionId={session.id} roundFinished={readOnly} onFocusNode={focusNode} labelFor={labelFor} />
        )}
      </div>
      {showShortcuts && <ShortcutsDialog onClose={() => setShowShortcuts(false)} />}
      {showPrompt && <PromptModal prompt={prompt} fresh={nodes.length === 0} onClose={() => setShowPrompt(false)} />}
      {tourOn && <CanvasTour steps={tourSteps} layoutKey={`${paletteOpen}:${panelOpen}:${panelTab}`} onStep={onTourStep} onDone={closeTour} />}
    </main>
  );
}

// Nearest grid slot (spiralling out from the preferred point) that doesn't overlap a component.
function findFreeSpot(nodes, preferred, size = { width: 178, height: 64 }) {
  const gap = 24;
  const solid = nodes.filter((node) => node.type !== "groupNode");
  const overlaps = (x, y) => solid.some((node) => {
    const width = node.measured?.width ?? node.width ?? size.width;
    const height = node.measured?.height ?? node.height ?? size.height;
    return x < node.position.x + width + gap && x + size.width + gap > node.position.x
      && y < node.position.y + height + gap && y + size.height + gap > node.position.y;
  });
  const stepX = size.width + gap;
  const stepY = size.height + gap;
  for (let ring = 0; ring < 8; ring += 1) {
    for (let dy = -ring; dy <= ring; dy += 1) {
      for (let dx = -ring; dx <= ring; dx += 1) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== ring) continue;
        const x = preferred.x + dx * stepX;
        const y = preferred.y + dy * stepY;
        if (!overlaps(x, y)) return { x, y };
      }
    }
  }
  return preferred;
}

// Limits for the resizable side panels; defaults match the CSS widths.
const PALETTE_WIDTH = { defaultWidth: 284, min: 220, max: 440 };
const SIDE_PANEL_WIDTH = { defaultWidth: 340, reviewWidth: 380, min: 300, max: 640 };

function usePanelWidth(key, { min, max }) {
  const [width, setWidth] = useState(() => {
    const stored = Number(readPreference(key, ""));
    return stored >= min && stored <= max ? stored : null;
  });
  useEffect(() => { writePreference(key, width ? String(width) : ""); }, [key, width]);
  return [width, setWidth];
}

function readPreference(key, fallback) {
  try { return window.localStorage.getItem(key) ?? fallback; } catch { return fallback; }
}

function writePreference(key, value) {
  try { window.localStorage.setItem(key, value); } catch { /* preference only */ }
}

function readLegacyCanvas(promptId) {
  try {
    const value = JSON.parse(window.localStorage.getItem(`designrounds:canvas:${promptId}`) || "null");
    return value?.nodes?.length ? value : null;
  } catch {
    return null;
  }
}
