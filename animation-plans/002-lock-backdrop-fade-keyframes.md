# 002 — Define fade keyframe for lock backdrop

- **Status**: DONE
- **Commit**: 37ab93c
- **Severity**: MEDIUM
- **Category**: Cohesion & tokens
- **Estimated scope**: 1 file, ~6 lines

## Problem

The Plus locked-state backdrop references a keyframe name that does not exist anywhere in the repository. Browsers ignore invalid animations; the backdrop may pop in without the intended 200ms opacity fade.

```css
/* src/styles/site.css:898 — current */
.lock-backdrop { position: fixed; inset: 0; z-index: 100; display: grid; place-items: center; padding: 20px; background: rgba(10, 10, 14, 0.5); backdrop-filter: blur(4px); overscroll-behavior: contain; animation: fade 0.2s forwards; }
```

No `@keyframes fade` exists (grep the repo — zero definitions).

## Target

Add an opacity-only entrance keyframe next to the lock dialog section. Duration 200ms fits the modal backdrop budget (150–250ms for small overlays). Use `ease-out` timing on the shorthand.

```css
@keyframes lock-backdrop-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

.lock-backdrop {
  /* ...existing properties unchanged... */
  animation: lock-backdrop-in 0.2s ease-out forwards;
}
```

Under reduced motion, keep a short opacity fade only (no movement) — match audit accessibility guidance:

```css
@media (prefers-reduced-motion: reduce) {
  .lock-backdrop { animation: lock-backdrop-in 0.2s ease forwards; }
  .lock-modal { animation: none; opacity: 1; transform: none; }
}
```

(If `.lock-modal` already has RM handling elsewhere, merge into the nearest existing block instead of duplicating.)

## Repo conventions to follow

- Keyframes for site chrome live in `src/styles/site.css` near their consumers (see `learn-prompt-in` at ~1687).
- Prefer a **scoped name** (`lock-backdrop-in`) over generic `fade` to avoid future collisions.
- Exemplar opacity enter: `learn-prompt-in` uses transform + opacity; this backdrop should stay **opacity only** (no transform on fullscreen overlay).

## Steps

1. In `src/styles/site.css`, immediately **before** the `.lock-backdrop` rule (~line 898), insert:

```css
@keyframes lock-backdrop-in { from { opacity: 0; } to { opacity: 1; } }
```

2. Replace `animation: fade 0.2s forwards` on `.lock-backdrop` with `animation: lock-backdrop-in 0.2s ease-out forwards`.

3. Search `src/styles/site.css` for an existing `@media (prefers-reduced-motion: reduce)` block that already touches Plus/lock UI. If none, add a small block after `.lock-modal` rules:

```css
@media (prefers-reduced-motion: reduce) {
  .lock-backdrop { animation: lock-backdrop-in 0.2s ease forwards; }
  .lock-modal { animation: none; opacity: 1; transform: none; }
}
```

4. Confirm no other selector still references `animation: fade`.

## Boundaries

- Do NOT add blur animation — `backdrop-filter` stays static.
- Do NOT rename `rise` on `.lock-modal` beyond reduced-motion handling above.
- Do NOT edit React lock dialog components unless markup is required (it is not).

## Verification

- **Mechanical**: `npm run build` succeeds.
- **Feel check**: Trigger the Plus locked dialog (or component that uses `.lock-backdrop`):
  - Backdrop eases in over ~200ms (opacity only).
  - In DevTools → Animations, confirm `lock-backdrop-in` runs once on open.
- Set `prefers-reduced-motion: reduce`: backdrop may still fade briefly; `.lock-modal` should not translate.
- **Done when**: `@keyframes lock-backdrop-in` exists, `.lock-backdrop` references it, and no `animation: fade` remains.
