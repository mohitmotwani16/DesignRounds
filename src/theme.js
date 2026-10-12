import { useEffect, useState } from "react";

// Colour theme: "system" follows the OS light/dark setting; the others are fixed.
// The choice is a per-browser preference. index.html applies it before the app
// loads so there is no flash of the wrong theme.
export const THEMES = [
  ["system", "System"],
  ["light", "Light"],
  ["dark", "Dark"],
  ["mono", "Monochrome"],
];
const KEY = "designrounds:theme";
const darkQuery = window.matchMedia?.("(prefers-color-scheme: dark)");

function readChoice() {
  try {
    const value = window.localStorage.getItem(KEY);
    return THEMES.some(([id]) => id === value) ? value : "system";
  } catch {
    return "system";
  }
}

const resolve = (choice) => (choice === "system" ? (darkQuery?.matches ? "dark" : "light") : choice);

function apply(choice) {
  const theme = resolve(choice);
  document.documentElement.dataset.theme = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", theme === "dark" ? "#1a1d24" : "#f8f9fb");
  return theme;
}

const listeners = new Set();
let current = { choice: readChoice() };
current.theme = apply(current.choice);

darkQuery?.addEventListener?.("change", () => {
  if (current.choice !== "system") return;
  current = { ...current, theme: apply("system") };
  listeners.forEach((listener) => listener(current));
});

export function setTheme(choice) {
  try { window.localStorage.setItem(KEY, choice); } catch { /* preference only */ }
  current = { choice, theme: apply(choice) };
  listeners.forEach((listener) => listener(current));
}

// { choice, theme } where theme is the resolved "light" | "dark" | "mono".
export function useTheme() {
  const [state, setState] = useState(current);
  useEffect(() => {
    listeners.add(setState);
    setState(current);
    return () => listeners.delete(setState);
  }, []);
  return state;
}
