import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import {
  captionText,
  englishCaptionUrl,
  excerptFrom,
  htmlToText,
  isPrivateAddress,
  pageTitle,
  robotsAllows,
  searchResultUrls,
  skipHost,
  sourceKind,
  youtubeCaptionTracks,
} from "./extract.js";

const USER_AGENT = "DesignRoundsReferenceBot/1.0 (+https://designrounds.in; interview reference indexing)";
const PAGE_LIMIT = 5;
const FETCH_TIMEOUT_MS = 12_000;
const BODY_LIMIT = 800_000;

export function searchQueries(prompt) {
  const title = String(prompt.title).replace(/^design\s+(a|an)\s+/i, "").trim();
  return [
    `${title} system design interview`,
    `${title} system design architecture transcript`,
  ];
}

async function assertPublic(url, lookupImpl) {
  const target = new URL(url);
  if (target.protocol !== "http:" && target.protocol !== "https:") throw new Error("unsupported protocol");
  if (target.username || target.password) throw new Error("credentials in url");
  if (skipHost(target.hostname)) throw new Error("blocked host");
  if (isIP(target.hostname)) {
    if (isPrivateAddress(target.hostname)) throw new Error("private address");
    return target;
  }
  const records = await lookupImpl(target.hostname, { all: true });
  if (!records.length || records.some((record) => isPrivateAddress(record.address))) throw new Error("private address");
  return target;
}

async function readBody(response) {
  const reader = response.body?.getReader();
  if (!reader) return "";
  const chunks = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > BODY_LIMIT) {
      await reader.cancel();
      break;
    }
    chunks.push(value);
  }
  return new TextDecoder().decode(Buffer.concat(chunks.map((chunk) => Buffer.from(chunk))));
}

async function fetchPublic(url, fetchImpl, pause, lookupImpl) {
  let current = url;
  for (let hop = 0; hop < 4; hop += 1) {
    const target = await assertPublic(current, lookupImpl);
    if (pause) await pause();
    const response = await fetchImpl(target, {
      redirect: "manual",
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      headers: { "User-Agent": USER_AGENT, Accept: "text/html,application/xhtml+xml,text/plain,application/xml;q=0.8", "Accept-Language": "en" },
    });
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location) throw new Error("redirect without location");
      current = new URL(location, target).toString();
      continue;
    }
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const type = (response.headers.get("content-type") || "").toLowerCase();
    if (type && !/text\/html|text\/plain|text\/xml|application\/xml|application\/xhtml|application\/json/.test(type)) {
      throw new Error("unsupported content type");
    }
    return { url: target.toString(), body: await readBody(response) };
  }
  throw new Error("too many redirects");
}

const robotsCache = new Map();

async function allowedByRobots(url, fetchImpl, lookupImpl) {
  const target = new URL(url);
  if (target.hostname.includes("youtube.com") || target.hostname === "youtu.be") return true;
  const origin = target.origin;
  if (!robotsCache.has(origin)) {
    robotsCache.set(origin, fetchPublic(`${origin}/robots.txt`, fetchImpl, null, lookupImpl)
      .then((page) => page.body)
      .catch(() => ""));
  }
  const robots = await robotsCache.get(origin);
  return robotsAllows(robots, target.pathname);
}

async function pageSource(url, fetchImpl, pause, lookupImpl) {
  if (!(await allowedByRobots(url, fetchImpl, lookupImpl))) return null;
  const page = await fetchPublic(url, fetchImpl, pause, lookupImpl);
  const host = new URL(page.url).hostname;
  if (host.includes("youtube.com") || host === "youtu.be") {
    const captionUrl = englishCaptionUrl(youtubeCaptionTracks(page.body));
    if (!captionUrl) return null;
    const captions = await fetchPublic(captionUrl, fetchImpl, pause, lookupImpl);
    const excerpt = captionText(captions.body);
    if (!excerpt) return null;
    return { url: page.url, title: pageTitle(page.body) || "Video transcript", kind: "transcript", excerpt };
  }
  const text = htmlToText(page.body);
  const excerpt = excerptFrom(text);
  if (!excerpt) return null;
  const title = pageTitle(page.body);
  return { url: page.url, title, kind: sourceKind(page.url, title, text), excerpt };
}

// Collect a handful of public explanations for one question. Failures of a
// single page are skipped; a search outage rejects so the job can retry.
export async function gatherSources(prompt, { fetchImpl = globalThis.fetch, pauseMs = 400, lookupImpl = lookup } = {}) {
  const pause = pauseMs > 0 ? () => new Promise((resolve) => setTimeout(resolve, pauseMs)) : null;
  const urls = [];
  const seen = new Set();
  for (const query of searchQueries(prompt)) {
    const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
    const page = await fetchPublic(searchUrl, fetchImpl, pause, lookupImpl);
    for (const url of searchResultUrls(page.body)) {
      if (seen.has(url)) continue;
      seen.add(url);
      urls.push(url);
    }
  }
  const sources = [];
  for (const url of urls) {
    if (sources.length >= PAGE_LIMIT) break;
    try {
      const source = await pageSource(url, fetchImpl, pause, lookupImpl);
      if (source) sources.push(source);
    } catch (error) {
      console.warn(`[answers] skip ${url}: ${error.message}`);
    }
  }
  return sources;
}
