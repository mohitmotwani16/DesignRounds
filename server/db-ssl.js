// Connection options for node-postgres, shared by the API, migrations and the prerenderer.
//
// A hosted database is reached over TLS. Verifying the server's certificate needs the
// provider's CA (Supabase: Project Settings -> Database -> SSL configuration), passed in
// DATABASE_CA_CERT as PEM or base64. Without it the connection is still encrypted but the
// server's identity is unchecked, so a network attacker could impersonate the database.
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);

function hostOf(url) {
  try {
    return new URL(url).hostname;
  } catch {
    // Passwords with unescaped special characters aren't valid URLs. Never treat those as local.
    return null;
  }
}

function caCertificate(value) {
  const cert = (value || "").trim();
  if (!cert) return null;
  return cert.includes("BEGIN CERTIFICATE") ? cert.replace(/\\n/g, "\n") : Buffer.from(cert, "base64").toString("utf8");
}

export function postgresOptions(url, env = process.env) {
  if (LOCAL_HOSTS.has(hostOf(url)) || env.DATABASE_SSL === "false") return { connectionString: url, ssl: false };
  const ca = caCertificate(env.DATABASE_CA_CERT);
  if (!ca) return { connectionString: url, ssl: { rejectUnauthorized: false }, verified: false };
  // node-postgres lets sslmode in the URL override `ssl`, which would discard the CA.
  const connectionString = url.replace(/([?&])sslmode=[^&]*&?/, "$1").replace(/[?&]$/, "");
  return { connectionString, ssl: { ca, rejectUnauthorized: true }, verified: true };
}
