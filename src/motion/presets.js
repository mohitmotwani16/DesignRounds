import { useEffect, useState } from "react";

/** Critically damped UI — Apple default (bounce 0). */
export const SPRING_UI = { type: "spring", bounce: 0, duration: 0.35 };

/** Material panel / modal surface. */
export const SPRING_MATERIAL = { type: "spring", bounce: 0, duration: 0.28 };

/** Drawer / side panel settle (slight bounce only after flick — applied in JS when velocity high). */
export const SPRING_DRAWER = { type: "spring", bounce: 0.15, duration: 0.3 };

export function usePrefersReducedMotion() {
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

/** px/s velocity from the last two pointer samples. */
export function pointerVelocityPxPerSec(sample, clientX) {
  if (!sample) return 0;
  const dt = performance.now() - sample.t;
  if (dt <= 0) return 0;
  return ((clientX - sample.x) / dt) * 1000;
}
