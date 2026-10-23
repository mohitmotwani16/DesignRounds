// Candidates for whole-round calibration (scripts/round-eval.js), per question: a
// strong candidate who raises the hard parts unprompted, one who makes the question's
// classic mistakes and recovers with help, and a weak one. `expect.score` is the
// overall review score a calibrated grader should land in.
export const roundPersonas = {
  "rate-limiter": [
  {
    id: "strong",
    persona: "A strong senior engineer. Asks two or three sharp clarifying questions, then states numbers (QPS, latency budget). Drives the conversation and draws each part as they describe it. Unprompted, they pick a token bucket kept in Redis and updated atomically with a Lua script, explain why a fixed window lets bursts through at the boundary, keep quota config in a local cache, choose fail-open with a local fallback limiter and a short timeout, and point out the hot-key problem for very large customers with a fix. They raise trade-offs and limitations of their own design before being asked. Never needs hints. Answers concisely.",
    expect: { score: [82, 93], allowAbove90: true },
  },
  {
    id: "recovers",
    persona: "A competent mid-level engineer who makes three specific mistakes and recovers when helped. (1) First design: a counter in Redis read with GET, compared, then written back with SET, using a fixed one-minute window. When asked about concurrent requests, they realise it's a race and switch to atomic INCR with an expiry. (2) When asked what happens at the boundary between two windows, they press the hint button once (wantsHint true) instead of answering; after the hint they understand that two bursts can pass and switch to a token bucket in Redis updated by a Lua script. (3) When asked what happens if Redis goes down, they first say to reject all requests with 503s (fail closed) to protect the backends; only if the interviewer pushes back do they switch to failing open with a local in-memory fallback. Otherwise reasonable: states 100k QPS and a 2 ms budget when asked, puts the limiter as middleware in the API gateway, caches quotas locally, and draws what they describe.",
    expect: { score: [62, 82], noStrongAfterHelp: true },
  },
  {
    id: "weak",
    persona: "A junior engineer with shallow knowledge. Doesn't ask clarifying questions and gives no numbers. Proposes storing a request count per user in the main SQL database and checking it on every request. Doesn't know rate-limiting algorithms by name and says 'I'm not sure' when asked about them. When asked about failures or scale, gives vague answers like 'add more servers' or 'it should be fine'. Draws a client, a server, the database and a rate limiter box, and little else.",
    expect: { score: [25, 58] },
  },
  ],
  "url-shortener": [
    {
      id: "strong",
      persona: "A strong senior engineer. Clarifies scale (100M new links a month, 100:1 reads to writes), then estimates storage and QPS. Draws as they go. Unprompted, they generate short codes from a distributed counter handed out in ranges and encoded in base62 (so no collisions), keep mappings in a key-value store partitioned by code, put a cache in front of redirects for the read-heavy path, choose 302 so analytics see every click (and say 301 would hide repeat clicks), and handle custom aliases and expiry. They raise trade-offs and limits of their own design before being asked. Never needs hints. Answers concisely.",
      expect: { score: [82, 93], allowAbove90: true },
    },
    {
      id: "recovers",
      persona: "A competent mid-level engineer who makes three specific mistakes and recovers when helped. (1) They generate the code by hashing the long URL with MD5 and keeping the first 7 characters; only when asked what happens when two URLs share those characters do they realise it collides and switch to a counter-based ID encoded in base62. (2) Asked how two servers would avoid handing out the same ID, they press the hint button once (wantsHint true) instead of answering; after the hint they hand out ID ranges to each server. (3) Their redirect reads straight from the database; only if the interviewer asks about the read-heavy load do they add a cache in front of it. Otherwise reasonable: asks about scale, uses a key-value store, picks 302 for analytics, and draws what they describe.",
      expect: { score: [62, 82], noStrongAfterHelp: true },
    },
    {
      id: "weak",
      persona: "A junior engineer with shallow knowledge. Doesn't ask clarifying questions and gives no numbers. Stores links in one SQL table and generates codes with random strings without checking for duplicates. Doesn't know the difference between 301 and 302 and says 'I'm not sure' when asked. When asked about scale or failures, gives vague answers like 'add more servers' or 'use a bigger database'. Draws a client, a server and the database, and little else.",
      expect: { score: [25, 58] },
    },
  ],
};
