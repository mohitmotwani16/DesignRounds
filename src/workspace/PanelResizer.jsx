import { useRef } from "react";

const STEP = 16;

// A drag handle on the inner edge of a workspace side panel. `side` is the panel's
// side of the canvas: dragging toward the canvas widens it. Keyboard: arrow keys
// resize, Home and End jump to the limits; double-click restores the default.
// `width` is null until the learner resizes, and the panel then uses its CSS width.
export function PanelResizer({ side, width, defaultWidth, min, max, label, onResize }) {
  const drag = useRef(null);
  const clamp = (value) => Math.round(Math.min(max, Math.max(min, value)));
  const current = width ?? defaultWidth;

  // The panel is the handle's neighbour; measure it so the first drag starts from
  // the width it actually has (CSS may have narrowed it on a smaller screen).
  const panelWidth = (handle) => {
    const panel = side === "left" ? handle.previousElementSibling : handle.nextElementSibling;
    return panel?.getBoundingClientRect().width ?? current;
  };

  function onPointerDown(event) {
    if (event.button !== 0) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { x: event.clientX, width: panelWidth(event.currentTarget) };
    document.body.classList.add("is-resizing-panel");
  }

  function onPointerMove(event) {
    if (!drag.current) return;
    const delta = event.clientX - drag.current.x;
    onResize(clamp(drag.current.width + (side === "left" ? delta : -delta)));
  }

  function endDrag() {
    if (!drag.current) return;
    drag.current = null;
    document.body.classList.remove("is-resizing-panel");
  }

  function onKeyDown(event) {
    const grow = side === "left" ? "ArrowRight" : "ArrowLeft";
    const shrink = side === "left" ? "ArrowLeft" : "ArrowRight";
    const next = { [grow]: current + STEP, [shrink]: current - STEP, Home: min, End: max }[event.key];
    if (next === undefined) return;
    event.preventDefault();
    onResize(clamp(next));
  }

  return (
    <div
      className={`panel-resizer panel-resizer-${side}`}
      role="separator"
      aria-orientation="vertical"
      aria-label={label}
      aria-valuenow={Math.round(current)}
      aria-valuemin={min}
      aria-valuemax={max}
      tabIndex={0}
      title={`Drag to resize · double-click to reset`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onLostPointerCapture={endDrag}
      onDoubleClick={() => onResize(null)}
      onKeyDown={onKeyDown}
    />
  );
}
