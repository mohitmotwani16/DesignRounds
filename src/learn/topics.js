import { useEffect, useState } from "react";

// Topic bodies, one module per topic, each its own chunk: a reader downloads only the
// article they open. The prerenderer loads them all first (preloadAllTopics) so every
// page ships as complete HTML, and the client loads the current one before its first
// render (see main.jsx), so the prerendered article never flashes away.
const loaders = import.meta.glob("./topics/*.js");
const cache = new Map();

const fileFor = (slug) => `./topics/${slug}.js`;

export const hasTopicBody = (slug) => fileFor(slug) in loaders;

export async function loadTopic(slug) {
  if (cache.has(slug)) return cache.get(slug);
  const load = loaders[fileFor(slug)];
  if (!load) return null;
  const body = (await load()).default;
  cache.set(slug, body);
  return body;
}

export async function preloadAllTopics() {
  await Promise.all(Object.keys(loaders).map((file) => loadTopic(file.slice("./topics/".length, -".js".length))));
}

// The body of a topic: immediately when it's already loaded, otherwise after its
// chunk arrives (client-side navigation between topics).
export function useTopic(slug) {
  const [body, setBody] = useState(() => cache.get(slug) ?? null);
  useEffect(() => {
    let cancelled = false;
    if (cache.has(slug)) { setBody(cache.get(slug)); return undefined; }
    setBody(null);
    loadTopic(slug).then((loaded) => { if (!cancelled) setBody(loaded); });
    return () => { cancelled = true; };
  }, [slug]);
  return body;
}
