import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Bell,
  Check,
  ChevronDown,
  ChevronRight,
  Clock3,
  Command,
  Database,
  Ellipsis,
  ExternalLink,
  FileText,
  Globe2,
  HardDrive,
  Layers2,
  Link2,
  ListFilter,
  LockKeyhole,
  Menu,
  MessageSquare,
  MoreHorizontal,
  MousePointer2,
  Network,
  Plus,
  Search,
  Send,
  Server,
  Settings2,
  ShieldCheck,
  Sparkles,
  SquarePen,
  StickyNote,
  Redo2,
  Undo2,
  X,
  Zap,
} from "lucide-react";
import {
  addEdge,
  Background,
  Controls,
  Handle,
  MarkerType,
  MiniMap,
  Position,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  useReactFlow,
} from "@xyflow/react";
import { categories, getPrompt, getTrack, prompts, tracks } from "./data/prompts.js";

const initialRoute = window.location.hash || "#/";

function navigate(path) {
  window.location.hash = path;
}

function App() {
  const [route, setRoute] = useState(initialRoute);
  const [lockedPromptId, setLockedPromptId] = useState(null);
  const [activePromptId, setActivePromptId] = useState(
    () => window.localStorage.getItem("designrounds:active-prompt") || "url-shortener"
  );

  useEffect(() => {
    const handleHashChange = () => setRoute(window.location.hash || "#/");
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  const activePrompt = getPrompt(activePromptId);
  const path = route.split("?")[0];

  function startPrompt(promptId) {
    const selectedPrompt = getPrompt(promptId);
    if (selectedPrompt.access === "paid") {
      setLockedPromptId(promptId);
      return;
    }
    setActivePromptId(promptId);
    window.localStorage.setItem("designrounds:active-prompt", promptId);
    navigate("/workspace");
  }

  if (path.startsWith("#/workspace")) {
    return (
      <ReactFlowProvider>
        <Workspace
          prompt={activePrompt}
          onBack={() => navigate("/library")}
        />
      </ReactFlowProvider>
    );
  }

  return (
    <div className="site-shell">
      <SiteHeader onNavigate={navigate} />
      {path.startsWith("#/library") ? (
        <LibraryPage onStart={startPrompt} />
      ) : (
        <LandingPage
          onStart={() => navigate("/library")}
          onSelectTrack={(trackId) => navigate(`/library?track=${encodeURIComponent(trackId)}`)}
        />
      )}
      {lockedPromptId && (
        <LockedPromptDialog prompt={getPrompt(lockedPromptId)} onClose={() => setLockedPromptId(null)} />
      )}
    </div>
  );
}

function SiteHeader({ onNavigate }) {
  return (
    <header className="site-header">
      <button className="brand-lockup" onClick={() => onNavigate("/")} aria-label="DesignRounds home">
        <span className="brand-mark"><Layers2 size={18} strokeWidth={2.3} /></span>
        <span className="brand-name">design<span>rounds</span></span>
      </button>
      <nav className="main-nav" aria-label="Main navigation">
        <button className="nav-link" onClick={() => onNavigate("/library")}>Practice</button>
        <a className="nav-link" href="#how-it-works">How it works</a>
        <a className="nav-link" href="#topics">Topics</a>
      </nav>
      <div className="header-actions">
        <span className="saved-note"><span className="availability-dot" />Your work saves automatically</span>
        <button className="button button-dark button-small" onClick={() => onNavigate("/library")}>
          Start practicing <ArrowRight size={15} />
        </button>
      </div>
      <button className="mobile-menu" onClick={() => onNavigate("/library")} aria-label="Open practice library"><Menu size={21} /></button>
    </header>
  );
}

function LandingPage({ onStart, onSelectTrack }) {
  return (
    <main>
      <section className="hero-section">
        <div className="hero-copy">
          <div className="eyebrow"><span className="eyebrow-line" /> SYSTEM DESIGN, BY DESIGN</div>
          <h1>Get better at system design <span>by doing it.</span></h1>
          <p className="hero-subtitle">
            Real interview prompts. A canvas to think things through.
            A better way to prepare for the conversations that matter.
          </p>
          <div className="hero-actions">
            <button className="button button-dark" onClick={onStart}>
              Explore practice rounds <ArrowRight size={16} />
            </button>
            <a href="#how-it-works" className="text-link">See how it works <ArrowDown size={15} /></a>
          </div>
          <div className="hero-proof">
            <span><Check size={14} /> Practice at your own pace</span>
            <span className="proof-divider" />
            <span><Check size={14} /> No setup required</span>
          </div>
        </div>
        <ProductPreview />
        <div className="hero-footnote"><span>01 / A BETTER KIND OF PRACTICE</span><span>BUILT FOR THE WAY ENGINEERS THINK</span></div>
      </section>

      <section className="principle-band" id="how-it-works">
        <div className="section-kicker">A more useful way to prepare</div>
        <div className="principle-heading">
          <h2>Less memorizing.<br /><span>More thinking out loud.</span></h2>
          <p>Good system design is a conversation. Practice the decisions, the reasoning, and the trade-offs—not just the diagrams.</p>
        </div>
        <div className="steps-grid">
          <Step number="01" icon={<FileText size={18} />} title="Start with a real prompt" text="Pick a familiar engineering challenge, with requirements that leave room to think." />
          <Step number="02" icon={<Network size={18} />} title="Build your own design" text="Use a visual canvas to map components, connections, and the choices behind them." />
          <Step number="03" icon={<MessageSquare size={18} />} title="Explain your decisions" text="Work through the reasoning and trade-offs you'd be asked about in an interview." />
        </div>
      </section>

      <section className="category-section">
        <div className="category-section-heading">
          <div><div className="section-kicker">A LIBRARY FOR THE WORK YOU DO</div><h2>Practice by discipline.<br /><span>Go deep on the details.</span></h2></div>
          <p>From backend systems to data platforms and production ML, every round sets a clear design brief and gives you room to explain your approach.</p>
        </div>
        <div className="track-grid">
          {tracks.map((track) => {
            const Icon = trackIcon(track.icon);
            const count = prompts.filter((prompt) => prompt.track === track.id).length;
            return (
              <button className="track-card" key={track.id} onClick={() => onSelectTrack(track.id)}>
                <div className="track-card-top"><span className={`track-icon icon-${track.color}`}><Icon size={18} /></span><span>{String(count).padStart(2, "0")} ROUNDS</span></div>
                <h3>{track.label}</h3><p>{track.description}</p>
                <span className="track-card-link">Explore area <ArrowRight size={14} /></span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="topics-section" id="topics">
        <div className="topics-topline">
          <div><div className="section-kicker">THE PRACTICE LIBRARY</div><h2>Familiar problems.<br /><span>Interesting decisions.</span></h2></div>
          <button className="button button-outline" onClick={onStart}>Browse all rounds <ArrowRight size={15} /></button>
        </div>
        <div className="featured-prompts">
          {prompts.slice(0, 3).map((prompt, index) => (
            <PromptCard key={prompt.id} prompt={prompt} onStart={onStart} index={index} compact />
          ))}
        </div>
      </section>
      <Footer onNavigate={() => { window.scrollTo({ top: 0, behavior: "smooth" }); onStart(); }} />
    </main>
  );
}

function ProductPreview() {
  return (
    <div className="preview-scene" aria-label="Preview of a system design practice canvas">
      <div className="preview-browser">
        <div className="preview-chrome"><span /><span /><span /><div className="chrome-address">app.designrounds.com / practice</div><Ellipsis size={16} /></div>
        <div className="preview-app">
          <div className="preview-workspace">
            <div className="preview-toolbar"><span className="preview-toolbar-logo"><Layers2 size={15} /></span><span>Design a URL shortener</span><span className="preview-unsaved"><i /> All changes saved</span><button><MoreHorizontal size={17} /></button></div>
            <div className="preview-canvas">
              <div className="preview-canvas-grid" />
              <div className="preview-node preview-client"><Globe2 size={14} /><span>Client</span></div>
              <div className="preview-node preview-api"><Server size={14} /><span>API service</span></div>
              <div className="preview-node preview-cache"><Zap size={14} /><span>Cache</span></div>
              <div className="preview-node preview-db"><Database size={14} /><span>Database</span></div>
              <svg className="preview-connectors" viewBox="0 0 500 284" preserveAspectRatio="none" aria-hidden="true">
                <defs><marker id="arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 z" fill="#9ca8b9" /></marker></defs>
                <path d="M121 98 C150 98 155 98 182 98" stroke="#9ca8b9" strokeWidth="1.4" fill="none" markerEnd="url(#arrow)" />
                <path d="M279 98 C312 98 306 62 339 62" stroke="#9ca8b9" strokeWidth="1.4" fill="none" markerEnd="url(#arrow)" />
                <path d="M279 110 C312 110 306 150 339 150" stroke="#9ca8b9" strokeWidth="1.4" fill="none" markerEnd="url(#arrow)" />
              </svg>
              <span className="preview-edge-label edge-one">create</span><span className="preview-edge-label edge-two">read</span>
              <div className="preview-zoom"><span>−</span><span>100%</span><span>+</span></div>
            </div>
          </div>
          <aside className="preview-interviewer">
            <div className="preview-panel-title"><span className="panel-bubble"><MessageSquare size={13} /></span><span>INTERVIEWER</span><span className="preview-live-dot" /></div>
            <div className="preview-prompt-label">A QUESTION ABOUT YOUR DESIGN</div>
            <p className="preview-question">You’ve added a cache for redirects. What would you use as the cache key?</p>
            <div className="preview-answer">I’d use the short code as the key, since the redirect lookup starts with that.</div>
            <div className="preview-followup"><span className="tiny-spark"><Sparkles size={11} /></span>And how would you keep the cache consistent when a link expires?</div>
            <div className="preview-input">Your response <span><ArrowUpRight size={13} /></span></div>
          </aside>
        </div>
      </div>
      <div className="preview-caption"><span className="caption-dot" /> A workspace built around your thinking <span className="caption-right">CANVAS + CONVERSATION</span></div>
    </div>
  );
}

function Step({ number, icon, title, text }) {
  return <article className="step-card"><div className="step-top"><span>{number}</span><i>{icon}</i></div><h3>{title}</h3><p>{text}</p></article>;
}

function LibraryPage({ onStart }) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState(() => {
    const requestedTrack = new URLSearchParams(window.location.hash.split("?")[1] || "").get("track");
    return tracks.some((track) => track.id === requestedTrack) ? requestedTrack : "all";
  });
  const [difficulty, setDifficulty] = useState("Any level");
  const filtered = useMemo(() => prompts.filter((prompt) => {
    const track = getTrack(prompt.track);
    const matchesSearch = `${prompt.title} ${prompt.description} ${prompt.category} ${track.label} ${prompt.requirements.join(" ")}`.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = category === "all" || prompt.track === category;
    const matchesDifficulty = difficulty === "Any level" || prompt.difficulty === difficulty;
    return matchesSearch && matchesCategory && matchesDifficulty;
  }), [search, category, difficulty]);
  const activeTrack = tracks.find((track) => track.id === category);
  const freePromptCount = prompts.filter((prompt) => prompt.access === "free").length;

  return (
    <main className="library-page page-width">
      <div className="breadcrumbs"><span>Practice</span><ChevronRight size={14} /><span className="breadcrumb-current">Practice library</span></div>
      <div className="library-heading">
        <div><div className="section-kicker">{activeTrack ? activeTrack.label.toUpperCase() : "YOUR NEXT ROUND"}</div><h1>{activeTrack ? `Practice ${activeTrack.shortLabel}.` : "Choose a design challenge."}</h1><p>{activeTrack ? activeTrack.description : "Each round gives you a clear brief, useful constraints, and space to explain your design."}</p></div>
        <div className="library-count"><strong>{filtered.length.toString().padStart(2, "0")}</strong><span>{activeTrack ? "ROUNDS IN THIS AREA" : "CURATED ROUNDS"}</span><span className="library-free-count">{freePromptCount} of {prompts.length} included free</span></div>
      </div>
      <div className="library-toolbar">
        <label className="search-field"><Search size={17} /><input aria-label="Search practice rounds" placeholder="Search challenges..." value={search} onChange={(event) => setSearch(event.target.value)} />{search && <button onClick={() => setSearch("")} aria-label="Clear search"><X size={15} /></button>}<kbd>⌘ K</kbd></label>
        <div className="filter-select"><ListFilter size={15} /><select aria-label="Filter by difficulty" value={difficulty} onChange={(event) => setDifficulty(event.target.value)}><option>Any level</option><option>Beginner</option><option>Intermediate</option><option>Advanced</option></select><ChevronDown size={14} /></div>
      </div>
      <div className="category-row" role="group" aria-label="Filter by engineering discipline">
        {categories.map((item) => <button key={item.id} onClick={() => setCategory(item.id)} className={`category-chip ${category === item.id ? "selected" : ""}`}>{item.label}</button>)}
      </div>
      <div className="access-key" aria-label="Plan access labels"><span><i className="free-key-dot" />Free practice · canvas + one final review planned</span><span><i className="plus-key-dot" />Plus · additional rounds + AI coaching when available</span></div>
      <div className="prompt-grid library-grid">
        {filtered.map((prompt, index) => <PromptCard key={prompt.id} prompt={prompt} onStart={onStart} index={index} />)}
      </div>
      {filtered.length === 0 && <div className="empty-state"><Search size={22} /><h3>No rounds match that search.</h3><p>Try another term or clear your filters.</p><button className="button button-outline" onClick={() => { setSearch(""); setCategory("all"); setDifficulty("Any level"); }}>Clear filters</button></div>}
      <div className="library-bottom-note"><LockKeyhole size={14} /> Your designs stay in this browser and are saved automatically.</div>
      <Footer onNavigate={() => window.scrollTo({ top: 0, behavior: "smooth" })} />
    </main>
  );
}

function PromptCard({ prompt, onStart, index = 0, compact = false }) {
  const Icon = promptIcon(prompt.icon);
  const track = getTrack(prompt.track);
  return (
    <article className={`prompt-card ${compact ? "prompt-compact" : ""}`} style={{ "--card-order": index }}>
      <div className="prompt-card-top">
        <div className={`prompt-icon icon-${prompt.color}`}><Icon size={19} strokeWidth={1.8} /></div>
        <span className={`access-tag ${prompt.access === "free" ? "access-free" : "access-plus"}`}>{prompt.access === "free" ? <Check size={10} /> : <LockKeyhole size={10} />}{prompt.access === "free" ? "FREE ROUND" : "PLUS ROUND"}</span>
      </div>
      <div className="prompt-meta"><span>{track.shortLabel}</span><span className="meta-separator">·</span><span>{prompt.difficulty}</span><span className="meta-time"><Clock3 size={13} /> {prompt.minutes} min</span></div>
      <h3>{prompt.title}</h3>
      <p className="prompt-description">{prompt.description}</p>
      <div className="prompt-card-bottom"><div className="topic-tags"><span>{prompt.category}</span>{prompt.considerations.slice(0, 1).map((tag) => <span key={tag}>{tag}</span>)}</div><button className="card-arrow" onClick={() => onStart(prompt.id)} aria-label={prompt.access === "free" ? `Start ${prompt.title}` : `View paid access details for ${prompt.title}`}><ArrowUpRight size={17} /></button></div>
    </article>
  );
}

function promptIcon(icon) {
  const icons = {
    link: Link2, message: MessageSquare, feed: Layers2, storage: HardDrive, shield: ShieldCheck, video: Globe2,
    booking: Clock3, notification: Bell, crawler: Globe2, autocomplete: Search, editor: SquarePen, paste: FileText,
    payment: ShieldCheck, scheduler: Server, cache: Database, gateway: Network,
    warehouse: Database, analytics: Layers2, pipeline: Network, events: Zap, alert: Bell, fraud: ShieldCheck,
    quality: Check, model: Sparkles, features: Database, training: Server, serve: Zap, search: Search, monitor: Layers2,
    platform: Layers2, regions: Globe2, discovery: Network, security: LockKeyhole, deploy: ArrowUpRight, config: Settings2,
    service: Server,
  };
  return icons[icon] || Network;
}

function trackIcon(icon) {
  const icons = { service: Server, database: Database, model: Sparkles, platform: Layers2 };
  return icons[icon] || Network;
}

function LockedPromptDialog({ prompt, onClose }) {
  const track = getTrack(prompt.track);
  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="locked-dialog" role="dialog" aria-modal="true" aria-labelledby="locked-dialog-title">
        <div className="locked-dialog-icon"><LockKeyhole size={20} /></div>
        <span className="modal-kicker">PLUS PRACTICE ROUND · {track.shortLabel.toUpperCase()}</span>
        <h2 id="locked-dialog-title">{prompt.title}</h2>
        <p>{prompt.description}</p>
        <div className="locked-dialog-requirements"><h3>Requirements to consider</h3><ul>{prompt.requirements.map((requirement) => <li key={requirement}><Check size={12} />{requirement}</li>)}</ul></div>
        <p className="locked-dialog-outcome"><strong>What you would practice:</strong> {prompt.expectedOutcome}</p>
        <div className="locked-dialog-note"><Sparkles size={15} /><span>Plus rounds and conversational AI coaching are planned. This preview does not take payments or start AI sessions.</span></div>
        <button className="button button-dark locked-dialog-close" onClick={onClose}>Back to practice library <ArrowRight size={14} /></button>
      </section>
    </div>
  );
}

function Footer({ onNavigate }) {
  return <footer className="site-footer"><button className="brand-lockup footer-brand" onClick={onNavigate}><span className="brand-mark"><Layers2 size={17} /></span><span className="brand-name">design<span>rounds</span></span></button><span>Thoughtful practice for systems that matter.</span><span>© 2026 DesignRounds</span></footer>;
}

const nodeLibrary = [
  { type: "client", label: "Client", icon: Globe2, color: "blue" },
  { type: "service", label: "Service", icon: Server, color: "violet" },
  { type: "database", label: "Database", icon: Database, color: "green" },
  { type: "cache", label: "Cache", icon: Zap, color: "orange" },
  { type: "queue", label: "Queue", icon: Network, color: "teal" },
  { type: "storage", label: "Object storage", icon: HardDrive, color: "rose" },
  { type: "note", label: "Decision note", icon: StickyNote, color: "orange" },
];

function makeNode(id, label, x, y) {
  const item = nodeLibrary.find((node) => node.type === id);
  return {
    id: `${id}-${Math.random().toString(36).slice(2, 8)}`,
    type: "systemNode",
    position: { x, y },
    data: { label, kind: id, color: item?.color || "blue" },
  };
}

function SystemNode({ data, selected }) {
  const item = nodeLibrary.find((node) => node.type === data.kind);
  const Icon = item?.icon || Server;
  return (
    <div className={`system-node ${selected ? "node-selected" : ""} ${data.kind === "note" ? "note-node" : ""}`}>
      <div className={`system-node-icon icon-${data.color || "blue"}`}><Icon size={17} strokeWidth={1.9} /></div>
      <div className="system-node-label">{data.label}</div>
      <div className="node-subtitle">{data.subtitle || (data.kind === "note" ? "Decision / assumption" : item?.label) || "Component"}</div>
      <Handle type="target" position={Position.Left} />
      <Handle type="source" position={Position.Right} />
    </div>
  );
}

const nodeTypes = { systemNode: SystemNode };

function Workspace({ prompt, onBack }) {
  const storageKey = `designrounds:canvas:${prompt.id}`;
  const [savedCanvas, setSavedCanvas] = useState(() => {
    try {
      const value = window.localStorage.getItem(storageKey);
      return value ? JSON.parse(value) : null;
    } catch {
      return null;
    }
  });
  const startingNodes = useMemo(() => savedCanvas?.nodes || [], [savedCanvas, prompt.id]);
  const startingEdges = useMemo(() => savedCanvas?.edges || [], [savedCanvas, prompt.id]);
  const [nodes, setNodes, onNodesChange] = useNodesState(startingNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(startingEdges);
  const [panelOpen, setPanelOpen] = useState(() => window.localStorage.getItem("designrounds:interviewer-open") !== "false");
  const [selectedNode, setSelectedNode] = useState(null);
  const [saveState, setSaveState] = useState("saved");
  const [showPrompt, setShowPrompt] = useState(false);
  const [componentSearch, setComponentSearch] = useState("");
  const reactFlow = useReactFlow();
  const history = useRef({ past: [], future: [], nodes: startingNodes, edges: startingEdges });

  useEffect(() => {
    history.current.nodes = nodes;
    history.current.edges = edges;
  }, [nodes, edges]);

  useEffect(() => {
    setSaveState("saving");
    const timeout = window.setTimeout(() => {
      try {
        window.localStorage.setItem(storageKey, JSON.stringify({ nodes, edges, savedAt: new Date().toISOString() }));
        setSaveState("saved");
      } catch {
        setSaveState("error");
      }
    }, 450);
    return () => window.clearTimeout(timeout);
  }, [nodes, edges, storageKey]);

  function recordHistory() {
    const stack = history.current;
    stack.past.push({ nodes: stack.nodes, edges: stack.edges });
    if (stack.past.length > 40) stack.past.shift();
    stack.future = [];
  }

  function undo() {
    const stack = history.current;
    if (!stack.past.length) return;
    const previous = stack.past.pop();
    stack.future.push({ nodes: stack.nodes, edges: stack.edges });
    stack.nodes = previous.nodes;
    stack.edges = previous.edges;
    setNodes(previous.nodes);
    setEdges(previous.edges);
    setSelectedNode(null);
  }

  function redo() {
    const stack = history.current;
    if (!stack.future.length) return;
    const next = stack.future.pop();
    stack.past.push({ nodes: stack.nodes, edges: stack.edges });
    stack.nodes = next.nodes;
    stack.edges = next.edges;
    setNodes(next.nodes);
    setEdges(next.edges);
    setSelectedNode(null);
  }

  useEffect(() => {
    function handleShortcut(event) {
      const target = event.target;
      if (target instanceof HTMLElement && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) return;
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z") {
        event.preventDefault();
        if (event.shiftKey) redo();
        else undo();
      } else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "y") {
        event.preventDefault();
        redo();
      }
    }
    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  });

  function addNode(item) {
    const canvasBounds = document.querySelector(".canvas-content")?.getBoundingClientRect();
    const position = reactFlow.screenToFlowPosition({
      x: canvasBounds ? canvasBounds.left + canvasBounds.width / 2 : window.innerWidth / 2,
      y: canvasBounds ? canvasBounds.top + canvasBounds.height / 2 : window.innerHeight / 2,
    });
    const node = {
      ...makeNode(item.type, item.label, position.x - 70, position.y - 35),
      data: { label: item.label, kind: item.type, color: item.color },
    };
    recordHistory();
    setNodes((current) => [...current, node]);
    setSelectedNode(node.id);
  }

  function onConnect(connection) {
    recordHistory();
    setEdges((current) => addEdge({
      ...connection,
      type: "smoothstep",
      markerEnd: { type: MarkerType.ArrowClosed, color: "#9ba7b8" },
      style: { stroke: "#9ba7b8", strokeWidth: 1.5 },
    }, current));
  }

  function onDrop(event) {
    event.preventDefault();
    const type = event.dataTransfer.getData("application/designrounds-node");
    const item = nodeLibrary.find((node) => node.type === type);
    if (!item) return;
    const position = reactFlow.screenToFlowPosition({ x: event.clientX, y: event.clientY });
    recordHistory();
    setNodes((current) => [...current, {
      ...makeNode(item.type, item.label, position.x, position.y),
      data: { label: item.label, kind: item.type, color: item.color },
    }]);
  }

  function renameSelected(value) {
    recordHistory();
    setNodes((current) => current.map((node) => node.id === selectedNode ? { ...node, data: { ...node.data, label: value } } : node));
  }

  function removeSelected() {
    recordHistory();
    setNodes((current) => current.filter((node) => node.id !== selectedNode));
    setEdges((current) => current.filter((edge) => edge.source !== selectedNode && edge.target !== selectedNode));
    setSelectedNode(null);
  }

  function clearCanvas() {
    if (!nodes.length && !edges.length) return;
    recordHistory();
    setNodes([]);
    setEdges([]);
    setSelectedNode(null);
  }

  function handlePanelToggle() {
    setPanelOpen((open) => {
      window.localStorage.setItem("designrounds:interviewer-open", String(!open));
      return !open;
    });
  }

  function handleNodeDragStart() {
    recordHistory();
  }

  const selected = nodes.find((node) => node.id === selectedNode);
  const visiblePalette = nodeLibrary.filter((item) => item.type !== "note" && item.label.toLowerCase().includes(componentSearch.toLowerCase()));

  return (
    <main className="workspace-shell">
      <header className="workspace-header">
        <button className="workspace-brand brand-lockup" onClick={onBack} aria-label="Back to library"><span className="brand-mark"><Layers2 size={16} /></span><span className="brand-name">design<span>rounds</span></span></button>
        <div className="workspace-divider" />
        <button className="workspace-round-name" onClick={() => setShowPrompt(true)}><span className="round-name-kicker">PRACTICE ROUND</span><span>{prompt.title}<ChevronDown size={14} /></span></button>
        <div className="workspace-header-right">
          <span className={`save-indicator ${saveState}`}><span />{saveState === "saved" ? "Saved" : saveState === "saving" ? "Saving…" : "Save failed"}</span>
          <span className="header-v-divider" />
          <button className="avatar-button" aria-label="Your profile">S</button>
          <button className="workspace-exit" onClick={onBack}>Exit round</button>
        </div>
      </header>

      <div className="workspace-body">
        <aside className="tool-rail" aria-label="Canvas tools">
          <button className="rail-tool active" title="Select" aria-label="Select" onClick={() => document.querySelector(".react-flow")?.focus()}><MousePointer2 size={17} /></button>
          <span className="rail-separator" />
          <button className="rail-tool" title="Add component" aria-label="Add component" onClick={() => addNode(nodeLibrary[1])}><Plus size={19} /></button>
          <button className="rail-tool" title="Add note" aria-label="Add note" onClick={() => addNode(nodeLibrary.find((item) => item.type === "note"))}><StickyNote size={17} /></button>
          <span className="rail-separator" />
          <button className="rail-tool" title="Fit diagram to view" aria-label="Fit diagram to view" onClick={() => reactFlow.fitView({ padding: 0.24, duration: 250 })}><Layers2 size={16} /></button>
          <div className="rail-bottom"><button className="rail-tool" title="Canvas settings" aria-label="Canvas settings"><Settings2 size={17} /></button></div>
        </aside>

        <aside className="component-sidebar">
          <div className="palette-heading"><div><span className="palette-kicker">YOUR WORKSPACE</span><h2>Components</h2></div><button className="icon-button" aria-label="Component options"><Ellipsis size={18} /></button></div>
          <label className="palette-search"><Search size={15} /><input placeholder="Find a component" aria-label="Find a component" value={componentSearch} onChange={(event) => setComponentSearch(event.target.value)} /></label>
          <div className="palette-group-title"><span>BUILDING BLOCKS</span><ChevronDown size={14} /></div>
          <div className="palette-items">
            {visiblePalette.map((item) => {
              const Icon = item.icon;
              return <button key={item.type} className="palette-item" draggable onDragStart={(event) => event.dataTransfer.setData("application/designrounds-node", item.type)} onClick={() => addNode(item)}><span className={`palette-item-icon icon-${item.color}`}><Icon size={16} /></span><span>{item.label}</span><Plus className="palette-add" size={15} /></button>;
            })}
          </div>
          <div className="palette-hint"><MousePointer2 size={14} /><span>Drag onto the canvas or click to add</span></div>
          <div className="palette-divider" />
          <div className="palette-group-title"><span>YOUR DESIGN</span><span className="count-badge">{nodes.length}</span></div>
          <div className="design-outline">
            {nodes.length ? nodes.map((node) => {
              const item = nodeLibrary.find((entry) => entry.type === node.data.kind);
              const Icon = item?.icon || StickyNote;
              return <button key={node.id} className={`outline-item ${selectedNode === node.id ? "outline-selected" : ""}`} onClick={() => { setSelectedNode(node.id); reactFlow.setCenter(node.position.x + 70, node.position.y + 40, { zoom: 1, duration: 300 }); }}><Icon size={14} /><span>{node.data.label}</span><span className="outline-dot" /></button>;
            }) : <div className="outline-empty">Add a component to start shaping your design.</div>}
          </div>
          <div className="sidebar-bottom"><div className="sidebar-bottom-icon"><LockKeyhole size={15} /></div><div><strong>Saved on this device</strong><span>Not synced to an account.</span></div></div>
        </aside>

        <section className="canvas-column" aria-label="System design canvas">
          <div className="canvas-topbar">
            <div className="canvas-topbar-left"><span className="canvas-breadcrumb">Design</span><ChevronRight size={13} /><span className="canvas-breadcrumb-current">{prompt.title}</span></div>
            <div className="canvas-topbar-actions">
              <button className="topbar-action prompt-action" onClick={() => setShowPrompt(true)}><FileText size={14} /> Prompt</button>
              <span className="canvas-action-divider" />
              <button className="topbar-action" title="Undo" onClick={undo}><Undo2 size={15} /></button>
              <button className="topbar-action" title="Redo" onClick={redo}><Redo2 size={15} /></button>
              <span className="canvas-action-divider" />
              <button className="topbar-action share-action" onClick={() => setShowPrompt(true)}><ExternalLink size={14} /> Round details</button>
            </div>
          </div>
          {selected && <div className="selection-toolbar"><span className={`selection-icon icon-${selected.data.color}`}><Server size={15} /></span><input aria-label="Component name" value={selected.data.label} onChange={(event) => renameSelected(event.target.value)} /><span className="selection-label">SELECTED COMPONENT</span><button className="selection-delete" onClick={removeSelected} aria-label="Remove component"><X size={14} /></button></div>}
          <div className="canvas-content">
            <ReactFlow
              nodes={nodes}
              edges={edges}
              nodeTypes={nodeTypes}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onNodeDragStart={handleNodeDragStart}
              onDelete={recordHistory}
              onNodeClick={(_, node) => setSelectedNode(node.id)}
              onPaneClick={() => setSelectedNode(null)}
              onDrop={onDrop}
              onDragOver={(event) => { event.preventDefault(); event.dataTransfer.dropEffect = "move"; }}
              fitView
              fitViewOptions={{ padding: 0.24 }}
              snapToGrid
              snapGrid={[16, 16]}
              deleteKeyCode={["Backspace", "Delete"]}
              defaultEdgeOptions={{ type: "smoothstep" }}
              proOptions={{ hideAttribution: true }}
              connectionLineStyle={{ stroke: "#7c8ba1", strokeWidth: 1.5 }}
              defaultViewport={{ x: 0, y: 0, zoom: 0.85 }}
            >
              <Background color="#dfe4eb" gap={22} size={1} />
              <Controls showInteractive={false} position="bottom-left" />
              <MiniMap position="bottom-right" zoomable pannable nodeColor={(node) => ({ blue: "#dceafe", violet: "#ece5ff", green: "#d9f4e8", orange: "#fff0da", teal: "#d8f4f0", rose: "#ffe4e6" }[node.data.color] || "#e6eaf0")} maskColor="rgba(248,249,251,0.75)" />
            </ReactFlow>
            {nodes.length === 0 && <div className="empty-canvas"><span className="empty-canvas-icon"><Network size={22} /></span><h3>A clean slate.</h3><p>Drag a component onto the canvas<br />or click one in the sidebar to begin.</p><button className="button button-outline button-small" onClick={() => addNode(nodeLibrary[0])}><Plus size={14} /> Add your first component</button></div>}
            <div className="canvas-session-label"><span className="session-pulse" /> {nodes.length} components <span>·</span> {edges.length} connections</div>
          </div>
          <div className="canvas-footer"><span><MousePointer2 size={13} /> Select to edit · Drag to arrange</span><span><Command size={12} /> Z to undo</span></div>
        </section>

        {panelOpen ? (
          <InterviewerPanel onClose={handlePanelToggle} prompt={prompt} selectedNode={selected} />
        ) : (
          <button className="floating-panel-open" onClick={handlePanelToggle}><MessageSquare size={16} /><span>Show interviewer</span><ChevronRight size={14} /></button>
        )}
      </div>
      {showPrompt && <PromptModal prompt={prompt} onClose={() => setShowPrompt(false)} />}
    </main>
  );
}

function InterviewerPanel({ onClose, prompt, selectedNode }) {
  const selectedName = selectedNode?.data.label;
  return (
    <aside className="interviewer-panel">
      <div className="interviewer-header"><div className="interviewer-title-icon"><MessageSquare size={15} /></div><div className="interviewer-title-text"><strong>Interviewer</strong><span>YOUR DESIGN PARTNER</span></div><span className="coming-pill"><span /> COMING SOON</span><button className="panel-close" onClick={onClose} title="Hide interviewer" aria-label="Hide interviewer"><X size={17} /></button></div>
      <div className="interviewer-body">
        <div className="interviewer-intro"><div className="intro-symbol"><MessageSquare size={18} /></div><span className="conversation-label">THE CONVERSATION</span><h3>Think it through.<br />Out loud.</h3><p>Your interviewer will ask about your design choices and help you explore the trade-offs.</p></div>
        <div className="conversation-rule"><span>YOUR ROUND</span><span>{prompt.title}</span></div>
        <div className="conversation-placeholder">
          <div className="placeholder-avatar"><Sparkles size={15} /></div>
          <div className="placeholder-copy"><span>DESIGNROUNDS INTERVIEWER</span><p>“Why did you choose this approach? What alternatives did you consider?”</p><small>Questions will be grounded in the design you build.</small></div>
        </div>
        {selectedName && <div className="selected-context"><span className="selected-context-dot" /><span>Selected in your design</span><strong>{selectedName}</strong></div>}
        <div className="coming-card"><div className="coming-card-top"><Sparkles size={15} /><span>IN DEVELOPMENT</span></div><p>The interviewer is getting ready. For now, focus on building your design and explaining your reasoning.</p></div>
      </div>
      <div className="interviewer-compose"><div className="compose-box"><textarea aria-label="Message to interviewer" placeholder="The conversation starts here…" disabled rows={2} /><div className="compose-bottom"><span>AI interviewer coming soon</span><button disabled aria-label="Send message"><Send size={15} /></button></div></div><div className="panel-privacy"><LockKeyhole size={11} /> Canvas changes save locally; chat isn't active yet.</div></div>
    </aside>
  );
}

function PromptModal({ prompt, onClose }) {
  const [tab, setTab] = useState("brief");
  useEffect(() => {
    const onKeyDown = (event) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="prompt-modal" role="dialog" aria-modal="true" aria-labelledby="prompt-modal-title">
        <div className="modal-header"><div><span className="modal-kicker">{getTrack(prompt.track).label.toUpperCase()} · {prompt.access === "free" ? "FREE ROUND" : "PLUS ROUND"}</span><h2 id="prompt-modal-title">{prompt.title}</h2></div><button className="icon-button" onClick={onClose} aria-label="Close prompt"><X size={19} /></button></div>
        <div className="modal-tabs"><button className={tab === "brief" ? "active" : ""} onClick={() => setTab("brief")}>The brief</button><button className={tab === "approach" ? "active" : ""} onClick={() => setTab("approach")}>A good place to start</button></div>
        {tab === "brief" ? <div className="modal-content"><p className="modal-description">{prompt.description}</p><div className="modal-meta"><span><Clock3 size={14} /> {prompt.minutes} minutes</span><span><Layers2 size={14} /> {prompt.difficulty}</span><span><Network size={14} /> {getTrack(prompt.track).label}</span></div><div className="brief-block"><h3>Requirements to consider</h3><ul>{prompt.requirements.map((requirement) => <li key={requirement}><span><Check size={12} /></span>{requirement}</li>)}</ul></div><div className="expected-outcome"><span>WHAT YOU'RE PRACTICING</span><p>{prompt.expectedOutcome}</p></div><div className="modal-nudge"><Sparkles size={15} /><span>Start by clarifying what matters most: who is using the system, and what does “working well” mean to them?</span></div></div> : <div className="modal-content approach-content"><p>There isn't one right answer. Use the canvas to explore the parts of the system that feel most important.</p><div className="consideration-list">{prompt.considerations.map((item, index) => <div key={item}><span>0{index + 1}</span>{item}</div>)}</div><p className="approach-footnote">These are just starting points—not a checklist. Follow the design where your reasoning takes you.</p></div>}
        <div className="modal-footer"><button className="button button-outline" onClick={onClose}>Back to canvas <ArrowRight size={15} /></button></div>
      </section>
    </div>
  );
}

export default App;
