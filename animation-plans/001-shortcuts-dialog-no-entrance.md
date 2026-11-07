# 001 — Remove shortcuts dialog entrance animation

- **Status**: DONE
- **Commit**: 37ab93c
- **Severity**: HIGH
- **Category**: Purpose & frequency
- **Estimated scope**: 1 file, 1 line

## Problem

The keyboard shortcuts overlay is opened with `?` and is among the highest-frequency UI surfaces in the workspace. Per the animation audit, keyboard-initiated actions used 100+ times per day must not animate open or close. Raycast-style instant palettes are the reference.

Current code:

```css
/* src/styles/workspace.css:449 — current */
.shortcuts-dialog { width: min(860px, 100%); max-height: calc(100vh - 40px); display: flex; flex-direction: column; overflow: hidden; border: 1px solid var(--bd-e3e6eb); border-radius: 14px; background: var(--bg-ffffff); box-shadow: 0 18px 70px rgba(22, 32, 48, .19); animation: modal-in .16s ease-out; }
```

## Target

The dialog appears instantly when mounted. Other overlays (inspector, prompt modals) keep `modal-in`.

```css
/* target — same rule without animation property */
.shortcuts-dialog { width: min(860px, 100%); max-height: calc(100vh - 40px); display: flex; flex-direction: column; overflow: hidden; border: 1px solid var(--bd-e3e6eb); border-radius: 14px; background: var(--bg-ffffff); box-shadow: 0 18px 70px rgba(22, 32, 48, .19); }
```

## Repo conventions to follow

- One declaration per selector line matches existing minified style in `workspace.css`.
- Do not change `modal-in` in `src/styles.css` — other consumers stay animated.

## Steps

1. Open `src/styles/workspace.css` and locate the `.shortcuts-dialog` rule (line ~449).
2. Delete the trailing `animation: modal-in .16s ease-out;` from that rule only.
3. Save the file.

## Boundaries

- Do NOT remove `modal-in` from `.inspector`, `.user-menu-popover`, `.prompt-modal`, or other dialogs.
- Do NOT add a replacement entrance (fade, scale, etc.).
- Do NOT change `Panels.jsx` markup for the shortcuts dialog.

## Verification

- **Mechanical**: `npm run build` completes without error.
- **Feel check**: Open a practice round workspace, press `?` repeatedly:
  - The shortcuts panel appears on the same frame as the backdrop — no vertical slide or scale.
  - Press `Escape` and `?` in quick succession — no animation restart artifacts.
  - Open the node inspector (pointer) — it may still use `modal-in` (0.12s); that is expected.
- Toggle `prefers-reduced-motion: reduce` in DevTools → Rendering; shortcuts should behave identically (already instant).
- **Done when**: `.shortcuts-dialog` has no `animation` property and repeated `?` toggles feel immediate.
