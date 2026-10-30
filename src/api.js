import { createInterviewStream, readServerEvents } from "./sse.js";

export class ApiError extends Error {
  constructor(status, code, message, details = {}) {
    super(message);
    this.status = status;
    this.code = code;
    this.problems = details.problems ?? null;
  }
}

// This browser's human-check pass: the launch id the server issued and when it
// expires (24 hours after the check). Kept in localStorage so every tab shares it
// and it survives restarts; the server decides whether it is still valid.
const HUMAN_PASS_STORAGE_KEY = "dr_human_pass";
const LEGACY_LAUNCH_KEY = "dr_human_launch";
let humanLaunch = "";
let humanValidUntil = "";
let onHumanRequired = () => {};
let onHumanPassChanged = () => {};
let humanWaiters = [];

export function readStoredHumanPass() {
  try {
    sessionStorage.removeItem(LEGACY_LAUNCH_KEY);
    const pass = JSON.parse(localStorage.getItem(HUMAN_PASS_STORAGE_KEY) || "null");
    return pass && typeof pass.launch === "string" ? { launch: pass.launch, validUntil: pass.validUntil || "" } : { launch: "", validUntil: "" };
  } catch {
    return { launch: "", validUntil: "" };
  }
}

export function setHumanPass(id, validUntil = "") {
  humanLaunch = id || "";
  humanValidUntil = id ? validUntil || "" : "";
  try {
    if (id) localStorage.setItem(HUMAN_PASS_STORAGE_KEY, JSON.stringify({ launch: humanLaunch, validUntil: humanValidUntil }));
    else localStorage.removeItem(HUMAN_PASS_STORAGE_KEY);
  } catch { /* the in-memory pass still works for this tab */ }
  if (id) releaseHumanWaiters();
}

function releaseHumanWaiters() {
  const waiters = humanWaiters;
  humanWaiters = [];
  for (const waiter of waiters) waiter.resolve();
}

export function getHumanLaunch() {
  return humanLaunch;
}

// Requests waiting for a pass give up when the user signs out.
export function cancelHumanWaiters() {
  const waiters = humanWaiters;
  humanWaiters = [];
  for (const waiter of waiters) waiter.reject(new ApiError(401, "AUTH_REQUIRED", "Sign in to continue."));
}

export function setHumanRequiredHandler(handler) {
  onHumanRequired = handler || (() => {});
}

// Called when another tab renews or clears the pass.
export function setHumanPassListener(listener) {
  onHumanPassChanged = listener || (() => {});
}

if (typeof window !== "undefined") {
  window.addEventListener("storage", (event) => {
    if (event.key !== HUMAN_PASS_STORAGE_KEY) return;
    // Another tab renewed or cleared the pass: adopt it without writing it back.
    const { launch, validUntil } = readStoredHumanPass();
    humanLaunch = launch;
    humanValidUntil = validUntil;
    if (launch) releaseHumanWaiters();
    onHumanPassChanged({ launch, validUntil });
  });
}

// A random id this browser keeps so its human-check events can be found later
// (issue #103). People see it as the "reference" in human-check errors.
const DIAGNOSTIC_ID_KEY = "dr_diag_id";
const DIAGNOSTIC_ALPHABET = "ABCDEFGHJKMNPQRSTVWXYZ23456789";
let diagnosticId = "";

export function getDiagnosticId() {
  if (diagnosticId) return diagnosticId;
  try {
    const stored = localStorage.getItem(DIAGNOSTIC_ID_KEY) || "";
    if (/^[A-Z0-9]{8,32}$/.test(stored)) return (diagnosticId = stored);
  } catch {
    // Storage blocked: keep an id for this page load only.
  }
  const bytes = new Uint8Array(10);
  crypto.getRandomValues(bytes);
  diagnosticId = Array.from(bytes, (byte) => DIAGNOSTIC_ALPHABET[byte % DIAGNOSTIC_ALPHABET.length]).join("");
  try { localStorage.setItem(DIAGNOSTIC_ID_KEY, diagnosticId); } catch { /* page-load id only */ }
  return diagnosticId;
}

// Reports a human-check failure that happened in the browser, so it can be looked
// into later. Best effort: one report per kind of failure per page load, never retried,
// and it never throws.
const reportedHumanChecks = new Set();
export function reportHumanCheck({ action, outcome, errorCode, detail }) {
  const key = `${action}:${outcome}:${errorCode || ""}`;
  if (typeof window === "undefined" || reportedHumanChecks.has(key)) return;
  reportedHumanChecks.add(key);
  const body = {
    action,
    outcome,
    ...(errorCode ? { errorCode: String(errorCode).slice(0, 20) } : {}),
    page: window.location.pathname.slice(0, 300),
    detail: { online: navigator.onLine, ...detail },
  };
  fetch("/api/v1/diagnostics/human-check", {
    method: "POST",
    credentials: "same-origin",
    headers: requestHeaders(true),
    body: JSON.stringify(body),
    keepalive: true,
  }).catch(() => {});
}

function requestHeaders(json) {
  return {
    ...(json ? { "Content-Type": "application/json" } : {}),
    ...(humanLaunch ? { "X-Human-Launch": humanLaunch } : {}),
    "X-Diagnostic-Id": getDiagnosticId(),
  };
}

const needsHumanPass = (status, payload) => status === 403 && payload?.error?.code === "HUMAN_CHECK_REQUIRED";

// A request refused for a missing or expired pass starts the (usually invisible)
// check and waits for it, so the caller sees a slightly slower response, not an error.
function waitForHumanPass() {
  onHumanRequired();
  return new Promise((resolve, reject) => humanWaiters.push({ resolve, reject }));
}

async function request(method, path, body, { signal, humanRetried = false } = {}) {
  let response;
  try {
    response = await fetch(`/api/v1${path}`, {
      method,
      credentials: "same-origin",
      headers: requestHeaders(body !== undefined),
      body: body === undefined ? undefined : JSON.stringify(body),
      signal,
    });
  } catch (error) {
    if (error.name === "AbortError") throw error;
    throw new ApiError(0, "NETWORK", "Can't reach DesignRounds. Check your connection and that the API server is running.");
  }
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (needsHumanPass(response.status, payload) && !humanRetried) {
      await waitForHumanPass();
      return request(method, path, body, { signal, humanRetried: true });
    }
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
async function streamRequest(method, path, body, { onDelta, onReset, humanRetried = false } = {}) {
  let response;
  try {
    response = await fetch(`/api/v1${path}`, {
      method,
      credentials: "same-origin",
      headers: { ...requestHeaders(true), Accept: "text/event-stream" },
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
      if (needsHumanPass(response.status, payload) && !humanRetried) {
        await waitForHumanPass();
        return streamRequest(method, path, body, { onDelta, onReset, humanRetried: true });
      }
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
  requestCode: (email, turnstileToken) => request("POST", "/auth/request-code", { email, ...(turnstileToken ? { turnstileToken } : {}) }),
  verifyCode: (email, code) => request("POST", "/auth/verify-code", { email, code }),
  confirmHuman: (turnstileToken) => request("POST", "/auth/human-check", { turnstileToken }),
  startGoogle: (next, turnstileToken) => request("POST", "/auth/google/start", { next, ...(turnstileToken ? { turnstileToken } : {}) }),
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
  startInterviewerTrial: (id) => request("POST", `/sessions/${id}/interview/trial`, {}),
  sendInterviewMessage: (id, body, handlers) => streamRequest("POST", `/sessions/${id}/interview/messages`, body, handlers),
  sendInterviewAudio: (id, body, handlers) => streamRequest("POST", `/sessions/${id}/interview/audio`, body, handlers),
  interviewTick: (id, body) => request("POST", `/sessions/${id}/interview/tick`, body),
  setInterviewMode: (id, mode) => request("POST", `/sessions/${id}/interview/mode`, { mode }),
  interviewFeedback: (id, turnId, body) => request("POST", `/sessions/${id}/interview/turns/${turnId}/feedback`, body),
  rateInterview: (id, body) => request("POST", `/sessions/${id}/interview/rating`, body),
  adminPacks: () => request("GET", "/admin/packs"),
  adminPack: (promptId) => request("GET", `/admin/packs/${encodeURIComponent(promptId)}`),
  buildPack: (promptId) => request("POST", `/admin/packs/${encodeURIComponent(promptId)}/build`, {}),
  publishPack: (promptId, version) => request("POST", `/admin/packs/${encodeURIComponent(promptId)}/versions/${version}/publish`, {}),
  retirePack: (promptId, version) => request("POST", `/admin/packs/${encodeURIComponent(promptId)}/versions/${version}/retire`, {}),
  saveDraftPack: (promptId, pack) => request("POST", `/admin/packs/${encodeURIComponent(promptId)}/drafts`, { pack }),
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
  plusWaitlistStatus: () => request("GET", "/plus/waitlist"),
  joinPlusWaitlist: (body) => request("POST", "/plus/waitlist", body),
  adminPlusWaitlist: () => request("GET", "/admin/plus-waitlist"),
  reportProblem: (body) => request("POST", "/reports", body),
  adminReports: () => request("GET", "/admin/reports"),
  setReportStatus: (id, status) => request("PATCH", `/admin/reports/${id}`, { status }),
  adminHumanChecks: (params) => request("GET", `/admin/human-checks${query(params)}`),
  getInvitation: (token) => request("GET", `/invitations/${encodeURIComponent(token)}`),
  acceptInvitation: (token) => request("POST", `/invitations/${encodeURIComponent(token)}/accept`, {}),
};
