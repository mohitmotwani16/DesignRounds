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
  sendInterviewMessage: (id, body) => request("POST", `/sessions/${id}/interview/messages`, body),
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
};
