import { BlockList, isIP } from "node:net";
// Turn public pages and search results into short, attributable excerpts.
// Full articles and transcripts are not stored.

const EXCERPT_MAX = 900;

const SKIP_HOSTS = [
  "educative.io",
  "udemy.com",
  "coursera.org",
  "facebook.com",
  "instagram.com",
  "pinterest.com",
  "tiktok.com",
  "localhost",
  "metadata.google.internal",
];

// Everything that isn't the public internet: loopback, private, link-local, carrier-grade
// NAT, documentation, benchmarking, multicast, reserved and the IPv6 transition prefixes
// that can embed a private IPv4 address.
const NON_PUBLIC = new BlockList();
for (const [network, prefix] of [
  ["0.0.0.0", 8], ["10.0.0.0", 8], ["100.64.0.0", 10], ["127.0.0.0", 8], ["169.254.0.0", 16], ["172.16.0.0", 12],
  ["192.0.0.0", 24], ["192.0.2.0", 24], ["192.168.0.0", 16], ["198.18.0.0", 15], ["198.51.100.0", 24], ["203.0.113.0", 24],
  ["224.0.0.0", 4], ["240.0.0.0", 4],
]) NON_PUBLIC.addSubnet(network, prefix, "ipv4");
for (const [network, prefix] of [
  ["::", 128], ["::1", 128], ["64:ff9b::", 96], ["100::", 64], ["2001::", 32], ["2001:db8::", 32], ["2002::", 16],
  ["fc00::", 7], ["fe80::", 10], ["fec0::", 10], ["ff00::", 8],
]) NON_PUBLIC.addSubnet(network, prefix, "ipv6");

export function isPrivateAddress(ip) {
  const value = String(ip).trim().toLowerCase();
  const family = isIP(value);
  // Anything that isn't a plain address can't be shown to be public.
  if (!family) return true;
  try {
    // BlockList also applies the IPv4 ranges to IPv4-mapped forms such as ::ffff:7f00:1.
    return NON_PUBLIC.check(value, family === 4 ? "ipv4" : "ipv6");
  } catch {
    return true;
  }
}

export function decodeEntities(value) {
  return value
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;|&apos;/g, "'");
}

export function htmlToText(html) {
  const stripped = String(html)
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<(nav|footer|header|aside|form|svg)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, " ");
  return decodeEntities(stripped).replace(/\s+/g, " ").trim();
}

export function pageTitle(html) {
  const match = String(html).match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return match ? decodeEntities(match[1]).replace(/\s+/g, " ").trim().slice(0, 180) : "";
}

export function excerptFrom(text) {
  const clean = String(text).replace(/\s+/g, " ").trim();
  if (clean.length < 200) return "";
  return clean.slice(0, EXCERPT_MAX);
}

export function searchResultUrls(html) {
  const urls = [];
  const seen = new Set();
  const add = (raw) => {
    let href = decodeEntities(String(raw)).trim();
    try {
      const parsed = new URL(href, "https://duckduckgo.com");
      const uddg = parsed.searchParams.get("uddg");
      if (uddg) href = uddg;
      else if (parsed.hostname.endsWith("duckduckgo.com")) return;
      const target = new URL(href);
      if (target.protocol !== "http:" && target.protocol !== "https:") return;
      target.hash = "";
      const key = target.toString();
      if (seen.has(key) || skipHost(target.hostname)) return;
      seen.add(key);
      urls.push(key);
    } catch {
      // Ignore malformed search hits.
    }
  };
  for (const match of String(html).matchAll(/href="([^"]+)"/gi)) add(match[1]);
  return urls;
}

export function skipHost(hostname) {
  const host = hostname.toLowerCase().replace(/^www\./, "");
  return SKIP_HOSTS.some((blocked) => host === blocked || host.endsWith(`.${blocked}`));
}

export function sourceKind(url, title, text) {
  const host = new URL(url).hostname.toLowerCase();
  const haystack = `${host} ${title} ${url}`.toLowerCase();
  if (host.includes("youtube.com") || host === "youtu.be" || /\btranscript\b/.test(haystack)) return "transcript";
  if (/(^|\.)reddit\.com$/.test(host) || host.includes("stackoverflow.com") || host.includes("stackexchange.com")) return "forum";
  if (host.startsWith("docs.") || host.includes("developer.") || /\/docs(\/|$)/.test(url)) return "docs";
  if (text && title) return "blog";
  return "other";
}

export function youtubeCaptionTracks(html) {
  const marker = "\"captionTracks\":";
  const start = String(html).indexOf(marker);
  if (start < 0) return [];
  const bracket = html.indexOf("[", start);
  if (bracket < 0) return [];
  let depth = 0;
  let inString = false;
  let escape = false;
  for (let i = bracket; i < html.length; i += 1) {
    const char = html[i];
    if (inString) {
      if (escape) escape = false;
      else if (char === "\\") escape = true;
      else if (char === "\"") inString = false;
      continue;
    }
    if (char === "\"") inString = true;
    else if (char === "[") depth += 1;
    else if (char === "]") {
      depth -= 1;
      if (depth === 0) {
        try {
          return JSON.parse(html.slice(bracket, i + 1));
        } catch {
          return [];
        }
      }
    }
  }
  return [];
}

export function captionText(body) {
  const raw = String(body);
  if (raw.trim().startsWith("{") || raw.trim().startsWith("[")) {
    try {
      const events = JSON.parse(raw).events ?? [];
      const text = events.flatMap((event) => event.segs ?? []).map((seg) => seg.utf8 || "").join(" ");
      return excerptFrom(decodeEntities(text));
    } catch {
      return "";
    }
  }
  const lines = [...raw.matchAll(/<text[^>]*>([\s\S]*?)<\/text>/gi)].map((match) => decodeEntities(match[1]));
  return excerptFrom(lines.join(" "));
}

export function englishCaptionUrl(tracks) {
  if (!Array.isArray(tracks) || !tracks.length) return null;
  const preferred = tracks.find((track) => String(track.languageCode || "").toLowerCase().startsWith("en")) || tracks[0];
  if (!preferred?.baseUrl) return null;
  const url = preferred.baseUrl.startsWith("http") ? preferred.baseUrl : `https:${preferred.baseUrl}`;
  try {
    return new URL(url).toString();
  } catch {
    return null;
  }
}

// Very small robots.txt reader: User-agent: * disallows, prefix match.
export function robotsAllows(robotsTxt, pathname) {
  const lines = String(robotsTxt).split(/\r?\n/).map((line) => line.replace(/#.*$/, "").trim());
  let applies = false;
  const disallows = [];
  for (const line of lines) {
    const agent = line.match(/^user-agent:\s*(.+)$/i);
    if (agent) {
      applies = agent[1].trim() === "*";
      continue;
    }
    if (!applies) continue;
    const disallow = line.match(/^disallow:\s*(.*)$/i);
    if (disallow) disallows.push(disallow[1].trim());
  }
  return !disallows.some((rule) => rule && (pathname === rule || pathname.startsWith(rule)));
}
