export default {
  blocks: [
    { type: "p", text: "**Secrets management** is how a system stores, distributes, rotates and audits credentials such as database passwords, API keys, signing keys and certificates. The goals are that secrets never live in source code or images, each workload gets only the secrets it needs, credentials are short-lived or rotated regularly, and every access is logged. Modern platforms go further and replace long-lived secrets with **workload identity**." },

    { type: "h2", text: "Where secrets go wrong" },
    { type: "ul", items: [
      "**Committed to source control:** a key in a repository is effectively public, even after deletion, because history and forks keep it.",
      "**Baked into images or config files,** where anyone with read access to the registry or server can read them.",
      "**Shared and long-lived:** one database password used by ten services for three years can't be rotated without breaking all of them.",
      "**Over-privileged:** an analytics job holding an admin credential turns a small bug into a breach.",
      "**Leaked through logs and error messages** when requests or environment variables are dumped.",
    ] },

    { type: "h2", text: "A secrets architecture" },
    { type: "diagram", kind: "flow", caption: "Workloads authenticate with their platform identity, receive short-lived credentials from a secrets service, and every access is audited.", nodes: [
      { id: "wl", label: "Workload", sub: "pod · VM · function", col: 0, row: 1, shape: "pill" },
      { id: "id", label: "Platform identity", sub: "signed token", col: 1.3, row: 0, tone: "muted" },
      { id: "vault", label: "Secrets service", sub: "policies · leases", col: 1.3, row: 1, tone: "accent" },
      { id: "kms", label: "KMS / HSM", sub: "root keys", col: 2.6, row: 0, shape: "db", tone: "store" },
      { id: "db", label: "Database", sub: "dynamic user", col: 2.6, row: 1.4, shape: "db", tone: "cache" },
      { id: "audit", label: "Audit log", col: 2.6, row: 2.4, shape: "queue", tone: "queue" },
    ], edges: [
      { from: "id", to: "wl", dashed: true }, { from: "wl", to: "vault", label: "authenticate" }, { from: "vault", to: "kms", dashed: true },
      { from: "vault", to: "db", label: "create creds" }, { from: "vault", to: "audit", dashed: true },
    ] },
    { type: "table", head: ["Component", "Role"], rows: [
      ["Secrets service (vault)", "Stores secrets encrypted, enforces access policies per workload, issues and revokes credentials, logs every access"],
      ["Key management service (KMS) or HSM", "Holds root encryption keys that never leave it; the vault uses it for envelope encryption. See [encryption](/learn/encryption)"],
      ["Workload identity", "A platform-issued, verifiable identity for each service (a Kubernetes service account token, a cloud instance role) used to authenticate to the vault without a stored password"],
      ["Delivery mechanism", "Inject secrets at runtime as files or environment variables, or have the app fetch them through an SDK"],
    ] },

    { type: "h2", text: "Static vs dynamic secrets" },
    { type: "table", head: ["", "Static secrets", "Dynamic secrets"], rows: [
      ["What", "A fixed value stored and handed out (an API key from a vendor)", "Credentials generated on request with a short lease (a database user valid for one hour)"],
      ["Rotation", "Scheduled; needs coordination with every consumer", "Automatic: they simply expire"],
      ["Blast radius if leaked", "Until someone notices and rotates", "Until the lease expires, and revocable per workload"],
      ["Attribution", "Shared credentials hide who did what", "Each workload has its own credentials"],
    ] },

    { type: "h2", text: "Rotation without downtime" },
    { type: "ol", items: [
      "Create the new credential while the old one still works (most systems allow two active keys).",
      "Distribute the new credential; applications reload it without restarting, by watching the secret file or refetching on a schedule.",
      "Verify that traffic is using the new credential.",
      "Revoke the old one.",
    ] },
    { type: "callout", tone: "tip", text: "If rotating a secret is scary, it won't be done during an incident, which is exactly when it's needed. Rotate routinely and automatically so the process is tested." },

    { type: "h2", text: "Operating principles" },
    { type: "ul", items: [
      "**Least privilege:** policies scoped per service and environment; production secrets unreadable from staging.",
      "**No humans on the hot path:** people get time-limited, approved, audited break-glass access, not standing credentials.",
      "**Scan for leaks** in repositories, CI logs and container images, and treat any detected secret as compromised.",
      "**High availability:** the secrets service is a critical dependency; replicate it, cache leases in clients, and plan for it being briefly unreachable.",
      "**Audit and alert** on unusual access, such as a service reading secrets it never used before.",
    ] },
  ],
  uses: [
    { name: "Microservices on Kubernetes", text: "Pods authenticate with service account identity and receive short-lived database credentials as mounted files." },
    { name: "CI/CD pipelines", text: "Deployment jobs use federated, short-lived cloud credentials instead of stored access keys." },
    { name: "Certificates", text: "An internal certificate authority issues short-lived TLS certificates for service-to-service mTLS, rotated automatically." },
  ],
  interview: [
    "Keep secrets out of code and images; inject at runtime.",
    "Use workload identity to authenticate and dynamic, short-lived credentials where possible.",
    "Describe zero-downtime rotation with two active credentials.",
    "Enforce least privilege, audit access and make the vault highly available.",
  ],
  related: ["encryption", "authentication-authorization", "kubernetes-architecture", "infrastructure-as-code", "service-mesh"],
  practice: ["secrets-platform", "service-platform"],
  reading: [
    { title: "OWASP Secrets Management Cheat Sheet", publisher: "OWASP Foundation", url: "https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html" },
    { title: "SPIFFE: Secure Production Identity Framework for Everyone", publisher: "SPIFFE (CNCF)", url: "https://spiffe.io/docs/latest/spiffe-about/overview/" },
  ],
};
