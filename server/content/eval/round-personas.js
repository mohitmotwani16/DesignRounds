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
  "ad-click-prediction": [
    {
      id: "strong",
      persona: "A strong senior ML engineer. Asks about impressions and candidates per request, the scoring latency budget, the click rate and how the score is used, then points out that the auction multiplies probabilities by bids so calibration matters. Draws as they go. Unprompted, they frame per-impression binary classification with a short click window and log loss, join impressions to clicks in a stream while logging served features, downsample negatives and correct the probabilities afterwards, use hashed ids with sharded embedding tables and smoothed real-time CTR counters, serve a light model then a deep model on GPUs within the budget, add an isotonic calibration layer, retrain incrementally every few hours with holdout gates, handle new ads with advertiser priors, creative embeddings and some exploration, and evaluate with normalised log loss, calibration and an A/B test on revenue with user guardrails. They raise trade-offs before being asked. Never needs hints. Answers concisely.",
      expect: { score: [82, 93], allowAbove90: true },
    },
    {
      id: "recovers",
      persona: "A competent mid-level ML engineer who makes three specific mistakes and recovers when helped. (1) They evaluate the model only with AUC; when asked whether the probabilities are right for the auction, they realise calibration matters and add a calibration step. (2) Asked what downsampling negatives does to predictions, they press the hint button once (wantsHint true) instead of answering; after the hint they explain the correction. (3) They plan a weekly retrain; only when the interviewer mentions campaigns launching every day do they move to frequent incremental training with validation. Otherwise reasonable: asks about scale and latency, builds training data from impression logs, uses embeddings for ids, and draws the serving path they describe.",
      expect: { score: [62, 82], noStrongAfterHelp: true },
    },
    {
      id: "weak",
      persona: "A junior engineer with shallow knowledge. Doesn't ask clarifying questions. Proposes computing each ad's historical click rate and multiplying it by the bid, refreshed weekly. Doesn't know what calibration is and says 'I'm not sure' when asked. When asked about new ads or latency, gives vague answers like 'use a faster server'. Draws a user, an ad server and a database, and little else.",
      expect: { score: [25, 58] },
    },
  ],
  "chatgpt-assistant": [
    {
      id: "strong",
      persona: "A strong senior AI engineer. Asks about daily users, messages, tokens in and out per request, first-token latency, self-hosting, plans, history and safety, then estimates input and output tokens per second, explains that output tokens drive GPU decode capacity and gives a GPU count and cost per message. Draws as they go. Unprompted, they put token-based plan limits in the gateway, store conversations partitioned by user with messages carrying parent ids for regenerate and edits, assemble context from recent turns, summaries of older turns and retrieved memory with the system prompt first for prefix caching, run moderation on input and on streamed output, route to a continuously batched GPU fleet with priorities for paid users, stream over SSE with cancellation that reaches the GPU and partial saves, degrade free users to a smaller model under overload, and ship model changes through evals and canaries. Never needs hints. Answers concisely.",
      expect: { score: [82, 93], allowAbove90: true },
    },
    {
      id: "recovers",
      persona: "A competent mid-level engineer who makes three specific mistakes and recovers when helped. (1) They size the system by requests per second; when asked what decides how many GPUs are needed, they switch to token-based estimates with output tokens driving capacity. (2) Asked what they send to the model for a very long conversation, they press the hint button once (wantsHint true); after the hint they keep recent turns and summarise older ones. (3) When the user presses stop, they only close the client stream; when the interviewer asks what the GPU is doing, they add cancellation propagated to the inference server. Otherwise reasonable: streams responses, stores conversations in a database and draws the components they describe.",
      expect: { score: [62, 82], noStrongAfterHelp: true },
    },
    {
      id: "weak",
      persona: "A junior engineer with shallow knowledge. Doesn't ask clarifying questions or give numbers. Proposes a web server that calls the model with the latest message and returns the full answer when it's done, keeping history in the browser. Doesn't know what tokens or a context window are and says 'I'm not sure'. When asked about scale or abuse, says 'add more servers'. Draws a client, a server and the model.",
      expect: { score: [25, 58] },
    },
  ],
  "support-ai-agent": [
    {
      id: "strong",
      persona: "A strong senior AI engineer. Asks about conversation volume, which actions the agent may take and their limits, how customers are identified, handoff expectations and success metrics. Draws as they go. Unprompted, they route common intents to fixed workflows and the long tail to an agent loop with retrieval over help articles, give it narrow typed tools behind a policy layer that takes the customer identity from the session and enforces refund limits in code, send larger refunds to a human approval queue, use idempotency keys on writes, hand off with a summary, treat customer and article text as untrusted, cap steps and tokens, evaluate with repeated simulated scenarios in a sandboxed order system with zero tolerance for unauthorised actions, measure cost per resolved conversation and roll out from shadow mode to read-only to small refunds. Never needs hints. Answers concisely.",
      expect: { score: [82, 93], allowAbove90: true },
    },
    {
      id: "recovers",
      persona: "A competent mid-level engineer who makes three specific mistakes and recovers when helped. (1) They put the refund limit and account rules only in the system prompt; when asked what stops a customer who claims to be acting for their spouse, they move identity to the session and enforce rules in a policy layer in code. (2) Asked what happens when the refund API times out and the agent retries, they press the hint button once (wantsHint true); after the hint they add idempotency keys. (3) They plan to test with a few dozen manual chats; only when the interviewer asks how they'd know it's safe to launch do they propose simulated scenarios against a sandbox run several times. Otherwise reasonable: one agent with retrieval and tools, a handoff to humans, and drawings of what they describe.",
      expect: { score: [62, 82], noStrongAfterHelp: true },
    },
    {
      id: "weak",
      persona: "A junior engineer with shallow knowledge. Doesn't ask clarifying questions. Proposes pasting the help articles into a prompt so a chatbot answers questions, and says refunds can be handled by 'the AI calling the refund API'. Can't explain how the agent knows who the customer is and says 'I'm not sure'. When asked about mistakes or safety, says 'the model is pretty smart'. Draws a user, a chatbot and the model.",
      expect: { score: [25, 58] },
    },
  ],
  "ecommerce-warehouse": [
    {
      id: "strong",
      persona: "A strong senior data engineer. Asks who the analysts are, which questions they answer, how fresh data must be and how much history is needed, then estimates about 10 million order lines a day and concludes a cloud warehouse with SQL models is enough. Draws as they go. Unprompted, they extract from the read replica into a raw layer, build a star schema whose fact grain is one row per order line, keep the shipping fee in a separate order-level fact, use SCD Type 2 for product category because finance reports by category at the time of sale, load incrementally with a lookback window and handle hard deletes, make loads idempotent with MERGE on order_line_id, record refunds as negative fact rows on the refund date, cluster facts by order date, and add checks that reconcile row counts and revenue with the source. They raise trade-offs of their own design before being asked. Never needs hints. Answers concisely.",
      expect: { score: [82, 93], allowAbove90: true },
    },
    {
      id: "recovers",
      persona: "A competent mid-level data engineer who makes three specific mistakes and recovers when helped. (1) Their first fact table has one row per order line but also repeats the order's shipping fee on every line; only when asked what summing the fee gives do they realise it overstates revenue and move it to an order-level fact. (2) Asked what happens if the nightly load is rerun, they press the hint button once (wantsHint true) instead of answering; after the hint they switch from appending to MERGE on order_line_id. (3) They overwrite the product's category in place; only if the interviewer asks what last year's report shows after a category change do they switch to SCD Type 2. (4) They describe their tables and keys in words only and draw no data model tables until the interviewer asks for the data model; then they draw the fact and dimension tables with their columns. Otherwise reasonable: asks about freshness and volume, extracts from the read replica, builds a star schema and draws the pipeline components they describe.",
      expect: { score: [62, 82], noStrongAfterHelp: true },
    },
    {
      id: "weak",
      persona: "A junior engineer with shallow knowledge. Doesn't ask clarifying questions and gives no numbers. Proposes copying the store's tables into the warehouse every night by appending them, and pointing dashboards at those copies. Can't explain what a fact table's grain is and says 'I'm not sure' when asked. When asked about reruns, refunds or history, gives vague answers like 'we can fix it manually'. Draws the source database, a warehouse and a dashboard, and little else.",
      expect: { score: [25, 58] },
    },
  ],
  // Tests the interviewer's data model request: a solid candidate who only ever talks
  // about the schema until the interviewer asks for it on the canvas.
  "ecommerce-warehouse:words-only": [
    {
      id: "words-only",
      persona: "A solid mid-level data engineer. Asks about consumers, freshness and volume, then draws the pipeline (read replica, a nightly ETL job, the warehouse, a BI dashboard) and explains it. They describe the star schema in words in detail: a fact table at one row per order line with order_line_id as primary key, foreign keys to customer, product and date dimensions, and the shipping fee kept in a separate order-level fact. They draw NO data model tables until the interviewer asks them to put the data model or tables on the canvas; when asked, they draw fact_order_line, dim_customer and dim_product as tables with their columns and keys, and say they've added them. Otherwise reasonable: MERGE on order_line_id for reruns, SCD Type 2 for product category, refunds as negative fact rows. Answers concisely.",
      expect: { score: [62, 88], allowAbove90: false, dataModelAsk: true },
    },
  ],
  "cdc-pipeline": [
    {
      id: "strong",
      persona: "A strong senior data engineer. Clarifies freshness (5 minutes), the busiest tables, write rate, that updates and hard deletes must be reflected, and that the primary must not be loaded. Draws as they go. Unprompted, they reject polling on updated_at because it misses deletes and loads the primary, and choose Debezium reading the Postgres WAL through a logical replication slot into Kafka topics keyed by primary key with a schema registry. They bootstrap with an incremental snapshot tied to the stream position, land raw changes append-only, and run a MERGE every few minutes that keeps the latest change per key by LSN so replays are idempotent. Deletes remove rows or set a soft-delete flag; breaking schema changes pause the table and alert. They warn that a stalled slot makes the primary retain WAL, cap it and alert on slot lag. They raise trade-offs before being asked. Never needs hints. Answers concisely.",
      expect: { score: [82, 93], allowAbove90: true },
    },
    {
      id: "recovers",
      persona: "A competent mid-level data engineer who makes three specific mistakes and recovers when helped. (1) They first propose polling the primary every few minutes for rows with a newer updated_at; only when asked about deletes and tables without updated_at do they switch to log-based CDC with Debezium and Kafka. (2) Asked how to load the existing rows and start streaming without gaps, they press the hint button once (wantsHint true) instead of answering; after the hint they tie the snapshot to a log position and stream from there. (3) They order changes by the event's wall-clock timestamp; only if the interviewer asks about two updates in the same millisecond do they switch to the LSN and partitioning by primary key. Otherwise reasonable: asks about freshness and volume, merges into current-state tables and draws what they describe.",
      expect: { score: [62, 82], noStrongAfterHelp: true },
    },
    {
      id: "weak",
      persona: "A junior engineer with shallow knowledge. Doesn't ask clarifying questions and gives no numbers. Proposes a cron job that runs SELECT * on each production table every five minutes and inserts the results into the warehouse. Has never heard of the write-ahead log or CDC tools and says 'I'm not sure' when asked. When asked about deletes, failures or schema changes, gives vague answers like 'it should be fine' or 'we'd rerun it'. Draws the database, a script and the warehouse, and little else.",
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
