import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

const STORAGE_PREFIX = "designrounds:canvas-tour:";
const seenMemory = new Set();

// One walkthrough per signed-in account, in this browser. A missing store means
// "not seen", so the tour can still run; we also mark the tab so a blocked
// localStorage does not show it again on every canvas visit in this tab.
export function canvasTourSeen(userId) {
  if (!userId) return true;
  if (seenMemory.has(userId)) return true;
  const key = STORAGE_PREFIX + userId;
  try { if (window.localStorage.getItem(key) === "1") return true; } catch { /* fall through */ }
  try { return window.sessionStorage.getItem(key) === "1"; } catch { return false; }
}

export function markCanvasTourSeen(userId) {
  if (!userId) return;
  seenMemory.add(userId);
  const key = STORAGE_PREFIX + userId;
  try { window.localStorage.setItem(key, "1"); } catch { /* preference only */ }
  try { window.sessionStorage.setItem(key, "1"); } catch { /* preference only */ }
}

export function canvasTourSteps(finished) {
  return [
    {
      id: "canvas",
      targets: ["canvas"],
      kicker: "The canvas",
      title: "Design the system here",
      body: "Drag empty space to move around, and scroll to zoom. Double-click a component to rename it. The brief stays under the round name, and your work saves on its own.",
    },
    {
      id: "library",
      targets: ["rail", "library"],
      kicker: "Components",
      title: "Add components from the library",
      body: "Click a component to drop it on the canvas, or drag it where you want it. Search when you know the name. The rail also adds a service, a zone, text, or a decision note.",
    },
    {
      id: "connect",
      targets: ["connect"],
      fallback: ["canvas"],
      kicker: "Connections",
      title: "Join them together",
      body: "Drag from the dot on one component to the dot on another. Double-click the line to name the call, then choose whether it is sync or async.",
    },
    {
      id: "interviewer",
      targets: ["panel"],
      tab: "interviewer",
      kicker: "Interviewer",
      title: "Chat with the AI interviewer",
      body: "Explain why you designed it this way. The interviewer reads the canvas and asks follow-ups. Type a reply, or answer out loud with the mic.",
    },
    {
      id: "finish",
      targets: ["finish"],
      kicker: "Finish",
      title: finished ? "This round is read-only" : "Finish the round when you're ready",
      body: finished
        ? "A finished round stays locked until you reopen it. That button in the header turns editing back on."
        : "Finish round saves the design and locks the canvas. You can reopen the round later if you want to keep editing.",
    },
    {
      id: "score",
      targets: ["panel"],
      tab: "review",
      kicker: "Score",
      title: "Get your score in Review",
      body: "Open Review and ask for a score. You get a mark on every dimension, plus what to fix before the next round.",
    },
  ];
}

function findTargets(step) {
  const names = step.targets || [];
  const found = names.map((name) => document.querySelector(`[data-tour="${name}"]`)).filter(Boolean);
  if (found.length) return found;
  return (step.fallback || []).map((name) => document.querySelector(`[data-tour="${name}"]`)).filter(Boolean);
}

function unionRect(elements) {
  const boxes = elements.map((element) => element.getBoundingClientRect());
  const left = Math.min(...boxes.map((box) => box.left));
  const top = Math.min(...boxes.map((box) => box.top));
  const right = Math.max(...boxes.map((box) => box.right));
  const bottom = Math.max(...boxes.map((box) => box.bottom));
  return { left, top, right, bottom, width: right - left, height: bottom - top };
}

function holeFor(rect) {
  const pad = 6;
  const left = Math.max(8, rect.left - pad);
  const top = Math.max(8, rect.top - pad);
  const right = Math.min(window.innerWidth - 8, rect.right + pad);
  const bottom = Math.min(window.innerHeight - 8, rect.bottom + pad);
  return { left, top, width: Math.max(24, right - left), height: Math.max(24, bottom - top), right, bottom };
}

function placeCard(target, card) {
  const gap = 14;
  const margin = 12;
  const { width, height } = card;
  const view = { width: window.innerWidth, height: window.innerHeight };
  const clamp = (spot) => ({
    left: Math.min(Math.max(margin, spot.left), Math.max(margin, view.width - width - margin)),
    top: Math.min(Math.max(margin, spot.top), Math.max(margin, view.height - height - margin)),
  });
  // A large region (the canvas) has no free side, so the card sits inside it.
  if (target.width > width + 48 && target.height > height + 72) {
    return clamp({ left: target.left + (target.width - width) / 2, top: target.bottom - height - 28 });
  }
  const spots = [
    { left: target.left + (target.width - width) / 2, top: target.bottom + gap },
    { left: target.left + (target.width - width) / 2, top: target.top - gap - height },
    { left: target.right + gap, top: Math.max(margin, target.top) },
    { left: target.left - gap - width, top: Math.max(margin, target.top) },
  ];
  const overlap = (spot) => {
    const right = Math.min(spot.left + width, target.right);
    const bottom = Math.min(spot.top + height, target.bottom);
    const left = Math.max(spot.left, target.left);
    const top = Math.max(spot.top, target.top);
    return Math.max(0, right - left) * Math.max(0, bottom - top);
  };
  let best = clamp(spots[0]);
  let bestScore = Infinity;
  for (const spot of spots) {
    const placed = clamp(spot);
    const shift = Math.abs(placed.left - spot.left) + Math.abs(placed.top - spot.top);
    const score = overlap(placed) * 8 + shift;
    if (score < bestScore) { bestScore = score; best = placed; }
  }
  return best;
}

// Spotlight walkthrough for a first visit to the canvas. The parent opens the
// library or the side panel before each step, and decides when the tour is allowed.
export function CanvasTour({ steps, layoutKey, onStep, onDone }) {
  const [index, setIndex] = useState(0);
  const [frame, setFrame] = useState(null);
  const cardRef = useRef(null);
  const nextRef = useRef(null);
  const announced = useRef(false);
  const step = steps[Math.min(index, steps.length - 1)];
  const last = index >= steps.length - 1;

  useEffect(() => {
    if (announced.current) return;
    announced.current = true;
    onStep(steps[0]);
  }, [onStep, steps]);

  function go(nextIndex) {
    const next = steps[nextIndex];
    if (!next) return;
    onStep(next);
    setIndex(nextIndex);
  }

  useEffect(() => {
    const onKeyDown = (event) => {
      event.stopPropagation();
      if (event.key === "Escape") { event.preventDefault(); onDone(); return; }
      if (event.key === "ArrowRight" || event.key === "Enter") {
        event.preventDefault();
        if (last) onDone();
        else go(index + 1);
        return;
      }
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        if (index > 0) go(index - 1);
      }
    };
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
    // `go` closes over the latest step list; rebinding on each step is enough.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, last, onDone, steps, onStep]);

  useEffect(() => { nextRef.current?.focus(); }, [index]);

  useEffect(() => {
    const shell = document.querySelector(".workspace-shell");
    shell?.setAttribute("inert", "");
    return () => shell?.removeAttribute("inert");
  }, []);

  useLayoutEffect(() => {
    const card = cardRef.current;
    if (!card) return undefined;
    let frameId = 0;
    let attempts = 0;
    const measure = () => {
      const elements = findTargets(step);
      const cardBox = card.getBoundingClientRect();
      if (!elements.length && attempts < 10) {
        attempts += 1;
        frameId = window.requestAnimationFrame(measure);
        setFrame(null);
        return;
      }
      const hole = elements.length ? holeFor(unionRect(elements)) : null;
      const cardPos = hole
        ? placeCard(hole, cardBox)
        : { left: Math.max(12, (window.innerWidth - cardBox.width) / 2), top: Math.max(12, (window.innerHeight - cardBox.height) / 2) };
      setFrame({ hole, card: cardPos });
    };
    measure();
    window.addEventListener("resize", measure);
    return () => {
      window.cancelAnimationFrame(frameId);
      window.removeEventListener("resize", measure);
    };
  }, [step, layoutKey]);

  const ui = (
    <div className="canvas-tour">
      <div className="canvas-tour-blocker" />
      {frame?.hole && (
        <div
          className="canvas-tour-hole"
          style={{ left: frame.hole.left, top: frame.hole.top, width: frame.hole.width, height: frame.hole.height }}
        />
      )}
      <div
        ref={cardRef}
        className="canvas-tour-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="canvas-tour-title"
        aria-describedby="canvas-tour-body"
        style={frame ? { left: frame.card.left, top: frame.card.top } : { left: 16, top: 16, visibility: "hidden" }}
      >
        <div className="canvas-tour-progress" aria-hidden="true">
          {steps.map((item, itemIndex) => <span key={item.id} className={itemIndex === index ? "is-current" : itemIndex < index ? "is-done" : ""} />)}
        </div>
        <p className="canvas-tour-kicker">{step.kicker} · {index + 1} of {steps.length}</p>
        <h2 id="canvas-tour-title">{step.title}</h2>
        <p id="canvas-tour-body">{step.body}</p>
        <div className="canvas-tour-actions">
          <button type="button" className="canvas-tour-skip" onClick={onDone}>Skip</button>
          <div className="canvas-tour-nav">
            <button type="button" className="canvas-tour-back" onClick={() => go(index - 1)} disabled={index === 0}>Back</button>
            <button type="button" className="canvas-tour-next" ref={nextRef} onClick={() => (last ? onDone() : go(index + 1))}>
              {last ? "Start designing" : "Next"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(ui, document.body);
}
