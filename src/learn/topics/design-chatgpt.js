// Case study: a ChatGPT-style LLM chat assistant at consumer scale.
export default {
  blocks: [
    { type: "p", text: "**The question**: design ChatGPT, a consumer chat assistant where millions of users hold multi-turn conversations with a large language model, see answers stream in token by token, return to old conversations, and use features like file uploads and memory. The chat UI is the easy part. The interesting parts are **context management**, **streaming at scale**, **GPU capacity and cost**, **rate limits by plan**, and **safety**. This walkthrough follows the [AI engineer interview framework](/learn/ai-engineer-system-design-interview) and works through each decision with numbers and a diagram." },
    { type: "callout", text: "Try it yourself first. Sketch the design on a blank canvas, then read on and compare. The [ChatGPT practice round](/system-design/chatgpt-assistant) is the same problem with an AI interviewer who pushes back." },

    { type: "h2", text: "1. Clarify requirements" },
    { type: "p", text: "\"Design ChatGPT\" could mean training a model or building the product around one. Say out loud that you're building the product and the serving system, and that the model already exists. Then agree on features, scale and the quality bar." },
    { type: "table", head: ["Question", "Answer (agreed with the interviewer)"], rows: [
      ["Core features?", "Multi-turn chat with streaming, conversation history, regenerate, stop; file upload as a stretch"],
      ["Scale?", "50M daily active users, ~10 messages each per day"],
      ["Latency?", "First token in under 1 s at p95; then steady streaming"],
      ["Plans?", "Free tier with limits and a smaller model by default; paid tier with higher limits and the best model"],
      ["Model hosting?", "We serve our own models on our GPU fleet"],
      ["Safety?", "Input and output moderation; abuse prevention"],
    ] },
    { type: "diagram", kind: "tree", caption: "The agreed scope. Solid core first, stretch features only if time allows, and the non-functional targets that will drive most of the design.", root: { label: "ChatGPT", tone: "accent", children: [
      { label: "Core", tone: "ok", children: [{ label: "Streaming" }, { label: "History" }, { label: "Stop / retry" }] },
      { label: "Stretch", tone: "muted", children: [{ label: "Files" }, { label: "Memory" }, { label: "Tools" }] },
      { label: "Targets", tone: "danger", children: [{ label: "TTFT < 1 s" }, { label: "Plan limits" }, { label: "Safety" }] },
    ] } },

    { type: "h2", text: "2. Estimates" },
    { type: "p", text: "Estimate in **tokens**, because tokens drive both GPU load and cost. Requests per second alone tells you very little: a 20-word question with a long history can cost more than a long question in a new chat." },
    { type: "code", code: `Messages      : 50M × 10 = 500M/day ≈ 5,800/s avg, ~15K/s peak
Tokens/message: input ≈ 2,500 (system + history + message), output ≈ 400
Daily tokens  : 500M × 2,500 = 1.25T input; 500M × 400 = 200B output
Decode load   : 200B ÷ 86,400 ≈ 2.3M output tokens/s avg, ~6M/s peak
Decode fleet  : one GPU server sustains ~5K output tokens/s with batching
                → peak needs ~1,200 servers
Prefill load  : 1.25T ÷ 86,400 ≈ 14.5M input tokens/s avg, ~38M/s peak;
                a ~50% prefix-cache hit rate leaves ~19M/s to compute
Prefill fleet : at ~50K input tokens/s per server → ~380 servers
Total fleet   : (1,200 + 380) × 1.3 headroom ≈ 2,050 GPU servers
Cost check    : 2,050 × ~$10/hour × 24 ≈ $490K/day ≈ $0.001 per message
Storage       : 500M messages × ~2 KB = 1 TB/day of conversation text
Concurrency   : 400 tokens at ~40 tokens/s = 10 s per answer;
                15K msgs/s × 10 s = ~150K open streams at peak
(illustrative throughput and prices; real numbers vary by model and GPU)` },
    { type: "diagram", kind: "segments", caption: "One average message in tokens, on a shared scale. Input is six times larger than output, yet output tokens need far more GPU time per token, so output drives the fleet size while input drives prefill load and the cost of long chats.", total: 2500, lanes: [
      { label: "Input", parts: [{ label: "System", size: 600, tone: "store" }, { label: "Memory", size: 200, tone: "cache" }, { label: "History", sub: "1,500 tokens", size: 1500, tone: "accent" }, { label: "New", size: 200, tone: "ok" }] },
      { label: "Output", parts: [{ label: "Answer", sub: "400", size: 400, tone: "danger" }] },
    ] },
    { type: "diagram", kind: "bars", caption: "The estimated GPU fleet at peak. Decode takes the largest share, and headroom is not optional because GPU capacity takes minutes or longer to add.", unit: " servers", values: [
      { label: "Decode", value: 1200, tone: "accent" },
      { label: "Prefill", value: 380, tone: "store" },
      { label: "Headroom (30%)", value: 470, tone: "muted" },
    ] },
    { type: "p", text: "Three conclusions shape everything below: GPU inference dominates cost, output tokens drive capacity, and the system must hold a very large number of long-lived streaming connections. See [how LLMs work](/learn/how-llms-work)." },

    { type: "h2", text: "3. API design" },
    { type: "p", text: "Sending a message is a long-running request whose response is a stream of events. Use a client-generated `message_id` so a retry after a network failure doesn't produce two answers; see [idempotency](/learn/idempotency)." },
    { type: "table", head: ["Endpoint", "Purpose"], rows: [
      ["POST /conversations", "Create a conversation; returns its id"],
      ["POST /conversations/{id}/messages", "Send a message with a client `message_id` and `parent_id`; responds with an SSE stream"],
      ["GET /messages/{id}/stream?after=seq", "Resume a dropped stream from the last sequence number"],
      ["POST /messages/{id}/stop", "Cancel generation and free the GPU slot"],
      ["GET /conversations?cursor=", "List recent conversations for the sidebar"],
      ["GET /conversations/{id}/messages", "Load the messages of one conversation in order"],
    ] },
    { type: "diagram", kind: "timeline", caption: "What one SSE response looks like over time. The client knows the message id immediately, text arrives as numbered delta events, and the final event carries token usage for billing and limits.", ticks: ["0 s", "2.5 s", "5 s", "7.5 s", "10 s"], spans: [
      { from: 0, to: 0.35, label: "wait", tone: "muted" },
      { from: 0.35, to: 3.7, label: "delta events: seq 1, 2, 3… (~40 tokens/s)", tone: "accent" },
      { from: 3.7, to: 4, label: "end", tone: "ok" },
    ], marks: [{ at: 0.35, label: "first token", tone: "accent" }, { at: 4, label: "usage", tone: "ok" }] },

    { type: "h2", text: "4. High-level architecture" },
    { type: "diagram", kind: "flow", caption: "The main path. The gateway handles identity and plan limits, the chat service owns the conversation and assembles context, and the router finds a GPU replica. Tokens flow back along the same chain over SSE or WebSockets.", nodes: [
      { id: "client", label: "Web / mobile", col: 0, row: 1, shape: "pill" },
      { id: "gw", label: "API gateway", sub: "auth · plan limits", col: 1, row: 1 },
      { id: "chat", label: "Chat service", sub: "context assembly", col: 2, row: 1, tone: "accent" },
      { id: "router", label: "Inference router", sub: "model · queue", col: 3, row: 1 },
      { id: "gpu", label: "GPU fleet", sub: "continuous batching", col: 4, row: 1, tone: "accent" },
      { id: "mod", label: "Moderation", sub: "input + output", col: 2, row: 0, tone: "danger" },
      { id: "conv", label: "Conversation store", sub: "messages · titles", col: 2, row: 2, shape: "db", tone: "store" },
      { id: "q", label: "Async jobs", sub: "titles · billing", col: 3, row: 2, shape: "queue", tone: "queue" },
    ], edges: [
      { from: "client", to: "gw", both: true }, { from: "gw", to: "chat", both: true }, { from: "chat", to: "mod" }, { from: "chat", to: "conv", both: true },
      { from: "chat", to: "router", both: true }, { from: "router", to: "gpu", both: true }, { from: "chat", to: "q", dashed: true },
    ] },
    { type: "p", text: "Following one message through the system:" },
    { type: "ol", items: [
      "The gateway authenticates the user, reads their plan and checks limits.",
      "The chat service saves the user message, then loads history, summary and memory.",
      "Moderation checks the input; a blocked message never reaches a GPU.",
      "The router picks a model and replica; the request waits in a short queue if needed.",
      "Tokens stream back and are relayed to the client, with moderation checking the output.",
      "When generation ends, the assistant message and token usage are saved and async jobs fire (title, memory extraction, billing).",
    ] },

    { type: "h2", text: "5. Conversation storage" },
    { type: "p", text: "Two tables serve almost every read:" },
    { type: "code", code: `conversations(user_id, conversation_id, title, model,
              created_at, updated_at)
  partition: user_id     sort: updated_at desc   → the sidebar list

messages(conversation_id, seq, message_id, parent_id, role, content,
         tokens, created_at)
  partition: conversation_id   sort: seq         → load a chat in order` },
    { type: "diagram", kind: "flow", caption: "Reads and writes. A wide-column or document store partitioned by conversation handles the high append rate. Large attachments go to object storage, and a cache holds active conversations so a follow-up message doesn't read the store again.", nodes: [
      { id: "chat", label: "Chat service", col: 0, row: 1, tone: "accent" },
      { id: "cache", label: "Active chat cache", sub: "last N turns", col: 1.4, row: 0, shape: "db", tone: "cache" },
      { id: "conv", label: "conversations", sub: "by user_id", col: 1.4, row: 1, shape: "db", tone: "store" },
      { id: "msg", label: "messages", sub: "by conversation_id", col: 1.4, row: 2, shape: "db", tone: "store" },
      { id: "obj", label: "Object storage", sub: "files · long pastes", col: 2.9, row: 2, shape: "db", tone: "store" },
    ], edges: [
      { from: "chat", to: "cache", both: true }, { from: "chat", to: "conv", both: true }, { from: "chat", to: "msg", both: true }, { from: "msg", to: "obj", dashed: true, label: "pointer" },
    ] },
    { type: "ul", items: [
      "`parent_id` turns a chat into a **tree**: regenerate adds a sibling answer, and editing an old message starts a new branch. The UI shows one path at a time and remembers the current leaf.",
      "The user message is stored before generation. The assistant message is written when streaming completes, with periodic partial saves so a dropped connection doesn't lose a long answer.",
      "See [data modeling](/learn/data-modeling-for-system-design) for choosing keys from access patterns.",
    ] },
    { type: "diagram", kind: "tree", caption: "One conversation stored as a tree. The user regenerated the first answer and later edited a question, so three branches exist. Only the highlighted path is sent to the model as history.", root: { label: "User: plan a trip", tone: "ok", children: [
      { label: "Answer v1", tone: "muted", edge: "first try" },
      { label: "Answer v2", tone: "accent", path: true, edge: "regenerate", children: [
        { label: "Q: cheaper?", tone: "muted", edge: "original", children: [{ label: "Old answer", tone: "muted" }] },
        { label: "Q: under $500?", tone: "ok", path: true, edge: "edited", children: [{ label: "New answer sent to user", tone: "accent", path: true }] },
      ] },
    ] } },
    { type: "callout", tone: "tip", text: "Real-world reference: OpenAI has described keeping PostgreSQL behind ChatGPT with one primary and nearly 50 read replicas, a cache layer, connection pooling and strict limits on writes, while moving shardable, write-heavy workloads to Azure Cosmos DB. The lesson for an interview: account metadata and message appends have different write rates, so they don't need the same store." },

    { type: "h2", text: "6. Context management" },
    { type: "p", text: "The model is stateless. Each request resends what it needs: system prompt, relevant memory, conversation history and the new message. Long conversations eventually exceed the context window, and they cost more on every turn, because the whole history is prefilled again." },
    { type: "diagram", kind: "flow", caption: "Assembling a prompt. Each source is added in a stable order so the shared prefix stays cacheable, and a token counter trims the history to fit the budget before anything goes to a GPU.", nodes: [
      { id: "sys", label: "System prompt", sub: "stable · first", col: 0, row: 0, tone: "store" },
      { id: "mem", label: "Memory lookup", sub: "per-user facts", col: 0, row: 1, tone: "cache" },
      { id: "hist", label: "History + summary", sub: "current branch", col: 0, row: 2, tone: "accent" },
      { id: "new", label: "New message", col: 0, row: 3, tone: "ok" },
      { id: "count", label: "Token counter", sub: "budget by plan", col: 1.5, row: 1.5, tone: "danger" },
      { id: "trim", label: "Trim + summarise", sub: "drop old pastes", col: 2.8, row: 1.5 },
      { id: "out", label: "Prompt", sub: "to inference", col: 4, row: 1.5, shape: "pill", tone: "ok" },
    ], edges: [
      { from: "sys", to: "count" }, { from: "mem", to: "count" }, { from: "hist", to: "count" }, { from: "new", to: "count" }, { from: "count", to: "trim" }, { from: "trim", to: "out" },
    ] },
    { type: "ul", items: [
      "Keep recent turns verbatim, summarise older ones, and drop or summarise large pasted content after it has been answered.",
      "Put the stable system prompt first to benefit from prefix caching; see [LLM caching](/learn/llm-caching).",
      "Long-term memory (\"remember I'm vegetarian\") is retrieved per turn from a per-user store; see [agent memory](/learn/agent-memory).",
      "Count tokens before calling the model and enforce plan-specific limits.",
    ] },
    { type: "diagram", kind: "segments", caption: "A worked example at turn 40. Without trimming, the prompt grows past 30,000 tokens and each message costs about ten times more. A rolling summary keeps the same chat under 3,000 tokens with little loss, because recent turns carry most of the meaning.", total: 32000, lanes: [
      { label: "Untrimmed", parts: [{ label: "System", size: 800, tone: "store" }, { label: "Forty turns of full history", sub: "~31,000 tokens", size: 31200, tone: "danger" }] },
      { label: "Trimmed", parts: [{ label: "~2,800 tokens", size: 2800, tone: "ok" }] },
    ] },
    { type: "p", text: "Update the summary asynchronously every few turns with a small model, and store it next to the conversation. Summarising inline on the request path would add latency to the message that happens to trigger it." },

    { type: "h2", text: "7. Streaming responses" },
    { type: "diagram", kind: "sequence", caption: "A streamed message. The server stores the user turn, opens a stream to the inference fleet, relays tokens to the client as they arrive, and saves the final answer when generation ends or the user stops it.", actors: ["Client", "Chat service", "Inference", "Store"], steps: [
      { from: 0, to: 1, label: "POST message (SSE)" },
      { from: 1, to: 3, label: "save user message" },
      { from: 1, to: 2, label: "generate(context, stream)" },
      { from: 2, to: 1, label: "token, token, token…" },
      { from: 1, to: 0, label: "data: token chunks", tone: "accent" },
      { from: 0, to: 1, label: "stop (optional)", dashed: true },
      { from: 1, to: 2, label: "cancel request", dashed: true },
      { from: 1, to: 3, label: "save assistant message + usage" },
    ] },
    { type: "ul", items: [
      "Server-Sent Events are a natural fit: one-way, plain HTTP and easy to resume. WebSockets also work and help when the client needs to send audio or live events. See [real-time communication](/learn/real-time-communication).",
      "Stop must cancel generation on the GPU, freeing capacity, not just stop sending. Every generated token that nobody reads is wasted money.",
      "Holding ~150K open streams is ordinary for modern connection servers. The harder problem is **deploys**: draining a pod with thousands of live answers needs a resume path.",
    ] },
    { type: "p", text: "**Surviving a dropped connection.** Phones lose signal mid-answer. Generation should continue, so the answer isn't lost, and write each token batch to a short-lived buffer. On reconnect, the client asks for everything after the last sequence number it received." },
    { type: "diagram", kind: "flow", caption: "Resumable streams. Tokens go to a short-lived per-message buffer as well as the open connection. A reconnecting client, possibly on another stream server, reads from the buffer starting at its last sequence number.", nodes: [
      { id: "gpu", label: "Inference", col: 0, row: 0.5, tone: "accent" },
      { id: "relay", label: "Stream relay", sub: "numbers each chunk", col: 1.3, row: 0.5 },
      { id: "buf", label: "Token buffer", sub: "per message · TTL 10 min", col: 2.7, row: 1.5, shape: "db", tone: "cache", w: 190 },
      { id: "s1", label: "Stream server A", sub: "connection dropped", col: 2.7, row: 0, tone: "muted" },
      { id: "s2", label: "Stream server B", sub: "after=seq 212", col: 4, row: 1.5 },
      { id: "c", label: "Client", col: 4, row: 0, shape: "pill" },
    ], edges: [
      { from: "gpu", to: "relay" }, { from: "relay", to: "s1" }, { from: "relay", to: "buf" }, { from: "s1", to: "c", dashed: true, tone: "danger" }, { from: "buf", to: "s2" }, { from: "s2", to: "c", tone: "accent" },
    ] },

    { type: "h2", text: "8. Inference fleet and scheduling" },
    { type: "p", text: "Generation has two phases. **Prefill** reads the whole prompt once and is compute-heavy. **Decode** then produces one token at a time and holds a **KV cache** in GPU memory for the life of the request. Three measurements matter: time to first token (TTFT), time between tokens (TBT), and total throughput." },
    { type: "ul", items: [
      "**Continuous batching** (Orca) lets requests join and leave a running batch at each step, so short answers don't wait for long ones.",
      "A paged **KV cache** (vLLM) allocates GPU memory in small blocks and shares blocks between requests with the same prefix, so far more requests fit on one GPU.",
      "**Chunked prefill** (Sarathi-Serve) splits long prompts into pieces and mixes them with decode steps, so a user pasting a long document doesn't freeze everybody else's stream.",
    ] },
    { type: "diagram", kind: "segments", caption: "Why chunked prefill matters. If a long prefill runs as one batch step, every stream on that GPU stalls and users see a pause. Splitting it adds a little TTFT for the new request and keeps all the others smooth.", lanes: [
      { label: "One-shot prefill", parts: [{ label: "decode", size: 2, tone: "accent" }, { label: "prefill: all streams stall", size: 6, tone: "danger" }, { label: "decode", size: 2, tone: "accent" }] },
      { label: "Chunked prefill", parts: [{ label: "d", size: 1, tone: "accent" }, { label: "chunk", size: 2, tone: "store" }, { label: "d", size: 1, tone: "accent" }, { label: "chunk", size: 2, tone: "store" }, { label: "d", size: 1, tone: "accent" }, { label: "chunk", size: 2, tone: "store" }, { label: "d", size: 1, tone: "accent" }] },
    ] },
    { type: "diagram", kind: "tree", caption: "How the router picks a replica for one request. Plan and request decide the model. Then it prefers a replica already holding this conversation's prefix, as long as that replica has KV memory free.", root: { label: "Incoming request", tone: "accent", children: [
      { label: "Pick model", sub: "plan · task · size", children: [
        { label: "Small model", tone: "store", edge: "free / simple" },
        { label: "Best model", tone: "accent", edge: "paid / hard" },
      ] },
      { label: "Pick replica", sub: "same model pool", children: [
        { label: "Holds prefix", tone: "ok", edge: "first choice" },
        { label: "KV memory free", tone: "cache", edge: "else" },
        { label: "Priority queue", tone: "queue", edge: "else" },
      ] },
    ] } },
    { type: "p", text: "See [LLM serving](/learn/llm-inference-serving) for the details. Autoscale on queue depth and KV cache utilisation, since CPU-style utilisation metrics are misleading on GPUs. Capacity is slow to add, so forecast daily peaks and pre-warm replicas before them." },

    { type: "h2", text: "9. Handling overload" },
    { type: "p", text: "A viral moment can double traffic in minutes, and you can't buy GPUs that fast. Decide in advance what degrades first, and make sure paying users are the last to notice. See [load shedding](/learn/load-shedding)." },
    { type: "diagram", kind: "flow", caption: "A degradation ladder. Each rung triggers at a higher queue wait and costs a little more user experience, while protecting the requests already in flight.", nodes: [
      { id: "a", label: "1. Queue briefly", sub: "wait < 2 s", col: 0, row: 0, tone: "ok" },
      { id: "b", label: "2. Cap output", sub: "lower max tokens", col: 1, row: 0, tone: "cache" },
      { id: "c", label: "3. Smaller model", sub: "free tier first", col: 2, row: 0, tone: "queue" },
      { id: "d", label: "4. Pause features", sub: "titles · memory · tools", col: 3, row: 0, tone: "store", w: 170 },
      { id: "e", label: "5. Reject", sub: "429 + Retry-After", col: 4, row: 0, tone: "danger" },
    ], edges: [{ from: "a", to: "b" }, { from: "b", to: "c" }, { from: "c", to: "d" }, { from: "d", to: "e" }] },
    { type: "p", text: "Never start work you can't finish: an admission check before prefill is much cheaper than cancelling a half-generated answer. Retries from clients need jitter and backoff, or a brief outage turns into a retry storm." },

    { type: "h2", text: "10. Rate limits and plans" },
    { type: "p", text: "Limit by **tokens and messages per time window per user and plan**, enforced at the gateway with a shared counter store. Free users get a smaller default model and lower caps; paid users get higher caps and priority. Abuse detection (scripts, shared accounts) feeds into stricter limits. See [rate limiting](/learn/rate-limiting) and [LLM gateway](/learn/llm-gateway)." },
    { type: "p", text: "One wrinkle: you don't know the output length before generating. So **reserve** an estimate up front and **settle** with the real number afterwards." },
    { type: "diagram", kind: "sequence", caption: "Reserve and settle. The gateway reserves input tokens plus an expected output, and the final usage event corrects the counter. A user can't start ten long answers at once, and short answers don't lose budget.", actors: ["Client", "Gateway", "Limit store", "Chat service"], steps: [
      { from: 0, to: 1, label: "send message" },
      { from: 1, to: 2, label: "reserve 2,900 tokens" },
      { from: 2, to: 1, label: "OK, 41,100 left", dashed: true },
      { from: 1, to: 3, label: "forward request" },
      { from: 3, to: 0, label: "stream answer", tone: "accent" },
      { from: 3, to: 1, label: "usage: 2,740 tokens", dashed: true },
      { from: 1, to: 2, label: "settle: refund 160" },
    ] },

    { type: "h2", text: "11. Tools, files and memory" },
    { type: "p", text: "These features share one idea: the model asks, trusted code acts, and the result comes back as more context. A web search or code run is an extra loop around the same inference path. See [tool calling and MCP](/learn/llm-tool-calling-mcp)." },
    { type: "diagram", kind: "flow", caption: "The tool loop. When the model emits a tool call instead of text, the chat service runs it in a sandbox, appends the result to the context and calls the model again. Each extra loop is another prefill, so loops are capped per message.", nodes: [
      { id: "ctx", label: "Prompt + tool list", col: 0, row: 0 },
      { id: "llm", label: "Model", col: 1.3, row: 0, tone: "accent" },
      { id: "txt", label: "Stream text", col: 2.6, row: 0, tone: "ok", shape: "pill" },
      { id: "run", label: "Tool runner", sub: "search · code sandbox", col: 1.3, row: 1.2, tone: "danger" },
    ], edges: [
      { from: "ctx", to: "llm" }, { from: "llm", to: "txt", label: "answer" }, { from: "llm", to: "run", label: "tool call" }, { from: "run", to: "ctx", dashed: true, label: "result" },
    ] },
    { type: "p", text: "File uploads are a small [document ingestion](/learn/design-document-ingestion-pipeline) pipeline, and retrieved content is untrusted input; see [prompt injection](/learn/prompt-injection)." },
    { type: "diagram", kind: "flow", caption: "File uploads. The file goes straight to object storage, is scanned and parsed in isolated workers, and is then either placed in the prompt (short files) or indexed for retrieval (long ones). The chat stays usable while this runs.", nodes: [
      { id: "up", label: "Upload URL", sub: "direct to storage", col: 0, row: 0, shape: "pill" },
      { id: "scan", label: "Virus + type scan", col: 1, row: 0, tone: "danger" },
      { id: "parse", label: "Parse", sub: "isolated worker", col: 2, row: 0 },
      { id: "short", label: "Short file", sub: "inline in prompt", col: 3, row: 0, tone: "ok" },
      { id: "long", label: "Long file", sub: "chunk + index", col: 3, row: 1, tone: "store" },
    ], edges: [
      { from: "up", to: "scan" }, { from: "scan", to: "parse" }, { from: "parse", to: "short" }, { from: "parse", to: "long" },
    ] },
    { type: "p", text: "**Memory** is written asynchronously. After a conversation turn, a small model extracts durable facts (\"vegetarian\", \"prefers Python\"), deduplicates them against what's stored, and saves them per user. Users must be able to see and delete them." },

    { type: "h2", text: "12. Safety" },
    { type: "ul", items: [
      "Input moderation before generation; output moderation on streamed chunks, with the ability to cut a stream.",
      "Policy-tuned refusals; special handling for self-harm topics (resources, not refusal).",
      "File uploads scanned and parsed in isolated workers; uploaded content treated as untrusted (see [prompt injection](/learn/prompt-injection)).",
      "See [LLM guardrails](/learn/llm-guardrails).",
    ] },
    { type: "diagram", kind: "flow", caption: "Safety is layered. Cheap checks run first, the model's own training is the middle layer, and output is checked as it streams. Account-level signals catch patterns that no single message reveals.", nodes: [
      { id: "acct", label: "Account signals", sub: "abuse · age · region", col: 0, row: 0, tone: "muted" },
      { id: "in", label: "Input classifier", sub: "fast", col: 1.1, row: 0, tone: "danger" },
      { id: "model", label: "Trained model", col: 2.2, row: 0, tone: "accent" },
      { id: "out", label: "Output classifier", sub: "rolling window", col: 3.3, row: 0, tone: "danger" },
      { id: "user", label: "User", col: 4.4, row: 0, shape: "pill", tone: "ok" },
      { id: "res", label: "Refusal / resources", col: 2.2, row: 1.6, tone: "cache" },
    ], edges: [
      { from: "acct", to: "in" }, { from: "in", to: "model" }, { from: "model", to: "out" }, { from: "out", to: "user" }, { from: "in", to: "res", dashed: true }, { from: "out", to: "res", dashed: true, label: "cut stream" },
    ] },
    { type: "p", text: "Streaming creates a trade-off: full-answer moderation is the most accurate, but it would destroy the streaming experience. A common compromise is to check a rolling window of text and hold back the last few words from display, so a violation can usually be cut before it's seen." },
    { type: "diagram", kind: "timeline", caption: "Moderating a stream. The classifier runs on overlapping windows while the client shows text slightly behind generation. If a window fails, the stream is cut and replaced by a message, before the flagged text appears.", ticks: ["0 s", "1 s", "2 s", "3 s", "4 s"], spans: [
      { from: 0, to: 3, label: "tokens generated", tone: "accent", lane: 0 },
      { from: 0.3, to: 2.6, label: "text shown to the user", tone: "ok", lane: 1 },
      { from: 0.8, to: 1.6, label: "window 1: pass", tone: "cache", lane: 2 },
      { from: 1.6, to: 2.6, label: "window 2: fail", tone: "danger", lane: 2 },
    ], marks: [{ at: 2.6, label: "stream cut", tone: "danger" }] },

    { type: "h2", text: "13. Reliability across regions" },
    { type: "p", text: "Conversation data and GPU capacity have different failure modes. Conversations must survive a region loss, while GPU capacity just has to exist somewhere with acceptable latency. Inference is stateless between requests, which makes it easy to move: the whole context is resent every turn." },
    { type: "diagram", kind: "flow", caption: "Multi-region design. A global router sends users to the nearest healthy region, and spills to another when GPUs run out. Conversation data replicates across regions, so a user can continue on any of them.", nodes: [
      { id: "u", label: "Users", col: 1, row: 0, shape: "pill" },
      { id: "g", label: "Global router", sub: "latency · capacity", col: 1, row: 1, tone: "accent" },
      { id: "a", label: "Region A chat", col: 0, row: 2 },
      { id: "b", label: "Region B chat", col: 2, row: 2 },
      { id: "ga", label: "GPU pool A", col: 0, row: 3, tone: "danger" },
      { id: "gb", label: "GPU pool B", col: 2, row: 3, tone: "accent" },
      { id: "s", label: "Replicated store", sub: "conversations", col: 1, row: 3, shape: "db", tone: "store" },
    ], edges: [
      { from: "u", to: "g" }, { from: "g", to: "a" }, { from: "g", to: "b" }, { from: "a", to: "ga" }, { from: "b", to: "gb" }, { from: "a", to: "s", both: true }, { from: "b", to: "s", both: true }, { from: "a", to: "gb", dashed: true, label: "spillover" },
    ] },
    { type: "table", head: ["Failure", "What users see", "Response"], rows: [
      ["One GPU node dies", "One stream stops and retries", "Router retries on another replica; client resumes"],
      ["GPU region out", "Slower first token, then normal", "Spill to other regions; degrade the free tier first"],
      ["Conversation store slow", "History loads late", "Serve from cache; allow new chats with limited context"],
      ["Moderation down", "Possibly slower replies", "Fail closed for high-risk input, or use a simple backup classifier"],
      ["Bad model release", "Worse answers or refusals", "Automatic rollback through the canary gate"],
    ] },

    { type: "h2", text: "14. Evaluation and operations" },
    { type: "ul", items: [
      "Offline eval suites for each model and system prompt version; red-team sets for safety.",
      "Online: thumbs up/down, regenerate rate, conversation length, retention by cohort; A/B tests for model and prompt changes.",
      "Dashboards: time to first token, tokens per second per stream, GPU utilisation, queue wait, cost per message.",
      "See [LLM evaluation](/learn/llm-evaluation) and [LLMOps](/learn/llmops-observability).",
    ] },
    { type: "diagram", kind: "flow", caption: "Releasing a new model or system prompt. Each gate can stop the rollout: offline evals catch quality regressions, shadow traffic checks load and latency, and a small canary and A/B test measure what users actually do.", nodes: [
      { id: "a", label: "Offline evals", sub: "quality + red team", col: 0, row: 0, tone: "store" },
      { id: "b", label: "Shadow traffic", sub: "latency · cost", col: 1, row: 0, tone: "cache" },
      { id: "c", label: "1% canary", sub: "error · refusal rate", col: 2, row: 0, tone: "queue" },
      { id: "d", label: "A/B test", sub: "retention · thumbs", col: 3, row: 0, tone: "accent" },
      { id: "e", label: "Full rollout", col: 4, row: 0, shape: "pill", tone: "ok" },
      { id: "r", label: "Roll back", col: 2, row: 1, tone: "danger" },
    ], edges: [
      { from: "a", to: "b" }, { from: "b", to: "c" }, { from: "c", to: "d" }, { from: "d", to: "e" }, { from: "c", to: "r", dashed: true, tone: "danger" }, { from: "d", to: "r", dashed: true, tone: "danger" },
    ] },

    { type: "h2", text: "Follow-up questions to expect" },
    { type: "ul", items: [
      "*How do you generate conversation titles?* Asynchronously, with a small model, after the first exchange.",
      "*How would you add web search?* As a tool the model can call, with retrieved pages treated as untrusted; see [AI answer engine](/learn/design-ai-answer-engine).",
      "*How do you handle a GPU region outage?* Route to other regions with capacity, degrade the free tier first, and keep conversation storage multi-region.",
      "*A user pastes a 200-page PDF. What happens?* Token count exceeds the plan budget, so index it as a file and retrieve the relevant parts per question, instead of prefilling it every turn.",
      "*Why not cache whole answers?* Identical full prompts are rare in personal chats. Prefix caching saves far more; a response cache only helps for short, non-personal, common questions.",
      "*Users report that answers are slow. Where do you look?* Split it into first-token delay and stream speed, as below.",
    ] },
    { type: "diagram", kind: "tree", caption: "Debugging \"it's slow\". The two metrics point at different problems and different fixes, which is why they are tracked separately.", root: { label: "Answers feel slow", tone: "danger", children: [
      { label: "TTFT high", sub: "long before first token", tone: "queue", children: [
        { label: "Queue wait", sub: "add capacity · shed" },
        { label: "Long prefill", sub: "trim · prefix cache" },
      ] },
      { label: "TBT high", sub: "stream stutters", tone: "cache", children: [
        { label: "Prefill stalls", sub: "chunk prefill" },
        { label: "KV memory full", sub: "fewer per GPU" },
      ] },
    ] } },
  ],
  uses: [
    { name: "Consumer assistants", text: "Streaming chat with history, memory and plan-based limits at very large scale." },
    { name: "Enterprise chat", text: "The same core with SSO, data retention controls and connectors to company data." },
    { name: "Embedded assistants", text: "Chat inside a product, sharing the gateway, inference and safety layers." },
  ],
  interview: [
    "Estimate in tokens: output tokens per second drives the GPU fleet size.",
    "Model conversations and messages for append and ordered reads, with branches for regenerate.",
    "Explain context management: recent turns, summaries, memory, prefix caching.",
    "Design streaming with cancellation and resume, and separate TTFT from time between tokens.",
    "Degrade in a planned order under GPU overload, and reserve then settle tokens for rate limits.",
  ],
  related: ["llm-inference-serving", "agent-memory", "llm-guardrails", "real-time-communication", "llm-gateway", "design-rag-chatbot"],
  practice: ["chatgpt-assistant", "llm-inference-platform", "chat-system", "model-serving", "rate-limiter"],
  reading: [
    { title: "Efficient Memory Management for Large Language Model Serving with PagedAttention", publisher: "Kwon et al., SOSP 2023", url: "https://arxiv.org/abs/2309.06180" },
    { title: "Orca: A Distributed Serving System for Transformer-Based Generative Models", publisher: "Yu et al., OSDI 2022", url: "https://www.usenix.org/conference/osdi22/presentation/yu" },
    { title: "Taming Throughput-Latency Tradeoff in LLM Inference with Sarathi-Serve", publisher: "Agrawal et al., 2024", url: "https://arxiv.org/abs/2403.02310" },
    { title: "Scaling PostgreSQL to power 800 million ChatGPT users", publisher: "OpenAI Engineering, 2026", url: "https://openai.com/index/scaling-postgresql/" },
  ],
};
