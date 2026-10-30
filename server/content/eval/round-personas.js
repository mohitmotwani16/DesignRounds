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
  "video-recommendations": [
    {
      id: "strong",
      persona: "A strong senior ML engineer. Asks about daily viewers, catalogue size and upload rate, the latency budget, available signals and the business goal, and pushes back on clicks in favour of satisfied watch time. Draws as they go. Unprompted, they define multi-task targets (click, watch time, like, share, dismiss) combined by experiment-tuned weights, build candidate sources (two-tower retrieval over an ANN index of eligible videos, subscriptions, co-watch, trending and fresh), a light ranker and a multi-task heavy ranker with position as a training-only feature and calibrated heads, then re-rank for policy, diversity and freshness, with counts and latency per stage and a fallback. They handle new uploads with content features in the video tower and exploration slots, watch for feedback loops with coverage metrics and a long-term holdout, and evaluate retrieval with recall@k and ranking with NDCG before A/B tests on long-term engagement. Never needs hints. Answers concisely.",
      expect: { score: [82, 93], allowAbove90: true },
    },
    {
      id: "recovers",
      persona: "A competent mid-level ML engineer who makes three specific mistakes and recovers when helped. (1) They set clicks as the training label; when asked what clickbait does to the feed, they switch to a multi-task score with watch time and dismissals. (2) Asked how a video uploaded an hour ago reaches viewers, they press the hint button once (wantsHint true); after the hint they add content features and exploration slots. (3) They ignore position bias; only when the interviewer asks what the model learns from items always shown first do they add position as a training-only feature. Otherwise reasonable: two-tower retrieval and a ranker, a feature store, and drawings of what they describe.",
      expect: { score: [62, 82], noStrongAfterHelp: true },
    },
    {
      id: "weak",
      persona: "A junior engineer with shallow knowledge. Doesn't ask clarifying questions. Proposes showing the most popular videos in categories the user watched, sorted by a click model refreshed nightly. Doesn't know what candidate generation or embeddings are and says 'I'm not sure'. When asked about latency or new videos, says 'cache it'. Draws a user, a recommendation server and a database.",
      expect: { score: [25, 58] },
    },
  ],
  "feed-ranking": [
    {
      id: "strong",
      persona: "A strong senior ML engineer. Asks about daily users, loads per day, eligible posts per viewer, latency, the goal, integrity rules and feedback signals. Draws as they go. Unprompted, they define a value function over calibrated predictions of likes, comments, shares, long dwell, hides and reports with experiment-tuned weights, gather inventory from friends, pages, groups and recommended posts, apply separate integrity classifiers as filters and demotions, use a light ranker then a multi-task heavy ranker with affinity and engagement-velocity features from a feature store, add a final pass for diversity and freshness with seen-post tracking, size GPU inference with fallbacks, and launch through A/B tests with satisfaction and integrity guardrails and long-term holdouts. Never needs hints. Answers concisely.",
      expect: { score: [82, 93], allowAbove90: true },
    },
    {
      id: "recovers",
      persona: "A competent mid-level ML engineer who makes three specific mistakes and recovers when helped. (1) They rank by predicted clicks alone; when asked whether a like and a thoughtful comment are worth the same, they move to a weighted value model with negative actions. (2) Asked how misinformation stays out of the top of the feed, they press the hint button once (wantsHint true); after the hint they add separate integrity classifiers applied as demotions. (3) They plan to judge success with a one-week engagement test; only when the interviewer raises slow harm to retention do they add long-term holdouts and survey metrics. Otherwise reasonable: a two-stage ranker with sensible features, drawn as they go.",
      expect: { score: [62, 82], noStrongAfterHelp: true },
    },
    {
      id: "weak",
      persona: "A junior engineer with shallow knowledge. Doesn't ask clarifying questions. Proposes sorting posts by number of likes and recency. Can't explain how different actions would be combined and says 'I'm not sure'. When asked about spam or scale, says 'add a filter' or 'more servers'. Draws a user, a feed server and a database.",
      expect: { score: [25, 58] },
    },
  ],
  "search-ranking": [
    {
      id: "strong",
      persona: "A strong senior ML engineer. Asks about catalogue size, peak queries, latency, the purchase goal, head versus tail queries and available labels. Draws as they go. Unprompted, they add query understanding (spelling, category, attributes, synonyms), retrieve with a sharded BM25 inverted index and embedding-based semantic retrieval merged into about a thousand candidates, rank with LambdaMART over text-match, quality, behaviour, commercial and light personal features, apply stock and sponsored rules, build labels from rater grades plus graded clicks, carts and purchases corrected for position bias, serve with scatter-gather, head-query caching and per-stage budgets, rank new products with content features and priors, and evaluate with NDCG by query segment, interleaving and conversion A/B tests. Never needs hints. Answers concisely.",
      expect: { score: [82, 93], allowAbove90: true },
    },
    {
      id: "recovers",
      persona: "A competent mid-level ML engineer who makes three specific mistakes and recovers when helped. (1) They use only vector search; when asked about a query with an exact model number, they add BM25 lexical retrieval and merge both. (2) Asked how to use clicks as labels, they press the hint button once (wantsHint true); after the hint they correct for position bias. (3) They evaluate with one average NDCG; only when the interviewer asks about rare queries do they split by head, torso and tail. Otherwise reasonable: a learning-to-rank model with sensible features and drawings of what they describe.",
      expect: { score: [62, 82], noStrongAfterHelp: true },
    },
    {
      id: "weak",
      persona: "A junior engineer with shallow knowledge. Doesn't ask clarifying questions. Proposes matching product titles with a database text search and sorting by popularity. Doesn't know what learning to rank is and says 'I'm not sure'. When asked about latency or typos, says 'add an index'. Draws a user, a search server and a database.",
      expect: { score: [25, 58] },
    },
  ],
  "content-moderation": [
    {
      id: "strong",
      persona: "A strong senior ML engineer. Asks about volume, modalities, languages, harm categories and their severity, actions, reviewer capacity, appeals and how success is measured. Draws as they go. Unprompted, they layer hash matching for known media, multimodal fused classifiers with a head per harm and account signals, a policy engine with per-harm thresholds (automatic action when confident, review or reduced reach in the middle band), review queues ordered by severity times probability times predicted reach and re-scored on reports and virality, versioned labeling guidelines with active learning and appeals as labels, rapid response to evasion with augmentation and analyst rules, and prevalence measured from random samples with language slices. Never needs hints. Answers concisely.",
      expect: { score: [82, 93], allowAbove90: true },
    },
    {
      id: "recovers",
      persona: "A competent mid-level ML engineer who makes three specific mistakes and recovers when helped. (1) They use one threshold of 0.5 for every harm; when asked whether a scam and child abuse material deserve the same threshold, they set per-harm thresholds. (2) Asked which flagged items reviewers see first when there are too many, they press the hint button once (wantsHint true); after the hint they prioritise by severity, probability and reach. (3) They report removal counts as success; only when the interviewer asks how to measure what the models miss do they add prevalence from random samples. Otherwise reasonable: text and image classifiers, a review queue, drawn as they go.",
      expect: { score: [62, 82], noStrongAfterHelp: true },
    },
    {
      id: "weak",
      persona: "A junior engineer with shallow knowledge. Doesn't ask clarifying questions. Proposes blocking posts that contain words from a banned list and letting users report the rest. Can't explain how images or videos would be checked and says 'I'm not sure'. When asked about scale, says 'hire more moderators'. Draws a user, an upload server and a database.",
      expect: { score: [25, 58] },
    },
  ],
  "people-you-may-know": [
    {
      id: "strong",
      persona: "A strong senior ML engineer. Asks about members, connections per member, surfaces, freshness, the success metric and privacy rules, preferring accepted connections over sends. Draws as they go. Unprompted, they generate candidates from friends of friends with degree caps and pruning, shared schools and employers, opted-in contacts and graph-embedding neighbours, rank with a link-prediction model on accepted connections using Adamic-Adar, affiliation, interaction and embedding features, compute daily in a distributed batch job storing top suggestions per member in a key-value store, add a stream-driven updater for new connections, filter blocks, opt-outs and sensitive signals with exposure caps, and evaluate with recall of future connections and cluster-randomised experiments. Never needs hints. Answers concisely.",
      expect: { score: [82, 93], allowAbove90: true },
    },
    {
      id: "recovers",
      persona: "A competent mid-level ML engineer who makes three specific mistakes and recovers when helped. (1) They optimise invitations sent; when asked about ignored invites, they switch to accepted connections as the label. (2) Asked how a new colleague's teammates appear quickly after a new connection, they press the hint button once (wantsHint true); after the hint they add an event-driven real-time updater. (3) They A/B test by member; only when the interviewer asks whom a treated member's invite affects do they propose cluster randomisation. Otherwise reasonable: friends-of-friends candidates, a ranking model, a nightly job, drawn as they go.",
      expect: { score: [62, 82], noStrongAfterHelp: true },
    },
    {
      id: "weak",
      persona: "A junior engineer with shallow knowledge. Doesn't ask clarifying questions. Proposes showing the people with the most mutual friends, computed when the page opens. Doesn't know what link prediction is and says 'I'm not sure'. When asked about privacy or scale, says 'it should be fine'. Draws a user, a server and a graph database.",
      expect: { score: [25, 58] },
    },
  ],
  "visual-search": [
    {
      id: "strong",
      persona: "A strong senior ML engineer. Asks about corpus size, growth and freshness, query rate, latency, result types and training signals. Draws as they go. Unprompted, they detect the object region, embed it with an encoder fine-tuned contrastively on augmented and engagement pairs with hard negatives, search a sharded product-quantized ANN index with full-precision re-ranking (giving the memory arithmetic), dedupe and re-rank with quality and availability, index new images through a queue into a small fresh index merged in rebuilds, re-embed the whole corpus into a new index when the encoder changes, and evaluate with labelled recall@k by category plus online saves and purchases. Never needs hints. Answers concisely.",
      expect: { score: [82, 93], allowAbove90: true },
    },
    {
      id: "recovers",
      persona: "A competent mid-level ML engineer who makes three specific mistakes and recovers when helped. (1) They plan to keep full-precision vectors on one machine; when asked for the memory arithmetic, they add product quantization and sharding. (2) Asked how a better encoder gets to users, they press the hint button once (wantsHint true); after the hint they re-embed the corpus into a new index and switch together. (3) They rebuild the whole index nightly; only when the interviewer asks about the one-hour freshness target do they add a small incremental index. Otherwise reasonable: a pretrained image embedding model and nearest-neighbour search, drawn as they go.",
      expect: { score: [62, 82], noStrongAfterHelp: true },
    },
    {
      id: "weak",
      persona: "A junior engineer with shallow knowledge. Doesn't ask clarifying questions. Proposes matching images by category tags and dominant colour stored in a database. Doesn't know what embeddings are and says 'I'm not sure'. When asked about billions of images, says 'use a bigger database'. Draws a user, an image server and a database.",
      expect: { score: [25, 58] },
    },
  ],
  "eta-prediction": [
    {
      id: "strong",
      persona: "A strong senior ML engineer. Asks where the estimate appears, order and search volumes, latency, available timestamps and how lateness compares with earliness. Draws as they go. Unprompted, they split the delivery into stages, predict quantiles per stage with gradient-boosted trees over historical and live kitchen load, courier supply, routing, traffic and weather features computed by stream jobs into an online store, cache search-page estimates per restaurant and delivery area for about a minute while predicting exactly at checkout, re-predict on order events, choose the displayed quantile by experiment, monitor lateness by city with fallbacks, and evaluate MAE, lateness rate and quantile coverage on time-based splits. Never needs hints. Answers concisely.",
      expect: { score: [82, 93], allowAbove90: true },
    },
    {
      id: "recovers",
      persona: "A competent mid-level ML engineer who makes three specific mistakes and recovers when helped. (1) They predict one total time from distance and hour; when asked what happens when the kitchen has many open orders, they add stages and live kitchen load. (2) Asked what value to show the customer, they press the hint button once (wantsHint true); after the hint they predict quantiles and show a cautious estimate. (3) They call the model for every restaurant on every search; only when the interviewer asks for the request arithmetic do they add caching per restaurant and area. Otherwise reasonable: gradient-boosted trees, a feature store, drawn as they go.",
      expect: { score: [62, 82], noStrongAfterHelp: true },
    },
    {
      id: "weak",
      persona: "A junior engineer with shallow knowledge. Doesn't ask clarifying questions. Proposes distance divided by average courier speed plus ten minutes. Doesn't know what features a model would use and says 'I'm not sure'. When asked about rain or peaks, says 'add a buffer'. Draws a user, a server and a maps service.",
      expect: { score: [25, 58] },
    },
  ],
  "dynamic-pricing": [
    {
      id: "strong",
      persona: "A strong senior ML engineer. Asks about cities, area size and update frequency, the reliability goal, legal caps and emergencies, signals, upfront quotes and how changes are tested. Draws as they go. Unprompted, they stream requests and driver locations into per-area minute aggregates with a geospatial index, forecast short-horizon demand and supply using neighbouring areas, set capped multipliers from price elasticity estimated with randomised price variation, smooth prices across time and space with hysteresis, lock quotes, add emergency overrides, anomaly alerts and a kill switch, show drivers where demand is, and test policies with switchback experiments measuring waits, completion, cancellations, earnings and retention. Never needs hints. Answers concisely.",
      expect: { score: [82, 93], allowAbove90: true },
    },
    {
      id: "recovers",
      persona: "A competent mid-level ML engineer who makes three specific mistakes and recovers when helped. (1) They learn price response directly from historical data; when asked why history might mislead because surge happens at busy times, they propose randomised price variation. (2) Asked how to test a new pricing policy, they press the hint button once (wantsHint true); after the hint they switch from rider A/B tests to switchback experiments. (3) They recompute raw prices every minute; only when the interviewer asks about neighbouring areas with very different prices do they add smoothing. Otherwise reasonable: streaming demand and supply per area with a forecasting model, drawn as they go.",
      expect: { score: [62, 82], noStrongAfterHelp: true },
    },
    {
      id: "weak",
      persona: "A junior engineer with shallow knowledge. Doesn't ask clarifying questions. Proposes doubling prices during morning and evening peaks in every city. Doesn't know what elasticity is and says 'I'm not sure'. When asked about disasters or fairness, says 'we can turn it off manually'. Draws a user, a pricing server and a database.",
      expect: { score: [25, 58] },
    },
  ],
  "notification-ranking": [
    {
      id: "strong",
      persona: "A strong senior ML engineer. Asks about users and candidate volume, push versus inbox versus drop, the cost of opt-outs, timing and which notifications must always be sent. Draws as they go. Unprompted, they queue candidates, aggregate bursts into summary notifications, score the uplift of sending against opt-out risk learned from randomised holdouts, allocate per-user budgets with fatigue features, choose send times from activity and time zones with quiet hours, deliver through rate-limited, idempotent provider queues with retries, let transactional alerts bypass ranking, and measure with long-running holdouts on retention, disables and uninstalls. Never needs hints. Answers concisely.",
      expect: { score: [82, 93], allowAbove90: true },
    },
    {
      id: "recovers",
      persona: "A competent mid-level ML engineer who makes three specific mistakes and recovers when helped. (1) They send everything above a predicted open probability; when asked whether a push helps someone who opens the app hourly anyway, they move to uplift with an opt-out penalty. (2) Asked how many of thirty candidates a user should get, they press the hint button once (wantsHint true); after the hint they add per-user budgets and fatigue. (3) They trust a two-week session lift; only when the interviewer raises rising opt-outs do they add long-term holdouts. Otherwise reasonable: a queue, a model and a push sender, drawn as they go.",
      expect: { score: [62, 82], noStrongAfterHelp: true },
    },
    {
      id: "weak",
      persona: "A junior engineer with shallow knowledge. Doesn't ask clarifying questions. Proposes sending a push for every event immediately and letting users turn types off in settings. Can't explain what to optimise and says 'I'm not sure'. When asked about annoyance or time zones, says 'users can mute it'. Draws a user, a notification server and a push provider.",
      expect: { score: [25, 58] },
    },
  ],
  "code-assistant": [
    {
      id: "strong",
      persona: "A strong senior AI engineer. Asks about developers and request rates, the inline latency budget, privacy and residency, features, languages and how customers judge value. Draws as they go. Unprompted, they debounce plugin requests and gather context on the client, send to a nearby completion API, rank prefix, suffix, open tabs, symbol definitions and similar snippets within a token budget for a small fill-in-the-middle model, trim and filter secrets in post-processing, cancel stale requests server-side, give a per-stage latency budget, separate GPU pools for inline, chat and agent models, run agent mode in a sandbox with tests and diff review treating repository text as untrusted, enforce no retention for enterprises, and measure retained code and controlled task-time studies. Never needs hints. Answers concisely.",
      expect: { score: [82, 93], allowAbove90: true },
    },
    {
      id: "recovers",
      persona: "A competent mid-level AI engineer who makes three specific mistakes and recovers when helped. (1) They use the largest model for inline completion; when asked whether the suggestion arrives in time, they switch to a small fast model with a latency budget. (2) Asked what happens to requests the developer no longer needs, they press the hint button once (wantsHint true); after the hint they add debounce and cancellation. (3) They measure only acceptance rate; only when the interviewer asks whether tiny suggestions prove value do they add retained code and task-time studies. Otherwise reasonable: current-file context, a completion API, drawn as they go.",
      expect: { score: [62, 82], noStrongAfterHelp: true },
    },
    {
      id: "weak",
      persona: "A junior engineer with shallow knowledge. Doesn't ask clarifying questions. Proposes sending the whole file to a large hosted model on every keystroke and showing the answer. Doesn't know what fill-in-the-middle or context selection is and says 'I'm not sure'. When asked about privacy, says 'we won't look at the code'. Draws an editor, a server and the model.",
      expect: { score: [25, 58] },
    },
  ],
  "voice-ai-agent": [
    {
      id: "strong",
      persona: "A strong senior AI engineer. Asks about concurrent calls, the response-time target, tasks, interruptions, transfers and consent. Draws as they go. Unprompted, they stream calls through media servers into streaming speech recognition, learned end-of-turn detection, a fast LLM agent with typed booking tools that verify the caller and confirm dates aloud, and streaming text-to-speech starting from the first phrase, with a per-stage latency budget and co-location; handle barge-in with echo cancellation and cancellation of generation; detect emergencies and transfer immediately; plan capacity for session-pinned calls with draining; and evaluate tail latency, booking success and recognition errors with simulated calls. Never needs hints. Answers concisely.",
      expect: { score: [82, 93], allowAbove90: true },
    },
    {
      id: "recovers",
      persona: "A competent mid-level AI engineer who makes three specific mistakes and recovers when helped. (1) They run recognition, the LLM and speech synthesis one after another on complete outputs; when asked to add up the silence, they stream every stage. (2) Asked how the agent knows the caller has finished speaking, they press the hint button once (wantsHint true); after the hint they combine voice activity with a learned end-of-turn signal. (3) They book as soon as the model hears a time; only when the interviewer raises misheard numbers do they add spoken confirmation. Otherwise reasonable: telephony, booking tools and transfers, drawn as they go.",
      expect: { score: [62, 82], noStrongAfterHelp: true },
    },
    {
      id: "weak",
      persona: "A junior engineer with shallow knowledge. Doesn't ask clarifying questions. Proposes recording the caller's message, transcribing it, generating a reply and playing it back. Doesn't know what barge-in or turn detection is and says 'I'm not sure'. When asked about emergencies, says 'the AI will handle it'. Draws a phone, a server and the model.",
      expect: { score: [25, 58] },
    },
  ],
  "text-to-image": [
    {
      id: "strong",
      persona: "A strong senior AI engineer. Asks about job volume, latency tiers, GPU-seconds per job, quotas, models and adapters, and safety. Draws as they go. Unprompted, they return a job id after quota and prompt checks, use weighted tier queues and a scheduler that routes jobs to workers with the right model warm and batches compatible jobs, size the GPU fleet from peak jobs times GPU-seconds with headroom and forecasting, put relaxed jobs on interruptible GPUs, check outputs with image classifiers and hash matching and add provenance before storage, store originals and thumbnails in object storage behind a CDN with seeds for reproducibility, notify clients over WebSockets, and cut GPU time with distilled models. Never needs hints. Answers concisely.",
      expect: { score: [82, 93], allowAbove90: true },
    },
    {
      id: "recovers",
      persona: "A competent mid-level AI engineer who makes three specific mistakes and recovers when helped. (1) They send each job to any free GPU; when asked what a one-minute model load does, they route by warm model. (2) Asked where a harmful image from an innocent prompt is caught, they press the hint button once (wantsHint true); after the hint they add output image checks before storage. (3) They use one FIFO queue; only when the interviewer raises one account flooding the relaxed queue do they add tiers, quotas and per-user limits. Otherwise reasonable: a job queue, GPU workers and object storage, drawn as they go.",
      expect: { score: [62, 82], noStrongAfterHelp: true },
    },
    {
      id: "weak",
      persona: "A junior engineer with shallow knowledge. Doesn't ask clarifying questions. Proposes an HTTP endpoint that loads the model and generates images while the client waits, storing them in the database. Doesn't know how to size GPUs and says 'I'm not sure'. When asked about safety, says 'we'll ban bad words'. Draws a user, a server and a database.",
      expect: { score: [25, 58] },
    },
  ],
  "document-ingestion": [
    {
      id: "strong",
      persona: "A strong senior AI engineer. Asks about backfill size, daily changes, formats, freshness and delete targets and tenancy. Draws as they go. Unprompted, they store raw files in object storage with a registry of versions and stage status, connect idempotent stages with queues (detect, parse with escalation to OCR only for hard pages, enrich, chunk with tenant, version, page and ACL metadata, embed in GPU batches with hash skipping, index into vector and keyword stores), version updates with index-then-switch-then-delete, hide deletes and revocations immediately and purge later, run backfills in separate fair-scheduled queues with throughput estimates, sandbox parsers with dead letters, and monitor lag, delete latency, parse quality and retrieval recall. Never needs hints. Answers concisely.",
      expect: { score: [82, 93], allowAbove90: true },
    },
    {
      id: "recovers",
      persona: "A competent mid-level AI engineer who makes three specific mistakes and recovers when helped. (1) They run OCR on every page; when asked what that costs at hundreds of millions of pages, they route only scanned or complex pages to OCR. (2) Asked what ends up indexed when two edits arrive out of order, they press the hint button once (wantsHint true); after the hint they add version checks and index-then-delete. (3) They send deletes through the normal queue; only when the interviewer asks about a big import ahead of a delete do they add a priority hide path. Otherwise reasonable: parse, chunk, embed and index stages, drawn as they go.",
      expect: { score: [62, 82], noStrongAfterHelp: true },
    },
    {
      id: "weak",
      persona: "A junior engineer with shallow knowledge. Doesn't ask clarifying questions. Proposes extracting text from each file, embedding the whole document and reprocessing everything nightly. Doesn't know how scanned PDFs would be handled and says 'I'm not sure'. When asked about permissions, says 'the app can check later'. Draws a file store, a script and a vector database.",
      expect: { score: [25, 58] },
    },
  ],
  "ai-answer-engine": [
    {
      id: "strong",
      persona: "A strong senior AI engineer. Asks about volume, the time to sources, citations, freshness, follow-ups and cost per answer. Draws as they go. Unprompted, they use a small planner to rewrite and split queries, combine an own fresh index with a search API, fetch top pages in parallel with timeouts behind a page cache with precomputed extracts, rerank and dedupe passages within a token budget, generate answers citing numbered passages with verification for sensitive queries, stream sources first, treat page text as untrusted with no tools beyond search, control cost with passage budgets, routing and caches, and measure citation accuracy, correctness and freshness. Never needs hints. Answers concisely.",
      expect: { score: [82, 93], allowAbove90: true },
    },
    {
      id: "recovers",
      persona: "A competent mid-level AI engineer who makes three specific mistakes and recovers when helped. (1) They fetch pages one after another; when asked what a slow website does to latency, they fetch in parallel with timeouts and a cache. (2) Asked how they know a citation supports its claim, they press the hint button once (wantsHint true); after the hint they add claim verification. (3) They don't consider manipulation; only when the interviewer raises pages with hidden instructions do they treat page text as untrusted data. Otherwise reasonable: search, an LLM with citations and streaming, drawn as they go.",
      expect: { score: [62, 82], noStrongAfterHelp: true },
    },
    {
      id: "weak",
      persona: "A junior engineer with shallow knowledge. Doesn't ask clarifying questions. Proposes asking a chatbot the question and showing its answer. Doesn't know how sources or citations would work and says 'I'm not sure'. When asked about recent news, says 'the model is updated often'. Draws a user, a server and the model.",
      expect: { score: [25, 58] },
    },
  ],
  "llm-gateway": [
    {
      id: "strong",
      persona: "A strong senior AI engineer. Asks about callers, streaming traffic, providers, failover, budgets, key handling and logging. Draws as they go. Unprompted, they build a stateless multi-zone gateway with model aliases and central provider credentials, authenticate team keys, enforce token and spend limits with reserve-then-reconcile counters in a shared store, check versioned exact caches, route by config with cost cascades and canaries, retry only retryable errors with backoff behind per-provider circuit breakers and fall back with per-model prompts, proxy streams with fallback only before the first token, meter usage asynchronously with redacted traces and per-team cost dashboards, and define fail-open or fail-closed per check. Never needs hints. Answers concisely.",
      expect: { score: [82, 93], allowAbove90: true },
    },
    {
      id: "recovers",
      persona: "A competent mid-level AI engineer who makes three specific mistakes and recovers when helped. (1) They rate-limit by request count; when asked whether a short and a huge request cost the same, they switch to token and spend limits. (2) Asked what happens when a provider fails half its requests, they press the hint button once (wantsHint true); after the hint they add retry rules, circuit breakers and fallback chains. (3) They write usage records synchronously; only when the interviewer asks what a slow metering database does do they make metering asynchronous. Otherwise reasonable: a central gateway holding keys and routing to providers, drawn as they go.",
      expect: { score: [62, 82], noStrongAfterHelp: true },
    },
    {
      id: "weak",
      persona: "A junior engineer with shallow knowledge. Doesn't ask clarifying questions. Proposes putting provider keys in a shared config file and asking teams to follow guidelines. Doesn't know what a fallback or budget enforcement would look like and says 'I'm not sure'. When asked about outages, says 'providers are reliable'. Draws services, a config file and a provider.",
      expect: { score: [25, 58] },
    },
  ],
  "llm-inference-platform": [
    {
      id: "strong",
      persona: "A strong senior AI engineer. Asks about model sizes, interactive versus batch traffic, latency targets, context lengths, fine-tuned variants, growth and hardware. Draws as they go. Unprompted, they plan GPU memory for weights (quantization and tensor parallelism for the largest model) and KV cache to bound concurrency, size replicas from token throughput, use a load-aware router with admission control separating interactive and preemptible batch traffic, run servers with continuous batching, paged KV cache, chunked prefill and prefix caching, serve fine-tunes as LoRA adapters on shared bases, autoscale on queue depth and cache pressure with warm spares, roll out with evals, benchmarks and canaries, and track cost per million tokens. Never needs hints. Answers concisely.",
      expect: { score: [82, 93], allowAbove90: true },
    },
    {
      id: "recovers",
      persona: "A competent mid-level AI engineer who makes three specific mistakes and recovers when helped. (1) They use static batches and a round-robin load balancer; when asked about sequences finishing at different lengths and a full KV cache, they add continuous batching and load-aware routing. (2) Asked how to serve thirty fine-tuned variants, they press the hint button once (wantsHint true); after the hint they use LoRA adapters on shared bases. (3) They run batch jobs at night; only when the interviewer raises urgent batch jobs during the day do they add priorities and preemption. Otherwise reasonable: model servers with GPU replicas and autoscaling, drawn as they go.",
      expect: { score: [62, 82], noStrongAfterHelp: true },
    },
    {
      id: "weak",
      persona: "A junior engineer with shallow knowledge. Doesn't ask clarifying questions. Proposes one GPU server per model handling one request at a time. Doesn't know what a KV cache or batching is and says 'I'm not sure'. When asked about growth, says 'buy more GPUs'. Draws a client, a server and a GPU.",
      expect: { score: [25, 58] },
    },
  ],
  "llm-eval-platform": [
    {
      id: "strong",
      persona: "A strong senior AI engineer. Asks about teams, change types, dataset sizes, release gating, agents, budget and production feedback. Draws as they go. Unprompted, they version datasets with slices and system configurations, run each case several times through the gateway within budgets, grade with code checks first and rubric judges calibrated against human labels with bias controls, run agents in sandboxes with outcome and trajectory checks, report paired comparisons with the baseline per slice with confidence intervals, gate CI on critical slices with approved overrides, control cost with tiered suites and cached outputs, and turn production failures into new cases. Never needs hints. Answers concisely.",
      expect: { score: [82, 93], allowAbove90: true },
    },
    {
      id: "recovers",
      persona: "A competent mid-level AI engineer who makes three specific mistakes and recovers when helped. (1) They trust an LLM judge out of the box; when asked how they know it agrees with people, they add calibration against human labels. (2) Asked whether one run per case is enough, they press the hint button once (wantsHint true); after the hint they add repeated trials and confidence intervals. (3) They grade agents only on their final message; only when the interviewer raises a refund issued to the wrong order do they add sandboxed outcome checks. Otherwise reasonable: datasets, an orchestrator, a judge and a CI threshold, drawn as they go.",
      expect: { score: [62, 82], noStrongAfterHelp: true },
    },
    {
      id: "weak",
      persona: "A junior engineer with shallow knowledge. Doesn't ask clarifying questions. Proposes engineers trying a few prompts by hand before releasing. Doesn't know what a golden dataset or judge is and says 'I'm not sure'. When asked about agents, says 'we'll watch for complaints'. Draws a developer, a model and a spreadsheet.",
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
