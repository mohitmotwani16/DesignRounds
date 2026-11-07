# Apple-design roadmap

Foundation: [`src/styles/interface.css`](../src/styles/interface.css). Springs: [`motion`](https://motion.dev) + [`src/motion/`](../src/motion/).

**Status (implemented):** Phases A–D as described below. Further polish (full canvas velocity projection, mobile sheet drag-to-dismiss) is optional.

## Phase A — Springs & sheets — DONE

| Surface | Implementation |
| --- | --- |
| Mobile `nav-sheet` | `motion/react` spring in [`site.jsx`](../src/components/site.jsx); `bounce: 0`, `duration: 0.35` |
| Modals | [`MotionModal.jsx`](../src/motion/MotionModal.jsx) — brief, prompt, nugget, lock, report, learn prompt |
| Shortcuts `?` | `MotionModal` with `instant` (no animation; motion policy) |
| Account menu | Spring popover in [`ui.jsx`](../src/components/ui.jsx) |
| Side panels | Width spring settle in `interface.css`; flick snap on [`PanelResizer`](../src/workspace/PanelResizer.jsx) when \|velocity\| > 520 px/s |

## Phase B — Workspace gestures — DONE

| Surface | Implementation |
| --- | --- |
| React Flow | `nodeDragThreshold={3}`, `selectNodesOnDrag={false}` |
| Palette | `pointerdown` → `.palette-tile-pressed` before drag |
| Edge bend | Unchanged (1:1); rubber-band deferred |
| Panel resize | 1:1 drag + flick to min/max |

## Phase C — Typography & vibrancy — DONE

- Nav + lib tabs: heavier weight on translucent chrome (`interface.css`)
- Existing display `letter-spacing` on marketing headings unchanged

## Phase D — Delight budget — DONE (policy)

- Product springs use `bounce: 0` only ([`presets.js`](../src/motion/presets.js))
- Landing `lp-*` and voice heartbeat unchanged
- No bounce added to daily chrome

## Optional follow-up

- Edge bend rubber-banding at extent
- Drag-to-dismiss mobile nav sheet with velocity projection
- `prefers-reduced-transparency` audit on all frosted layers
