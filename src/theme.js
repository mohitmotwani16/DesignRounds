import { useEffect, useState } from "react";

// Colour theme: light by default for everyone. "system" (follow the OS light/dark
// setting) and the others are opt-in choices.
// The choice is a per-browser preference. index.html applies it before the app
// loads so there is no flash of the wrong theme.
export const THEMES = [
  ["system", "System"],
  ["light", "Light"],
  ["dark", "Dark"],
  ["mono", "Monochrome"],
];
const KEY = "designrounds:theme";
const DEFAULT_CHOICE = "light";
// No window during build-time prerendering: everything below degrades to defaults.
const browser = typeof window !== "undefined";
const darkQuery = browser ? window.matchMedia?.("(prefers-color-scheme: dark)") : null;

function readChoice() {
  if (!browser) return DEFAULT_CHOICE;
  try {
    const value = window.localStorage.getItem(KEY);
    return THEMES.some(([id]) => id === value) ? value : DEFAULT_CHOICE;
  } catch {
    return DEFAULT_CHOICE;
  }
}

const resolve = (choice) => (choice === "system" ? (darkQuery?.matches ? "dark" : "light") : choice);

function apply(choice) {
  const theme = resolve(choice);
  if (!browser) return theme;
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
