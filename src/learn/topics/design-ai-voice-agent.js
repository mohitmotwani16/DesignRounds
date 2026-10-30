// Case study: a real-time voice AI agent (speech in, speech out) with tool use.
export default {
  blocks: [
    { type: "p", text: "**The question**: design a real-time voice AI agent that answers phone calls or in-app voice conversations, for example to book appointments or handle support. It must listen, understand, think, use tools and speak back with a delay short enough to feel like a conversation, and it must handle people interrupting it. Voice turns every latency problem in AI engineering into something the user can hear." },

    { type: "h2", text: "1. Clarify requirements" },
    { type: "table", head: ["Question", "Answer"], rows: [
      ["Channel?", "Phone (telephony) and in-app (WebRTC)"],
      ["Tasks?", "Answer FAQs, look up and book appointments via tools, transfer to a human"],
      ["Scale?", "5,000 concurrent calls at peak"],
      ["Latency?", "Agent starts speaking within ~800 ms of the user finishing, most of the time"],
      ["Behaviour?", "Users can interrupt (barge-in); the agent stops and listens"],
      ["Compliance?", "Disclose that it's an AI; recording consent; PII handling"],
    ] },

    { type: "h2", text: "2. Two architectures" },
    { type: "table", head: ["", "Cascaded pipeline", "Speech-to-speech model"], rows: [
      ["How", "Speech recognition (ASR) → LLM → text-to-speech (TTS)", "One model takes audio in and produces audio out"],
      ["Latency", "Sum of stages; needs streaming everywhere", "Potentially lower"],
      ["Control", "Text in the middle: easy to log, guard, evaluate and use tools", "Harder to inspect and constrain"],
      ["Flexibility", "Swap any component; pick best ASR/LLM/TTS per language", "Tied to one model's capabilities"],
    ] },
    { type: "p", text: "Most production agents use a **streaming cascade**, because the text stage makes tools, guardrails and evaluation straightforward. The design below uses it." },

    { type: "h2", text: "3. Architecture" },
    { type: "diagram", kind: "flow", caption: "A streaming voice pipeline. Audio streams in over WebRTC or a telephony bridge; streaming ASR produces partial transcripts; turn detection decides when the user has finished; the LLM streams text into streaming TTS; audio streams back. Barge-in cancels speech immediately.", nodes: [
      { id: "user", label: "Caller", col: 0, row: 1, shape: "pill" },
      { id: "rtc", label: "Media server", sub: "WebRTC / SIP", col: 1.2, row: 1 },
      { id: "vad", label: "VAD + turn detection", col: 2.4, row: 0.2, tone: "danger", w: 170 },
      { id: "asr", label: "Streaming ASR", sub: "partial transcripts", col: 2.4, row: 1.8, tone: "store" },
      { id: "agent", label: "Agent (LLM)", sub: "tools · state", col: 3.75, row: 1, tone: "accent" },
      { id: "tools", label: "Booking API", col: 3.75, row: 2.3, tone: "store" },
      { id: "tts", label: "Streaming TTS", col: 5.05, row: 1, tone: "ok" },
    ], edges: [
      { from: "user", to: "rtc", both: true }, { from: "rtc", to: "vad" }, { from: "rtc", to: "asr" }, { from: "vad", to: "agent", label: "end of turn" }, { from: "asr", to: "agent" },
      { from: "agent", to: "tools", both: true }, { from: "agent", to: "tts", label: "text stream" }, { from: "tts", to: "rtc", dashed: true, label: "audio" }, { from: "vad", to: "tts", dashed: true, label: "barge-in: stop" },
    ] },

    { type: "h2", text: "4. The latency budget" },
    { type: "diagram", kind: "timeline", caption: "Time from the user's last word to the agent's first audio, with every stage streaming (illustrative). Turn detection and the LLM's time to first token are the biggest items.", ticks: ["0 ms", "200", "400", "600", "800"], spans: [
      { from: 0, to: 1.2, label: "turn detection", tone: "danger" },
      { from: 1.2, to: 1.5, label: "ASR", tone: "store" },
      { from: 1.5, to: 3.2, label: "LLM time to first sentence", tone: "accent" },
      { from: 3.2, to: 3.9, label: "TTS first audio", tone: "ok" },
    ], marks: [{ at: 3.9, label: "agent speaks", tone: "ok" }] },
    { type: "ul", items: [
      "**Stream everything:** ASR emits partial text while the user speaks; the LLM streams tokens; TTS starts speaking from the first phrase, not the full answer.",
      "**Turn detection:** waiting for a fixed silence (say 700 ms) is slow and cuts off people who pause. Combine voice activity detection with a small model that predicts end-of-turn from the transcript.",
      "**Fast models:** a small or mid-size LLM tuned for short spoken answers; keep prompts compact and use prefix caching.",
      "**Co-locate** ASR, LLM and TTS in the same region as the media server to avoid extra network hops.",
      "**Fillers for tool calls:** if a lookup takes a second, say \"Let me check that\" while it runs.",
    ] },

    { type: "h2", text: "5. Interruptions (barge-in)" },
    { type: "ul", items: [
      "While the agent speaks, keep listening. When voice activity indicates the user is speaking (and it's not echo of the agent's own audio), **stop TTS immediately** and cancel the in-flight LLM generation.",
      "Record what was actually spoken before the interruption, so conversation history matches what the user heard.",
      "Use echo cancellation so the agent doesn't interrupt itself.",
    ] },

    { type: "h2", text: "6. Conversation design for voice" },
    { type: "ul", items: [
      "Short sentences, one question at a time, no lists or markdown; confirm critical details (\"That's Tuesday at 3 pm, correct?\").",
      "Spell out numbers and dates properly for TTS; handle ASR errors on names and numbers by confirming.",
      "Tools work as in any [agent](/learn/ai-agent-architecture): typed, permission-checked, with idempotent booking calls.",
      "Transfer to a human with a summary when stuck or asked.",
    ] },

    { type: "h2", text: "7. Scale and cost" },
    { type: "code", code: `Concurrency : 5,000 calls; each holds a media session plus streaming ASR and TTS
ASR         : one streaming session per active call → 5,000 concurrent streams
LLM         : a turn every ~10 s per call → ~500 LLM requests/s, short outputs
TTS         : speaking ~40% of call time → ~2,000 concurrent synthesis streams
Media       : stateful sessions pinned to servers; drain before deploys
Cost/minute : ASR + LLM + TTS + telephony per minute of call; compare with the
              cost of a human-handled minute` },

    { type: "h2", text: "8. Evaluation and operations" },
    { type: "ul", items: [
      "Latency percentiles per stage and end to end; interruption handling success; ASR word error rate on names and numbers.",
      "Task success (bookings made correctly), transfer rate, call duration, caller satisfaction.",
      "Simulated calls with synthetic voices and noise for regression testing; sampled call review. See [LLM evaluation](/learn/llm-evaluation).",
      "Recordings and transcripts are sensitive: consent, redaction and retention policies.",
    ] },
  ],
  uses: [
    { name: "Call centres", text: "Appointment booking, order status and triage before human transfer." },
    { name: "In-app voice assistants", text: "Hands-free help in driving, cooking or fitness apps over WebRTC." },
    { name: "Language practice and tutoring", text: "Conversational practice where natural turn-taking matters most." },
  ],
  interview: [
    "Compare a streaming cascade with speech-to-speech and justify the choice.",
    "Build a latency budget per stage and stream every stage.",
    "Design turn detection and barge-in with cancellation.",
    "Cover voice-specific conversation design, tools and evaluation.",
  ],
  related: ["ai-agent-architecture", "llm-inference-serving", "real-time-communication", "llm-tool-calling-mcp", "design-customer-support-ai-agent"],
  practice: ["voice-ai-agent", "support-ai-agent", "chat-system", "notification-service"],
  reading: [
    { title: "LiveKit Agents documentation", publisher: "LiveKit", url: "https://docs.livekit.io/agents/" },
    { title: "WebRTC", publisher: "webrtc.org", url: "https://webrtc.org/" },
  ],
};
