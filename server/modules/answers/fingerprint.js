import crypto from "node:crypto";

// Identity of a question for pool rebuilds. A title or requirement edit changes
// the fingerprint and queues a new pool; wording-neutral catalog fields do not.
export function promptFingerprint(prompt) {
  const payload = JSON.stringify({
    id: prompt.id,
    title: prompt.title,
    description: prompt.description,
    track: prompt.track,
    difficulty: prompt.difficulty,
    requirements: prompt.requirements ?? [],
    considerations: prompt.considerations ?? [],
    expectedOutcome: prompt.expectedOutcome ?? "",
  });
  return crypto.createHash("sha256").update(payload).digest("hex").slice(0, 16);
}
