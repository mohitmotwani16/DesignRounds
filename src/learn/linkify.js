// Deterministic in-text links from review coaching copy to handbook topics.
import { DISCIPLINES, TOPICS, categoryById, topicMeta } from "./catalog.js";
import { searchKeywords } from "./search-intent.js";

const MAX_LINKS = 2;
const CORE_CATEGORIES = ["foundations", "networking", "databases", "caching", "messaging", "distributed", "reliability"];

// Manual aliases when review wording doesn't match search keywords (keep small).
export const LEARN_ALIASES = {
  idempotency: ["idempotency keys", "idempotency key", "idempotent"],
  "cache-invalidation": ["cache invalidation", "explicit invalidation"],
  "slowly-changing-dimensions": ["SCD", "SCD Type 2", "slowly changing dimensions"],
};

function normalizePhrase(phrase) {
  return phrase.trim().replace(/\s+/g, " ");
}

function titlePhrase(title) {
  const head = title.split("|")[0].trim();
  const colon = head.indexOf(": ");
  if (colon > 0 && colon < 80) return normalizePhrase(head.slice(0, colon));
  return normalizePhrase(head);
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function wordBoundaryPattern(phrase) {
  const parts = phrase.split(/\s+/).filter(Boolean).map(escapeRegex);
  if (parts.length === 0) return null;
  if (parts.length === 1) return `\\b${parts[0]}\\b`;
  return `\\b${parts.join("\\s+")}\\b`;
}

function buildPhraseIndex() {
  const entries = [];
  for (const topic of TOPICS) {
    const phrases = new Set();
    phrases.add(normalizePhrase(topic.short));
    phrases.add(titlePhrase(topic.title));
    for (const keyword of searchKeywords(topic.slug)) phrases.add(normalizePhrase(keyword));
    for (const alias of LEARN_ALIASES[topic.slug] ?? []) phrases.add(normalizePhrase(alias));
    for (const phrase of phrases) {
      if (phrase.length >= 3) entries.push({ phrase, slug: topic.slug, len: phrase.length });
    }
  }
  entries.sort((a, b) => b.len - a.len);
  return entries;
}

const PHRASE_INDEX = buildPhraseIndex();

/** Slugs that may be linked for a round (core handbook + track discipline + pack topics). */
export function learnAllowlistSlugs({ track, packLearnTopics = [] }) {
  const slugs = new Set();
  for (const catId of CORE_CATEGORIES) {
    const category = categoryById(catId);
    if (category) for (const topic of category.topics) slugs.add(topic.slug);
  }
  const discipline = track ? DISCIPLINES[track] : null;
  if (discipline) {
    slugs.add(discipline.roadmap);
    for (const guide of discipline.guides) slugs.add(guide);
    for (const catId of discipline.categories) {
      const category = categoryById(catId);
      if (category) for (const topic of category.topics) slugs.add(topic.slug);
    }
  }
  for (const slug of packLearnTopics) {
    if (topicMeta(slug)) slugs.add(slug);
  }
  return [...slugs];
}

export function learnAllowlistSet(options) {
  return new Set(learnAllowlistSlugs(options));
}

/** Inserts [label](/learn/slug) markdown for up to two non-overlapping handbook matches. */
export function annotateLearnText(text, allowedSlugs) {
  const allow = allowedSlugs instanceof Set ? allowedSlugs : new Set(allowedSlugs);
  if (!text || !allow.size) return text;

  const candidates = [];
  for (const { phrase, slug } of PHRASE_INDEX) {
    if (!allow.has(slug)) continue;
    const source = wordBoundaryPattern(phrase);
    if (!source) continue;
    const pattern = new RegExp(source, "gi");
    for (const match of text.matchAll(pattern)) {
      candidates.push({ start: match.index, end: match.index + match[0].length, slug, len: match[0].length });
    }
  }

  candidates.sort((a, b) => a.start - b.start || b.len - a.len);

  const picked = [];
  const usedSlugs = new Set();
  for (const candidate of candidates) {
    if (picked.length >= MAX_LINKS) break;
    if (usedSlugs.has(candidate.slug)) continue;
    if (picked.some((other) => candidate.start < other.end && candidate.end > other.start)) continue;
    picked.push(candidate);
    usedSlugs.add(candidate.slug);
  }

  picked.sort((a, b) => b.start - a.start);
  let out = text;
  for (const { start, end, slug } of picked) {
    const label = out.slice(start, end);
    out = `${out.slice(0, start)}[${label}](/learn/${slug})${out.slice(end)}`;
  }
  return out;
}

// For tests and scripts: every alias must resolve to a catalog slug.
export function validateLearnAliases() {
  const missing = Object.keys(LEARN_ALIASES).filter((slug) => !topicMeta(slug));
  if (missing.length) throw new Error(`LEARN_ALIASES unknown slugs: ${missing.join(", ")}`);
}
