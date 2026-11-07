# 003 — Pointer-gate hover transform lifts

- **Status**: DONE
- **Commit**: 37ab93c
- **Severity**: MEDIUM
- **Category**: Accessibility
- **Estimated scope**: 2 files, ~40 lines moved/added

## Problem

Several controls animate `transform` on `:hover` without `@media (hover: hover) and (pointer: fine)`. Touch devices often apply sticky hover after tap, causing cards and buttons to “stick” lifted or nudged.

Representative rules:

```css
/* src/styles.css:45 — current */
.button:hover { transform: translateY(-1px); }

/* src/styles/site.css:176-177 — current */
.btn:hover svg.nudge { transform: translateX(2px); }
.btn:active { transform: translateY(1px); }

/* src/styles/site.css:307-308 — current */
.lp-btn:hover svg { transform: translateX(3px); }

/* src/styles/site.css:459-467 — current */
.lp-qcard:hover, .lp-qcard:focus-within { transform: translateY(-8px) scale(1.02); background: var(--bg-raised); box-shadow: var(--lp-lift), 0 0 0 2px var(--accent); }
.lp-qcard:hover .lp-qcard-go { background: var(--accent); color: var(--accent-ink); transform: translateX(4px); }
```

`:active` press feedback must remain available on touch (not gated behind hover media).

## Target

1. **Keep** `:active` transforms on `.btn` / `.lp-btn` as-is for all pointers.
2. **Move** hover-only transforms into a shared pointer-fine block in `site.css`.
3. **Split** `.lp-qcard:focus-within` so keyboard users still get background/shadow/border feedback without hover-only lift; lift applies only under hover media.

```css
/* shared pointer gate (site.css) */
@media (hover: hover) and (pointer: fine) {
  .btn:hover svg.nudge { transform: translateX(2px); }
  .lp-btn:hover svg { transform: translateX(3px); }
  .lp-qcard:hover { transform: translateY(-8px) scale(1.02); }
  .lp-qcard:hover .lp-qcard-go { background: var(--accent); color: var(--accent-ink); transform: translateX(4px); }
}

/* focus-within (all pointers) — no transform lift */
.lp-qcard:focus-within {
  background: var(--bg-raised);
  box-shadow: var(--lp-lift), 0 0 0 2px var(--accent);
}
```

```css
/* styles.css */
@media (hover: hover) and (pointer: fine) {
  .button:hover { transform: translateY(-1px); }
}
```

Update the existing reduced-motion block at `site.css` ~646 — it currently lists `.lp-qcard:hover, .lp-qcard:focus-within` together. Keep `transform: none` for both inside `@media (prefers-reduced-motion: reduce)`.

## Repo conventions to follow

- `touch-action: manipulation` already on `.btn` / `.lp-btn` — leave it.
- Exemplar: audit playbook CSS for hover gating (exact media query string).
- Match existing reduced-motion pattern in `site.css` lines 638–647.

## Steps

1. In `src/styles/site.css`, remove hover transform rules from the global `.btn:hover svg.nudge` and `.lp-btn:hover svg` selectors (lines ~176–177, ~307–308).
2. Add one `@media (hover: hover) and (pointer: fine) { ... }` block in the buttons / landing section containing those two rules.
3. Replace the combined `.lp-qcard:hover, .lp-qcard:focus-within` rule (~459) with:
   - `.lp-qcard:focus-within { background; box-shadow; }` (no transform)
   - Inside the same hover media block as step 2: `.lp-qcard:hover { transform: ...; background; box-shadow; }`
   - Move `.lp-qcard:hover .lp-qcard-go` into the hover media block (background/color/transform).
4. For `.lp-qcard-go`, keep base transitions on the unhovered rule; only gate the hover child selector.
5. In `src/styles.css`, wrap `.button:hover { transform: translateY(-1px); }` in the same media query (duplicate the media block if needed — legacy shell file is separate).
6. Re-read `site.css` reduced-motion block ~646; ensure `transform: none` still covers `.lp-qcard:hover` and `.lp-qcard:focus-within`.

## Boundaries

- Do NOT gate `:active` / `:focus-visible` feedback.
- Do NOT change `.round:hover` or `.prompt-card:hover` in this plan (separate pages; optional follow-up).
- Do NOT add new dependencies.

## Verification

- **Mechanical**: `npm run build` succeeds.
- **Feel check** (Chrome DevTools → Sensors → touch OR real phone):
  - Tap `.lp-btn` / `.button` — no lingering `translateY` or SVG nudge after finger lifts.
  - Tab to a question card with keyboard — `focus-within` ring/shadow appears, card does not lift unless pointer hover.
- **Desktop**: Hover question cards — lift and go-arrow motion unchanged.
- **Done when**: All listed hover transforms live only inside `@media (hover: hover) and (pointer: fine)` and focus-within still shows non-transform affordance.
