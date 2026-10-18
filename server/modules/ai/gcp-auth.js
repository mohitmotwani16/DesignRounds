import { GoogleAuth, IdentityPoolClient } from "google-auth-library";

// Google Cloud credentials for Vertex AI, chosen from the environment:
//
//   GCP_WORKLOAD_IDENTITY_PROVIDER + GCP_SERVICE_ACCOUNT_EMAIL
//       Vercel OIDC federation: each deployment proves its identity with a short-lived
//       Vercel token, which Google exchanges for a service-account access token.
//       No long-lived key exists anywhere. Production uses this.
//   GCP_SERVICE_ACCOUNT_KEY
//       A service-account JSON key (raw JSON or base64). Simple, but the key never
//       expires, so keep it out of production when federation is available.
//   neither
//       Application Default Credentials: `gcloud auth application-default login`
//       on a laptop, or the attached service account on Google Cloud.

const SCOPES = ["https://www.googleapis.com/auth/cloud-platform"];
const env = process.env;

function parseServiceAccountKey(raw) {
  const text = raw.trim().startsWith("{") ? raw : Buffer.from(raw, "base64").toString("utf8");
  let key;
  try {
    key = JSON.parse(text);
  } catch {
    throw new Error("GCP_SERVICE_ACCOUNT_KEY must be a service-account JSON key, as JSON or base64.");
  }
  if (key.type !== "service_account" || !key.client_email || !key.private_key) {
    throw new Error("GCP_SERVICE_ACCOUNT_KEY is not a service-account key (expected type, client_email and private_key).");
  }
  return key;
}

function vercelFederationClient(provider, serviceAccount) {
  if (!/^projects\/\d+\/locations\/global\/workloadIdentityPools\/[^/]+\/providers\/[^/]+$/.test(provider)) {
    throw new Error("GCP_WORKLOAD_IDENTITY_PROVIDER must look like projects/<number>/locations/global/workloadIdentityPools/<pool>/providers/<provider>.");
  }
  return new IdentityPoolClient({
    type: "external_account",
    audience: `//iam.googleapis.com/${provider}`,
    subject_token_type: "urn:ietf:params:oauth:token-type:jwt",
    token_url: "https://sts.googleapis.com/v1/token",
    service_account_impersonation_url: `https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/${serviceAccount}:generateAccessToken`,
    scopes: SCOPES,
    // Loaded on first use so local development never needs the Vercel runtime.
    subject_token_supplier: {
      async getSubjectToken() {
        const { getVercelOidcToken } = await import("@vercel/functions/oidc");
        return getVercelOidcToken();
      },
    },
  });
}

// Options for `new AnthropicVertex(...)`, plus a label for startup logs.
export function vertexCredentials() {
  const provider = env.GCP_WORKLOAD_IDENTITY_PROVIDER;
  const serviceAccount = env.GCP_SERVICE_ACCOUNT_EMAIL;
  if (provider || serviceAccount) {
    if (!provider || !serviceAccount) throw new Error("Set both GCP_WORKLOAD_IDENTITY_PROVIDER and GCP_SERVICE_ACCOUNT_EMAIL for Vercel OIDC federation.");
    return { label: "vercel-oidc", options: { authClient: vercelFederationClient(provider, serviceAccount) } };
  }
  if (env.GCP_SERVICE_ACCOUNT_KEY) {
    const key = parseServiceAccountKey(env.GCP_SERVICE_ACCOUNT_KEY);
    return { label: "service-account-key", options: { googleAuth: new GoogleAuth({ credentials: key, scopes: SCOPES }) } };
  }
  return { label: "adc", options: { googleAuth: new GoogleAuth({ scopes: SCOPES }) } };
}

let tokenClient;

// Tests swap in a stub with the same `getAccessToken` surface.
export function setTokenClientForTests(stub) {
  tokenClient = stub;
}

const TOKEN_TIMEOUT_MS = 15_000;

function withTimeout(promise, ms, what) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${what} took longer than ${ms} ms`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

// A Google Cloud access token for direct REST calls (Gemini on Vertex). The client
// is built once and caches the token until shortly before it expires. google-auth-library
// sets no timeout of its own, so a stalled exchange is cut off here instead of holding
// the learner's request open until the function is killed.
export async function googleAccessToken() {
  const started = Date.now();
  if (!tokenClient) {
    const { label, options } = vertexCredentials();
    tokenClient = options.authClient ?? (await options.googleAuth.getClient());
    tokenClient.label = label;
  }
  const { token } = await withTimeout(tokenClient.getAccessToken(), TOKEN_TIMEOUT_MS, `Google Cloud sign-in (${tokenClient.label ?? "stub"})`);
  if (!token) throw new Error("Google Cloud returned no access token.");
  const elapsed = Date.now() - started;
  if (elapsed > 200) console.log(`[ai] google token via ${tokenClient.label ?? "stub"} in ${elapsed}ms`);
  return token;
}
