import express from "express";
import { prompts } from "../../src/data/prompts.js";
import { plusBriefs } from "../content/round-briefs.js";
import { loadGuideExcerpts } from "../content/guide-excerpts.js";
import { HttpError, route } from "../http.js";

// Full practice rounds for the server: the public catalog plus the Plus rounds'
// briefs, which only the server holds. Everything server-side (sessions, the AI
// interviewer and reviews) reads rounds from here.
export const fullPrompts = prompts.map((prompt) => ({ ...prompt, ...(plusBriefs[prompt.id] ?? {}) }));
export const promptById = new Map(fullPrompts.map((prompt) => [prompt.id, prompt]));

const excerpts = loadGuideExcerpts();

// Entitlements are decided here, never by the client.
export function canAccessRound(user, prompt) {
  return prompt.access === "free" || user?.plan === "plus";
}

// The detailed brief of a round: what a learner needs to design it.
export function briefFor(prompt) {
  return {
    requirements: prompt.requirements ?? [],
    prerequisites: prompt.prerequisites ?? [],
    expectedOutcome: prompt.expectedOutcome ?? "",
  };
}

export const roundsRouter = express.Router();

// A round's full page content. Free rounds are public (their content is also
// prerendered); Plus rounds need a signed-in Plus member.
roundsRouter.get("/rounds/:id", route(async (req, res) => {
  const prompt = promptById.get(req.params.id);
  if (!prompt) throw new HttpError(404, "NOT_FOUND", "No such design round.");
  if (!canAccessRound(req.user, prompt)) {
    if (!req.user) throw new HttpError(401, "AUTH_REQUIRED", "Sign in with a Plus account to open this round.");
    throw new HttpError(403, "PLAN_REQUIRED", "This round is part of the Plus plan.");
  }
  const guide = excerpts[prompt.id] ?? { scale: "", mistakes: [], questions: [] };
  res.json({ round: { id: prompt.id, ...briefFor(prompt), guide } });
}));
