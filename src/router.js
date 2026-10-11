import { useEffect, useState } from "react";

export function navigate(path, { replace = false } = {}) {
  const hash = `#${path}`;
  if (replace) {
    window.history.replaceState(null, "", hash);
    // Fire asynchronously like a real hash change, so state set just before
    // navigating (e.g. the signed-in user) renders together with the new route.
    window.setTimeout(() => window.dispatchEvent(new HashChangeEvent("hashchange")), 0);
  } else {
    window.location.hash = path;
  }
}

function parseHash() {
  const raw = window.location.hash.slice(1) || "/";
  const [path, search = ""] = raw.split("?");
  return { path: path || "/", params: new URLSearchParams(search), raw };
}

export function useRoute() {
  const [route, setRoute] = useState(parseHash);
  useEffect(() => {
    const onChange = () => setRoute(parseHash());
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);
  return route;
}

// Only allow in-app destinations after sign-in.
export function safeNext(value, fallback = "/library") {
  return value && value.startsWith("/") && !value.startsWith("//") ? value : fallback;
}
