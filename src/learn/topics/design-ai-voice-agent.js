// Case study: a real-time voice AI agent (speech in, speech out) with tool use.
export default {
  blocks: [
    { type: "p", text: "**The question**: design a real-time voice AI agent that answers phone calls or in-app voice conversations, for example to book appointments or handle support. It must listen, understand, think, use tools and speak back with a delay short enough to feel like a conversation, and it must handle people interrupting it. Voice turns every latency problem in AI engineering into something the user can hear." },
    { type: "callout", text: "Try it yourself first. Write out where each millisecond goes between the caller's last word and the agent's first word, then compare. The [voice AI agent practice round](/system-design/voice-ai-agent) is the same problem with an AI interviewer. For the speech models and voice platform underneath, see [design an AI voice platform](/learn/design-ai-voice-platform)." },

    { type: "h2", text: "1. Clarify requirements" },
    { type: "table", head: ["Question", "Answer"], rows: [
      ["Channel?", "Phone (telephony) and in-app (WebRTC)"],
      ["Tasks?", "Answer FAQs, look up and book appointments via tools, transfer to a human"],
      ["Scale?", "5,000 concurrent calls at peak"],
      ["Latency?", "Agent starts speaking within ~800 ms of the user finishing, most of the time"],
      ["Behaviour?", "Users can interrupt (barge-in); the agent stops and listens"],
      ["Compliance?", "Disclose that it's an AI; recording consent; PII handling"],
    ] },
    { type: "p", text: "Be precise about what the latency target measures. The ~800 ms above is the time inside your system. A caller's experience, **voice to voice**, also includes microphones, codecs, jitter buffers and the phone network. Practitioner guides commonly treat about 1.5 seconds voice to voice as the outer target, and phone networks can add several hundred milliseconds." },
    { type: "diagram", kind: "tree", caption: "What makes voice different from text chat. Nothing can be hidden behind a spinner, people talk over the agent, and the input channel itself is noisy and lossy.", root: { label: "Voice agent", tone: "accent", children: [
      { label: "Time", tone: "danger", children: [{ label: "No spinner" }, { label: "Every stage streams" }] },
      { label: "Turn-taking", tone: "queue", children: [{ label: "When did they stop?" }, { label: "Barge-in" }] },
      { label: "Audio", tone: "store", children: [{ label: "Noise + echo" }, { label: "8 kHz phones" }] },
    ] } },

    { type: "h2", text: "2. Two architectures" },
    { type: "table", head: ["", "Cascaded pipeline", "Speech-to-speech model"], rows: [
      ["How", "Speech recognition (ASR) → LLM → text-to-speech (TTS)", "One model takes audio in and produces audio out"],
      ["Latency", "Sum of stages; needs streaming everywhere", "Potentially lower"],
      ["Control", "Text in the middle: easy to log, guard, evaluate and use tools", "Harder to inspect and constrain"],
      ["Flexibility", "Swap any component; pick best ASR/LLM/TTS per language", "Tied to one model's capabilities"],
    ] },
    { type: "diagram", kind: "flow", caption: "The two shapes side by side. The cascade has a text stage in the middle that you can read, filter and test. The speech-to-speech model is simpler to wire up, yet it hides those steps inside one model.", zones: [{ label: "cascade", from: [0, 0], to: [3, 0], tone: "muted" }, { label: "speech-to-speech", from: [0, 1.6], to: [3, 1.6], tone: "muted" }], nodes: [
      { id: "a1", label: "Audio in", col: 0, row: 0, shape: "pill" },
      { id: "a2", label: "ASR", col: 1, row: 0, tone: "store" },
      { id: "a3", label: "LLM + tools", sub: "readable text", col: 2, row: 0, tone: "accent" },
      { id: "a4", label: "TTS", col: 3, row: 0, tone: "ok" },
      { id: "b1", label: "Audio in", col: 0, row: 1.6, shape: "pill" },
      { id: "b2", label: "Realtime model", sub: "audio in, audio out", col: 1.5, row: 1.6, tone: "accent" },
      { id: "b3", label: "Audio out", col: 3, row: 1.6, shape: "pill", tone: "ok" },
    ], edges: [{ from: "a1", to: "a2" }, { from: "a2", to: "a3" }, { from: "a3", to: "a4" }, { from: "b1", to: "b2" }, { from: "b2", to: "b3" }] },
    { type: "p", text: "Most production agents use a **streaming cascade**, because the text stage makes tools, guardrails and evaluation straightforward. The design below uses it. Say that this may change for some use cases as speech-to-speech models improve." },

    { type: "h2", text: "3. Architecture" },
    { type: "diagram", kind: "flow", caption: "A streaming voice pipeline. Audio streams in over WebRTC or a telephony bridge, streaming ASR produces partial transcripts, and turn detection decides when the user has finished. The LLM streams text into streaming TTS, and audio streams back. Barge-in cancels speech immediately.", nodes: [
      { id: "user", label: "Caller", col: 0, row: 1, shape: "pill" },
      { id: "rtc", label: "Media server", sub: "WebRTC / SIP", col: 1, row: 1 },
      { id: "vad", label: "VAD + turn model", col: 2, row: 0, tone: "danger" },
      { id: "asr", label: "Streaming ASR", sub: "partial transcripts", col: 2, row: 2, tone: "store" },
      { id: "agent", label: "Agent (LLM)", sub: "tools · state", col: 3, row: 1, tone: "accent" },
      { id: "tools", label: "Booking API", col: 3, row: 2.3, tone: "store" },
      { id: "tts", label: "Streaming TTS", col: 4, row: 0.3, tone: "ok" },
      { id: "out", label: "Audio to caller", col: 4, row: 1.6, shape: "pill", tone: "ok" },
    ], edges: [
      { from: "user", to: "rtc", both: true }, { from: "rtc", to: "vad" }, { from: "rtc", to: "asr" }, { from: "vad", to: "agent", label: "end of turn" }, { from: "asr", to: "agent" },
      { from: "agent", to: "tools", both: true }, { from: "agent", to: "tts" }, { from: "vad", to: "tts", dashed: true, tone: "danger", label: "barge-in: stop" }, { from: "tts", to: "out", dashed: true },
    ] },
    { type: "p", text: "**A worked example.** Arjun calls a clinic:" },
    { type: "code", code: `Arjun : "Hi, I need to see Dr. Mehta, sometime next week?"
        (partial transcripts stream in; his voice rises at the end)
Turn  : ~250 ms after the pause, the turn model decides he has finished
Agent : "Sure, let me check her calendar."   ← spoken before the tool runs
Tool  : get_slots(doctor="Mehta", week="next")       ← ~400 ms
Agent : "She has Tuesday at 3 pm or Thursday at 11. Which works?"
Arjun : "Thurs..."      ← barge-in, the agent stops within ~100 ms
Arjun : "Thursday, please."
Agent : "Thursday at 11 with Dr. Mehta. Can I confirm your date of birth?"` },
    { type: "diagram", kind: "sequence", caption: "One turn of that call, including a tool lookup. Tokens flow to speech while the LLM is still generating, and a short phrase covers the wait for the tool.", actors: ["Caller", "Media + ASR", "Agent LLM", "TTS"], steps: [
      { from: 0, to: 1, label: "audio frames (every 20 ms)" },
      { from: 1, to: 2, label: "final transcript" },
      { from: 2, to: 3, label: "\"let me check\"" },
      { from: 3, to: 0, label: "audio stream starts", tone: "accent" },
      { from: 2, to: 2, label: "get_slots tool call" },
      { from: 2, to: 3, label: "\"Tuesday at 3 or…\"" },
      { from: 3, to: 0, label: "audio stream", tone: "accent" },
    ] },

    { type: "h2", text: "4. The latency budget" },
    { type: "diagram", kind: "timeline", caption: "Time from the user's last word to the agent's first audio, with every stage streaming (illustrative). Turn detection and the LLM's time to first token are the biggest items.", ticks: ["0 ms", "200", "400", "600", "800"], spans: [
      { from: 0, to: 1.2, label: "turn detection", tone: "danger" },
      { from: 1.2, to: 1.5, label: "ASR", tone: "store" },
      { from: 1.5, to: 3.2, label: "LLM to first sentence", tone: "accent" },
      { from: 3.2, to: 3.9, label: "TTS", tone: "ok" },
    ], marks: [{ at: 3.9, label: "agent speaks", tone: "ok" }] },
    { type: "ul", items: [
      "**Stream everything:** ASR emits partial text while the user speaks; the LLM streams tokens; TTS starts speaking from the first phrase, not the full answer.",
      "**Turn detection:** waiting for a fixed silence (say 700 ms) is slow and cuts off people who pause. Combine voice activity detection with a small model that predicts end-of-turn from the transcript or audio.",
      "**Fast models:** a small or mid-size LLM tuned for short spoken answers; keep prompts compact and use prefix caching. A published rule of thumb is an LLM time to first token of 600 ms or less for voice.",
      "**Co-locate** ASR, LLM and TTS in the same region as the media server to avoid extra network hops.",
      "**Fillers for tool calls:** if a lookup takes a second, say \"Let me check that\" while it runs.",
    ] },
    { type: "p", text: "The whole round trip contains more than the server stages. This published voice-to-voice budget, from a guide by the team behind the Pipecat framework, totals about 1.3 seconds on a desktop WebRTC call:" },
    { type: "diagram", kind: "bars", caption: "A published voice-to-voice breakdown of 1,293 ms. Stages are grouped, and network and buffers are not free even on a good connection. Faster models help most, but the whole path counts, as does the caller's region.", unit: " ms", values: [
      { label: "LLM to first token", value: 650, tone: "accent" },
      { label: "Transcription + endpointing", value: 300, tone: "danger" },
      { label: "TTS to first byte", value: 120, tone: "ok" },
      { label: "Jitter buffers (both ways)", value: 80, tone: "muted" },
      { label: "Mic + speaker", value: 55, tone: "muted" },
      { label: "Codec + packet handling", value: 48, tone: "muted" },
      { label: "Sentence aggregation", value: 20, tone: "store" },
      { label: "Network", value: 20, tone: "cache" },
    ] },
    { type: "callout", tone: "tip", text: "Measure at percentiles, and per stage. A provider's median time to first token can look fine while its p95 is a second or more, and that p95 is what makes a call feel broken. Keep a backup model, and hedge or fail over quickly when a call is running slow." },

    { type: "h2", text: "5. Getting audio in and out" },
    { type: "p", text: "The transport layer has large effects. For a browser or app, use **WebRTC** rather than a raw WebSocket to the client. It runs over UDP, so a lost packet is skipped instead of blocking everything behind it, and it brings Opus, echo cancellation, noise reduction, automatic gain control and useful statistics. WebSockets are fine between servers, or for a prototype." },
    { type: "diagram", kind: "flow", caption: "Two ways in. App users connect over WebRTC with Opus at high quality. Phone callers arrive through a carrier and a SIP bridge at narrow-band 8 kHz, so speech models must handle lower quality and an extra delay.", nodes: [
      { id: "app", label: "App / browser", col: 0, row: 0, shape: "pill" },
      { id: "ph", label: "Phone caller", col: 0, row: 1, shape: "pill" },
      { id: "car", label: "Carrier", sub: "PSTN", col: 1, row: 1, tone: "muted" },
      { id: "sip", label: "SIP bridge", sub: "G.711 8 kHz", col: 2, row: 1, tone: "queue" },
      { id: "sfu", label: "WebRTC edge", sub: "Opus · nearest region", col: 2, row: 0, tone: "store" },
      { id: "wrk", label: "Agent session", sub: "per-call worker", col: 3.2, row: 0.5, tone: "accent" },
    ], edges: [{ from: "app", to: "sfu" }, { from: "ph", to: "car" }, { from: "car", to: "sip" }, { from: "sfu", to: "wrk", both: true }, { from: "sip", to: "wrk", both: true }] },
    { type: "table", head: ["", "WebRTC", "WebSocket", "Telephone (SIP)"], rows: [
      ["Transport", "UDP with congestion control", "TCP", "RTP over carrier networks"],
      ["Packet loss", "Skipped, concealed", "Blocks until resent", "Carrier-managed"],
      ["Audio", "Opus, wide-band", "Whatever you send", "G.711, 8 kHz"],
      ["Best for", "Apps and browsers", "Server to server, prototypes", "Phone calls"],
      ["Extra delay", "Low", "Can spike on bad networks", "Often several hundred ms more"],
    ] },
    { type: "p", text: "**Region matters.** A round trip from the UK to a US West data centre is about 140 ms, compared with 15 ms or less to a nearby London region, and that's paid on every exchange. Run a session worker close to its caller, or at least route over a private backbone from a nearby edge." },

    { type: "h2", text: "6. Turn detection" },
    { type: "p", text: "Knowing when someone has finished is the single hardest perception problem here. \"My number is 4-1-5...\" has a long pause in it that doesn't end the turn, while \"Yes.\" ends immediately." },
    { type: "diagram", kind: "tree", caption: "Common approaches, from simplest to most capable. Modern stacks layer them: a fast VAD triggers a small turn model, and an LLM decision can extend the wait when someone clearly isn't done.", root: { label: "Turn detection", tone: "accent", children: [
      { label: "Fixed silence", sub: "VAD + 800 ms", tone: "muted" },
      { label: "Turn model", sub: "audio or text · ~30 ms", tone: "ok", path: true },
      { label: "LLM tag", sub: "\"wait, not finished\"", tone: "store" },
      { label: "Push to talk", sub: "apps only", tone: "muted" },
    ] } },
    { type: "diagram", kind: "timeline", caption: "A pause in the middle of a phone number. A fixed 800 ms silence rule would respond too early here, or feel slow everywhere else. A turn model looks at what was said and how, and it waits.", ticks: ["0 s", "1 s", "2 s", "3 s", "4 s"], spans: [
      { from: 0, to: 1.4, label: "\"my number is 4-1-5\"", tone: "accent", lane: 0 },
      { from: 2.4, to: 3.4, label: "\"5-5-5-0-1\"", tone: "accent", lane: 0 },
      { from: 1.4, to: 2.2, label: "rule fires", tone: "danger", lane: 1 },
      { from: 1.4, to: 2.4, label: "model: wait", tone: "ok", lane: 2 },
    ], marks: [{ at: 2.2, label: "wrong reply", tone: "danger" }] },
    { type: "p", text: "A pipeline from one published guide: a VAD with a roughly 200 ms trigger, then a small audio turn model that takes about 30 ms on a CPU, with a decision about 250 ms after the pause. An LLM can also tag its response as \"not finished, wait longer\", which helps with slow speakers." },

    { type: "h2", text: "7. Interruptions (barge-in)" },
    { type: "ul", items: [
      "While the agent speaks, keep listening. When voice activity indicates the user is speaking (and it's not echo of the agent's own audio), **stop TTS immediately** and cancel the in-flight LLM generation.",
      "Record what was actually spoken before the interruption, so conversation history matches what the user heard.",
      "Use echo cancellation so the agent doesn't interrupt itself.",
      "Filter brief sounds such as coughs and keyboard clicks by requiring a minimum speech length, and use speaker isolation to ignore background voices.",
    ] },
    { type: "diagram", kind: "sequence", caption: "A barge-in. Every stage must be cancellable, and the buffered audio on the client must be flushed too. Word timestamps from TTS then let you save only the words the caller actually heard.", actors: ["Caller", "Media + VAD", "Agent LLM", "TTS"], steps: [
      { from: 3, to: 0, label: "\"she has Tuesday at 3 or…\"", tone: "accent" },
      { from: 0, to: 1, label: "\"Thurs…\" speech starts" },
      { from: 1, to: 3, label: "cancel + flush audio", tone: "danger" },
      { from: 1, to: 2, label: "cancel generation", tone: "danger" },
      { from: 3, to: 2, label: "heard up to \"Tuesday at 3\"", dashed: true },
      { note: "history now stores only what was heard", over: [2, 3] },
      { from: 1, to: 2, label: "new user turn" },
    ] },
    { type: "diagram", kind: "segments", caption: "Why you need to track what was heard. The LLM produces text far faster than speech, so most of the reply is waiting in buffers when the caller interrupts. Saving the whole text would make the agent believe it had offered slots the caller never heard.", lanes: [
      { label: "Generated", parts: [{ label: "She has Tuesday at 3", size: 4, tone: "ok" }, { label: "or Thursday at 11. Which works?", size: 6, tone: "muted" }] },
      { label: "Heard", parts: [{ label: "She has Tuesday at 3", size: 4, tone: "ok" }, { label: "cut off", size: 6, tone: "danger" }] },
    ] },

    { type: "h2", text: "8. Tool calls without silence" },
    { type: "p", text: "A tool call is especially expensive in voice. It takes two model calls rather than one, the call request itself can't usefully be streamed to speech, and tool definitions add to the prompt. Silence for more than a second or two makes callers ask \"are you there?\"" },
    { type: "diagram", kind: "timeline", caption: "A tool call with and without a filler phrase. Both take the same 1.9 seconds to reach the answer, but the top one leaves dead air, and the bottom one sounds like a person checking something.", ticks: ["0 s", "0.5 s", "1 s", "1.5 s", "2 s", "2.5 s"], spans: [
      { from: 0, to: 3.8, label: "silence", tone: "danger", lane: 0 },
      { from: 3.8, to: 5, label: "answer", tone: "ok", lane: 0 },
      { from: 0.4, to: 2.2, label: "\"let me check that\"", tone: "cache", lane: 1 },
      { from: 3.8, to: 5, label: "answer", tone: "ok", lane: 1 },
    ] },
    { type: "ul", items: [
      "Tell the model to say a short phrase before calling a tool, or use a watchdog timer that speaks only if a call runs long.",
      "Tools work as in any [agent](/learn/ai-agent-architecture): typed, permission-checked, with idempotent booking calls.",
      "Decide per tool whether a barge-in cancels it. A search can be cancelled, but a booking in progress should finish and be reported.",
      "Keep tool request and response pairs consistent in the context after a cancel, or the model's next call can fail.",
    ] },

    { type: "h2", text: "9. Conversation design for voice" },
    { type: "ul", items: [
      "Short sentences, one question at a time, no lists or markdown; confirm critical details (\"That's Tuesday at 3 pm, correct?\").",
      "Spell out numbers and dates properly for TTS; handle ASR errors on names and numbers by confirming.",
      "Transfer to a human with a summary when stuck or asked.",
    ] },
    { type: "table", head: ["Written text", "Text sent to TTS", "Why"], rows: [
      ["Dr. Mehta, 3:00pm", "Doctor Mehta, three P M", "Abbreviations read badly"],
      ["$1,250.50", "twelve hundred fifty dollars and fifty cents", "Digits need a spoken form"],
      ["415-555-0199", "four one five, five five five, oh one nine nine", "Digit groups with pauses"],
      ["**Important:** bring your ID", "Please bring your ID", "Markdown has no sound"],
    ] },
    { type: "diagram", kind: "flow", caption: "Confirming what ASR may have misheard. High-risk values like names and dates get read back. A \"no\" goes to a narrower prompt, and repeated failure hands the call to a human instead of looping.", nodes: [
      { id: "a", label: "Caller gives name", col: 0, row: 0, shape: "pill" },
      { id: "b", label: "ASR + confidence", col: 1.2, row: 0, tone: "store" },
      { id: "c", label: "Read back", sub: "\"M E H T A?\"", col: 2.4, row: 0, tone: "accent" },
      { id: "d", label: "Book", col: 3.6, row: 0, tone: "ok" },
      { id: "e", label: "Ask to spell it", col: 2.4, row: 1, tone: "cache" },
      { id: "f", label: "Human", sub: "after 2 failures", col: 3.6, row: 1, tone: "danger" },
    ], edges: [{ from: "a", to: "b" }, { from: "b", to: "c" }, { from: "c", to: "d", label: "yes" }, { from: "c", to: "e", label: "no" }, { from: "e", to: "f", dashed: true }] },

    { type: "h2", text: "10. Scale and cost" },
    { type: "code", code: `Concurrency : 5,000 calls; each holds a media session, ASR and TTS
ASR         : one streaming session per active call → 5,000 streams
LLM         : a turn every ~10 s per call → ~500 requests/s, short outputs
TTS         : speaking ~40% of call time → ~2,000 synthesis streams
Media       : stateful sessions pinned to servers; drain before deploys
Cost/minute : ASR + LLM + TTS + telephony per minute of call; compare
              with the cost of a human-handled minute` },
    { type: "diagram", kind: "flow", caption: "A session-based deployment. A call is pinned to one worker for its whole life. Deploys drain gracefully, stopping new calls while existing ones finish, because a restart would hang up on a caller.", nodes: [
      { id: "d", label: "Dispatcher", sub: "region · capacity", col: 0, row: 1, tone: "accent" },
      { id: "w1", label: "Worker A", sub: "up to ~50 calls", col: 1.3, row: 0, tone: "ok" },
      { id: "w2", label: "Worker B", sub: "up to ~50 calls", col: 1.3, row: 1, tone: "ok" },
      { id: "w3", label: "Worker C", sub: "draining", col: 1.3, row: 2, tone: "muted" },
      { id: "m", label: "ASR · LLM · TTS", sub: "stateless streams", col: 2.8, row: 1, tone: "store" },
    ], edges: [{ from: "d", to: "w1" }, { from: "d", to: "w2" }, { from: "d", to: "w3", dashed: true }, { from: "w1", to: "m", both: true }, { from: "w2", to: "m", both: true }, { from: "w3", to: "m", both: true }] },
    { type: "diagram", kind: "segments", caption: "An illustrative cost split for one minute of a phone call, at about $0.09. Exact prices vary widely by vendor and volume, so compare your own quotes with the cost of a human-handled minute.", lanes: [
      { parts: [{ label: "Telephony", sub: "$0.015", size: 15, tone: "muted" }, { label: "ASR", sub: "$0.01", size: 10, tone: "store" }, { label: "LLM", sub: "$0.02", size: 20, tone: "accent" }, { label: "TTS", sub: "$0.04", size: 40, tone: "ok" }, { label: "Infra", size: 5, tone: "cache" }] },
    ] },

    { type: "h2", text: "11. Evaluation and operations" },
    { type: "ul", items: [
      "Latency percentiles per stage and end to end; interruption handling success; ASR word error rate on names and numbers.",
      "Task success (bookings made correctly), transfer rate, call duration, caller satisfaction.",
      "Simulated calls with synthetic voices and noise for regression testing; sampled call review. See [LLM evaluation](/learn/llm-evaluation).",
      "Recordings and transcripts are sensitive: consent, redaction and retention policies.",
    ] },
    { type: "diagram", kind: "flow", caption: "Testing voice agents with simulated callers. A second model talks to the agent through synthetic voices, with noise added and interruptions scheduled, so regressions show up before real callers hear them.", nodes: [
      { id: "s", label: "Scenario", sub: "goal · accent · noise", col: 0, row: 0, tone: "store" },
      { id: "v", label: "Voice simulator", col: 1.2, row: 0, tone: "queue" },
      { id: "a", label: "Agent under test", col: 2.4, row: 0, tone: "accent" },
      { id: "r", label: "Sandbox tools", col: 3.6, row: 0, tone: "muted" },
      { id: "g", label: "Scoring", sub: "task · latency", col: 2.4, row: 1, tone: "ok" },
    ], edges: [{ from: "s", to: "v" }, { from: "v", to: "a", both: true }, { from: "a", to: "r", both: true }, { from: "a", to: "g", dashed: true }] },
    { type: "table", head: ["Trace field", "Why it's kept"], rows: [
      ["VAD start and end, turn decision time", "Find turn-detection bugs and early cut-offs"],
      ["ASR partial and final text, confidence", "See mishearings"],
      ["LLM TTFT, tokens, prompt version", "Latency and regressions"],
      ["TTS TTFB, words actually spoken", "Reconstruct what the caller heard"],
      ["Tool calls, results and durations", "Debug slow turns and wrong actions"],
    ] },

    { type: "h2", text: "Follow-up questions to expect" },
    { type: "ul", items: [
      "*Callers say the agent talks over them. Why?* Turn detection is firing too early, or barge-in isn't working. Check VAD settings, echo cancellation and call traces.",
      "*How do you support 20 languages?* Detect the language early, and route to the best ASR and TTS for each. Test each one, because quality varies by language.",
      "*How do you stop a caller's voice from being cloned or misused?* Keep recordings under strict access and retention. Never train on them without consent, and don't reuse them for voices.",
      "*What about prompt injection by voice?* A caller's speech is untrusted input. Bind identity outside the conversation, and enforce tool permissions in code. See [prompt injection](/learn/prompt-injection).",
      "*The first word is always delayed. Why?* Debug the path, as below.",
    ] },
    { type: "diagram", kind: "tree", caption: "Debugging slow replies. Compare each stage's trace with its budget. Often the issue is outside the model: a far-off region, a slow tool, or turn detection waiting too long.", root: { label: "Replies feel slow", tone: "danger", children: [
      { label: "Turn detection", tone: "queue", children: [{ label: "Silence too long" }] },
      { label: "LLM", tone: "accent", children: [{ label: "Long prompt" }, { label: "Tool first" }] },
      { label: "TTS / network", tone: "store", children: [{ label: "Far region" }, { label: "Chunk size" }] },
    ] } },
  ],
  uses: [
    { name: "Call centres", text: "Appointment booking, order status and triage before human transfer." },
    { name: "In-app voice assistants", text: "Hands-free help in driving, cooking or fitness apps over WebRTC." },
    { name: "Language practice and tutoring", text: "Conversational practice where natural turn-taking matters most." },
  ],
  interview: [
    "Compare a streaming cascade with speech-to-speech and justify the choice.",
    "Build a latency budget per stage, and separate server time from voice-to-voice time.",
    "Design turn detection and barge-in with cancellation, and save only what the caller heard.",
    "Pick WebRTC for apps and SIP for phones, and pin each call to a worker near the caller.",
    "Cover voice-specific conversation design, tool fillers and evaluation with simulated calls.",
  ],
  related: ["design-ai-voice-platform", "ai-agent-architecture", "llm-inference-serving", "real-time-communication", "llm-tool-calling-mcp", "design-customer-support-ai-agent"],
  practice: ["voice-ai-agent", "support-ai-agent", "chat-system", "notification-service"],
  reading: [
    { title: "Voice AI and Voice Agents: An Illustrated Primer", publisher: "Kwindla Hultman Kramer", url: "https://voiceaiandvoiceagents.com/" },
    { title: "LiveKit Agents documentation", publisher: "LiveKit", url: "https://docs.livekit.io/agents/" },
    { title: "WebRTC", publisher: "webrtc.org", url: "https://webrtc.org/" },
    { title: "The Voice Agent Latency Playbook: Instrument, Diagnose, Fix", publisher: "Hugging Face community", url: "https://huggingface.co/blog/dvalle08/voice-agent-latency-playbook" },
  ],
};
