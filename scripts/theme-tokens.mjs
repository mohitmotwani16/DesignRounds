// Generates src/styles/theme.css: the colour tokens used by the stylesheets, with a
// value for each theme (light, dark, mono).
//
//   npm run theme            regenerate theme.css from the tokens used in the CSS
//   npm run theme -- --migrate   one-time: rewrite raw hex colours in the CSS into tokens
//
// Tokens are named by role and light-theme colour, e.g. var(--bg-f4f5f7) is a background
// that is #f4f5f7 in the light theme. The role decides how the colour adapts: dark
// backgrounds stay distinct from text, accent text is lightened for contrast, and so on.
// Write new CSS with tokens (any role-hex name works) and rerun `npm run theme`.
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cssFiles = ["src/styles.css", "src/styles/library.css", "src/styles/workspace.css", "src/styles/account.css"].map((file) => path.join(root, file));
const themeFile = path.join(root, "src/styles/theme.css");

const FG = new Set(["color", "fill", "caret-color", "accent-color", "text-decoration-color", "-webkit-text-fill-color"]);
const roleFor = (property) => {
  if (property.startsWith("--")) {
    if (/bg|paper|canvas|surface/.test(property)) return "bg";
    if (/line|border/.test(property)) return "bd";
    return "fg";
  }
  if (property.startsWith("background")) return "bg";
  if (/^(border|outline|stroke|box-shadow|column-rule)/.test(property)) return "bd";
  return FG.has(property) ? "fg" : "fg";
};

function normalizeHex(hex) {
  let value = hex.slice(1).toLowerCase();
  if (value.length === 3 || value.length === 4) value = [...value].map((char) => char + char).join("");
  return value;
}

if (process.argv.includes("--migrate")) {
  for (const file of cssFiles) {
    const source = readFileSync(file, "utf8");
    // Declarations: "property: value" after "{" or ";" (selectors like a:hover are never preceded by those).
    const migrated = source.replace(/([{;]\s*)(--[\w-]+|[a-z-]+)(\s*:\s*)([^;{}]*)/g, (match, lead, property, colon, value) => {
      if (property.startsWith("--") && /^--(bg|fg|bd)-[0-9a-f]+$/.test(property)) return match;
      const role = roleFor(property);
      return lead + property + colon + value.replace(/#[0-9a-fA-F]{3,8}\b/g, (hex) => `var(--${role}-${normalizeHex(hex)})`);
    });
    writeFileSync(file, migrated);
    console.log(`migrated ${path.relative(root, file)}`);
  }
}

// ---- Colour maths ----------------------------------------------------------------
function toHsl(hex) {
  const [r, g, b] = [0, 2, 4].map((offset) => parseInt(hex.slice(offset, offset + 2), 16) / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
    h /= 6;
  }
  // c (chroma) measures how colourful it really is; HSL saturation is misleading near white.
  return { h, s, l, c: max - min, alpha: hex.length === 8 ? hex.slice(6) : "" };
}

function toHex({ h, s, l, alpha }) {
  const clamp = (value) => Math.min(1, Math.max(0, value));
  s = clamp(s);
  l = clamp(l);
  const hue = (p, q, t) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  let r = l;
  let g = l;
  let b = l;
  if (s) {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue(p, q, h + 1 / 3);
    g = hue(p, q, h);
    b = hue(p, q, h - 1 / 3);
  }
  return `#${[r, g, b].map((channel) => Math.round(channel * 255).toString(16).padStart(2, "0")).join("")}${alpha}`;
}

const CHROMATIC = 0.12;

function dark(role, color) {
  // Pure greys pick up the palette's slate-blue tint so dark surfaces feel consistent.
  if (color.c < 0.02 && role !== "fg") color = { ...color, h: 0.61, s: 0.12 };
  const saturated = color.c >= CHROMATIC;
  // Near-neutral colours keep only a hint of their hue once darkened.
  if (!saturated) color = { ...color, s: Math.min(color.s, 0.15) };
  const { s, l } = color;
  if (role === "bg") {
    if (!saturated) {
      // Keep surface levels apart: cards (white) stay lighter than the page (#f8f9fb).
      if (l > 0.95) return { ...color, l: 0.18 - (1 - l) * 1.6 };
      if (l > 0.9) return { ...color, l: 0.1 - (0.95 - l) * 0.4 };
      if (l > 0.5) return { ...color, l: 0.08 + (0.9 - l) * 0.6 };
      return { ...color, l: 0.32 + (0.5 - l) * 0.3 };
    }
    if (l > 0.85) return { ...color, s: s * 0.4, l: 0.2 - (1 - l) * 0.4 };
    if (l < 0.3) return { ...color, l: l + 0.12 };
    return { ...color, s: s * 0.9 };
  }
  if (role === "bd") {
    if (l > 0.8) return { ...color, s: saturated ? s * 0.55 : s, l: 0.22 + (1 - l) * 0.55 };
    if (!saturated) return { ...color, l: 0.95 - l * 0.55 };
    return { ...color, s: s * 0.9, l: Math.min(0.85, Math.max(0.6, 0.95 - l * 0.55)) };
  }
  // fg
  if (l > 0.96 && !saturated) return color; // text on accent or dark buttons stays white
  if (!saturated) return { ...color, l: 0.95 - l * 0.55 };
  if (l < 0.65) return { ...color, s: s * 0.9, l: Math.min(0.85, Math.max(0.62, 0.95 - l * 0.55)) };
  return color;
}

function mono(role, color) {
  const { l } = color;
  const gray = { ...color, s: 0 };
  if (color.c < CHROMATIC) return gray;
  if (role === "fg") return l > 0.96 ? gray : { ...gray, l: Math.min(l, 0.3) };
  if (l < 0.75) return { ...gray, l: 0.2 };
  return gray;
}

// ---- Generate theme.css ----------------------------------------------------------
const tokens = new Map();
// Tokens can also be used from JS (e.g. inline SVG styles), so source files are scanned too.
const sourceFiles = readdirSync(path.join(root, "src"), { recursive: true }).filter((file) => /\.(jsx?|css)$/.test(file)).map((file) => path.join(root, "src", file));
for (const file of new Set([...cssFiles, ...sourceFiles])) {
  if (file === themeFile) continue;
  for (const match of readFileSync(file, "utf8").matchAll(/var\(--(bg|fg|bd)-([0-9a-f]{6}(?:[0-9a-f]{2})?)\)/g)) tokens.set(`${match[1]}-${match[2]}`, { role: match[1], hex: match[2] });
}
const sorted = [...tokens.entries()].sort(([a], [b]) => a.localeCompare(b));
const block = (selector, transform, extra = "") => `${selector} {\n${extra}${sorted.map(([name, { role, hex }]) => `  --${name}: ${transform ? toHex(transform(role, toHsl(hex))) : `#${hex}`};`).join("\n")}\n}\n`;

writeFileSync(themeFile, `/* Generated by scripts/theme-tokens.mjs. Do not edit by hand; run \`npm run theme\`. */

${block(":root,\n:root[data-theme=\"light\"]", null, "  color-scheme: light;\n")}
${block(":root[data-theme=\"dark\"]", dark, "  color-scheme: dark;\n")}
${block(":root[data-theme=\"mono\"]", mono, "  color-scheme: light;\n")}`);
console.log(`wrote ${path.relative(root, themeFile)} with ${sorted.length} tokens`);

const leftovers = cssFiles.flatMap((file) => [...readFileSync(file, "utf8").matchAll(/(?<![\w-])#[0-9a-fA-F]{3,8}\b/g)].map((match) => `${path.relative(root, file)}: ${match[0]}`));
if (leftovers.length) console.warn(`raw hex colours that won't follow the theme (use tokens instead):\n  ${leftovers.slice(0, 20).join("\n  ")}`);
