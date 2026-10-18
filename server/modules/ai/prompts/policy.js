import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Shared operating rules for every DesignRounds AI task (final review, interviewer).
// Task prompts are appended after this. The text lives in
// server/content/interviewer/policy.md, which the Universal Context Setter also
// renders, so there is one source. Bump the version on any wording change; it is
// recorded with each stored result.
export const policyVersion = "policy-v1";

const file = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "content", "interviewer", "policy.md");

export const policy = readFileSync(file, "utf8").replace(/\r\n/g, "\n").replace(/\n$/, "");
