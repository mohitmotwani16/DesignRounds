import { createInterviewStream, readServerEvents } from "./sse.js";

export class ApiError extends Error {
  constructor(status, code, message, details = {}) {
    super(message);
    this.status = status;
    this.code = code;
    this.problems = details.problems ?? null;
  }
}

async function request(method, path, body, { signal } = {}) {
  let response;
  try {
    response = await fetch(`/api/v1${path}`, {
      method,
      credentials: "same-origin",
      headers: body === undefined ? {} : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal,
    });
  } catch (error) {
    if (error.name === "AbortError") throw error;
    throw new ApiError(0, "NETWORK", "Can't reach DesignRounds. Check your connection and that the API server is running.");
  }
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    // Gateway errors from the hosting platform (e.g. a timeout) carry no JSON body.
    const unavailable = !payload.error && [502, 503, 504].includes(response.status);
    const fallback = unavailable ? "DesignRounds took too long to respond. Try again in a moment." : `Request failed (${response.status}).`;
    throw new ApiError(response.status, payload.error?.code || (unavailable ? "UNAVAILABLE" : "HTTP_ERROR"), payload.error?.message || fallback, { problems: payload.error?.problems });
  }
  return payload;
}

// Interview replies are an event stream: `delta` appends text, `reset` drops a
// discarded attempt, and `done` is the saved turns. Errors that happen before
// the stream starts are still a single JSON body.
async function streamRequest(method, path, body, { onDelta, onReset } = {}) {
  let response;
  try {
    response = await fetch(`/api/v1${path}`, {
      method,
      credentials: "same-origin",
      headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
      body: JSON.stringify(body),
    });
  } catch (error) {
    if (error.name === "AbortError") throw error;
    throw new ApiError(0, "NETWORK", "Can't reach DesignRounds. Check your connection and that the API server is running.");
  }

  const type = response.headers.get("content-type") || "";
  if (!type.includes("text/event-stream")) {
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const unavailable = !payload.error && [502, 503, 504].includes(response.status);
      const fallback = unavailable ? "DesignRounds took too long to respond. Try again in a moment." : `Request failed (${response.status}).`;
      throw new ApiError(response.status, payload.error?.code || (unavailable ? "UNAVAILABLE" : "HTTP_ERROR"), payload.error?.message || fallback, { problems: payload.error?.problems });
    }
    return payload;
  }

  const stream = createInterviewStream();
  try {
    await readServerEvents(response, {
      onEvent(event, raw) {
        const before = stream.reply;
        stream.onEvent(event, raw);
        if (event === "delta" && stream.reply !== before) onDelta?.(stream.reply.slice(before.length));
        if (event === "reset") onReset?.();
      },
    });
  } catch {
    throw new ApiError(0, "NETWORK", "The interviewer reply was interrupted. Check your connection and try again.");
  }
  if (stream.failure) {
    throw new ApiError(stream.failure.status || 502, stream.failure.code || "HTTP_ERROR", stream.failure.message || "The interviewer reply failed.");
  }
  if (!stream.result) throw new ApiError(0, "NETWORK", "The interviewer reply was interrupted. Check your connection and try again.");
  return stream.result;
}

const query = (params) => {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    const text = Array.isArray(value) ? value.join(",") : value;
    if (text !== undefined && text !== null && text !== "" && text !== "all") search.set(key, text);
  }
  const string = search.toString();
  return string ? `?${string}` : "";
};

export const api = {
  round: (id) => request("GET", `/rounds/${encodeURIComponent(id)}`),
  catalog: (params, options) => request("GET", `/catalog/prompts${query(params)}`, undefined, options),
  me: () => request("GET", "/me"),
  session: () => request("GET", "/session"),
  requestCode: (email) => request("POST", "/auth/request-code", { email }),
  verifyCode: (email, code) => request("POST", "/auth/verify-code", { email, code }),
  signOut: () => request("POST", "/auth/sign-out", {}),
  signOutEverywhere: () => request("POST", "/auth/sign-out-everywhere", {}),
  updateProfile: (fields) => request("PATCH", "/me", fields),
  deleteAccount: (confirmEmail) => request("DELETE", "/me", { confirmEmail }),
  listSessions: () => request("GET", "/sessions"),
  startSession: (promptId) => request("POST", "/sessions", { promptId }),
  getSession: (id) => request("GET", `/sessions/${id}`),
  saveDiagram: (id, version, diagram) => request("PUT", `/sessions/${id}/diagram`, { version, diagram }),
  updateSession: (id, fields) => request("PATCH", `/sessions/${id}`, fields),
  deleteSession: (id) => request("DELETE", `/sessions/${id}`),
  devSetPlan: (plan) => request("POST", "/dev/plan", { plan }),
  listReviews: (id) => request("GET", `/sessions/${id}/reviews`),
  requestReview: (id, requestId) => request("POST", `/sessions/${id}/reviews`, { requestId }),
  getInterview: (id) => request("GET", `/sessions/${id}/interview`),
  sendInterviewMessage: (id, body, handlers) => streamRequest("POST", `/sessions/${id}/interview/messages`, body, handlers),
  sendInterviewAudio: (id, body, handlers) => streamRequest("POST", `/sessions/${id}/interview/audio`, body, handlers),
  interviewCheck: (id, body) => request("POST", `/sessions/${id}/interview/check`, body),
  publishedArticles: () => request("GET", "/articles/published"),
  publishedArticle: (slug) => request("GET", `/articles/published/${encodeURIComponent(slug)}`),
  myArticles: () => request("GET", "/articles/mine"),
  slugAvailable: (slug, except) => request("GET", `/articles/slug-available?slug=${encodeURIComponent(slug)}&except=${encodeURIComponent(except || "")}`),
  createArticle: (fields) => request("POST", "/articles", fields),
  getArticle: (id) => request("GET", `/articles/${id}`),
  updateArticle: (id, fields) => request("PATCH", `/articles/${id}`, fields),
  deleteArticle: (id) => request("DELETE", `/articles/${id}`),
  submitArticle: (id) => request("POST", `/articles/${id}/submit`, {}),
  sendArticleMessage: (id, body) => request("POST", `/articles/${id}/messages`, { body }),
  adminArticles: (status) => request("GET", `/admin/articles?status=${encodeURIComponent(status)}`),
  adminDecision: (id, action, message) => request("POST", `/admin/articles/${id}/decision`, message ? { action, message } : { action }),
  adminList: () => request("GET", "/admin/admins"),
  grantAdmin: (email) => request("POST", "/admin/admins", { email }),
  revokeAdmin: (id) => request("DELETE", `/admin/admins/${id}`),
  adminMembers: (email = "") => request("GET", `/admin/members${email ? `?email=${encodeURIComponent(email)}` : ""}`),
  setMemberPlan: (id, plan, expiresAt) => request("PUT", `/admin/members/${id}/plan`, { plan, expiresAt }),
  inviteMember: (email, plan, expiresAt) => request("POST", "/admin/invitations", { email, plan, expiresAt }),
  getInvitation: (token) => request("GET", `/invitations/${encodeURIComponent(token)}`),
  acceptInvitation: (token) => request("POST", `/invitations/${encodeURIComponent(token)}/accept`, {}),
};
