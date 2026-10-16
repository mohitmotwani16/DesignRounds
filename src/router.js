import { createElement, useEffect, useState } from "react";

// Path-based routing on the History API. Every public page has a real URL
// (/library, /system-design/url-shortener, ...) that search engines can index; the
// old hash URLs (#/library) are translated once on load so existing links keep working.
//
// During build-time prerendering there is no window: the prerenderer sets the URL
// with setServerLocation() before rendering.

let serverLocation = null;

export function setServerLocation(url) {
  serverLocation = url;
}

const NAVIGATE_EVENT = "designrounds:navigate";

function currentUrl() {
  if (typeof window === "undefined") return serverLocation ?? "/";
  return `${window.location.pathname}${window.location.search}${window.location.hash}`;
}

export function parseUrl(url) {
  const [beforeHash, hash = ""] = url.split("#");
  const [rawPath, search = ""] = beforeHash.split("?");
  const path = rawPath.length > 1 ? rawPath.replace(/\/+$/, "") : "/";
  return { path: path || "/", params: new URLSearchParams(search), hash, raw: `${path}${search ? `?${search}` : ""}` };
}

export function navigate(to, { replace = false } = {}) {
  if (to === currentUrl()) return;
  window.history[replace ? "replaceState" : "pushState"](null, "", to);
  // Asynchronous like a real navigation, so state set just before navigating
  // (e.g. the signed-in user) renders together with the new route.
  window.setTimeout(() => window.dispatchEvent(new Event(NAVIGATE_EVENT)), 0);
}

export function useRoute() {
  const [route, setRoute] = useState(() => parseUrl(currentUrl()));
  useEffect(() => {
    const onChange = () => setRoute(parseUrl(currentUrl()));
    window.addEventListener("popstate", onChange);
    window.addEventListener(NAVIGATE_EVENT, onChange);
    return () => {
      window.removeEventListener("popstate", onChange);
      window.removeEventListener(NAVIGATE_EVENT, onChange);
    };
  }, []);
  return route;
}

// A real link (crawlable <a href>) that navigates inside the app. Modified clicks
// (new tab, new window) and external links keep the browser's default behaviour.
export function Link({ to, onClick, children, ...rest }) {
  return createElement("a", {
    ...rest,
    href: to,
    onClick: (event) => {
      onClick?.(event);
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || rest.target) return;
      if (!to.startsWith("/") || to.startsWith("//")) return;
      event.preventDefault();
      navigate(to);
    },
  }, children);
}

// Old hash-routed URLs (designrounds.in/#/library?track=x) map to their new paths.
export function legacyHashTarget(hash) {
  if (!hash.startsWith("#/")) return null;
  const { path, params } = parseUrl(hash.slice(1));
  if (path === "/" && params.get("s")) return `/#${params.get("s")}`;
  if (path === "/library" && params.get("track")) return `/library/${params.get("track")}`;
  return `${path}${params.toString() ? `?${params}` : ""}`;
}

if (typeof window !== "undefined") {
  const target = legacyHashTarget(window.location.hash);
  if (target) window.history.replaceState(null, "", target);
}

// Only allow in-app destinations after sign-in. Browsers treat "\" as "/",
// so "/\evil.com" would leave the site.
export function safeNext(value, fallback = "/library") {
  return typeof value === "string" && /^\/(?![/\\])[^\\\u0000-\u001f]*$/.test(value) ? value : fallback;
}
