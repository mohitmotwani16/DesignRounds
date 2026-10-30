// Diagrams for Learn topics, drawn as inline SVG from small specs so every topic shares
// one visual language and both themes (colours come from CSS variables).
//
//   flow:     nodes on a grid { id, label, sub?, col, row, shape?: box|db|queue|pill, tone?, w? }
//             edges { from, to, label?, dashed?, both?, bend?, tone? }   zones { label, from: [c, r], to: [c, r], tone? }
//   sequence: actors [names], steps { from, to, label, dashed? } | { note, over: [i, j?] }
//   ring:     nodes { label, angle, tone? } (degrees clockwise from the top), keys { label, angle }
//   timeline: ticks [labels], spans { from, to, label, lane?, tone? } (positions in tick units),
//             events { at, tone?, label? }, marks { at, label, tone? }, gaps { from, to, label }
//   tree:     root { label, sub?, tone?, edge?, children? } (edge labels the link from its parent)
//   bars:     values { label, value, display?, tone? }, log? (log scale), unit?
//   segments: lanes { label?, parts { label, size, sub?, tone? } }, total? (shared scale), width?
//
// tone: accent | store | cache | queue | ok | danger | muted

import { MOBILE_MEDIA, useMediaQuery } from "../useMediaQuery.js";

const COL = 180;
const ROW = 100;
const PAD = 24;
const NODE_W = 140;
const NODE_H = 48;

const textWidth = (text, size = 12) => text.length * size * 0.56 + 12;

export function Diagram({ spec }) {
  const Kind = KINDS[spec.kind] ?? Flow;
  const content = <Kind spec={spec} />;
  return (
    <figure className="dg">
      <div className="dg-scroll">{content}</div>
      {spec.caption && <figcaption>{spec.caption}</figcaption>}
    </figure>
  );
}

function Markers({ id }) {
  return (
    <defs>
      {["default", "accent", "danger"].map((tone) => (
        <marker key={tone} id={`${id}-arrow-${tone}`} viewBox="0 0 10 10" refX="8.5" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0,0 L10,5 L0,10 z" className={`dg-arrowhead dg-arrowhead-${tone}`} />
        </marker>
      ))}
    </defs>
  );
}

let diagramCount = 0;
const markerId = (spec) => {
  if (!spec.__id) Object.defineProperty(spec, "__id", { value: `dg${(diagramCount += 1)}`, enumerable: false });
  return spec.__id;
};

function EdgeLabel({ x, y, text }) {
  const width = textWidth(text, 11.5);
  return (
    <g className="dg-edge-label">
      <rect x={x - width / 2} y={y - 10} width={width} height={20} rx={6} />
      <text x={x} y={y + 4} textAnchor="middle">{text}</text>
    </g>
  );
}

// ---------------------------------------------------------------- flow

function flowForViewport(spec, mobile) {
  if (!mobile || spec.mobileLayout === "keep") return spec;
  const maxCol = Math.max(...spec.nodes.map((node) => node.col));
  const maxRow = Math.max(...spec.nodes.map((node) => node.row));
  const minCol = Math.min(...spec.nodes.map((node) => node.col));
  const minRow = Math.min(...spec.nodes.map((node) => node.row));
  const colSpan = maxCol - minCol;
  const rowSpan = maxRow - minRow;
  const widerThanTall = colSpan > rowSpan || (colSpan === rowSpan && colSpan > 0.5);
  if (!widerThanTall) return spec;
  const flip = (pair) => [pair[1], pair[0]];
  return {
    ...spec,
    nodes: spec.nodes.map((node) => ({ ...node, col: node.row, row: node.col })),
    zones: spec.zones?.map((zone) => ({ ...zone, from: flip(zone.from), to: flip(zone.to) })),
  };
}

function Flow({ spec }) {
  const mobile = useMediaQuery(MOBILE_MEDIA);
  const layout = flowForViewport(spec, mobile);
  const id = markerId(layout);
  const zoneSpace = spec.zones?.length ? 16 : 0;
  // Boxes grow to fit their text, so a long label never spills over the border.
  const sized = new Map(layout.nodes.map((node) => {
    const padding = node.shape === "queue" ? 40 : node.shape === "pill" ? 30 : 24;
    const w = Math.max(node.w ?? NODE_W, textWidth(node.label, 13.5) + padding, node.sub ? textWidth(node.sub, 11) + padding : 0);
    return [node.id, { ...node, w, h: node.h ?? NODE_H }];
  }));
  // Columns widen until every near-horizontal edge label fits between its two boxes
  // (labels on diagonal or vertical edges sit in open space between rows).
  let colW = COL;
  for (const edge of layout.edges ?? []) {
    const a = sized.get(edge.from);
    const b = sized.get(edge.to);
    if (!edge.label || edge.bend || !a || !b) continue;
    const dc = Math.abs(b.col - a.col);
    if (dc === 0 || Math.abs(b.row - a.row) > 0.35) continue;
    colW = Math.max(colW, ((a.w + b.w) / 2 + textWidth(edge.label, 11.5) + 22) / dc);
  }
  // Wide boxes in the first column (and the zones around them) can reach past the left
  // edge, so shift everything right until the leftmost box clears the padding.
  const leftmost = Math.min(...[...sized.values()].map((node) => PAD + node.col * colW + colW / 2 - node.w / 2));
  const shift = Math.max(0, PAD + (layout.zones?.length ? 18 : 0) - leftmost);
  const nodes = new Map([...sized.values()].map((node) => [node.id, { ...node, x: shift + PAD + node.col * colW + colW / 2, y: PAD + zoneSpace + node.row * ROW + ROW / 2 }]));
  const cols = Math.max(...layout.nodes.map((node) => node.col)) + 1;
  const rows = Math.max(...layout.nodes.map((node) => node.row)) + 1;
  const rightmost = Math.max(...[...nodes.values()].map((node) => node.x + node.w / 2));
  const width = layout.width ?? Math.max(PAD * 2 + shift + cols * colW, rightmost + PAD + 18);
  const height = layout.height ?? PAD * 2 + zoneSpace + rows * ROW;
  const svgStyle = mobile
    ? { width: "100%", maxWidth: "100%", minWidth: 0 }
    : { minWidth: Math.min(width, 560), maxWidth: width };

  return (
    <svg viewBox={`0 0 ${width} ${height}`} style={svgStyle} role="img" aria-label={layout.alt ?? layout.caption}>
      <Markers id={id} />
      {layout.zones?.map((zone) => <Zone key={zone.label} zone={zone} zoneSpace={zoneSpace} nodes={[...nodes.values()]} />)}
      {layout.edges?.map((edge, index) => <FlowEdge key={index} edge={edge} from={nodes.get(edge.from)} to={nodes.get(edge.to)} id={id} />)}
      {[...nodes.values()].map((node) => <Node key={node.id} node={node} />)}
    </svg>
  );
}

// A zone wraps the nodes whose grid positions fall inside it, using their real sizes.
function Zone({ zone, zoneSpace, nodes }) {
  const [c1, r1] = zone.from;
  const [c2, r2] = zone.to;
  const inside = nodes.filter((node) => node.col >= c1 && node.col <= c2 && node.row >= r1 && node.row <= r2);
  const left = inside.length ? Math.min(...inside.map((node) => node.x - node.w / 2)) : PAD + c1 * COL + (COL - NODE_W) / 2;
  const right = inside.length ? Math.max(...inside.map((node) => node.x + node.w / 2)) : PAD + c2 * COL + (COL + NODE_W) / 2;
  const top = inside.length ? Math.min(...inside.map((node) => node.y - node.h / 2)) : PAD + zoneSpace + r1 * ROW + (ROW - NODE_H) / 2;
  const bottom = inside.length ? Math.max(...inside.map((node) => node.y + node.h / 2)) : PAD + zoneSpace + r2 * ROW + (ROW + NODE_H) / 2;
  const x = left - 18;
  const y = top - 30;
  const w = right - left + 36;
  const h = bottom - top + 48;
  return (
    <g className={`dg-zone dg-tone-${zone.tone ?? "muted"}`}>
      <rect x={x} y={y} width={w} height={h} rx={14} />
      <text x={x + 12} y={y + 17}>{zone.label}</text>
    </g>
  );
}

function Node({ node }) {
  const { x, y, w, h } = node;
  const x0 = x - w / 2;
  const y0 = y - h / 2;
  const shape = node.shape ?? "box";
  let body;
  if (shape === "db") {
    const e = 7;
    body = (
      <>
        <path d={`M${x0},${y0 + e} A${w / 2},${e} 0 0 1 ${x0 + w},${y0 + e} L${x0 + w},${y0 + h - e} A${w / 2},${e} 0 0 1 ${x0},${y0 + h - e} Z`} />
        <ellipse cx={x} cy={y0 + e} rx={w / 2} ry={e} />
      </>
    );
  } else if (shape === "queue") {
    body = (
      <>
        <rect x={x0} y={y0} width={w} height={h} rx={8} />
        {[0, 1, 2].map((i) => <line key={i} className="dg-slot" x1={x0 + w - 12 - i * 9} y1={y0 + 8} x2={x0 + w - 12 - i * 9} y2={y0 + h - 8} />)}
      </>
    );
  } else {
    body = <rect x={x0} y={y0} width={w} height={h} rx={shape === "pill" ? h / 2 : 10} />;
  }
  const labelY = shape === "db" ? y + 4 : y;
  return (
    <g className={`dg-node dg-tone-${node.tone ?? "default"}`}>
      {body}
      {node.sub ? (
        <>
          <text x={shape === "queue" ? x - 12 : x} y={labelY - 3} textAnchor="middle" className="dg-label">{node.label}</text>
          <text x={shape === "queue" ? x - 12 : x} y={labelY + 13} textAnchor="middle" className="dg-sub">{node.sub}</text>
        </>
      ) : (
        <text x={shape === "queue" ? x - 12 : x} y={labelY + 4.5} textAnchor="middle" className="dg-label">{node.label}</text>
      )}
    </g>
  );
}

// Where the line from a node's centre towards (dx, dy) leaves its box, plus a small gap.
function exitPoint(node, dx, dy, gap = 3) {
  const length = Math.hypot(dx, dy) || 1;
  const t = Math.min((node.w / 2) / (Math.abs(dx) || 1e-9), (node.h / 2) / (Math.abs(dy) || 1e-9));
  return { x: node.x + dx * t + (dx / length) * gap, y: node.y + dy * t + (dy / length) * gap };
}

function FlowEdge({ edge, from, to, id }) {
  if (!from || !to) return null;
  const tone = edge.tone === "accent" || edge.tone === "danger" ? edge.tone : "default";
  const bend = edge.bend ?? 0;
  const mx = (from.x + to.x) / 2;
  const my = (from.y + to.y) / 2;
  const length = Math.hypot(to.x - from.x, to.y - from.y) || 1;
  const control = { x: mx - ((to.y - from.y) / length) * bend, y: my + ((to.x - from.x) / length) * bend };
  const start = exitPoint(from, control.x - from.x, control.y - from.y);
  const end = exitPoint(to, control.x - to.x, control.y - to.y, 5);
  const d = bend ? `M${start.x},${start.y} Q${control.x},${control.y} ${end.x},${end.y}` : `M${start.x},${start.y} L${end.x},${end.y}`;
  const label = bend
    ? { x: 0.25 * start.x + 0.5 * control.x + 0.25 * end.x, y: 0.25 * start.y + 0.5 * control.y + 0.25 * end.y }
    : { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 };
  return (
    <g className={`dg-edge dg-edge-${tone}`}>
      <path d={d} fill="none" strokeDasharray={edge.dashed ? "6 5" : undefined} markerEnd={`url(#${id}-arrow-${tone})`} markerStart={edge.both ? `url(#${id}-arrow-${tone})` : undefined} />
      {edge.label && <EdgeLabel x={label.x} y={label.y} text={edge.label} />}
    </g>
  );
}

// ---------------------------------------------------------------- sequence

const SEQ_COL = 190;
const SEQ_STEP = 44;

function Sequence({ spec }) {
  const id = markerId(spec);
  const headerH = 40;
  const top = PAD + headerH;
  const width = PAD * 2 + spec.actors.length * SEQ_COL;
  const height = top + 24 + spec.steps.length * SEQ_STEP + 16;
  const xOf = (index) => PAD + index * SEQ_COL + SEQ_COL / 2;
  return (
    <svg viewBox={`0 0 ${width} ${height}`} style={{ minWidth: Math.min(width, 560), maxWidth: width }} role="img" aria-label={spec.alt ?? spec.caption}>
      <Markers id={id} />
      {spec.actors.map((actor, index) => (
        <g key={actor} className="dg-node dg-tone-accent">
          <line className="dg-lifeline" x1={xOf(index)} y1={top} x2={xOf(index)} y2={height - 10} />
          <rect x={xOf(index) - 70} y={PAD} width={140} height={headerH - 6} rx={10} />
          <text x={xOf(index)} y={PAD + 22} textAnchor="middle" className="dg-label">{actor}</text>
        </g>
      ))}
      {spec.steps.map((step, index) => {
        const y = top + 28 + index * SEQ_STEP;
        if (step.note) {
          const [a, b = a] = step.over;
          const x1 = xOf(Math.min(a, b)) - 78;
          const x2 = xOf(Math.max(a, b)) + 78;
          return (
            <g key={index} className="dg-note">
              <rect x={x1} y={y - 15} width={x2 - x1} height={26} rx={6} />
              <text x={(x1 + x2) / 2} y={y + 2} textAnchor="middle">{step.note}</text>
            </g>
          );
        }
        const tone = step.tone === "accent" || step.tone === "danger" ? step.tone : "default";
        if (step.from === step.to) {
          const x = xOf(step.from);
          return (
            <g key={index} className={`dg-edge dg-edge-${tone}`}>
              <path d={`M${x},${y - 8} h36 v16 h-34`} fill="none" markerEnd={`url(#${id}-arrow-${tone})`} />
              <text x={x + 44} y={y + 4} className="dg-seq-label">{step.label}</text>
            </g>
          );
        }
        const x1 = xOf(step.from);
        const x2 = xOf(step.to);
        const direction = Math.sign(x2 - x1);
        return (
          <g key={index} className={`dg-edge dg-edge-${tone}`}>
            <path d={`M${x1 + direction * 3},${y} L${x2 - direction * 5},${y}`} fill="none" strokeDasharray={step.dashed ? "6 5" : undefined} markerEnd={`url(#${id}-arrow-${tone})`} />
            <text x={(x1 + x2) / 2} y={y - 7} textAnchor="middle" className="dg-seq-label">{step.label}</text>
          </g>
        );
      })}
    </svg>
  );
}

// ---------------------------------------------------------------- ring

function Ring({ spec }) {
  const id = markerId(spec);
  const width = 560;
  const height = 360;
  const cx = width / 2;
  const cy = height / 2;
  const r = 120;
  const point = (angle, radius = r) => {
    const radians = ((angle - 90) * Math.PI) / 180;
    return { x: cx + radius * Math.cos(radians), y: cy + radius * Math.sin(radians) };
  };
  const nodes = [...spec.nodes].sort((a, b) => a.angle - b.angle);
  const owner = (angle) => nodes.find((node) => node.angle >= angle) ?? nodes[0];
  return (
    <svg viewBox={`0 0 ${width} ${height}`} style={{ minWidth: 420, maxWidth: width }} role="img" aria-label={spec.alt ?? spec.caption}>
      <Markers id={id} />
      <circle className="dg-ring" cx={cx} cy={cy} r={r} />
      {spec.keys?.map((key) => {
        const target = owner(key.angle);
        const sweep = (target.angle - key.angle + 360) % 360;
        const from = point(key.angle, r - 16);
        const to = point(target.angle - Math.min(6, sweep / 3), r - 16);
        return (
          <g key={key.label} className="dg-edge dg-edge-accent">
            <path d={`M${from.x},${from.y} A${r - 16},${r - 16} 0 ${sweep > 180 ? 1 : 0} 1 ${to.x},${to.y}`} fill="none" strokeDasharray="4 4" markerEnd={`url(#${id}-arrow-accent)`} />
          </g>
        );
      })}
      {spec.keys?.map((key) => {
        const p = point(key.angle);
        const label = point(key.angle, r - 38);
        return (
          <g key={`k-${key.label}`} className="dg-key">
            <rect x={p.x - 6} y={p.y - 6} width={12} height={12} rx={3} transform={`rotate(45 ${p.x} ${p.y})`} />
            <text x={label.x} y={label.y + 4} textAnchor="middle">{key.label}</text>
          </g>
        );
      })}
      {nodes.map((node) => {
        const p = point(node.angle);
        const label = point(node.angle, r + 26);
        // Labels on the sides read away from the ring so they never cover a node.
        const side = label.x > cx + 20 ? "start" : label.x < cx - 20 ? "end" : "middle";
        const dx = side === "start" ? 6 : side === "end" ? -6 : 0;
        const dy = side === "middle" ? (label.y < cy ? -4 : 12) : 4;
        return (
          <g key={node.label} className={`dg-node dg-tone-${node.tone ?? "store"}`}>
            <circle cx={p.x} cy={p.y} r={13} />
            <text x={label.x + dx} y={label.y + dy} textAnchor={side} className="dg-label">{node.label}</text>
          </g>
        );
      })}
    </svg>
  );
}

// ---------------------------------------------------------------- timeline

const TICK = 150;

function Timeline({ spec }) {
  const id = markerId(spec);
  const ticks = spec.ticks ?? [];
  const spans = spec.spans ?? [];
  const events = spec.events ?? [];
  const lanes = Math.max(0, ...spans.map((span) => (span.lane ?? 0) + 1));
  const left = PAD + 20;
  const xOf = (at) => left + at * TICK;
  const top = PAD + (spec.marks?.length ? 26 : 0);
  const axisY = top + lanes * 46 + 22;
  const below = events.some((event) => event.label) ? 20 : 0;
  const gapsY = axisY + 44 + below;
  const height = (spec.gaps?.length ? gapsY + 24 : axisY + 34 + below) + PAD / 2;
  const last = Math.max(ticks.length - 1, ...spans.map((span) => span.to), ...events.map((event) => event.at));
  const width = Math.max(xOf(last) + left + 10, 520);
  return (
    <svg viewBox={`0 0 ${width} ${height}`} style={{ minWidth: Math.min(width, 560), maxWidth: width }} role="img" aria-label={spec.alt ?? spec.caption}>
      <Markers id={id} />
      {spans.map((span, index) => {
        const y = top + (span.lane ?? 0) * 46;
        return (
          <g key={`s${index}`} className={`dg-node dg-tone-${span.tone ?? "accent"}`}>
            <rect x={xOf(span.from) + 2} y={y} width={Math.max(8, (span.to - span.from) * TICK - 4)} height={36} rx={8} />
            {span.label && <text x={(xOf(span.from) + xOf(span.to)) / 2} y={y + 22} textAnchor="middle" className="dg-label">{span.label}</text>}
          </g>
        );
      })}
      <g className="dg-edge">
        <path d={`M${left - 14},${axisY} L${width - 12},${axisY}`} fill="none" markerEnd={`url(#${id}-arrow-default)`} />
      </g>
      {ticks.map((tick, index) => (
        <g key={`t${index}`} className="dg-tick">
          <line x1={xOf(index)} y1={axisY - 5} x2={xOf(index)} y2={axisY + 5} />
          <text x={xOf(index)} y={axisY + 22 + below} textAnchor="middle">{tick}</text>
        </g>
      ))}
      {events.map((event, index) => (
        <g key={`e${index}`} className={`dg-node dg-tone-${event.tone ?? "store"}`}>
          <circle cx={xOf(event.at)} cy={axisY} r={6} />
          {event.label && <text x={xOf(event.at)} y={axisY + 21} textAnchor="middle" className="dg-sub">{event.label}</text>}
        </g>
      ))}
      {(spec.marks ?? []).map((mark, index) => (
        <g key={`m${index}`} className={`dg-mark dg-mark-${mark.tone ?? "accent"}`}>
          <line x1={xOf(mark.at)} y1={PAD + 12} x2={xOf(mark.at)} y2={axisY + 12} />
          <text x={xOf(mark.at)} y={PAD + 4} textAnchor="middle">{mark.label}</text>
        </g>
      ))}
      {(spec.gaps ?? []).map((gap, index) => (
        <g key={`g${index}`} className="dg-gap">
          <path d={`M${xOf(gap.from)},${gapsY - 8} v8 H${xOf(gap.to)} v-8`} fill="none" />
          <text x={(xOf(gap.from) + xOf(gap.to)) / 2} y={gapsY + 15} textAnchor="middle">{gap.label}</text>
        </g>
      ))}
    </svg>
  );
}

// ---------------------------------------------------------------- tree

const TREE_ROW = 96;
const TREE_GAP = 18;

function Tree({ spec }) {
  const id = markerId(spec);
  const placed = [];
  const links = [];
  let cursor = PAD;
  // Leaves sit side by side; each parent is centred over its children.
  const layout = (node, depth) => {
    const w = Math.max(54, textWidth(node.label, 13) + 18, node.sub ? textWidth(node.sub, 11) + 18 : 0);
    const h = node.sub ? 46 : 36;
    const kids = (node.children ?? []).map((child) => layout(child, depth + 1));
    let x;
    if (kids.length) x = (kids[0].x + kids[kids.length - 1].x) / 2;
    else { x = cursor + w / 2; cursor += w + TREE_GAP; }
    const entry = { node, x, y: PAD + depth * TREE_ROW + 23, w, h };
    placed.push(entry);
    for (const kid of kids) links.push({ from: entry, to: kid });
    return entry;
  };
  layout(spec.root, 0);
  const width = Math.max(cursor - TREE_GAP + PAD, 320);
  const height = Math.max(...placed.map((entry) => entry.y + entry.h / 2)) + PAD;
  return (
    <svg viewBox={`0 0 ${width} ${height}`} style={{ minWidth: Math.min(width, 560), maxWidth: width }} role="img" aria-label={spec.alt ?? spec.caption}>
      <Markers id={id} />
      {links.map(({ from, to }, index) => {
        const tone = to.node.path ? "accent" : "default";
        const y1 = from.y + from.h / 2 + 2;
        const y2 = to.y - to.h / 2 - 4;
        return (
          <g key={index} className={`dg-edge dg-edge-${tone}`}>
            <path d={`M${from.x},${y1} L${to.x},${y2}`} fill="none" markerEnd={`url(#${id}-arrow-${tone})`} />
            {to.node.edge && <EdgeLabel x={(from.x + to.x) / 2} y={(y1 + y2) / 2} text={to.node.edge} />}
          </g>
        );
      })}
      {placed.map(({ node, x, y, w, h }, index) => (
        <g key={index} className={`dg-node dg-tone-${node.tone ?? "default"}`}>
          <rect x={x - w / 2} y={y - h / 2} width={w} height={h} rx={8} />
          {node.sub ? (
            <>
              <text x={x} y={y - 3} textAnchor="middle" className="dg-label">{node.label}</text>
              <text x={x} y={y + 13} textAnchor="middle" className="dg-sub">{node.sub}</text>
            </>
          ) : <text x={x} y={y + 4.5} textAnchor="middle" className="dg-label">{node.label}</text>}
        </g>
      ))}
    </svg>
  );
}

// ---------------------------------------------------------------- bars

function Bars({ spec }) {
  const shown = (item) => item.display ?? `${item.value}${spec.unit ?? ""}`;
  const labelW = Math.max(...spec.values.map((item) => textWidth(item.label, 12.5))) + 8;
  const barW = 380;
  const valueW = Math.max(...spec.values.map((item) => textWidth(shown(item), 12))) + 8;
  const rowH = 30;
  const width = PAD * 2 + labelW + barW + valueW;
  const height = PAD * 2 + spec.values.length * rowH;
  const values = spec.values.map((item) => item.value);
  const max = Math.max(...values);
  const min = Math.min(...values.filter((value) => value > 0));
  const span = Math.log10(max) - Math.log10(min) + 0.3;
  const scale = (value) => (spec.log ? (Math.log10(value) - Math.log10(min) + 0.3) / span : value / max);
  return (
    <svg viewBox={`0 0 ${width} ${height}`} style={{ minWidth: Math.min(width, 560), maxWidth: width }} role="img" aria-label={spec.alt ?? spec.caption}>
      {spec.values.map((item, index) => {
        const y = PAD + index * rowH;
        const w = Math.max(3, scale(item.value) * barW);
        return (
          <g key={index}>
            <text x={PAD + labelW - 8} y={y + 19} textAnchor="end" className="dg-bar-label">{item.label}</text>
            <g className={`dg-node dg-tone-${item.tone ?? "accent"}`}><rect x={PAD + labelW} y={y + 5} width={w} height={rowH - 10} rx={4} /></g>
            <text x={PAD + labelW + w + 8} y={y + 19} className="dg-bar-value">{shown(item)}</text>
          </g>
        );
      })}
    </svg>
  );
}

// ---------------------------------------------------------------- segments

function Segments({ spec }) {
  const labelW = Math.max(0, ...spec.lanes.map((row) => (row.label ? textWidth(row.label, 12.5) + 10 : 0)));
  const barW = spec.width ?? 640;
  const rowH = 62;
  const width = PAD * 2 + labelW + barW;
  const height = PAD * 2 + spec.lanes.length * rowH - 14 + 10;
  const top = PAD + 10;
  return (
    <svg viewBox={`0 0 ${width} ${height}`} style={{ minWidth: Math.min(width, 560), maxWidth: width }} role="img" aria-label={spec.alt ?? spec.caption}>
      {spec.lanes.map((row, rowIndex) => {
        const total = spec.total ?? row.parts.reduce((sum, part) => sum + part.size, 0);
        const y = top + rowIndex * rowH;
        let x = PAD + labelW;
        return (
          <g key={rowIndex}>
            {row.label && <text x={PAD + labelW - 10} y={y + 27} textAnchor="end" className="dg-bar-label">{row.label}</text>}
            {row.parts.map((part, index) => {
              const w = (part.size / total) * barW;
              const cx = x + w / 2;
              x += w;
              return (
                <g key={index} className={`dg-node dg-tone-${part.tone ?? "muted"}`}>
                  <rect x={cx - w / 2 + 1} y={y} width={Math.max(2, w - 2)} height={44} rx={6} />
                  {w < textWidth(part.label, 13) + 4 ? (
                    <text x={cx} y={y - 6} textAnchor="middle" className="dg-sub">{part.label}</text>
                  ) : part.sub && w >= textWidth(part.sub, 11) ? (
                    <>
                      <text x={cx} y={y + 19} textAnchor="middle" className="dg-label">{part.label}</text>
                      <text x={cx} y={y + 35} textAnchor="middle" className="dg-sub">{part.sub}</text>
                    </>
                  ) : <text x={cx} y={y + 27} textAnchor="middle" className="dg-label">{part.label}</text>}
                </g>
              );
            })}
          </g>
        );
      })}
    </svg>
  );
}

const KINDS = { flow: Flow, sequence: Sequence, ring: Ring, timeline: Timeline, tree: Tree, bars: Bars, segments: Segments };
