export class ApiError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

async function request(method, path, body) {
  let response;
  try {
    response = await fetch(`/api/v1${path}`, {
      method,
      credentials: "same-origin",
      headers: body === undefined ? {} : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, "NETWORK", "Can't reach DesignRounds. Check your connection and that the API server is running.");
  }
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new ApiError(response.status, payload.error?.code || "HTTP_ERROR", payload.error?.message || `Request failed (${response.status}).`);
  }
  return payload;
}

export const api = {
  me: () => request("GET", "/me"),
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
};
