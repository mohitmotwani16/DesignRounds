# 006 — Gate landing SVG packet motion in JSX

- **Status**: DONE
- **Commit**: 37ab93c
- **Severity**: MEDIUM
- **Category**: Accessibility
- **Estimated scope**: 1 file, ~12 lines

## Problem

Landing demo packets use SMIL `<animateMotion>`. CSS reduced motion hides `.lp-packet` with `display: none` inside a broad media block, but SMIL can still run in some browsers before/without that stylesheet applying, and the motion is not gated in JavaScript like the question carousel (`still` state).

```jsx
/* src/pages/Landing.jsx:246-250 — current */
{!mobile && wires.map((wire, index) => (
  <circle key={`packet-${wire.d}`} r="5" className="lp-packet">
    <animateMotion dur={`${1.3 + (index % 3) * 0.3}s`} repeatCount="indefinite" begin={`${1.6 + index * 0.3}s`} path={wire.d} />
  </circle>
))}
```

Existing patterns in the same file:

```javascript
useEffect(() => { setStill(Boolean(window.matchMedia?.("(prefers-reduced-motion: reduce)").matches)); }, []);
```

## Target

Do not render packet circles (and thus no `animateMotion`) when the user prefers reduced motion. Reuse the same `matchMedia` approach as `QuestionStack` — either lift a tiny hook or read preference once in `Demo()`.

```javascript
function usePrefersReducedMotion() {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (!mq) return undefined;
    const sync = () => setReduce(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);
  return reduce;
}
```

In `Demo()`:

```javascript
const reduceMotion = usePrefersReducedMotion();
// ...
{!mobile && !reduceMotion && wires.map((wire, index) => (
```

Keep the existing CSS RM block as defense in depth.

## Repo conventions to follow

- Follow `QuestionStack` / `useRoundClock` style: optional chaining on `matchMedia`, early return when reduced.
- Do not add npm dependencies; a local hook in `Landing.jsx` is fine (file already contains demo-only helpers).

## Steps

1. Add `usePrefersReducedMotion` near `useRoundClock` in `src/pages/Landing.jsx` (after imports, before `Demo`).
2. Call it inside `Demo()` and store result in `reduceMotion`.
3. Change packet render condition from `!mobile &&` to `!mobile && !reduceMotion &&`.
4. Optionally subscribe `useRoundClock` and `QuestionStack` to the shared hook in a later refactor — **not required** for this plan.

## Boundaries

- Do NOT remove CSS `.lp-packet` rules under reduced motion.
- Do NOT change wire draw animations (`lp-draw`) in this plan — CSS block already disables them.
- Do NOT gate the static diagram on desktop — only SMIL packets.

## Verification

- **Mechanical**: `npm run build` succeeds.
- **Feel check**: Landing page desktop demo — packets animate along wires when motion allowed.
- DevTools → Rendering → `prefers-reduced-motion: reduce` → reload: **no** `<circle>` packets in DOM (or no `animateMotion` children).
- Return motion to `no-preference`: packets return.
- **Done when**: `animateMotion` nodes render only when `!reduceMotion && !mobile`.
