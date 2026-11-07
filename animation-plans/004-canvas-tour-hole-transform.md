# 004 — Canvas tour spotlight: transform not layout transition

- **Status**: DONE
- **Commit**: 37ab93c
- **Severity**: MEDIUM
- **Category**: Performance
- **Estimated scope**: 2 files, ~15 lines

## Problem

The canvas tour spotlight animates `left`, `top`, `width`, and `height`. Those properties trigger layout and paint. The audit requires animating `transform` and `opacity` only for UI motion.

```css
/* src/styles/workspace.css:628 — current */
.canvas-tour-hole { position: fixed; z-index: 81; border-radius: 12px; pointer-events: none; box-shadow: 0 0 0 2px #fff, 0 0 0 4px #5964d8, 0 0 0 9999px rgba(15, 20, 32, .62); transition: left .18s ease, top .18s ease, width .18s ease, height .18s ease; }
```

```jsx
/* src/workspace/CanvasTour.jsx:225-228 — current */
<div
  className="canvas-tour-hole"
  style={{ left: frame.hole.left, top: frame.hole.top, width: frame.hole.width, height: frame.hole.height }}
/>
```

Reduced motion already disables the transition (~648); default users still pay layout cost during the tween.

## Target

- Position the hole with `transform: translate(x, y)` from `left: 0; top: 0`.
- Set `width` / `height` instantly when the step changes (no transition on size).
- Transition **only** `transform` for 180ms with strong ease-out:

```css
--ease-out: cubic-bezier(0.23, 1, 0.32, 1); /* add to :root in site.css only if not present; else use literal in workspace rule */
```

```css
.canvas-tour-hole {
  position: fixed;
  left: 0;
  top: 0;
  z-index: 81;
  border-radius: 12px;
  pointer-events: none;
  box-shadow: 0 0 0 2px #fff, 0 0 0 4px #5964d8, 0 0 0 9999px rgba(15, 20, 32, .62);
  transition: transform 180ms cubic-bezier(0.23, 1, 0.32, 1);
}
```

```jsx
style={{
  width: frame.hole.width,
  height: frame.hole.height,
  transform: `translate(${frame.hole.left}px, ${frame.hole.top}px)`,
}}
```

Keep existing RM rule: `transition: none` on `.canvas-tour-hole`.

The tour **card** may keep instant `left`/`top` positioning (no CSS transition today) — do not add layout transitions to `.canvas-tour-card`.

## Repo conventions to follow

- Measurement logic in `CanvasTour.jsx` (`holeFor`, `useLayoutEffect`) stays unchanged except inline styles on the hole element.
- Exemplar duration band: workspace palette uses `.12s`–`.18s`; 180ms matches audit UI cap.

## Steps

1. Edit `src/workspace/CanvasTour.jsx` hole `style` (~225): remove `left` and `top`; set `width`, `height`, and `transform` as in Target.
2. Edit `src/styles/workspace.css` `.canvas-tour-hole`: set `left: 0; top: 0;` remove old `left`/`top`/`width`/`height` from transition; use transform-only transition with cubic-bezier above.
3. Confirm `@media (prefers-reduced-motion: reduce) { .canvas-tour-hole { transition: none; } }` still present (~648).
4. Optional consistency: if `src/styles/site.css` `:root` gains `--ease-out` in a later plan, switch the hole rule to `var(--ease-out)`; until then literal bezier is fine.

## Boundaries

- Do NOT animate `width`/`height` on the hole.
- Do NOT change tour step content or `inert` behavior on `.workspace-shell`.
- Do NOT add Motion library.

## Verification

- **Mechanical**: `npm run build` succeeds.
- **Feel check**: Sign in, open a round, trigger canvas tour (first visit), click **Next** through steps:
  - Spotlight **moves** smoothly between targets; size jumps instantly when the highlighted region changes shape.
  - DevTools → Performance: stepping tour should not show repeated Layout thrash on every frame of the move (transform-only path).
- Enable `prefers-reduced-motion: reduce`: hole jumps instantly between steps (no transition).
- **Done when**: `.canvas-tour-hole` transitions only `transform` and JSX supplies `translate()` for position.
