import { HttpError } from "../../http.js";

// A failed AI call. `code` is stable and safe to show; `detail` is for server logs only.
export class AiError extends Error {
  constructor(code, message, detail) {
    super(message);
    this.code = code;
    this.detail = detail;
  }
}

const userFacing = {
  RATE_LIMITED: [503, "The AI is busy right now. Try again in a minute."],
  TIMEOUT: [504, "The AI took too long to respond. Try again."],
  INVALID_OUTPUT: [502, "The AI returned an incomplete response. Try again."],
  NETWORK: [502, "Couldn't reach the AI service. Try again shortly."],
  AUTH: [503, "The AI service isn't configured correctly. We've logged the problem."],
  MISCONFIGURED: [503, "The AI service isn't configured correctly. We've logged the problem."],
  REFUSED: [422, "The AI couldn't respond to this. Try rewording your last message or design notes."],
  PROVIDER_ERROR: [502, "The AI service returned an error. Try again shortly."],
  DISABLED: [503, "AI features are not available right now."],
};

// Every AI failure releases the learner's credit, so each message says so.
export function toHttpError(error) {
  const [status, message] = userFacing[error.code] || userFacing.PROVIDER_ERROR;
  return new HttpError(status, `AI_${error.code || "PROVIDER_ERROR"}`, `${message} No credit was used.`);
}
