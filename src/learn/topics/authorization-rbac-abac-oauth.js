// Authorization: what an authenticated caller may do. RBAC, ABAC, OAuth scopes, ReBAC and ACLs,
// with working policy code and how to choose and combine them.
export default {
  blocks: [
    { type: "p", text: "**Authorization** decides what an authenticated caller is allowed to access. First the system verifies identity ([authentication](/learn/authentication-authorization)); then, on every request, it checks permissions to decide which resources and actions that identity may use. The main models are **RBAC** (roles), **ABAC** (attributes and context) and **OAuth scopes** (permissions delegated to third-party apps), with relationship-based access (ReBAC) and ACLs for sharing-heavy products." },

    { type: "h2", text: "Authentication vs authorization" },
    { type: "p", text: "Authentication asks **\"who are you?\"**; authorization asks **\"what can you do?\"** They are separate security layers that work together: a user can log in successfully and still be refused permission to delete a file." },
    { type: "p", text: "Google Drive shows the split clearly. Signing in with your Google account proves who you are. Whether you can open a shared document depends on whether you were given viewer, commenter or editor access to **that** document. The API checks both your identity and your permission on the specific resource, every time." },
    { type: "callout", tone: "warning", text: "Check authorization on the server, for every request and every object. The most common real-world API vulnerability is broken object-level authorization: `GET /invoices/1234` returns someone else's invoice because the server checked that the caller was logged in but not that invoice 1234 belongs to them." },

    { type: "h2", text: "RBAC: role-based access control" },
    { type: "p", text: "RBAC assigns each user one or more **roles** (admin, editor, viewer), and each role bundles a set of **permissions**. You manage a handful of roles instead of permissions for every person, which scales well in large organizations." },
    { type: "diagram", kind: "flow", caption: "RBAC: users get roles, roles carry permissions. Higher roles inherit the permissions of lower ones.", nodes: [
      { id: "u1", label: "Alice", col: 0, row: 0, shape: "pill" },
      { id: "u2", label: "Bob", col: 0, row: 1, shape: "pill" },
      { id: "u3", label: "Carol", col: 0, row: 2, shape: "pill" },
      { id: "admin", label: "Admin", col: 1.3, row: 0, tone: "danger" },
      { id: "editor", label: "Editor", col: 1.3, row: 1, tone: "cache" },
      { id: "viewer", label: "Viewer", col: 1.3, row: 2, tone: "store" },
      { id: "p1", label: "manage users, settings", col: 2.7, row: 0 },
      { id: "p2", label: "write and delete posts", col: 2.7, row: 1 },
      { id: "p3", label: "read posts", col: 2.7, row: 2 },
    ], edges: [
      { from: "u1", to: "admin" }, { from: "u2", to: "editor" }, { from: "u3", to: "viewer" },
      { from: "admin", to: "p1" }, { from: "editor", to: "p2" }, { from: "viewer", to: "p3" },
      { from: "admin", to: "editor", label: "inherits", dashed: true }, { from: "editor", to: "viewer", label: "inherits", dashed: true },
    ] },
    { type: "p", text: "**Simple but effective.** Most business applications use RBAC because it matches how organizations are structured. GitHub's repository permission levels (read, triage, write, maintain, admin) are roles: each level includes specific powers such as pushing code, managing issues or changing settings, and each includes everything below it." },
    { type: "p", text: "**In production.** Slack's workspace roles form a hierarchy: the primary owner can delete the workspace, admins manage members and settings, members can create channels, and guests can only see the channels they were invited to. The fixed hierarchy prevents privilege escalation while keeping administration simple." },
    { type: "code", code: `from enum import Enum

class Permission(Enum):
    READ_POSTS = "read:posts"
    WRITE_POSTS = "write:posts"
    DELETE_POSTS = "delete:posts"
    MANAGE_USERS = "manage:users"
    ADMIN_SETTINGS = "admin:settings"

class Role(Enum):
    VIEWER = "viewer"
    EDITOR = "editor"
    MODERATOR = "moderator"
    ADMIN = "admin"

# Each role lists only what it adds; inheritance supplies the rest.
OWN = {
    Role.VIEWER: {Permission.READ_POSTS},
    Role.EDITOR: {Permission.WRITE_POSTS},
    Role.MODERATOR: {Permission.DELETE_POSTS},
    Role.ADMIN: {Permission.MANAGE_USERS, Permission.ADMIN_SETTINGS},
}
INHERITS = {Role.EDITOR: {Role.VIEWER}, Role.MODERATOR: {Role.EDITOR}, Role.ADMIN: {Role.MODERATOR}}

def permissions(role):
    granted = set(OWN[role])
    for parent in INHERITS.get(role, ()):
        granted |= permissions(parent)
    return granted

def can(user_roles, permission):
    return any(permission in permissions(role) for role in user_roles)

assert can({Role.MODERATOR}, Permission.READ_POSTS)        # inherited from viewer
assert not can({Role.EDITOR}, Permission.DELETE_POSTS)` },
    { type: "p", text: "RBAC's weakness is **role explosion**: when rules depend on context (\"editors, but only for their own team's posts, only during business hours\") you end up creating a role for every combination. That is where ABAC comes in." },

    { type: "h2", text: "ABAC: attribute-based access control" },
    { type: "p", text: "ABAC decides using **attributes** of everything involved: the **user** (department, role, clearance), the **resource** (owner, classification, department), the **action** (read, write, urgency) and the **environment** (time, location, device, IP), combined by policy rules. That makes fine-grained, context-aware decisions possible." },
    { type: "diagram", kind: "flow", caption: "ABAC: a policy engine combines user, resource, action and environment attributes into one decision.", nodes: [
      { id: "u", label: "User: Dr. Smith", sub: "cardiology · doctor · clearance 3", col: 0, row: 0, tone: "store" },
      { id: "env", label: "Environment", sub: "14:30 · hospital network", col: 0, row: 1.6, tone: "cache" },
      { id: "pe", label: "Policy engine", sub: "clearance, department, hours", col: 1.6, row: 0.8, tone: "accent" },
      { id: "r", label: "Patient record", sub: "classification L3 · cardiology", col: 3.2, row: 0, tone: "danger" },
      { id: "a", label: "Action: READ", sub: "urgency normal", col: 3.2, row: 1.6, tone: "queue" },
      { id: "d", label: "GRANTED", col: 1.6, row: 2.3, tone: "ok", shape: "pill" },
    ], edges: [
      { from: "u", to: "pe", label: "request" }, { from: "env", to: "pe", label: "context" },
      { from: "r", to: "pe", label: "resource" }, { from: "a", to: "pe", label: "action" }, { from: "pe", to: "d" },
    ] },
    { type: "p", text: "**Dynamic decisions.** Healthcare uses ABAC heavily. A doctor may read a patient's record during their shift, in their own department, for patients in their care. The same doctor may be refused the same record outside working hours or from an untrusted network, with an audited emergency override for urgent cases." },
    { type: "p", text: "**Complex but flexible.** Financial firms use ABAC for regulatory compliance. A trader may execute trades up to their authorized limit, during market hours, in their assigned asset classes, and only from approved locations. Policies adapt to context automatically instead of needing new roles. Cloud platforms use the same idea for project and resource scoping and cost-center checks." },
    { type: "code", code: `from dataclasses import dataclass
from datetime import datetime, time
import ipaddress

@dataclass
class User:
    id: str
    department: str
    role: str
    clearance: int

@dataclass
class Resource:
    owner_id: str
    department: str
    classification: int          # 0 public … 3 secret

@dataclass
class Context:
    ip: str
    at: datetime
    emergency: bool = False

HOSPITAL_NET = ipaddress.ip_network("10.0.0.0/8")

def can_read_record(user: User, record: Resource, ctx: Context) -> tuple[bool, str]:
    if user.clearance < record.classification:
        return False, "clearance too low"
    if ipaddress.ip_address(ctx.ip) not in HOSPITAL_NET:
        return False, "untrusted network"
    if ctx.emergency and user.role == "doctor":
        return True, "emergency override (audited)"
    if user.department != record.department:
        return False, "different department"
    if not time(7, 0) <= ctx.at.time() <= time(19, 0):
        return False, "outside shift hours"
    return True, "all rules passed"` },
    { type: "p", text: "Real systems express these rules in a policy language evaluated by an engine (AWS IAM policies, Open Policy Agent's Rego, Amazon Cedar) so rules can change without redeploying code, and every decision can be logged for audit." },

    { type: "h2", text: "OAuth: delegated authorization" },
    { type: "p", text: "OAuth lets a user give a **third-party application** access to their data **without sharing their password**. The user approves specific permissions, called **scopes**, and the app receives an access token limited to exactly those actions." },
    { type: "p", text: "**Scope-based permissions.** When you connect Spotify to Last.fm, you grant scopes like \"read your currently playing track\" and \"read your playlists\", but not \"modify your playlists\". Spotify's API checks the token's scopes on every request, so Last.fm can only do what you approved. Twitter's API works the same way: a social media management tool might request \"read tweets\", \"post tweets\" and \"read direct messages\" but never \"delete account\", users see the exact list before approving, and the API validates scopes on each call." },
    { type: "diagram", kind: "sequence", caption: "OAuth 2.0 authorization code flow: a document editor gets read-only access to a user's Google Docs without ever seeing their password.", actors: ["User (browser)", "DocEditor app", "Google OAuth", "Google Docs API"], steps: [
      { from: 0, to: 1, label: "1. Import my Google Docs" },
      { from: 1, to: 2, label: "2. redirect: scope=docs.readonly" },
      { from: 2, to: 0, label: "3. show login page" },
      { from: 0, to: 2, label: "4. credentials (to Google only)" },
      { from: 2, to: 0, label: "5. Allow DocEditor to view docs?" },
      { from: 0, to: 2, label: "6. Allow" },
      { from: 2, to: 0, label: "7a. redirect with ?code=abc123" },
      { from: 0, to: 1, label: "7b. GET /callback?code=abc123" },
      { from: 1, to: 2, label: "8. exchange code + client_secret", tone: "accent" },
      { from: 2, to: 1, label: "9. access token (expires in 1 h)", tone: "accent" },
      { from: 1, to: 3, label: "10. GET /documents · Bearer token" },
      { from: 3, to: 1, label: "11. document content", dashed: true },
    ] },
    { type: "p", text: "The result: no password is shared, access is limited to the approved scope, the user explicitly consented, and the access is temporary (and revocable from the user's account settings)." },
    { type: "code", code: `from dataclasses import dataclass
from datetime import datetime, timezone

# Higher scopes imply lower ones.
IMPLIES = {
    "write:posts": {"read:posts"},
    "delete:posts": {"read:posts", "write:posts"},
    "write:profile": {"read:profile"},
    "admin:users": {"read:profile", "write:profile"},
}

@dataclass
class AccessToken:
    user_id: str
    client_id: str
    scopes: set
    expires_at: datetime

def effective_scopes(granted):
    result = set(granted)
    for scope in granted:
        result |= IMPLIES.get(scope, set())
    return result

def authorize(token: AccessToken, required_scope: str, resource_owner: str) -> bool:
    if token.expires_at <= datetime.now(timezone.utc):
        return False                                   # expired: client must refresh
    if required_scope not in effective_scopes(token.scopes):
        return False                                   # 403 insufficient_scope
    return token.user_id == resource_owner            # the token acts for one user only` },
    { type: "p", text: "For the login variant of this flow (OpenID Connect, \"Sign in with Google\"), see [authentication](/learn/authentication-authorization)." },

    { type: "h2", text: "ReBAC and ACLs: permissions from relationships" },
    { type: "p", text: "Products built around sharing (documents, folders, repositories) often decide access from **relationships**: you can view a document if you're a member of a folder that contains it, or of a team that owns it. **ReBAC** stores these relationships as a graph of tuples and answers \"can user U do X on object O?\" by walking it. Google's Zanzibar, which powers Drive and YouTube permissions, works this way and inspired SpiceDB and OpenFGA. **Access control lists (ACLs)** are the simplest form: each resource lists who may do what, as in file and storage-bucket permissions." },

    { type: "h2", text: "Choosing an authorization model" },
    { type: "p", text: "RBAC fits most business applications with clear organizational roles. ABAC handles complex compliance rules and context-dependent policies. OAuth enables safe third-party integrations. ReBAC fits products where users share objects with each other." },
    { type: "table", head: ["Model", "Complexity", "Flexibility", "Best for"], rows: [
      ["RBAC", "Low", "Medium", "Internal apps and SaaS with clear role hierarchies"],
      ["ABAC", "High", "Very high", "Compliance, healthcare, finance, context-dependent rules"],
      ["OAuth scopes", "Medium", "Medium", "Third-party access, API platforms"],
      ["ReBAC", "Medium–high", "High", "Sharing: documents, folders, repositories"],
      ["ACLs", "Low", "Low–medium", "Per-object permissions on files and buckets"],
    ] },
    { type: "p", text: "Large systems layer them. GitHub uses RBAC for repository permissions, OAuth scopes for API access by third-party apps, and attribute-based rules for security policies such as requiring two-factor authentication for sensitive operations. Each layer handles what it is good at." },

    { type: "h2", text: "Where authorization lives in an architecture" },
    { type: "ul", items: [
      "The [API gateway](/learn/api-gateway) authenticates and can enforce coarse checks (is this token allowed to call this API at all? does it have the scope?).",
      "Services make **fine-grained** decisions, because only they know who owns an invoice or which team a document belongs to.",
      "A central **policy engine or permission service** (OPA, Cedar, SpiceDB) keeps rules consistent across services and makes every decision auditable.",
      "Cache permission lookups briefly, but make revocations (removing someone from a team) propagate quickly; stale \"allow\" decisions are a security bug.",
    ] },
  ],
  uses: [
    { name: "GitHub and Slack", text: "Role hierarchies (read → admin, guest → owner) for everyday permissions, plus OAuth scopes for third-party apps." },
    { name: "Hospitals and banks", text: "ABAC policies combining clearance, department, time and location, with audited emergency overrides." },
    { name: "Google Drive and Zanzibar", text: "Relationship-based permissions across folders, groups and shares, evaluated by a global authorization service." },
    { name: "AWS IAM", text: "Policy-based, ABAC-capable authorization that evaluates every API call against JSON policies with conditions." },
  ],
  interview: [
    "Separate authentication (at the gateway) from authorization (per request, per object, in the service that owns the data).",
    "Pick the model from the product's sharing rules: roles for org hierarchies, attributes for contextual rules, relationships for sharing, scopes for third parties.",
    "Mention broken object-level authorization and how your design prevents it.",
    "For third-party access, describe OAuth scopes, consent and short-lived tokens.",
  ],
  related: ["authentication-authorization", "api-gateway", "encryption", "secrets-management", "multi-tenancy"],
  practice: ["api-gateway", "file-storage", "collaborative-editor", "secrets-platform"],
};
