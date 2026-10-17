import { useEffect, useRef, useState } from "react";
import { Search, X } from "lucide-react";

// Ctrl K (⌘ K on a Mac) anywhere, or "/" when not already typing, focuses the page's
// search. Shared by the library, the handbook and the handbook's sidebar.
export function useSearchShortcut(ref) {
  useEffect(() => {
    const onKeyDown = (event) => {
      const active = document.activeElement;
      const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(active?.tagName) || active?.isContentEditable;
      const combo = (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k";
      if (!combo && !(event.key === "/" && !typing)) return;
      // A hidden field (the sidebar inside a closed drawer) can't take focus; leave the key alone.
      if (!ref.current || ref.current.offsetParent === null) return;
      event.preventDefault();
      ref.current.focus();
      ref.current.select();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [ref]);
}

// The shortcut hint shows ⌘ K on Apple devices. It starts as Ctrl K so the prerendered
// HTML and the first client render match.
function useShortcutLabel() {
  const [label, setLabel] = useState("Ctrl K");
  useEffect(() => {
    if (/Mac|iPhone|iPad/.test(navigator.userAgentData?.platform || navigator.platform || navigator.userAgent)) setLabel("⌘ K");
  }, []);
  return label;
}

export function ShortcutHint() {
  return <kbd className="search-kbd" aria-hidden="true">{useShortcutLabel()}</kbd>;
}

// The one search box used by the library and the handbook: same look, same shortcuts.
// Escape clears it.
export function SearchBox({ value, onChange, placeholder, label, className = "" }) {
  const ref = useRef(null);
  useSearchShortcut(ref);

  return (
    <label className={`search-box ${className}`}>
      <Search size={20} aria-hidden="true" />
      <span className="sr-only">{label}</span>
      <input
        ref={ref}
        type="search"
        name="q"
        autoComplete="off"
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => { if (event.key === "Escape" && value) { event.preventDefault(); onChange(""); } }}
      />
      {value
        ? <button type="button" className="search-box-clear" onClick={() => { onChange(""); ref.current?.focus(); }} aria-label="Clear search"><X size={15} /></button>
        : <ShortcutHint />}
    </label>
  );
}
