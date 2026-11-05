// Case study: an AI coding assistant (inline completion, chat and agent mode).
export default {
  blocks: [
    { type: "p", text: "**The question**: design an AI code assistant like GitHub Copilot: as a developer types in their editor, it suggests the next lines of code; it also offers a chat about the codebase and, increasingly, an agent mode that edits files and runs tests. The hardest constraint is **latency**: inline suggestions are useless if they arrive after the developer has typed on. The other key challenges are **picking the right context from the repository**, **privacy of customers' code**, and **measuring usefulness**." },
    { type: "callout", text: "Try it yourself first. Write down the latency budget for one suggestion, then compare. The [code assistant practice round](/system-design/code-assistant) is the same problem with an AI interviewer." },

    { type: "h2", text: "1. Clarify requirements" },
    { type: "table", head: ["Question", "Answer"], rows: [
      ["Features?", "Inline completion (main focus), chat about code, agent mode for multi-file changes"],
      ["Users?", "2M daily active developers; completions requested as they type"],
      ["Latency?", "Inline: suggestion visible within ~300 ms of a pause; chat: first token under 2 s"],
      ["Privacy?", "Enterprise customers require that code isn't retained or used for training; some need region pinning"],
      ["Languages?", "All popular languages; quality matters most for the top ten"],
    ] },
    { type: "p", text: "Say early that this is **three products with one backend**. They differ so much in latency, model size and cost that treating them as one system is the most common mistake." },
    { type: "diagram", kind: "tree", caption: "Three features with very different budgets. Inline completion gets milliseconds and a small model, chat gets seconds and a stronger model, and agent mode gets minutes and a tool loop.", root: { label: "Code assistant", tone: "accent", children: [
      { label: "Inline", sub: "~300 ms · small model", tone: "ok" },
      { label: "Chat", sub: "~2 s first token", tone: "store" },
      { label: "Agent", sub: "minutes · tool loop", tone: "danger" },
    ] } },

    { type: "h2", text: "2. Estimates" },
    { type: "code", code: `Requests    : 2M devs × ~5 active hours × ~120 requests/hour ≈ 1.2B/day
              ≈ 14K/s avg, ~40K/s peak (work hours across time zones)
Per request : ~1,500-4,000 prompt tokens, ~20-60 output tokens
Daily tokens: 1.2B × 3,000 = 3.6T input; 1.2B × 40 = 48B output
Implication : prompt-heavy, output-light → prefill dominates; a small,
              fast model is mandatory; caching and cancelling are crucial
Cancelling  : many requests are obsolete before they finish (the user
              kept typing) → cancel in-flight requests to save GPU time` },
    { type: "diagram", kind: "segments", caption: "The shape of one inline request, on a shared scale. Compare this with a chat request, where output is often a hundred times larger. Reading the prompt is nearly all the work, so serving is tuned for prefill.", total: 3040, lanes: [
      { label: "Input", parts: [{ label: "Prefix", sub: "1,500", size: 1500, tone: "accent" }, { label: "Suffix", sub: "500", size: 500, tone: "store" }, { label: "Other files", sub: "1,000", size: 1000, tone: "cache" }] },
      { label: "Output", parts: [{ label: "40 tokens", size: 40, tone: "danger" }] },
    ] },
    { type: "diagram", kind: "bars", caption: "An illustrative funnel for 100 requests. Many are cancelled because the developer kept typing, some fail quality filters, and only a minority of what's shown is accepted. Every step above acceptance costs GPU time.", values: [
      { label: "Requests sent", value: 100, display: "100", tone: "muted" },
      { label: "Not cancelled", value: 60, display: "60", tone: "store" },
      { label: "Shown to the user", value: 40, display: "40", tone: "cache" },
      { label: "Accepted", value: 12, display: "12", tone: "ok" },
    ] },

    { type: "h2", text: "3. Inline completion architecture" },
    { type: "diagram", kind: "flow", caption: "Inline completion: the editor plugin debounces keystrokes and builds context locally, the service assembles a fill-in-the-middle prompt and calls a small, fast model, and post-processing filters the suggestion before it's shown as ghost text.", nodes: [
      { id: "ed", label: "Editor plugin", sub: "debounce · local context", col: 0, row: 1 },
      { id: "gw", label: "Completion API", sub: "auth · nearest region", col: 1.1, row: 1 },
      { id: "ctx", label: "Prompt builder", sub: "prefix · suffix · repo", col: 2.2, row: 1, tone: "accent" },
      { id: "llm", label: "Small code model", sub: "FIM · low latency", col: 3.3, row: 1, tone: "accent" },
      { id: "post", label: "Post-process", sub: "syntax · filters", col: 3.3, row: 2, tone: "ok" },
      { id: "idx", label: "Repo index", sub: "symbols · embeddings", col: 2.2, row: 0, shape: "db", tone: "store" },
      { id: "show", label: "Ghost text", col: 0, row: 2, shape: "pill", tone: "ok" },
    ], edges: [
      { from: "ed", to: "gw" }, { from: "gw", to: "ctx" }, { from: "idx", to: "ctx", dashed: true }, { from: "ctx", to: "llm" }, { from: "llm", to: "post" }, { from: "post", to: "show", dashed: true },
    ] },
    { type: "p", text: "**A worked example.** A developer has this open, with the cursor at `|`:" },
    { type: "code", code: `# orders/service.py
from .models import Order

def total_revenue(orders: list[Order]) -> float:
    """Sum paid orders, ignoring refunds."""
    return |

def test_total_revenue_empty():
    assert total_revenue([]) == 0.0` },
    { type: "ol", items: [
      "The developer pauses. After ~75 ms of quiet, the plugin sends a request and cancels any older one.",
      "The prefix holds the docstring. The suffix shows the test, so the model knows an empty list must return `0.0`.",
      "A symbol lookup adds the `Order` class, so the model uses real field names like `status` and `amount`.",
      "The model returns `sum(o.amount for o in orders if o.status == \"paid\")` and stops at the end of the line.",
      "Post-processing checks that it parses and doesn't repeat the following lines, then shows it as ghost text.",
    ] },

    { type: "h2", text: "4. Context: the core quality lever" },
    { type: "p", text: "The model only knows what's in its prompt. Within a few thousand tokens, include what most helps predict the next lines:" },
    { type: "ul", items: [
      "**Prefix and suffix:** code before and after the cursor. Models trained for **fill-in-the-middle (FIM)** use both, so a completion fits between existing lines.",
      "**Open tabs and recently edited files:** strong signals of what the developer is working on.",
      "**Relevant snippets from the repository:** definitions of symbols used near the cursor (from a language server or symbol index), and similar code found by embedding search.",
      "**File path, language and imports.**",
      "Context is ranked and trimmed to a token budget; the plugin does much of the gathering locally to avoid shipping whole repositories.",
    ] },
    { type: "code", code: `<|file_path|> orders/service.py
<|snippet|>  class Order: id: int; amount: float; status: str
<|fim_prefix|> def total_revenue(orders: list[Order]) -> float:
    """Sum paid orders, ignoring refunds."""
    return <|fim_suffix|>

def test_total_revenue_empty():
    assert total_revenue([]) == 0.0
<|fim_middle|>` },
    { type: "diagram", kind: "flow", caption: "Filling the prompt. Candidates come from many sources, each is scored for likely usefulness, and a packer fills the token budget with the highest scores. The prefix closest to the cursor is always kept.", nodes: [
      { id: "a", label: "Prefix + suffix", sub: "always in", col: 0, row: 0, tone: "accent" },
      { id: "b", label: "Open tabs", sub: "similar code", col: 0, row: 1, tone: "store" },
      { id: "c", label: "Symbol definitions", sub: "language server", col: 0, row: 2, tone: "cache" },
      { id: "d", label: "Repo embeddings", sub: "similar snippets", col: 0, row: 3, tone: "queue" },
      { id: "r", label: "Score + rank", col: 1.5, row: 1.5 },
      { id: "p", label: "Pack to budget", sub: "~3,000 tokens", col: 2.7, row: 1.5, tone: "danger" },
      { id: "o", label: "Prompt", col: 3.9, row: 1.5, shape: "pill", tone: "ok" },
    ], edges: [{ from: "a", to: "r" }, { from: "b", to: "r" }, { from: "c", to: "r" }, { from: "d", to: "r" }, { from: "r", to: "p" }, { from: "p", to: "o" }] },
    { type: "callout", tone: "tip", text: "Real-world reference: GitHub reported that its A/B tests of neighbouring tabs raised acceptance by about 5% (relative), and that even a very low bar for including a match worked best. Adding the suffix through fill-in-the-middle raised acceptance by about 10%. Caching let them add both without extra latency." },

    { type: "h2", text: "5. Indexing the repository" },
    { type: "p", text: "Open files aren't always enough, and chat and agent mode need to search the whole codebase. That requires an index that's chunked by function and class, embedded, and joined to a symbol graph. The difficulty is keeping it fresh across thousands of branches without uploading everything on every save. See [chunking strategies](/learn/rag-chunking-strategies)." },
    { type: "p", text: "**Merkle trees solve the sync problem.** Hash every file, then hash each folder from its children. An edit changes only that file's hash and its ancestors. Client and server compare roots, then walk down only into folders that differ, so finding one changed file among 50,000 takes a handful of comparisons." },
    { type: "diagram", kind: "tree", caption: "One edited file changes a single path up to the root. The client and server compare hashes from the top, skip every folder that matches, and only re-chunk and re-embed the file that really changed.", root: { label: "repo root", sub: "hash changed", tone: "danger", children: [
      { label: "src/", sub: "hash changed", tone: "danger", path: true, children: [
        { label: "orders.py", sub: "edited", tone: "danger", path: true },
        { label: "users.py", sub: "same · skip", tone: "ok" },
      ] },
      { label: "tests/", sub: "same · skip", tone: "ok", children: [
        { label: "test_a.py", tone: "muted" },
        { label: "test_b.py", tone: "muted" },
      ] },
    ] } },
    { type: "diagram", kind: "flow", caption: "The indexing pipeline, in the shape Cursor has described. Changed files are split at syntax boundaries, and embeddings are cached by chunk content, so a chunk unchanged across branches or users is never embedded twice.", nodes: [
      { id: "m", label: "Merkle diff", sub: "changed files only", col: 0, row: 0, tone: "accent" },
      { id: "c", label: "AST chunking", sub: "function · class", col: 1, row: 0 },
      { id: "h", label: "Chunk hash", sub: "cached?", col: 2, row: 0, tone: "cache" },
      { id: "e", label: "Embed", sub: "async · GPU", col: 3, row: 0, tone: "store" },
      { id: "v", label: "Vector index", sub: "paths obscured", col: 3, row: 1, shape: "db", tone: "store" },
      { id: "s", label: "Reuse vector", col: 2, row: 1, tone: "ok" },
    ], edges: [{ from: "m", to: "c" }, { from: "c", to: "h" }, { from: "h", to: "e" }, { from: "e", to: "v" }, { from: "h", to: "s", dashed: true }, { from: "s", to: "v", dashed: true }] },
    { type: "p", text: "**Sharing indexes across a team.** Clones of the same repository are nearly identical; Cursor reports 92% similarity on average. So a new user's client computes a similarity hash from its Merkle tree, and the server copies a teammate's index as a starting point. Security needs care: each search result is checked against hashes the client proved it holds, so nobody can read code they don't already have." },
    { type: "diagram", kind: "bars", caption: "Time until a new user's first code search, before and after index reuse, on a log scale, using Cursor's published numbers. The very largest repositories gain the most, going from hours to seconds at p99.", log: true, values: [
      { label: "p50 before", value: 7.87, display: "7.87 s", tone: "muted" },
      { label: "p50 after", value: 0.525, display: "525 ms", tone: "ok" },
      { label: "p90 before", value: 169, display: "2.82 min", tone: "muted" },
      { label: "p90 after", value: 1.87, display: "1.87 s", tone: "ok" },
      { label: "p99 before", value: 14508, display: "4.03 hours", tone: "muted" },
      { label: "p99 after", value: 21, display: "21 s", tone: "ok" },
    ] },

    { type: "h2", text: "6. Latency engineering" },
    { type: "diagram", kind: "bars", caption: "An illustrative latency budget for one inline completion. The model call dominates, so a small model, short outputs, nearby regions and prefix caching all matter.", unit: "ms", values: [
      { label: "Debounce", value: 75, display: "~75 ms", tone: "muted" },
      { label: "Context build", value: 20, display: "~20 ms", tone: "store" },
      { label: "Network", value: 40, display: "~40 ms", tone: "cache" },
      { label: "Model (prefill + ~30 tokens)", value: 140, display: "~140 ms", tone: "accent" },
      { label: "Post-process + render", value: 15, display: "~15 ms", tone: "ok" },
    ] },
    { type: "ul", items: [
      "**Debounce** keystrokes (send after a short pause) and **cancel** stale requests server-side.",
      "A small model specialised for code, possibly distilled from a larger one; see [model compression](/learn/model-compression).",
      "Stop generation early: at a line or block boundary, or when confidence drops.",
      "Serve from regions near developers; keep the prompt's stable parts first for prefix caching; see [LLM caching](/learn/llm-caching).",
      "Client-side cache: if the user types exactly what was suggested, keep showing the rest without a new request.",
    ] },
    { type: "diagram", kind: "sequence", caption: "Typing through a request. The second request supersedes the first, and the cancel must reach the GPU to save the work. A connection held open by the plugin avoids a TLS handshake on every keystroke.", actors: ["Editor plugin", "Completion API", "GPU replica"], steps: [
      { from: 0, to: 0, label: "typed \"ret\", pause 75 ms" },
      { from: 0, to: 1, label: "request #1" },
      { from: 1, to: 2, label: "generate #1" },
      { from: 0, to: 0, label: "typed \"urn s\", pause 75 ms" },
      { from: 0, to: 1, label: "cancel #1 + request #2", tone: "danger" },
      { from: 1, to: 2, label: "stop #1, generate #2", tone: "danger" },
      { from: 2, to: 1, label: "stream #2", dashed: true },
      { from: 1, to: 0, label: "ghost text", tone: "accent" },
    ] },
    { type: "diagram", kind: "flow", caption: "A client-side cache avoids work. If what the developer types matches the suggestion on screen, the plugin just trims the suggestion. Only a mismatch sends a new request.", nodes: [
      { id: "t", label: "Keystroke", col: 0, row: 0, shape: "pill" },
      { id: "m", label: "Matches ghost text?", col: 1.3, row: 0, tone: "cache" },
      { id: "y", label: "Trim suggestion", sub: "0 ms · no request", col: 2.8, row: 0, tone: "ok" },
      { id: "n", label: "Debounce + request", col: 2.8, row: 1, tone: "accent" },
    ], edges: [{ from: "t", to: "m" }, { from: "m", to: "y", label: "yes" }, { from: "m", to: "n", label: "no" }] },

    { type: "h2", text: "7. Models and serving" },
    { type: "p", text: "Inline models are small, trained specifically on code with fill-in-the-middle tokens, and retrained often to keep up with new libraries. Chat and agent mode call much larger models, often from outside providers. A shared gateway applies authentication, quotas and policy to all of them; see [LLM gateway](/learn/llm-gateway)." },
    { type: "diagram", kind: "flow", caption: "Routing by feature. Each feature picks a model pool with its own capacity, so an expensive agent run can never starve the fast inline path. The gateway records usage per organisation.", nodes: [
      { id: "g", label: "Gateway", sub: "auth · org policy", col: 0, row: 1, tone: "accent" },
      { id: "a", label: "Inline pool", sub: "small · regional", col: 1.5, row: 0, tone: "ok" },
      { id: "b", label: "Chat pool", sub: "mid or large", col: 1.5, row: 1, tone: "store" },
      { id: "c", label: "Agent pool", sub: "largest · long runs", col: 1.5, row: 2, tone: "danger" },
      { id: "m", label: "Usage + quotas", col: 3, row: 1, shape: "db", tone: "cache" },
    ], edges: [{ from: "g", to: "a" }, { from: "g", to: "b" }, { from: "g", to: "c" }, { from: "a", to: "m", dashed: true }, { from: "b", to: "m", dashed: true }, { from: "c", to: "m", dashed: true }] },
    { type: "p", text: "Improving the model pays off in both quality and speed, because a better-tuned small model can output more tokens per second. GitHub reported these gains for a custom completion model in 2025:" },
    { type: "diagram", kind: "bars", caption: "GitHub's reported improvements from a custom Copilot completion model, compared with the previous one. They also reported 3× token throughput. Treat these as vendor-reported results, but the pattern is useful: one targeted model improved latency and retained code together.", unit: "%", values: [
      { label: "Accepted and retained chars", value: 20, display: "+20%", tone: "ok" },
      { label: "Acceptance rate", value: 12, display: "+12%", tone: "ok" },
      { label: "Latency", value: 35, display: "-35%", tone: "accent" },
    ] },

    { type: "h2", text: "8. Post-processing and safety" },
    { type: "ul", items: [
      "Trim to syntactically sensible boundaries; drop suggestions that duplicate the following lines.",
      "Filter secrets and obviously unsafe patterns; optionally flag suggestions that closely match public code (licence concerns).",
      "Don't suggest in files marked sensitive or excluded by policy.",
    ] },
    { type: "diagram", kind: "flow", caption: "Each filter can drop a suggestion, and showing nothing is often the right answer. A wrong suggestion costs the developer attention, which is more expensive than a silent miss.", nodes: [
      { id: "a", label: "Raw model output", col: 0, row: 0, tone: "accent" },
      { id: "b", label: "Trim", sub: "line · block end", col: 1, row: 0 },
      { id: "c", label: "Parse check", sub: "syntax valid?", col: 2, row: 0, tone: "cache" },
      { id: "d", label: "Duplicate check", sub: "repeats suffix?", col: 3, row: 0, tone: "queue" },
      { id: "e", label: "Secret + licence", sub: "match filters", col: 4, row: 0, tone: "danger" },
      { id: "f", label: "Confidence", sub: "worth showing?", col: 4, row: 1, tone: "store" },
      { id: "g", label: "Ghost text", col: 3, row: 1, shape: "pill", tone: "ok" },
    ], edges: [{ from: "a", to: "b" }, { from: "b", to: "c" }, { from: "c", to: "d" }, { from: "d", to: "e" }, { from: "e", to: "f" }, { from: "f", to: "g" }] },

    { type: "h2", text: "9. Chat and agent mode" },
    { type: "ul", items: [
      "Chat uses a stronger model with retrieved repository context and the current selection; answers stream.",
      "Agent mode runs a [tool loop](/learn/ai-agent-architecture): search code, read files, edit, run tests and linters in a sandbox, iterate. Tests act as the success check.",
      "Changes are presented as diffs for review; the agent never pushes or merges on its own.",
      "Repository content (including comments and READMEs) can carry injected instructions: sandbox without secrets or network by default. See [prompt injection](/learn/prompt-injection).",
    ] },
    { type: "diagram", kind: "flow", caption: "The agent loop. It gathers context with search and read tools, proposes edits, and treats test results as feedback. It stops when tests pass or when a budget runs out, and the human reviews the diff.", nodes: [
      { id: "t", label: "Task", sub: "\"fix the failing test\"", col: 0, row: 1, shape: "pill" },
      { id: "m", label: "Large model", sub: "plan next step", col: 1.2, row: 1, tone: "accent" },
      { id: "s", label: "Search + read", col: 2.5, row: 0, tone: "store" },
      { id: "e", label: "Edit files", sub: "sandbox", col: 2.5, row: 1, tone: "cache" },
      { id: "r", label: "Run tests", sub: "no secrets · no network", col: 2.5, row: 2, tone: "danger" },
      { id: "d", label: "Diff for review", col: 3.8, row: 1, shape: "pill", tone: "ok" },
    ], edges: [{ from: "t", to: "m" }, { from: "m", to: "s", both: true }, { from: "m", to: "e", both: true }, { from: "m", to: "r", both: true }, { from: "e", to: "d", dashed: true, label: "done" }] },
    { type: "table", head: ["", "Inline", "Chat", "Agent"], rows: [
      ["Model", "Small and specialised", "Mid or large", "Largest available"],
      ["Latency target", "~300 ms", "First token ~2 s", "Minutes"],
      ["Context", "Local files and snippets", "Repo retrieval, selection", "Tools that fetch on demand"],
      ["Cost per use", "Tiny, very frequent", "Moderate", "High; many model calls"],
      ["Failure cost", "Ignored suggestion", "Wrong explanation", "Bad change, needs review"],
      ["Control", "Developer accepts or skips", "Developer copies or applies", "Sandbox, budget, diff review"],
    ] },

    { type: "h2", text: "10. Privacy" },
    { type: "ul", items: [
      "Enterprise mode: prompts processed in memory, not retained, not used for training; contractually and technically enforced.",
      "Region pinning for data residency; per-organisation policy for which repositories and files may be sent.",
      "Telemetry (acceptance events) stored without code content.",
    ] },
    { type: "diagram", kind: "flow", caption: "Tracing a code snippet in enterprise mode. Exclusions are applied on the client so that excluded files never leave the machine. The prompt lives only in memory on the server, and only event metadata is stored.", nodes: [
      { id: "c", label: "Client exclusions", sub: ".env · org rules", col: 0, row: 0, tone: "danger" },
      { id: "t", label: "TLS to pinned region", col: 1.2, row: 0 },
      { id: "m", label: "Inference in memory", sub: "no prompt logs", col: 2.5, row: 0, tone: "accent" },
      { id: "r", label: "Response", col: 3.7, row: 0, shape: "pill", tone: "ok" },
      { id: "e", label: "Event telemetry", sub: "accepted · no code", col: 2.5, row: 1, shape: "db", tone: "store" },
    ], edges: [{ from: "c", to: "t" }, { from: "t", to: "m" }, { from: "m", to: "r" }, { from: "m", to: "e", dashed: true }] },
    { type: "p", text: "Repository indexes deserve the same scrutiny. A vector can leak information about the code it came from, so encrypt indexes per organisation, obfuscate file paths, and delete them on request. Don't assume that embeddings count as anonymous." },

    { type: "h2", text: "11. Measuring usefulness" },
    { type: "table", head: ["Metric", "Notes"], rows: [
      ["Acceptance rate", "Share of shown suggestions accepted; easy to game with tiny suggestions"],
      ["Characters retained", "Share of accepted code still present after some minutes; captures lasting value"],
      ["Share of code written with suggestions", "Overall adoption"],
      ["Latency p50/p95 and show rate", "Slow suggestions aren't shown at all"],
      ["Task completion time (controlled studies)", "The outcome that matters; measured in experiments"],
    ] },
    { type: "p", text: "Two studies are worth knowing. Ziegler et al. found that acceptance rate predicted developers' perceived productivity better than measures of how long code persisted. Peng et al. ran a controlled trial where developers with Copilot finished implementing an HTTP server in JavaScript **55.8% faster**. A single small task doesn't prove a general gain, so large companies also run their own long-term studies." },
    { type: "diagram", kind: "flow", caption: "Which metric to trust at which stage. Fast online metrics guide daily decisions, while expensive experiments check that the fast metrics still track real outcomes.", nodes: [
      { id: "a", label: "Offline tests", sub: "tests pass on held-out repos", col: 0, row: 0, tone: "store", w: 190 },
      { id: "b", label: "A/B online", sub: "acceptance · retained", col: 1.3, row: 0, tone: "cache" },
      { id: "c", label: "Cohort retention", sub: "still using it?", col: 2.5, row: 0, tone: "queue" },
      { id: "d", label: "Controlled study", sub: "task time", col: 3.7, row: 0, tone: "ok" },
    ], edges: [{ from: "a", to: "b" }, { from: "b", to: "c" }, { from: "c", to: "d" }] },
    { type: "p", text: "Offline, evaluate on held-out repositories with tests: does the completion make the tests pass? Online, A/B test model and context changes on acceptance and retention. See [LLM evaluation](/learn/llm-evaluation)." },

    { type: "h2", text: "Follow-up questions to expect" },
    { type: "ul", items: [
      "*How do you support a language the model is weak in?* Add training data for it, and raise the confidence threshold there so fewer weak suggestions are shown.",
      "*How do you keep suggestions from repeating vulnerable code?* Add static-analysis filters, train on vetted code, and measure security on an offline suite.",
      "*A team has a huge monorepo. What changes?* Index by service, prefer nearby files, and scope search to what the developer is working on.",
      "*Could you run it on the laptop?* A small local model protects privacy and works offline, but with lower quality; many products keep a local fallback.",
      "*Suggestions got worse this week. Where do you look?* Split the problem as below.",
    ] },
    { type: "diagram", kind: "tree", caption: "Debugging a drop in acceptance. Separate \"no suggestion arrived in time\" from \"the suggestion arrived and was bad\", since they have different owners and fixes.", root: { label: "Acceptance fell", tone: "danger", children: [
      { label: "Fewer shown", tone: "queue", children: [{ label: "Latency up", sub: "cancelled more" }, { label: "Filter change" }] },
      { label: "Worse quality", tone: "accent", children: [{ label: "Context bug", sub: "wrong snippets" }, { label: "Model release" }, { label: "One language" }] },
    ] } },
  ],
  uses: [
    { name: "IDE assistants", text: "Inline completion with fill-in-the-middle models and repository context." },
    { name: "Code review bots", text: "Retrieval over the diff and related code with a stronger model, posting comments for humans to accept." },
    { name: "Coding agents", text: "Sandboxed tool loops that edit, test and propose pull requests." },
  ],
  interview: [
    "Lead with the latency budget and how debounce, cancellation and a small model meet it.",
    "Explain fill-in-the-middle and which repository context to include.",
    "Keep a repository index fresh with Merkle-tree sync and content-hash caching.",
    "Separate inline completion from chat and agent mode, each with its own model and limits.",
    "Measure retained characters and task time as well as acceptance, and address code privacy.",
  ],
  related: ["llm-inference-serving", "model-compression", "llm-caching", "ai-agent-architecture", "rag-chunking-strategies", "typeahead-autocomplete"],
  practice: ["code-assistant", "llm-inference-platform", "autocomplete", "model-serving"],
  reading: [
    { title: "Efficient Training of Language Models to Fill in the Middle", publisher: "Bavarian et al., OpenAI, 2022", url: "https://arxiv.org/abs/2207.14255" },
    { title: "The Impact of AI on Developer Productivity: Evidence from GitHub Copilot", publisher: "Peng et al., 2023", url: "https://arxiv.org/abs/2302.06590" },
    { title: "Productivity Assessment of Neural Code Completion", publisher: "Ziegler et al., MAPS 2022", url: "https://arxiv.org/abs/2205.06537" },
    { title: "How GitHub Copilot is getting better at understanding your code", publisher: "GitHub Blog", url: "https://github.blog/ai-and-ml/github-copilot/how-github-copilot-is-getting-better-at-understanding-your-code/" },
    { title: "The road to better completions: building a faster, smarter GitHub Copilot", publisher: "GitHub Blog, 2025", url: "https://github.blog/ai-and-ml/github-copilot/the-road-to-better-completions-building-a-faster-smarter-github-copilot-with-a-new-custom-model/" },
    { title: "Securely indexing large codebases", publisher: "Cursor", url: "https://cursor.com/blog/secure-codebase-indexing" },
  ],
};
