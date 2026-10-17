import { useEffect, useState } from "react";
import { api } from "../api.js";

// Published community articles. The prerenderer sets them at build time (and embeds
// them in the page as JSON), so they render in the sidebar and on their own pages with
// no flash; the client then refreshes the list from the API, which picks up articles
// published since the last build.
let articles = [];
const bodies = new Map();
const listeners = new Set();
let refreshed = false;

const notify = () => listeners.forEach((listener) => listener());

export function setCommunityArticles(list) {
  articles = list.map(({ body, ...meta }) => meta);
  for (const article of list) if (article.body !== undefined) bodies.set(article.slug, article);
  notify();
}

export const communityArticles = () => articles;
export const communityArticle = (slug) => articles.find((article) => article.slug === slug) ?? null;
export const communityInCategory = (categoryId) => articles.filter((article) => article.category === categoryId);
export const loadedCommunityArticle = (slug) => bodies.get(slug) ?? null;

export async function loadCommunityArticle(slug) {
  if (bodies.has(slug)) return bodies.get(slug);
  try {
    const { article } = await api.publishedArticle(slug);
    bodies.set(slug, article);
    if (!communityArticle(slug)) { const { body, ...meta } = article; articles = [...articles, meta]; notify(); }
    return article;
  } catch {
    return null;
  }
}

async function refresh() {
  if (refreshed) return;
  refreshed = true;
  try {
    const { articles: list } = await api.publishedArticles();
    articles = list;
    notify();
  } catch {
    // Keep whatever the page shipped with.
  }
}

// The current list; re-renders when it changes.
export function useCommunityArticles() {
  const [, setVersion] = useState(0);
  useEffect(() => {
    const listener = () => setVersion((version) => version + 1);
    listeners.add(listener);
    refresh();
    return () => listeners.delete(listener);
  }, []);
  return articles;
}

// Reads data the prerenderer embedded in the page, before the first render.
export function hydrateCommunityFromPage() {
  if (typeof document === "undefined") return;
  const element = document.getElementById("community-data");
  if (!element) return;
  try {
    setCommunityArticles(JSON.parse(element.textContent));
  } catch {
    // Ignore malformed data; the API refresh fills in.
  }
}
