import { tracks } from "./prompts.js";

// Roles a learner can pick on first sign-in. The first seven are practice
// disciplines and reorder the library; the rest are identity only.
export const INTEREST_OPTIONS = [
  { id: "software-engineering", label: "Software engineer" },
  { id: "data-engineering", label: "Data engineer" },
  { id: "machine-learning", label: "ML engineer" },
  { id: "ai-engineering", label: "AI / LLM engineer" },
  { id: "platform-infrastructure", label: "Platform / SRE" },
  { id: "distributed-systems", label: "Distributed systems" },
  { id: "frontend-mobile", label: "Frontend / mobile engineer" },
  { id: "engineering-manager", label: "Engineering manager" },
  { id: "student", label: "Student" },
  { id: "other", label: "Other" },
];

const TRACK_IDS = new Set(tracks.map((track) => track.id));
// Older profiles stored the label of a single target role; "ML / AI engineer" was the
// machine learning option before AI engineering became its own discipline.
const LABEL_TO_ID = { "ML / AI engineer": "machine-learning", ...Object.fromEntries(INTEREST_OPTIONS.map((option) => [option.label, option.id])) };

export const interestLabel = (id) => INTEREST_OPTIONS.find((option) => option.id === id)?.label ?? null;

// Disciplines that should lead the library, in the order the learner picked them.
// Older profiles stored a single target role and no interests list.
export function practiceTracks(user) {
  const selected = Array.isArray(user?.interests) ? user.interests : [];
  if (selected.length) return selected.filter((id) => TRACK_IDS.has(id));
  const legacy = LABEL_TO_ID[user?.targetRole];
  return legacy && TRACK_IDS.has(legacy) ? [legacy] : [];
}

// What the profile form should show as selected, including a legacy single role.
export function selectedInterests(user) {
  if (Array.isArray(user?.interests) && user.interests.length) return user.interests;
  const legacy = LABEL_TO_ID[user?.targetRole];
  return legacy ? [legacy] : [];
}
