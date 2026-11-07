# 005 — Rename legacy prompt-card-in keyframe

- **Status**: DONE
- **Commit**: 37ab93c
- **Severity**: LOW
- **Category**: Cohesion & tokens
- **Estimated scope**: 1 file, 2 renames

## Problem

Two different `@keyframes card-in` definitions exist. The cascade winner depends on stylesheet import order, so `.prompt-card` and `.round` may unintentionally share or override each other's entrance.

```css
/* src/styles.css:148-150 — legacy library / home */
.prompt-card { ... animation: card-in .35s both; animation-delay: calc(var(--card-order, 0) * 45ms); ... }
@keyframes card-in { from { opacity: .3; transform: translateY(7px); } to { opacity: 1; transform: translateY(0); } }

/* src/styles/site.css:719-720 — marketing library grid */
.round { ... animation: card-in 0.45s var(--ease) backwards; animation-delay: calc(var(--i, 0) * 40ms); }
@keyframes card-in { from { opacity: 0; transform: translateY(10px); } }
```

Different `from` opacity and distance — they are not the same motion.

## Target

Rename the **legacy** keyframe only (in `styles.css`) so names are unique:

```css
.prompt-card { ... animation: prompt-card-in 0.35s both; ... }
@keyframes prompt-card-in { from { opacity: .3; transform: translateY(7px); } to { opacity: 1; transform: translateY(0); } }
```

Leave `site.css` `card-in` untouched for `.round`.

## Repo conventions to follow

- Prefix with component/context name (`prompt-card-in`, `learn-prompt-in`) per existing `learn-prompt-in` pattern in `site.css`.
- Stagger delays stay on the consumer: `calc(var(--card-order, 0) * 45ms)` — within audit stagger 30–80ms band.

## Steps

1. In `src/styles.css`, rename `@keyframes card-in` to `@keyframes prompt-card-in` (~line 150).
2. Update `.prompt-card` animation shorthand to `prompt-card-in .35s both` (~line 148).
3. Grep the repo for `card-in` and confirm remaining hits are only `site.css` `.round` + its keyframe (and any `modal-in` false positives).

## Boundaries

- Do NOT change `.round` animation values in `site.css`.
- Do NOT unify the two keyframes into one definition — they serve different surfaces.
- Do NOT edit `animation-plans/SCOPE.md` in this task.

## Verification

- **Mechanical**: `npm run build` succeeds.
- **Feel check**: Pages using legacy `.prompt-card` (home/featured prompts if still routed) stagger in with 7px lift; Library `.round` cards still use 10px / 0.45s stagger.
- Grep: `prompt-card-in` appears only in `styles.css`; `keyframes card-in` only in `site.css`.
- **Done when**: No duplicate `@keyframes card-in` name across stylesheets.
