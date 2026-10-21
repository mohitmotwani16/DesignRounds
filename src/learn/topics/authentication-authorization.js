export default {
  blocks: [
    { type: "p", text: "**Authentication (authN)** answers \"who are you?\"; **authorization (authZ)** answers \"what are you allowed to do?\" A login proves identity; a permission check decides whether that identity may delete this document. They are separate layers, usually handled by separate components, and mixing them up is a common source of security bugs. This page covers authentication: **API keys, sessions and JWTs**, and how \"Sign in with Google\" works. Permissions (RBAC, ABAC, OAuth scopes) are covered in [authorization](/learn/authorization-rbac-abac-oauth)." },
    { type: "p", text: "Every API that isn't fully public needs to identify its callers. Which method fits depends on who the caller is (an application or a person), how the system scales, and how quickly you must be able to revoke access." },

    { type: "h2", text: "API keys: identifying applications" },
    { type: "p", text: "An API key identifies an **application, not a user**. Each client gets its own unique key, which it sends with every request. Use keys when you need to know **which application** is calling (for usage tracking, billing and per-client rate limits) but not which person is behind it." },
    { type: "code", code: "GET /v1/charges\nAuthorization: Bearer sk_test_your_secret_key" },
    { type: "diagram", kind: "flow", caption: "API key authentication: the application stores the key securely and sends it with every request; the server looks it up to identify the caller.", nodes: [
      { id: "c", label: "Client application", sub: "key in a secret store", col: 0, row: 0, tone: "ok" },
      { id: "s", label: "API server", sub: "protected resource", col: 2, row: 0, tone: "store" },
      { id: "k", label: "Key store", sub: "hashed keys, owner, limits", col: 2, row: 1.1, shape: "db" },
    ], edges: [{ from: "c", to: "s", label: "Authorization: Bearer sk_…" }, { from: "s", to: "k", label: "look up", dashed: true }] },
    { type: "p", text: "A key works like a password for the app. Because the server knows exactly which application sent each request, it can rate limit and meter per client. GitHub, for example, allows 5,000 requests an hour with a valid token but only 60 an hour anonymously." },
    { type: "p", text: "**Keys are long-lived** (months or years), so their lifecycle needs managing: rotate them regularly, monitor usage, revoke them instantly when leaked, and store only a hash on the server. AWS provides tooling to rotate access keys and flag unused ones. Give keys a recognizable prefix (`sk_live_`) so leaked keys can be detected by secret scanners." },

    { type: "h2", text: "Sessions: state on the server" },
    { type: "p", text: "Sessions keep the user's login state **on the server**. When a user signs in, the server creates a session record (user ID, roles, a CSRF token) and gives the browser only an opaque, random **session ID**, usually in a cookie. Every later request sends the cookie, and the server looks the session up." },
    { type: "diagram", kind: "sequence", caption: "Session cookie authentication: the browser holds only an ID; the server keeps and checks the session.", actors: ["Browser", "Web server", "Session store"], steps: [
      { from: 0, to: 1, label: "1. POST /login (credentials)" },
      { from: 1, to: 2, label: "create session abc123" },
      { from: 1, to: 0, label: "2. Set-Cookie: sessionid=abc123", dashed: true },
      { from: 0, to: 1, label: "3. GET /protected (Cookie: sessionid=abc123)" },
      { from: 1, to: 2, label: "validate abc123" },
      { from: 1, to: 0, label: "200 OK", dashed: true },
    ] },
    { type: "ul", items: [
      "**Rich user context.** The session can hold the user ID and lightweight state such as role IDs and a CSRF token. Keep it small and look up larger data (the full profile) from its own store; small sessions use less memory and are easier to invalidate.",
      "**Strong security controls.** Banking apps use 15-minute idle timeouts, cookie flags `HttpOnly` (JavaScript can't read it), `Secure` (HTTPS only) and `SameSite` (limits cross-site sending), and kill sessions immediately on suspicious activity.",
      "**Instant revocation.** Logging out or banning a user is just deleting the session record.",
      "**Scaling cost.** Sessions in one server's memory break as soon as there are two servers. Reddit moved from in-memory sessions to Redis-backed sessions so any application server could handle any request; that enabled horizontal scaling but made Redis a critical dependency. See [stateless vs stateful](/learn/stateless-vs-stateful).",
      "**Awkward for non-browsers.** Cookies suit web apps; mobile apps and API clients usually prefer tokens.",
    ] },
    { type: "p", text: "A minimal, secure session manager:" },
    { type: "code", code: `import secrets, time

class SessionManager:
    def __init__(self, store, timeout_seconds=1800):          # 30-minute idle timeout
        self.store = store                                    # e.g. Redis, shared by all servers
        self.timeout = timeout_seconds

    def create(self, user_id, role_ids):
        session_id = secrets.token_urlsafe(32)                # unguessable, 256 bits of randomness
        self.store.set(session_id, {
            "user_id": user_id,
            "role_ids": role_ids,
            "csrf": secrets.token_urlsafe(16),
            "last_seen": time.time(),
        }, ttl=self.timeout)
        return session_id                                     # sent as an HttpOnly, Secure, SameSite cookie

    def validate(self, session_id):
        session = self.store.get(session_id)
        if session is None:                                   # unknown, expired or revoked
            return None
        if time.time() - session["last_seen"] > self.timeout:
            self.invalidate(session_id)
            return None
        session["last_seen"] = time.time()                    # sliding expiry
        self.store.set(session_id, session, ttl=self.timeout)
        return session

    def invalidate(self, session_id):                         # logout, password change, suspicious activity
        self.store.delete(session_id)` },

    { type: "h2", text: "JWTs: self-contained tokens" },
    { type: "p", text: "A **JSON Web Token (JWT)** carries the user's identity and permissions **inside the token itself**, signed by the issuer. A service validates it cryptographically, with no database or session lookup, so authentication becomes stateless and any service in a distributed system can check it." },
    { type: "diagram", kind: "flow", caption: "JWT bearer authentication: the auth server issues a signed token; the API server verifies the signature locally on every request.", nodes: [
      { id: "c", label: "Client", sub: "application", col: 0, row: 0, tone: "danger" },
      { id: "a", label: "Auth server", sub: "JWT issuer", col: 1.6, row: 0, tone: "cache" },
      { id: "s", label: "API server", sub: "verifies signature", col: 1.6, row: 1.3, tone: "store" },
    ], edges: [{ from: "c", to: "a", label: "1. login" }, { from: "a", to: "c", label: "2. JWT", bend: 30 }, { from: "c", to: "s", label: "3. Authorization: Bearer <JWT>" }] },
    { type: "p", text: "A JWT has three base64url-encoded parts joined by dots: `header.payload.signature`." },
    { type: "diagram", kind: "segments", width: 780, caption: "The structure of a JWT. The signature covers the header and payload, so any change to them invalidates the token.", lanes: [{ parts: [
      { label: "Header", sub: "{\"alg\":\"HS256\",\"typ\":\"JWT\"}", size: 1, tone: "cache" },
      { label: "Payload (claims)", sub: "{\"sub\":\"user123\",\"exp\":1640995200}", size: 1.15, tone: "ok" },
      { label: "Signature", sub: "HMAC-SHA256(header.payload)", size: 1, tone: "danger" },
    ] }] },
    { type: "ul", items: [
      "**Claims and permissions.** The payload holds claims such as the user ID (`sub`), roles, issue time (`iat`) and expiry (`exp`). The server checks them locally. It still has to fetch the issuer's public keys (a JWKS endpoint) to verify signatures, and must validate the issuer, audience and expiry with a little clock-skew tolerance. Put role IDs in the token rather than long permission lists, to keep tokens small.",
      "**The revocation problem.** A JWT stays valid until it expires; you can't delete it like a session. Production systems use **short-lived access tokens with refresh tokens**, or keep a denylist of revoked token IDs for critical cases. Choose the lifetime by risk: 5–15 minutes for high-risk apps, 15–60 minutes for typical web apps, longer for some mobile cases.",
    ] },
    { type: "p", text: "Creating and validating an HS256 token by hand shows what libraries do for you:" },
    { type: "code", code: `import base64, hashlib, hmac, json, time

def b64url(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).decode().rstrip("=")

def b64url_decode(text: str) -> bytes:
    return base64.urlsafe_b64decode(text + "=" * (-len(text) % 4))

def create_token(secret: bytes, user_id: str, claims: dict, expires_in=900) -> str:
    header = {"alg": "HS256", "typ": "JWT"}
    now = int(time.time())
    payload = {"sub": user_id, "iat": now, "exp": now + expires_in, **claims}
    signing_input = ".".join(b64url(json.dumps(part, separators=(",", ":")).encode()) for part in (header, payload))
    signature = hmac.new(secret, signing_input.encode(), hashlib.sha256).digest()
    return f"{signing_input}.{b64url(signature)}"

def validate_token(secret: bytes, token: str):
    try:
        header_b64, payload_b64, signature_b64 = token.split(".")
    except ValueError:
        return None
    if json.loads(b64url_decode(header_b64)).get("alg") != "HS256":    # pin the algorithm
        return None
    expected = hmac.new(secret, f"{header_b64}.{payload_b64}".encode(), hashlib.sha256).digest()
    if not hmac.compare_digest(expected, b64url_decode(signature_b64)):  # constant-time compare
        return None
    payload = json.loads(b64url_decode(payload_b64))
    if payload["exp"] < time.time() - 30:                               # 30 s clock-skew tolerance
        return None
    return payload` },
    { type: "callout", tone: "warning", text: "JWTs are signed, not encrypted: anyone holding one can read its claims. Don't put secrets in them, always verify the signature and expiry, pin the expected algorithm, and keep them out of localStorage when an HttpOnly cookie will do (to limit theft through XSS). In production use a maintained library rather than hand-rolled code." },

    { type: "h2", text: "Choosing an authentication method" },
    { type: "p", text: "Each method suits a different caller. **API keys** fit service-to-service calls and per-client rate limiting. **Sessions** fit traditional web apps that need rich user context and instant logout. **JWTs** fit distributed systems, microservices and mobile apps where many services must verify identity without a shared store." },
    { type: "table", head: ["Method", "Stateless?", "User context", "Immediate revocation", "Horizontal scaling"], rows: [
      ["API key", "Often no (looked up in a DB)", "None: identifies an app", "Easy if checked on the server", "Excellent with a shared cache"],
      ["Session", "No", "Rich (server-side)", "Excellent: delete the session", "Needs a shared session store"],
      ["JWT", "Yes (verified locally)", "Embedded in the token", "Hard: wait for expiry or keep a denylist", "Excellent"],
    ] },
    { type: "p", text: "A common hybrid: **short-lived access tokens** (5–15 minutes) verified locally, plus a **long-lived refresh token** stored server-side that can be revoked. Revoking the refresh token stops new access tokens within minutes." },
    { type: "p", text: "Real systems mix methods. GitHub uses personal access tokens (user-generated API keys) for its REST API, OAuth tokens for third-party apps, and sessions for its website, using each where it fits best instead of forcing one approach everywhere." },

    { type: "h2", text: "Sign in with Google: OpenID Connect" },
    { type: "p", text: "**OAuth 2.0** lets a user grant an application limited access to their data on another service without sharing their password; see [authorization](/learn/authorization-rbac-abac-oauth). **OpenID Connect (OIDC)** adds an **ID token** on top, so the same flow also tells the application who the user is. That is \"Sign in with Google\"." },
    { type: "diagram", kind: "sequence", caption: "Authorization code flow with PKCE: the browser only ever sees a short-lived code; the backend exchanges it for tokens over a direct server-to-server call.", actors: ["User / browser", "Your app (backend)", "Identity provider"], steps: [
      { from: 0, to: 1, label: "Sign in with Google" },
      { from: 1, to: 0, label: "redirect to IdP (state, PKCE challenge)" },
      { from: 0, to: 2, label: "login + consent" },
      { from: 2, to: 0, label: "redirect back with ?code=…" },
      { from: 0, to: 1, label: "code" },
      { from: 1, to: 2, label: "exchange code + PKCE verifier + secret", tone: "accent" },
      { from: 2, to: 1, label: "ID token + access token", tone: "accent" },
      { from: 1, to: 0, label: "set session cookie" },
    ] },
    { type: "ul", items: [
      "Use the **authorization code flow with PKCE** for web and mobile apps; the old implicit flow is deprecated.",
      "Validate the **state** parameter to prevent CSRF on the callback.",
      "Use the **client credentials** flow for service-to-service calls with no user.",
    ] },

    { type: "h2", text: "Where authentication lives in an architecture" },
    { type: "ul", items: [
      "The [API gateway](/learn/api-gateway) authenticates each request (validates the session, key or token) and passes a verified identity to the services behind it.",
      "Services make **authorization** decisions with domain knowledge. See [authorization](/learn/authorization-rbac-abac-oauth).",
      "Internal service-to-service calls use mTLS identities or short-lived service tokens. See [service mesh](/learn/service-mesh).",
      "Protect credentials: hash passwords with bcrypt, scrypt or Argon2; add MFA; [rate limit](/learn/rate-limiting) logins and OTP requests; keep keys in a [secrets manager](/learn/secrets-management).",
    ] },
  ],
  uses: [
    { name: "Stripe and GitHub APIs", text: "Secret API keys or personal access tokens identify the calling app or developer, with per-key rate limits and instant revocation." },
    { name: "Banking web apps", text: "Server-side sessions with short idle timeouts and strict cookie flags, so a session can be killed the moment fraud is suspected." },
    { name: "Mobile apps and microservices", text: "Short-lived JWT access tokens verified locally by every service, renewed with revocable refresh tokens." },
    { name: "Sign in with Google / Apple / GitHub", text: "OpenID Connect authorization code flows let apps authenticate users without handling their passwords. Providers include Auth0, Okta, Cognito and Keycloak." },
  ],
  interview: [
    "Say who the caller is first: an application (API key), a browser user (session) or a distributed client (JWT).",
    "Explain revocation: instant for sessions and server-checked keys, delayed for JWTs unless tokens are short-lived or denylisted.",
    "Authenticate once at the gateway, then authorize per request and per object in the services.",
    "Mention secure cookie flags, password hashing and rate-limited logins as defaults.",
  ],
  related: ["authorization-rbac-abac-oauth", "api-gateway", "encryption", "secrets-management", "rate-limiting", "stateless-vs-stateful"],
  practice: ["api-gateway", "secrets-platform", "payment-platform"],
};
