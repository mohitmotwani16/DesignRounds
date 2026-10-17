import { practiceTracks } from "./interests.js";
import { prompts } from "./prompts.js";

const LEVELS = ["Beginner", "Intermediate", "Advanced"];
const EXPERIENCE_LEVELS = { "Student / new grad": 0, "1–3 years": 0, "3–6 years": 1, "6–10 years": 2, "10+ years": 2 };
export const DEFAULT_TRACK = "software-engineering";
const rank = (prompt) => Math.max(0, LEVELS.indexOf(prompt.difficulty));

export const trackForUser = (user) => practiceTracks(user)[0] || DEFAULT_TRACK;
export const levelForUser = (user) => EXPERIENCE_LEVELS[user?.experienceLevel] ?? 0;

export function recommendRounds(trackId, { done = new Set(), level = 0 } = {}) {
  const free = prompts.filter((prompt) => prompt.track === trackId && prompt.access === "free");
  const fresh = free.filter((prompt) => !done.has(prompt.id));
  return [...(fresh.length ? fresh : free)]
    .sort((a, b) => Math.abs(rank(a) - level) - Math.abs(rank(b) - level) || rank(a) - rank(b) || Number(Boolean(b.popular)) - Number(Boolean(a.popular)) || a.minutes - b.minutes)
    .slice(0, 3);
}

export function recommendedFreeRound(user) {
  return recommendRounds(trackForUser(user), { level: levelForUser(user) })[0] ?? prompts.find((prompt) => prompt.access === "free");
}
