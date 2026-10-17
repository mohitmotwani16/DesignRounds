export default {
  blocks: [
    { type: "p", text: "**Stream processing** computes results continuously over an unbounded flow of events, rather than over a finished dataset. Its hard part isn't speed but **time**: events arrive late, out of order, and from devices with wrong clocks. **Windows** group events into finite chunks to aggregate, **event time** says when something actually happened, and **watermarks** tell the processor how long to wait for stragglers before emitting a result." },

    { type: "h2", text: "Event time vs processing time" },
    { type: "table", head: ["", "Event time", "Processing time"], rows: [
      ["Meaning", "When the event happened, stamped at the source", "When the processor sees the event"],
      ["Deterministic on replay", "Yes: the same input gives the same results", "No: results depend on when you ran"],
      ["Handles late data", "Yes, within the allowed lateness", "No: a late event lands in the wrong window"],
      ["Cost", "Needs watermarks and buffered state", "Simple and low-latency"],
      ["Use for", "Business metrics, billing, anything you'll reconcile", "Operational monitoring where approximate is fine"],
    ] },
    { type: "p", text: "A phone that loses signal in a tunnel might send a purchase event ten minutes late. Counted in processing time, the purchase lands in the wrong minute's revenue. Counted in event time, it lands in the right one, as long as the processor is still waiting for that window." },

    { type: "h2", text: "Window types" },
    { type: "table", head: ["Window", "Shape", "Example"], rows: [
      ["Tumbling", "Fixed size, no overlap: 12:00-12:05, 12:05-12:10", "Orders per 5 minutes"],
      ["Sliding (hopping)", "Fixed size, overlapping, advancing by a step: 10 minutes every 1 minute", "Moving average of error rate"],
      ["Session", "Per key, closes after a gap of inactivity", "A user's browsing session ends after 30 idle minutes"],
      ["Global", "One window per key with custom triggers", "Emit a running total every 100 events"],
    ] },

    { type: "h2", text: "Watermarks and late data" },
    { type: "p", text: "A **watermark** is the processor's estimate that \"no more events older than time T will arrive\". A common heuristic is the maximum event time seen minus an allowed delay, for example two minutes. When the watermark passes the end of a window, the window can be finalised and emitted." },
    { type: "diagram", kind: "sequence", caption: "The 12:00-12:05 window emits when the watermark passes 12:05. A late event within the allowed lateness updates the result; one beyond it goes to a side output.", actors: ["Events", "Window 12:00-12:05", "Sink"], steps: [
      { from: 0, to: 1, label: "events at 12:01, 12:03" },
      { from: 0, to: 1, label: "event at 12:07 → watermark 12:05" },
      { from: 1, to: 2, label: "emit count = 2" },
      { from: 0, to: 1, label: "late event at 12:04 (allowed)" },
      { from: 1, to: 2, label: "emit updated count = 3" },
      { note: "events later than allowed lateness → side output", over: [1, 2] },
    ] },
    { type: "ul", items: [
      "**Too short a delay:** results are fast but many events arrive \"late\" and are dropped or require corrections.",
      "**Too long a delay:** results are complete but slow, and state for open windows grows.",
      "**Allowed lateness:** keep a finished window's state a little longer and emit updated results for stragglers, then discard it.",
      "**Side outputs:** send events that are too late to a separate stream or table, so they're counted in a correction job instead of silently lost.",
      "**Idle sources:** a partition with no traffic holds the watermark back; processors need idleness detection or per-source timeouts.",
    ] },
    { type: "callout", tone: "tip", text: "Downstream systems must accept updated results for a window (upserts keyed by window and key) if you emit corrections. If they can only append, you'll double count." },

    { type: "h2", text: "State, checkpoints and exactly-once" },
    { type: "p", text: "Windows, joins and deduplication keep **state** per key. Engines such as Apache Flink and Spark Structured Streaming store that state locally and **checkpoint** it, together with the input offsets, to durable storage. After a crash, the job restores the last checkpoint and replays input from the matching offsets, so each event affects the state exactly once." },
    { type: "p", text: "That guarantee is about internal state. For the output to be exactly-once too, the sink must be transactional (commit output with the checkpoint) or idempotent (upserts keyed by window), as explained in [delivery guarantees](/learn/delivery-semantics). Otherwise replay after a crash can produce duplicates downstream." },

    { type: "h2", text: "Design checklist" },
    { type: "ol", items: [
      "Stamp events with event time at the source, and keep a unique event ID for deduplication.",
      "Choose windows from the business question, and the watermark delay from measured lateness (for example the 99th percentile delay).",
      "Decide what happens to late data: update results, send to a side output, or drop with a metric.",
      "Partition the input stream by the aggregation key so state stays local, and watch for [hot keys](/learn/hot-partitions).",
      "Use checkpoints and an idempotent or transactional sink for correct results after failures.",
      "Reconcile periodically with a batch job over the same raw data. See [batch vs stream processing](/learn/batch-vs-stream-processing).",
    ] },
  ],
  uses: [
    { name: "Real-time dashboards", text: "Tumbling one-minute windows over order events feed live revenue and conversion charts." },
    { name: "Fraud detection", text: "Sliding windows count card transactions per merchant and device to flag bursts within seconds." },
    { name: "Product analytics", text: "Session windows group clickstream events into visits for engagement metrics." },
  ],
  interview: [
    "Ask how late events can arrive and how correct results must be before choosing a watermark.",
    "Use event time for business metrics and explain why processing time gives wrong answers on replay.",
    "Say what happens to data later than the allowed lateness.",
    "Explain checkpoints plus an idempotent sink when claiming exactly-once.",
  ],
  related: ["batch-vs-stream-processing", "event-streaming-kafka", "delivery-semantics", "backpressure", "clocks-and-ordering"],
  practice: ["realtime-analytics", "clickstream", "fraud-data-platform"],
  reading: [
    { title: "Streaming 101: The world beyond batch", publisher: "Tyler Akidau, O'Reilly Radar", url: "https://www.oreilly.com/radar/the-world-beyond-batch-streaming-101/" },
    { title: "Apache Flink: Timely Stream Processing", publisher: "Apache Software Foundation", url: "https://nightlies.apache.org/flink/flink-docs-stable/docs/concepts/time/" },
  ],
};
