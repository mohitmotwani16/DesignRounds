// Diagrams for Learn topics, drawn as inline SVG from small specs so every topic shares
// one visual language and both themes (colours come from CSS variables).
//
//   flow:     nodes on a grid { id, label, sub?, col, row, shape?: box|db|queue|pill, tone?, w? }
//             edges { from, to, label?, dashed?, both?, bend?, tone? }   zones { label, from: [c, r], to: [c, r], tone? }
//   sequence: actors [names], steps { from, to, label, dashed? } | { note, over: [i, j?] }
//   ring:     nodes { label, angle, tone? } (degrees clockwise from the top), keys { label, angle }
//
// tone: accent | store | cache | queue | ok | danger | muted

const COL = 180;
const ROW = 100;
const PAD = 24;
const NODE_W = 140;
const NODE_H = 48;

const textWidth = (text, size = 12) => text.length * size * 0.56 + 12;

export function Diagram({ spec }) {
  const content = spec.kind === "sequence" ? <Sequence spec={spec} /> : spec.kind === "ring" ? <Ring spec={spec} /> : <Flow spec={spec} />;
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

function Flow({ spec }) {
  const id = markerId(spec);
  const zoneSpace = spec.zones?.length ? 16 : 0;
  // Boxes grow to fit their text, so a long label never spills over the border.
  const sized = new Map(spec.nodes.map((node) => {
    const padding = node.shape === "queue" ? 40 : node.shape === "pill" ? 30 : 24;
    const w = Math.max(node.w ?? NODE_W, textWidth(node.label, 13.5) + padding, node.sub ? textWidth(node.sub, 11) + padding : 0);
    return [node.id, { ...node, w, h: node.h ?? NODE_H }];
  }));
  // Columns widen until every near-horizontal edge label fits between its two boxes
  // (labels on diagonal or vertical edges sit in open space between rows).
  let colW = COL;
  for (const edge of spec.edges ?? []) {
    const a = sized.get(edge.from);
    const b = sized.get(edge.to);
    if (!edge.label || edge.bend || !a || !b) continue;
    const dc = Math.abs(b.col - a.col);
    if (dc === 0 || Math.abs(b.row - a.row) > 0.35) continue;
    colW = Math.max(colW, ((a.w + b.w) / 2 + textWidth(edge.label, 11.5) + 22) / dc);
  }
  const nodes = new Map([...sized.values()].map((node) => [node.id, { ...node, x: PAD + node.col * colW + colW / 2, y: PAD + zoneSpace + node.row * ROW + ROW / 2 }]));
  const cols = Math.max(...spec.nodes.map((node) => node.col)) + 1;
  const rows = Math.max(...spec.nodes.map((node) => node.row)) + 1;
  const rightmost = Math.max(...[...nodes.values()].map((node) => node.x + node.w / 2));
  const width = spec.width ?? Math.max(PAD * 2 + cols * colW, rightmost + PAD + 18);
  const height = spec.height ?? PAD * 2 + zoneSpace + rows * ROW;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} style={{ minWidth: Math.min(width, 560) }} role="img" aria-label={spec.alt ?? spec.caption}>
      <Markers id={id} />
      {spec.zones?.map((zone) => <Zone key={zone.label} zone={zone} zoneSpace={zoneSpace} nodes={[...nodes.values()]} />)}
      {spec.edges?.map((edge, index) => <FlowEdge key={index} edge={edge} from={nodes.get(edge.from)} to={nodes.get(edge.to)} id={id} />)}
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
    <svg viewBox={`0 0 ${width} ${height}`} style={{ minWidth: Math.min(width, 560) }} role="img" aria-label={spec.alt ?? spec.caption}>
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
    <svg viewBox={`0 0 ${width} ${height}`} style={{ minWidth: 420 }} role="img" aria-label={spec.alt ?? spec.caption}>
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
