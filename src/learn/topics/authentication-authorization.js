export default {
  blocks: [
    { type: "p", text: "**Authentication (authN)** answers \"who are you?\"; **authorization (authZ)** answers \"what are you allowed to do?\" A login proves identity; a permission check decides whether that identity may delete this document. They are separate concerns, usually handled by separate components, and mixing them up is a common source of security bugs." },

    { type: "h2", text: "Sessions vs tokens" },
    { type: "table", head: ["", "Server-side sessions", "Self-contained tokens (JWT)"], rows: [
      ["What the client holds", "An opaque random session ID in a cookie", "A signed token containing claims (user ID, roles, expiry)"],
      ["Validation", "Look up the session in a store (Redis, DB)", "Verify the signature locally; no lookup"],
      ["Revocation", "Instant: delete the session", "Hard: valid until expiry, unless you keep a denylist"],
      ["Scaling", "Needs a shared session store", "Stateless; any service can verify"],
      ["Typical use", "Browser web apps", "APIs, mobile apps, service-to-service calls"],
    ] },
    { type: "p", text: "A common hybrid: **short-lived access tokens** (5–15 minutes) verified locally, plus a **long-lived refresh token** stored server-side that can be revoked. Revoking the refresh token stops new access tokens within minutes." },
    { type: "callout", tone: "warning", text: "JWTs are signed, not encrypted: anyone holding one can read its claims. Don't put secrets in them, always verify the signature and expiry, pin the expected algorithm, and keep them out of localStorage when an HttpOnly cookie will do (to limit theft through XSS)." },

    { type: "h2", text: "OAuth 2.0 and OpenID Connect" },
    { type: "p", text: "**OAuth 2.0** lets a user grant an application limited access to their data on another service without sharing their password (\"let this app read your calendar\"). **OpenID Connect (OIDC)** adds an **ID token** on top, so the same flow also tells the application who the user is: this is \"Sign in with Google\"." },
    { type: "diagram", kind: "sequence", caption: "Authorization code flow with PKCE: the browser only ever sees a short-lived code; the backend exchanges it for tokens over a direct server-to-server call.", actors: ["User / browser", "Your app (backend)", "Identity provider"], steps: [
      { from: 0, to: 1, label: "Sign in with Google" },
      { from: 1, to: 0, label: "redirect to IdP (state, PKCE challenge)" },
      { from: 0, to: 2, label: "login + consent" },
      { from: 2, to: 0, label: "redirect back with ?code=…" },
      { from: 0, to: 1, label: "code" },
      { from: 1, to: 2, label: "exchange code + PKCE verifier + client secret", tone: "accent" },
      { from: 2, to: 1, label: "ID token + access token", tone: "accent" },
      { from: 1, to: 0, label: "set session cookie" },
    ] },
    { type: "ul", items: [
      "Use the **authorization code flow with PKCE** for web and mobile apps; the old implicit flow is deprecated.",
      "Validate the **state** parameter to prevent CSRF on the callback.",
      "**Client credentials** flow for service-to-service calls with no user.",
    ] },

    { type: "h2", text: "Authorization models" },
    { type: "table", head: ["Model", "How decisions are made", "Example"], rows: [
      ["**RBAC** (role-based)", "Users get roles; roles grant permissions", "`admin`, `editor`, `viewer` in a workspace"],
      ["**ABAC** (attribute-based)", "Rules over attributes of user, resource and context", "\"Managers may approve expenses under ₹50,000 in their own department\""],
      ["**ReBAC** (relationship-based)", "Permissions follow relationships in a graph", "\"You can view a doc if you're a member of a folder that contains it\" (Google Zanzibar)"],
      ["ACLs", "Each resource lists who may do what", "File and bucket permissions"],
    ] },
    { type: "p", text: "Whatever the model, **check authorization on the server for every request and every object**. The most common real-world vulnerability is broken object-level authorization: `GET /invoices/1234` returning someone else's invoice because the server checked that the user was logged in but not that the invoice was theirs." },

    { type: "h2", text: "Where auth lives in an architecture" },
    { type: "ul", items: [
      "The [API gateway](/learn/api-gateway) authenticates the request (validates the session or token) and passes a verified identity to services.",
      "Services make **authorization** decisions with domain knowledge, possibly using a central policy engine (OPA, Cedar) or permission service.",
      "Internal service-to-service calls use mTLS identities or short-lived service tokens. See [service mesh](/learn/service-mesh).",
      "Protect credentials: hash passwords with bcrypt, scrypt or Argon2; add MFA; [rate limit](/learn/rate-limiting) logins and OTP requests.",
    ] },
  ],
  uses: [
    { name: "Sign in with Google / Apple / GitHub", text: "OpenID Connect authorization code flows let apps authenticate users without handling their passwords." },
    { name: "Google Zanzibar", text: "Google's global authorization system for Drive, YouTube and more, based on relationship tuples; it inspired SpiceDB, OpenFGA and others." },
    { name: "Auth0, Okta, Cognito and Keycloak", text: "Managed and self-hosted identity providers implementing OAuth 2.0, OIDC, SAML and MFA." },
    { name: "AWS IAM", text: "A large-scale policy-based (ABAC-capable) authorization system evaluating every API call against JSON policies." },
  ],
  interview: [
    "Separate authentication (gateway or identity provider) from authorization (checked per request, per object, in services).",
    "Choose sessions for browser apps or short-lived access tokens plus refresh tokens for APIs, and explain revocation.",
    "Describe OAuth/OIDC authorization code flow with PKCE for third-party login.",
    "Pick an authorization model (RBAC, ABAC, ReBAC) that matches the sharing rules of the product.",
  ],
  related: ["api-gateway", "encryption", "rate-limiting", "service-mesh", "webhooks"],
  practice: ["api-gateway", "secrets-platform", "collaborative-editor", "file-storage"],
};
