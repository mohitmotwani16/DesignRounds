export default {
  blocks: [
    { type: "p", text: "Encryption protects data from being read by anyone without the key. In system design it comes in two main forms: **encryption in transit** protects data moving over networks, and **encryption at rest** protects data stored on disks, databases and backups. Around both sits the hardest part: **managing keys** safely." },

    { type: "h2", text: "Encryption in transit: TLS" },
    { type: "p", text: "**TLS** (the S in HTTPS) encrypts traffic between two parties, protects it from tampering, and authenticates the server with a certificate signed by a trusted authority. TLS 1.3 needs a single round trip to set up and uses forward secrecy, so a stolen server key can't decrypt previously recorded traffic." },
    { type: "ul", items: [
      "**At the edge**: terminate TLS at a CDN, load balancer or [API gateway](/learn/api-gateway), with automated certificate renewal (Let's Encrypt, ACM).",
      "**Inside the network**: don't assume the internal network is safe. Re-encrypt between services, ideally with **mutual TLS** (both sides present certificates), which a [service mesh](/learn/service-mesh) can automate. This is the basis of **zero-trust** networking.",
      "**Databases and caches**: enable TLS on database and Redis connections, especially across zones or providers.",
      "Use **HSTS** so browsers never fall back to plain HTTP.",
    ] },

    { type: "h2", text: "Encryption at rest" },
    { type: "p", text: "Data at rest is encrypted so stolen disks, snapshots or backups are useless without the key. Layers, from broad to fine-grained:" },
    { type: "table", head: ["Layer", "What it protects against", "Example"], rows: [
      ["Disk / volume encryption", "Lost or stolen physical disks, discarded hardware", "EBS encryption, LUKS"],
      ["Storage service encryption", "Access to the underlying storage media", "S3 server-side encryption, database transparent data encryption (TDE)"],
      ["Application-level / field encryption", "Database admins, SQL injection dumps, overly broad access", "Encrypt card numbers or national IDs before writing them"],
      ["Client-side / end-to-end encryption", "Even the service provider reading data", "WhatsApp and Signal messages, password managers"],
    ] },
    { type: "p", text: "Broad layers are cheap and transparent but protect only against physical theft; the service itself still sees plaintext. Fine-grained layers protect more but complicate querying (you can't index or search ciphertext easily)." },

    { type: "h2", text: "Envelope encryption and KMS" },
    { type: "p", text: "Encrypting terabytes with one master key, and sending all that data to a key service, doesn't scale. **Envelope encryption** uses two levels of keys:" },
    { type: "diagram", kind: "flow", caption: "Envelope encryption: data is encrypted locally with a data key; only the small data key is encrypted by the master key, which never leaves the KMS.", nodes: [
      { id: "kms", label: "KMS / HSM", sub: "master key (never exported)", col: 0, row: 0, tone: "accent", w: 190 },
      { id: "dk", label: "Data key", sub: "plaintext, in memory only", col: 1.4, row: 0, tone: "cache", w: 180 },
      { id: "data", label: "Your data", col: 1.4, row: 1.2, shape: "pill" },
      { id: "cipher", label: "Ciphertext", col: 2.8, row: 1.2, shape: "db", tone: "store" },
      { id: "edk", label: "Encrypted data key", sub: "stored with the data", col: 2.8, row: 0, shape: "db", tone: "store", w: 180 },
    ], edges: [
      { from: "kms", to: "dk", label: "generate" }, { from: "dk", to: "data", label: "AES-256-GCM" }, { from: "data", to: "cipher" },
      { from: "kms", to: "edk", label: "encrypt data key", bend: -50 },
    ] },
    { type: "ol", items: [
      "Ask the **key management service (KMS)** for a new data key. It returns the key in plaintext and also encrypted under a master key that never leaves the KMS (often backed by hardware security modules).",
      "Encrypt the data locally with the plaintext data key (e.g. AES-256-GCM), then discard the plaintext key.",
      "Store the ciphertext together with the **encrypted** data key.",
      "To decrypt, send the encrypted data key to the KMS (which checks permissions and logs the request), get the plaintext key back, and decrypt locally.",
    ] },
    { type: "p", text: "Benefits: bulk data never goes to the KMS; access to keys is centrally controlled and audited; **rotating** the master key only re-encrypts small data keys; and deleting a per-user data key makes that user's data unreadable (**crypto-shredding**), a practical way to honour deletion requests in backups and logs." },

    { type: "h2", text: "Hashing is not encryption" },
    { type: "ul", items: [
      "**Passwords** must be hashed with a slow, salted algorithm (Argon2, bcrypt, scrypt), never encrypted, so even the service can't recover them.",
      "**Integrity and signatures**: HMACs verify webhook payloads and tokens (see [webhooks](/learn/webhooks)); digital signatures prove who created data.",
      "**Secrets** (API keys, database passwords) belong in a secrets manager (Vault, AWS Secrets Manager), not in code or environment files committed to a repository.",
    ] },
  ],
  uses: [
    { name: "AWS KMS, Google Cloud KMS, Azure Key Vault", text: "Provide managed master keys and envelope encryption used by S3, EBS, RDS and countless applications." },
    { name: "WhatsApp and Signal", text: "Use end-to-end encryption (the Signal protocol) so message content is readable only on users' devices." },
    { name: "Payment systems (PCI DSS)", text: "Encrypt or tokenise card numbers at the application level and tightly restrict access to keys." },
    { name: "HashiCorp Vault", text: "Manages secrets and offers encryption as a service, dynamic database credentials and certificate issuance." },
  ],
  interview: [
    "State TLS at the edge and mTLS (or TLS) between internal services.",
    "Encrypt data at rest by default, and add field-level encryption for especially sensitive fields.",
    "Explain envelope encryption with a KMS and key rotation; mention crypto-shredding for deletion.",
    "Hash passwords with a slow algorithm and keep secrets in a secrets manager.",
  ],
  related: ["authentication-authorization", "http", "service-mesh", "object-storage", "api-gateway", "webhooks"],
  practice: ["secrets-platform", "payment-platform", "file-storage", "chat-system"],
};
