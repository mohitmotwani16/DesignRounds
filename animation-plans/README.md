# Animation execution plans

Self-contained fix plans produced from [SCOPE.md](./SCOPE.md) using the `improve-animations` workflow. Each file is intended for an executor with **no other context** — values and paths are inlined.

**Repo commit when plans were written:** `37ab93c`

## Plan index

| # | File | Title | Severity | Category | Status |
| --- | --- | --- | --- | --- | --- |
| 001 | [001-shortcuts-dialog-no-entrance.md](./001-shortcuts-dialog-no-entrance.md) | Remove shortcuts dialog entrance animation | HIGH | Purpose & frequency | DONE |
| 002 | [002-lock-backdrop-fade-keyframes.md](./002-lock-backdrop-fade-keyframes.md) | Define lock backdrop fade keyframe | MEDIUM | Cohesion & tokens | DONE |
| 003 | [003-pointer-gate-hover-transforms.md](./003-pointer-gate-hover-transforms.md) | Pointer-gate hover transform lifts | MEDIUM | Accessibility | DONE |
| 004 | [004-canvas-tour-hole-transform.md](./004-canvas-tour-hole-transform.md) | Canvas tour spotlight transform transition | MEDIUM | Performance | DONE |
| 005 | [005-rename-duplicate-card-in.md](./005-rename-duplicate-card-in.md) | Rename legacy `prompt-card-in` keyframe | LOW | Cohesion & tokens | DONE |
| 006 | [006-landing-smil-reduced-motion.md](./006-landing-smil-reduced-motion.md) | Gate landing SVG packet motion in JSX | MEDIUM | Accessibility | DONE |

## Recommended execution order

1. **001** — Instant win for daily workspace users; no dependencies.
2. **002** — Independent bugfix; safe before or after 001.
3. **005** — Rename only in `styles.css`; avoids confusion before broader token work.
4. **003** — Touch/hover fixes on marketing + buttons; no dependency on 004–006.
5. **004** — Requires JSX + CSS coordination; do after 001 if testing workspace heavily.
6. **006** — Landing-only; can run in parallel with 003–004.

## Dependencies

| Plan | Depends on | Notes |
| --- | --- | --- |
| 001 | — | |
| 002 | — | |
| 003 | — | Overlaps `site.css` RM block with existing landing rules — merge, don’t duplicate media queries blindly. |
| 004 | — | Optional: use `--ease-out` token if a future plan adds it to `:root`. |
| 005 | — | |
| 006 | — | Complements CSS RM in `site.css` ~638–646. |

## How to execute

Run plans in order above, or spawn an agent per file with the plan body as the sole spec. After each plan:

1. Complete mechanical verification (`npm run build`).
2. Complete feel checks listed in the plan.
3. Update **Status** in the plan file from `TODO` to `DONE` (optional housekeeping).

## Out of scope (future plans)

Not covered by this batch — consider a second pass:

- Shared motion tokens (`--ease-out`, durations) across `site.css` / `workspace.css`
- `modal-in` easing token swap for remaining dialogs
- Pointer-gate `.round:hover` / `.prompt-card:hover`
- Minimap `width`/`height` transition in `workspace.css`
- Remove or narrow global `*` reduced-motion hammer in `styles.css` (~397)

See [SCOPE.md](./SCOPE.md) §6 and §8.
