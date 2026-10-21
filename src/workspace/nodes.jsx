import { createContext, memo, useContext, useEffect, useRef, useState } from "react";
import { BaseEdge, Handle, NodeResizer, Position } from "@xyflow/react";
import { Server, StickyNote } from "lucide-react";
import { getItem } from "./catalog.jsx";
import { routeEdge } from "./diagram.js";

// Lets nodes commit inline edits through the workspace (so they join undo history).
export const CanvasActions = createContext({ commitNodeData: () => {}, readOnly: false });

// Dispatched on window with a node id to start renaming that node (Enter / F2).
export const RENAME_EVENT = "designrounds:rename-node";

const sides = [
  ["top", Position.Top],
  ["right", Position.Right],
  ["bottom", Position.Bottom],
  ["left", Position.Left],
];

function Handles() {
  // With ConnectionMode.Loose every handle can start or end a connection.
  return sides.map(([id, position]) => <Handle key={id} id={id} type="source" position={position} className="node-handle" />);
}

function InlineLabel({ id, value, field = "label", className, multiline = false, placeholder }) {
  const { commitNodeData, readOnly } = useContext(CanvasActions);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef(null);

  useEffect(() => { if (!editing) setDraft(value); }, [value, editing]);
  useEffect(() => { if (editing) { inputRef.current?.focus(); inputRef.current?.select(); } }, [editing]);
  useEffect(() => {
    if (field !== "label" || readOnly) return undefined;
    const onRename = (event) => { if (event.detail === id) setEditing(true); };
    window.addEventListener(RENAME_EVENT, onRename);
    return () => window.removeEventListener(RENAME_EVENT, onRename);
  }, [id, field, readOnly]);

  function finish(save) {
    setEditing(false);
    const next = draft.trim();
    if (save && next !== value && (next || field !== "label")) commitNodeData(id, { [field]: next.slice(0, field === "label" ? 120 : 2000) });
  }

  if (editing) {
    const props = {
      ref: inputRef,
      className: `inline-edit nodrag nopan ${className || ""}`,
      value: draft,
      onChange: (event) => setDraft(event.target.value),
      onBlur: () => finish(true),
      onKeyDown: (event) => {
        event.stopPropagation();
        if (event.key === "Escape") finish(false);
        if (event.key === "Enter" && (!multiline || event.ctrlKey || event.metaKey)) { event.preventDefault(); finish(true); }
      },
    };
    return multiline ? <textarea {...props} rows={3} /> : <input {...props} />;
  }
  return (
    <div className={className} onDoubleClick={readOnly ? undefined : (event) => { event.stopPropagation(); setEditing(true); }} title={readOnly ? undefined : "Double-click to edit"}>
      {value || <span className="inline-placeholder">{placeholder}</span>}
    </div>
  );
}

export const SystemNode = memo(function SystemNode({ id, data, selected }) {
  const item = getItem(data.kind);
  const Icon = item?.icon || Server;
  const color = data.color || item?.color || "blue";
  return (
    <div className={`system-node node-color-${color} ${selected ? "node-selected" : ""} ${item?.tech ? "tech-node" : ""}`}>
      <div className={`system-node-icon icon-${color}`}><Icon size={18} strokeWidth={1.9} /></div>
      <div className="system-node-text">
        <InlineLabel id={id} value={data.label} className="system-node-label" />
        {(data.subtitle || data.label !== item?.label) && <div className="node-subtitle">{data.subtitle || item?.label || "Component"}</div>}
      </div>
      {data.note && <span className="node-note-flag" title={data.note}><StickyNote size={11} /></span>}
      <Handles />
    </div>
  );
});

export const GroupNode = memo(function GroupNode({ id, data, selected }) {
  const color = data.color || "slate";
  return (
    <div className={`group-node node-color-${color} ${selected ? "node-selected" : ""}`}>
      <NodeResizer isVisible={selected} minWidth={160} minHeight={100} lineClassName="group-resize-line" handleClassName="group-resize-handle" />
      <InlineLabel id={id} value={data.label} className={`group-node-label icon-${color}`} />
      {data.subtitle && <div className="group-node-subtitle">{data.subtitle}</div>}
    </div>
  );
});

export const TextNode = memo(function TextNode({ id, data, selected }) {
  return (
    <div className={`text-node ${selected ? "node-selected" : ""}`}>
      <InlineLabel id={id} value={data.label} className="text-node-label" placeholder="Text" />
      <Handles />
    </div>
  );
});

export const NoteNode = memo(function NoteNode({ id, data, selected }) {
  return (
    <div className={`note-node ${selected ? "node-selected" : ""}`}>
      <div className="note-node-head"><StickyNote size={13} /><InlineLabel id={id} value={data.label} className="note-node-title" /></div>
      <InlineLabel id={id} value={data.note || ""} field="note" multiline className="note-node-body" placeholder="Double-click to write the decision, assumption, or trade-off." />
      <Handles />
    </div>
  );
});

// The free end of an arrow dropped on empty canvas. All four handles sit on the dot;
// the arrow picks the side it approaches from. Arrows can end here but not start here,
// so a drag on the dot always moves it.
export const PointNode = memo(function PointNode({ selected }) {
  return (
    <div className={`point-node ${selected ? "node-selected" : ""}`} title="Free arrow end: drag to move">
      {sides.map(([id, position]) => <Handle key={id} id={id} type="source" position={position} isConnectableStart={false} className="point-handle" />)}
    </div>
  );
});

// A right-angled arrow whose segments can be dragged aside (see routeEdge).
export const BendableEdge = memo(function BendableEdge({
  id, sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition, data, style, markerStart, markerEnd, interactionWidth,
  label, labelStyle, labelShowBg, labelBgStyle, labelBgPadding, labelBgBorderRadius,
}) {
  const { path, labelX, labelY } = routeEdge({ sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition }, data?.bend);
  return (
    <BaseEdge id={id} path={path} style={style} markerStart={markerStart} markerEnd={markerEnd} interactionWidth={interactionWidth}
      label={label} labelX={labelX} labelY={labelY} labelStyle={labelStyle} labelShowBg={labelShowBg} labelBgStyle={labelBgStyle}
      labelBgPadding={labelBgPadding} labelBgBorderRadius={labelBgBorderRadius} />
  );
});

export const edgeTypes = { bendable: BendableEdge };

export const nodeTypes = { systemNode: SystemNode, groupNode: GroupNode, textNode: TextNode, noteNode: NoteNode, pointNode: PointNode };
