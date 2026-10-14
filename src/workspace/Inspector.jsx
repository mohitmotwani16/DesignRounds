import { memo, useEffect, useRef } from "react";
import { ArrowLeftRight, ArrowRight, Copy, MessageSquare, Repeat, Server, Trash2, X } from "lucide-react";
import { getItem, nodeColors } from "./catalog.jsx";

// Field edits record one undo step when the field gains focus, then update live.
function Field({ label, value, onChange, onBegin, placeholder, multiline, maxLength, inputRef, disabled }) {
  const Tag = multiline ? "textarea" : "input";
  return (
    <label className="inspector-field">
      <span>{label}</span>
      <Tag ref={inputRef} value={value || ""} placeholder={placeholder} maxLength={maxLength} rows={multiline ? 4 : undefined} disabled={disabled}
        onFocus={onBegin} onChange={(event) => onChange(event.target.value)} onKeyDown={(event) => event.stopPropagation()} />
    </label>
  );
}

const ASK_TITLES = {
  available: "Ask the interviewer about this component",
  plus: "The live interviewer is part of Plus",
  finished: "The interview ends when the round is finished",
};

export const NodeInspector = memo(function NodeInspector({ id, type, data, readOnly, onBegin, onChange, onDuplicate, onDelete, onClose, ask = "plus", onAsk }) {
  const item = getItem(data.kind);
  const Icon = item?.icon || Server;
  const color = data.color || item?.color || "blue";
  const canRecolor = !item?.tech;
  const set = (field) => (value) => onChange(id, { [field]: value });
  const isNote = type === "noteNode";
  const isText = type === "textNode";

  return (
    <aside className="inspector" aria-label="Selected component">
      <div className="inspector-head">
        <span className={`inspector-icon ${item?.tech ? "tech" : `icon-${color}`}`}><Icon size={16} /></span>
        <div><span className="inspector-kicker">{type === "groupNode" ? "ZONE" : isNote ? "DECISION NOTE" : isText ? "TEXT" : "COMPONENT"}</span><strong>{item?.label || "Component"}</strong></div>
        <button className="icon-button" onClick={onClose} aria-label="Close inspector"><X size={15} /></button>
      </div>
      <div className="inspector-body">
        <Field label={isText ? "Text" : isNote ? "Title" : "Name"} value={data.label} onBegin={onBegin} onChange={set("label")} maxLength={120} disabled={readOnly} />
        {!isNote && !isText && (
          <Field label={type === "groupNode" ? "Description" : "Technology / details"} value={data.subtitle} onBegin={onBegin} onChange={set("subtitle")} maxLength={120} disabled={readOnly}
            placeholder={type === "groupNode" ? "e.g. us-east-1, private subnet" : "e.g. PostgreSQL, 3 replicas"} />
        )}
        {!isText && (
          <Field label={isNote ? "Note" : "Why this choice?"} value={data.note} onBegin={onBegin} onChange={set("note")} multiline maxLength={2000} disabled={readOnly}
            placeholder={isNote ? "Assumption, decision, or open question." : "Rationale, trade-offs, alternatives you considered…"} />
        )}
        {canRecolor && !isNote && !readOnly && (
          <div className="inspector-field">
            <span>Color</span>
            <div className="swatches">
              {nodeColors.map((swatch) => (
                <button key={swatch} className={`swatch swatch-${swatch} ${swatch === color ? "selected" : ""}`} aria-label={`Color ${swatch}`} aria-pressed={swatch === color}
                  onClick={() => { onBegin(); onChange(id, { color: swatch }); }} />
              ))}
            </div>
          </div>
        )}
      </div>
      <div className="inspector-actions">
        <button className="inspector-ask" disabled={ask !== "available"} title={ASK_TITLES[ask]} onClick={onAsk}><MessageSquare size={14} /> Ask the interviewer about this</button>
        {!readOnly && (
          <div className="inspector-row">
            <button className="button button-outline button-small" onClick={onDuplicate}><Copy size={13} /> Duplicate</button>
            <button className="button button-outline button-small danger-text" onClick={onDelete}><Trash2 size={13} /> Delete</button>
          </div>
        )}
      </div>
    </aside>
  );
});

export const EdgeInspector = memo(function EdgeInspector({ edge, sourceLabel, targetLabel, readOnly, focusLabel, onBegin, onChange, onReverse, onDelete, onClose }) {
  const labelRef = useRef(null);
  const style = edge.data?.style || "sync";
  const bidirectional = Boolean(edge.data?.bidirectional);
  useEffect(() => { if (focusLabel) labelRef.current?.focus(); }, [focusLabel]);

  return (
    <aside className="inspector" aria-label="Selected connection">
      <div className="inspector-head">
        <span className="inspector-icon icon-slate">{bidirectional ? <ArrowLeftRight size={16} /> : <ArrowRight size={16} />}</span>
        <div><span className="inspector-kicker">CONNECTION</span><strong className="inspector-edge-path">{sourceLabel} → {targetLabel}</strong></div>
        <button className="icon-button" onClick={onClose} aria-label="Close inspector"><X size={15} /></button>
      </div>
      <div className="inspector-body">
        <Field label="Label" inputRef={labelRef} value={edge.label} onBegin={onBegin} onChange={(value) => onChange(edge.id, { label: value })} maxLength={80} disabled={readOnly} placeholder="e.g. writes, HTTPS, order.created" />
        <div className="inspector-field">
          <span>Interaction</span>
          <div className="segmented small">
            <button disabled={readOnly} className={style === "sync" ? "selected" : ""} onClick={() => { onBegin(); onChange(edge.id, { data: { style: "sync" } }); }}>Sync (solid)</button>
            <button disabled={readOnly} className={style === "async" ? "selected" : ""} onClick={() => { onBegin(); onChange(edge.id, { data: { style: "async" } }); }}>Async (dashed)</button>
          </div>
        </div>
        <div className="inspector-field">
          <span>Direction</span>
          <div className="segmented small">
            <button disabled={readOnly} className={!bidirectional ? "selected" : ""} onClick={() => { onBegin(); onChange(edge.id, { data: { bidirectional: false } }); }}>One-way</button>
            <button disabled={readOnly} className={bidirectional ? "selected" : ""} onClick={() => { onBegin(); onChange(edge.id, { data: { bidirectional: true } }); }}>Two-way</button>
          </div>
        </div>
      </div>
      {!readOnly && (
        <div className="inspector-actions">
          <div className="inspector-row">
            <button className="button button-outline button-small" onClick={onReverse}><Repeat size={13} /> Reverse</button>
            <button className="button button-outline button-small danger-text" onClick={onDelete}><Trash2 size={13} /> Delete</button>
          </div>
        </div>
      )}
    </aside>
  );
});

export function MultiInspector({ count, readOnly, onDuplicate, onDelete, onClose }) {
  return (
    <aside className="inspector inspector-compact" aria-label="Selection">
      <div className="inspector-head">
        <div><span className="inspector-kicker">SELECTION</span><strong>{count} items selected</strong></div>
        <button className="icon-button" onClick={onClose} aria-label="Clear selection"><X size={15} /></button>
      </div>
      {!readOnly && (
        <div className="inspector-actions">
          <div className="inspector-row">
            <button className="button button-outline button-small" onClick={onDuplicate}><Copy size={13} /> Duplicate</button>
            <button className="button button-outline button-small danger-text" onClick={onDelete}><Trash2 size={13} /> Delete</button>
          </div>
        </div>
      )}
    </aside>
  );
}
