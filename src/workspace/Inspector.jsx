import { memo, useEffect, useRef, useState } from "react";
import { ArrowLeftRight, ArrowRight, ChevronDown, ChevronUp, Copy, MessageSquare, Plus, Repeat, Server, Trash2, X } from "lucide-react";
import { COLUMN_KEYS, COLUMN_TYPES, DATA_MODEL_KINDS, getItem, nodeColors } from "./catalog.jsx";
import { columnId, columnsFromText, columnsToText, MAX_COLUMNS } from "./columns.js";

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
  loading: "Loading interviewer…",
  plus: "The live interviewer is part of Plus",
  finished: "The interview ends when the round is finished",
};

// One editable column row: name, type, key toggles, and what a foreign key references.
function ColumnRow({ column, index, count, readOnly, onBegin, onPatch, onRemove, onMove, onEnter, nameRef }) {
  const keys = column.keys ?? [];
  const toggle = (key) => { onBegin(); onPatch({ keys: keys.includes(key) ? keys.filter((entry) => entry !== key) : [...keys, key] }); };
  return (
    <li className="column-row">
      <div className="column-row-main">
        <input ref={nameRef} className="column-name-input" value={column.name} placeholder="column_name" maxLength={64} disabled={readOnly} aria-label={`Column ${index + 1} name`}
          onFocus={onBegin} onChange={(event) => onPatch({ name: event.target.value.replace(/\s+/g, "_") })}
          onKeyDown={(event) => { event.stopPropagation(); if (event.key === "Enter") { event.preventDefault(); onEnter(); } }} />
        <input className="column-type-input" list="column-types" value={column.type ?? ""} placeholder="type" maxLength={40} disabled={readOnly} aria-label={`Column ${index + 1} type`}
          onFocus={onBegin} onChange={(event) => onPatch({ type: event.target.value })} onKeyDown={(event) => { event.stopPropagation(); if (event.key === "Enter") { event.preventDefault(); onEnter(); } }} />
        {!readOnly && (
          <span className="column-row-tools">
            <button type="button" className="icon-button" title="Move up" aria-label={`Move column ${index + 1} up`} disabled={index === 0} onClick={() => onMove(-1)}><ChevronUp size={13} /></button>
            <button type="button" className="icon-button" title="Move down" aria-label={`Move column ${index + 1} down`} disabled={index === count - 1} onClick={() => onMove(1)}><ChevronDown size={13} /></button>
            <button type="button" className="icon-button danger-text" title="Remove column" aria-label={`Remove column ${index + 1}`} onClick={onRemove}><X size={13} /></button>
          </span>
        )}
      </div>
      <div className="column-keys">
        {COLUMN_KEYS.map((key) => (
          <button type="button" key={key.id} className={`column-key-toggle key-${key.id} ${keys.includes(key.id) ? "on" : ""}`} aria-pressed={keys.includes(key.id)} title={key.title} disabled={readOnly} onClick={() => toggle(key.id)}>{key.label}</button>
        ))}
        {keys.includes("fk") && (
          <input className="column-ref-input" value={column.ref ?? ""} placeholder="references table.column" maxLength={120} disabled={readOnly} aria-label={`Column ${index + 1} references`}
            onFocus={onBegin} onChange={(event) => onPatch({ ref: event.target.value })} onKeyDown={(event) => event.stopPropagation()} />
        )}
      </div>
    </li>
  );
}

// Columns of a data model table: a row editor, or the same columns as lines of text
// ("order_id bigint pk"), which is quicker for typing or pasting a whole schema.
function ColumnsEditor({ columns, readOnly, onBegin, onSet }) {
  const [asText, setAsText] = useState(false);
  const [draft, setDraft] = useState("");
  const [focusIndex, setFocusIndex] = useState(null);
  const nameRefs = useRef([]);
  useEffect(() => {
    if (focusIndex === null) return;
    nameRefs.current[focusIndex]?.focus();
    setFocusIndex(null);
  }, [focusIndex, columns.length]);

  const patch = (index, change) => onSet(columns.map((column, at) => (at === index ? { ...column, ...change } : column)));
  const add = (at = columns.length) => {
    if (columns.length >= MAX_COLUMNS) return;
    onBegin();
    onSet([...columns.slice(0, at), { id: columnId(), name: "", type: "", keys: [] }, ...columns.slice(at)]);
    setFocusIndex(at);
  };
  const move = (index, step) => {
    const next = [...columns];
    const [column] = next.splice(index, 1);
    next.splice(index + step, 0, column);
    onBegin();
    onSet(next);
  };
  const openText = () => { setDraft(columnsToText(columns)); setAsText(true); };
  const applyText = () => { onBegin(); onSet(columnsFromText(draft)); setAsText(false); };

  return (
    <div className="inspector-field columns-editor">
      <div className="columns-editor-head">
        <span>Columns <span className="count-badge">{columns.length}</span></span>
        {!readOnly && <button type="button" className="link-button" onClick={asText ? applyText : openText}>{asText ? "Done" : "Edit as text"}</button>}
      </div>
      {asText ? (
        <>
          <textarea className="columns-text" rows={Math.min(14, Math.max(5, columns.length + 2))} value={draft} autoFocus spellCheck={false}
            placeholder={"order_id bigint pk\ncustomer_id bigint fk -> customers.id\norder_date date part\namount decimal(12,2)"}
            onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => { event.stopPropagation(); if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) applyText(); }} />
          <p className="columns-help">One column per line: name, type, then any keys (pk, fk, partition, sort). Write <code>-&gt; table.column</code> for what a foreign key references.</p>
        </>
      ) : (
        <>
          {columns.length ? (
            <ul className="column-list">
              {columns.map((column, index) => (
                <ColumnRow key={column.id ?? index} column={column} index={index} count={columns.length} readOnly={readOnly} onBegin={onBegin}
                  nameRef={(element) => { nameRefs.current[index] = element; }}
                  onPatch={(change) => patch(index, change)} onRemove={() => { onBegin(); onSet(columns.filter((_, at) => at !== index)); }}
                  onMove={(step) => move(index, step)} onEnter={() => (index === columns.length - 1 ? add() : nameRefs.current[index + 1]?.focus())} />
              ))}
            </ul>
          ) : <p className="columns-help">No columns yet. Add the key columns first, then the ones your queries need.</p>}
          {!readOnly && <button type="button" className="button button-outline button-small columns-add" disabled={columns.length >= MAX_COLUMNS} onClick={() => add()}><Plus size={13} /> Add column</button>}
        </>
      )}
      <datalist id="column-types">{COLUMN_TYPES.map((type) => <option key={type} value={type} />)}</datalist>
    </div>
  );
}

export const NodeInspector = memo(function NodeInspector({ id, type, data, readOnly, onBegin, onChange, onDuplicate, onDelete, onClose, ask = "plus", onAsk }) {
  const item = getItem(data.kind);
  const Icon = item?.icon || Server;
  const color = data.color || item?.color || "blue";
  const canRecolor = !item?.tech;
  const set = (field) => (value) => onChange(id, { [field]: value });
  const isNote = type === "noteNode";
  const isText = type === "textNode";
  const isTable = type === "tableNode";

  return (
    <aside className={`inspector ${isTable ? "inspector-table" : ""}`} aria-label={isTable ? "Selected table" : "Selected component"}>
      <div className="inspector-head">
        <span className={`inspector-icon ${item?.tech ? "tech" : `icon-${color}`}`}><Icon size={16} /></span>
        <div><span className="inspector-kicker">{type === "groupNode" ? "ZONE" : isNote ? "DECISION NOTE" : isText ? "TEXT" : isTable ? "DATA MODEL" : "COMPONENT"}</span><strong>{item?.label || "Component"}</strong></div>
        <button className="icon-button" onClick={onClose} aria-label="Close inspector"><X size={15} /></button>
      </div>
      <div className="inspector-body">
        <Field label={isText ? "Text" : isNote ? "Title" : isTable ? "Table name" : "Name"} value={data.label} onBegin={onBegin} onChange={set("label")} maxLength={120} disabled={readOnly} />
        {isTable && (
          <>
            <label className="inspector-field">
              <span>Kind</span>
              <select value={data.kind} disabled={readOnly} onFocus={onBegin} onChange={(event) => onChange(id, { kind: event.target.value })} onKeyDown={(event) => event.stopPropagation()}>
                {DATA_MODEL_KINDS.map((kind) => <option key={kind} value={kind}>{getItem(kind).label}</option>)}
              </select>
            </label>
            <Field label="Grain or description" value={data.subtitle} onBegin={onBegin} onChange={set("subtitle")} maxLength={120} disabled={readOnly}
              placeholder={data.kind === "fact-table" ? "e.g. one row per order line" : data.kind === "event-schema" ? "e.g. topic orders, keyed by order_id" : "e.g. one row per customer version"} />
            <ColumnsEditor columns={data.columns ?? []} readOnly={readOnly} onBegin={onBegin} onSet={(columns) => onChange(id, { columns })} />
          </>
        )}
        {!isNote && !isText && !isTable && (
          <Field label={type === "groupNode" ? "Description" : "Technology / details"} value={data.subtitle} onBegin={onBegin} onChange={set("subtitle")} maxLength={120} disabled={readOnly}
            placeholder={type === "groupNode" ? "e.g. us-east-1, private subnet" : "e.g. PostgreSQL, 3 replicas"} />
        )}
        {!isText && (
          <Field label={isNote ? "Note" : "Why this choice?"} value={data.note} onBegin={onBegin} onChange={set("note")} multiline maxLength={2000} disabled={readOnly}
            placeholder={isNote ? "Assumption, decision, or open question." : "Rationale, trade-offs, alternatives you considered…"} />
        )}
        {canRecolor && !isNote && !isTable && !readOnly && (
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
        <button type="button" className={`inspector-ask${ask === "available" ? " button button-outline button-small" : ""}`} disabled={ask !== "available"} title={ASK_TITLES[ask] ?? ASK_TITLES.plus} onClick={onAsk}><MessageSquare size={14} /> Ask the interviewer about this</button>
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

const RELATIONSHIPS = ["1:1", "1:N", "N:1", "N:M"];

export const EdgeInspector = memo(function EdgeInspector({ edge, sourceLabel, targetLabel, readOnly, focusLabel, betweenTables = false, onBegin, onChange, onReverse, onDelete, onClose }) {
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
        <Field label="Label" inputRef={labelRef} value={edge.label} onBegin={onBegin} onChange={(value) => onChange(edge.id, { label: value })} maxLength={80} disabled={readOnly}
          placeholder={betweenTables ? "e.g. 1:N on customer_id" : "e.g. writes, HTTPS, order.created"} />
        {betweenTables && (
          <div className="inspector-field">
            <span>Relationship</span>
            <div className="segmented small">
              {RELATIONSHIPS.map((relation) => (
                <button key={relation} disabled={readOnly} className={edge.label?.startsWith(relation) ? "selected" : ""} title={`${sourceLabel} to ${targetLabel}: ${relation}`}
                  onClick={() => { onBegin(); onChange(edge.id, { label: `${relation}${edge.label?.replace(/^(1:1|1:N|N:1|N:M)/, "") ?? ""}` }); }}>{relation}</button>
              ))}
            </div>
          </div>
        )}
        {!betweenTables && <div className="inspector-field">
          <span>Interaction</span>
          <div className="segmented small">
            <button disabled={readOnly} className={style === "sync" ? "selected" : ""} onClick={() => { onBegin(); onChange(edge.id, { data: { style: "sync" } }); }}>Sync (solid)</button>
            <button disabled={readOnly} className={style === "async" ? "selected" : ""} onClick={() => { onBegin(); onChange(edge.id, { data: { style: "async" } }); }}>Async (dashed)</button>
          </div>
        </div>}
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
            {edge.data?.bend && <button className="button button-outline button-small" onClick={() => { onBegin(); onChange(edge.id, { data: { bend: undefined } }); }}>Straighten</button>}
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
