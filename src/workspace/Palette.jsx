import { memo, useMemo, useState } from "react";
import { ChevronRight, Search, Server, X } from "lucide-react";
import { catalog, componentCount, getItem, searchItems, shapeItems, techCatalog } from "./catalog.jsx";

export const DRAG_TYPE = "application/designrounds-node";
const EXPANDED_KEY = "designrounds:palette-expanded";
const defaultExpanded = { shapes: true, clients: true, network: true, compute: true, databases: true, cache: true, messaging: true, storage: true };

function readExpanded() {
  try {
    return { ...defaultExpanded, ...JSON.parse(window.localStorage.getItem(EXPANDED_KEY) || "{}") };
  } catch {
    return defaultExpanded;
  }
}

const Tile = memo(function Tile({ item, onAdd, disabled }) {
  const Icon = item.icon;
  return (
    <button
      className="palette-tile"
      draggable={!disabled}
      disabled={disabled}
      title={`${item.label}${item.tech ? " (technology)" : ""}: click to add or drag onto the canvas`}
      onDragStart={(event) => { event.dataTransfer.setData(DRAG_TYPE, item.kind); event.dataTransfer.effectAllowed = "copy"; }}
      onClick={() => onAdd(item)}
    >
      <span className={`palette-tile-icon ${item.tech ? "tech" : `icon-${item.color}`}`}><Icon size={18} strokeWidth={1.8} /></span>
      <span className="palette-tile-label">{item.label}</span>
    </button>
  );
});

function Section({ id, label, items, expanded, onToggle, onAdd, disabled }) {
  const open = Boolean(expanded[id]);
  return (
    <section className="palette-section">
      <button className="palette-section-head" onClick={() => onToggle(id)} aria-expanded={open}>
        <ChevronRight size={13} className={open ? "rotated" : ""} />
        <span>{label}</span>
        <span className="palette-section-count">{items.length}</span>
      </button>
      {open && <div className="palette-grid">{items.map((item) => <Tile key={item.kind} item={item} onAdd={onAdd} disabled={disabled} />)}</div>}
    </section>
  );
}

export const Palette = memo(function Palette({ onAdd, disabled, outline, selectedIds, onFocusNode }) {
  const [tab, setTab] = useState("library");
  const [term, setTerm] = useState("");
  const [expanded, setExpanded] = useState(readExpanded);
  const results = useMemo(() => searchItems(term), [term]);

  function toggle(id) {
    setExpanded((current) => {
      const next = { ...current, [id]: !current[id] };
      try { window.localStorage.setItem(EXPANDED_KEY, JSON.stringify(next)); } catch { /* preference only */ }
      return next;
    });
  }

  return (
    <aside className="component-sidebar" aria-label="Component library">
      <div className="sidebar-tabs" role="tablist">
        <button role="tab" aria-selected={tab === "library"} className={tab === "library" ? "active" : ""} onClick={() => setTab("library")}>Components</button>
        <button role="tab" aria-selected={tab === "outline"} className={tab === "outline" ? "active" : ""} onClick={() => setTab("outline")}>Outline <span className="count-badge">{outline.length}</span></button>
      </div>

      {tab === "library" ? (
        <>
          <label className="palette-search">
            <Search size={15} />
            <input placeholder={`Search ${componentCount} components…`} aria-label="Search components" value={term} onChange={(event) => setTerm(event.target.value)} />
            {term && <button onClick={() => setTerm("")} aria-label="Clear search"><X size={14} /></button>}
          </label>
          <div className="palette-scroll">
            {term ? (
              results.length ? (
                <div className="palette-grid palette-results">{results.map((item) => <Tile key={item.kind} item={item} onAdd={onAdd} disabled={disabled} />)}</div>
              ) : (
                <p className="palette-empty">No components match “{term}”. Try a broader term like “database” or “queue”, or add a generic Service and rename it.</p>
              )
            ) : (
              <>
                <Section id="shapes" label="Shapes & annotations" items={shapeItems} expanded={expanded} onToggle={toggle} onAdd={onAdd} disabled={disabled} />
                {catalog.map((group) => <Section key={group.id} id={group.id} label={group.label} items={group.items} expanded={expanded} onToggle={toggle} onAdd={onAdd} disabled={disabled} />)}
                <div className="palette-divider-label">Technologies</div>
                {techCatalog.map((group) => <Section key={group.id} id={group.id} label={group.label} items={group.items} expanded={expanded} onToggle={toggle} onAdd={onAdd} disabled={disabled} />)}
              </>
            )}
          </div>
          <div className="palette-hint">{disabled ? "This round is read-only." : "Click to add · drag to place · double-click a node to rename"}</div>
        </>
      ) : (
        <div className="palette-scroll design-outline">
          {outline.length ? outline.map((node) => {
            const Icon = getItem(node.kind)?.icon || Server;
            return (
              <button key={node.id} className={`outline-item ${selectedIds.has(node.id) ? "outline-selected" : ""}`} onClick={() => onFocusNode(node.id)}>
                <Icon size={14} /><span>{node.label || "Untitled"}</span>
              </button>
            );
          }) : <div className="outline-empty">Nothing on the canvas yet. Add a component to start shaping your design.</div>}
        </div>
      )}
    </aside>
  );
});
