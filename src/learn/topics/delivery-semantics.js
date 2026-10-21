export default {
  blocks: [
    { type: "p", text: "Networks drop messages and machines crash at inconvenient moments, so messaging systems can't promise both \"never lose a message\" and \"never deliver it twice\" without help. **Delivery semantics** describe which failure you accept: **at-most-once** (may lose), **at-least-once** (may duplicate) or **exactly-once** (neither, at a cost and usually only within a closed system)." },

    { type: "h2", text: "Where duplicates and losses come from" },
    { type: "diagram", kind: "sequence", caption: "The consumer processes the message, then crashes before acknowledging. The broker can't tell the difference, so it redelivers: a duplicate.", actors: ["Broker", "Consumer", "Database"], steps: [
      { from: 0, to: 1, label: "deliver msg #81" },
      { from: 1, to: 2, label: "charge card ₹500", tone: "accent" },
      { from: 2, to: 1, label: "OK" },
      { note: "consumer crashes before ack", over: [1] },
      { from: 0, to: 1, label: "visibility timeout → redeliver msg #81", tone: "danger" },
      { from: 1, to: 2, label: "charge card ₹500 again?", tone: "danger" },
    ] },
    { type: "p", text: "The core problem: \"do the work\" and \"record that it's done\" are two separate steps. Whichever order you do them in, a crash between them causes either a loss or a duplicate." },

    { type: "h2", text: "The three guarantees" },
    { type: "table", head: ["Guarantee", "How it's achieved", "Failure mode", "Fits"], rows: [
      ["**At-most-once**", "Acknowledge (or commit the offset) **before** processing; never retry", "Messages can be lost", "Metrics samples, logs you can afford to drop, live location pings"],
      ["**At-least-once**", "Acknowledge **after** processing; retry on failure", "Messages can be processed more than once", "Almost everything: orders, emails, payments (with idempotency)"],
      ["**Exactly-once**", "At-least-once delivery **plus** deduplication or atomic commit of results and progress", "Higher cost and complexity", "Financial ledgers, billing counts, stream aggregations"],
    ] },

    {"type":"h2","text":"Each guarantee, step by step"},
    {"type":"p","text":"A consumer reads an event, starts processing, and crashes. Is the event lost, or processed again? It depends on **when the consumer acknowledges** (commits its offset) relative to doing the work."},
    {"type":"h3","text":"At-most-once: fire and forget"},
    {"type":"diagram","kind":"sequence","caption":"At-most-once: the offset is committed before processing, so a crash mid-processing loses event X for good.","actors":["Broker","Consumer","Database"],"steps":[{"from":0,"to":1,"label":"event X"},{"from":1,"to":0,"label":"commit offset (X done)"},{"from":1,"to":2,"label":"write error count…"},{"note":"crash before the write lands","over":[1,2]},{"from":0,"to":1,"label":"after restart: next event Y (X is lost)"}]},
    {"type":"p","text":"Each event is processed **zero or one** time. A logging pipeline commits event X, crashes while writing to the database, restarts after X, and X is gone. Use it when occasional loss is fine and speed matters most: metrics where a few missing points don't change trends, log aggregation with tolerable gaps. Simplest and lowest latency, but loses data on failure."},
    {"type":"h3","text":"At-least-once: never lose, may duplicate"},
    {"type":"diagram","kind":"sequence","caption":"At-least-once: the work is done before the commit, so a crash in between causes redelivery and a duplicate write.","actors":["Broker","Consumer","Database"],"steps":[{"from":0,"to":1,"label":"event X"},{"from":1,"to":2,"label":"write error count (done)"},{"note":"crash before committing the offset","over":[0,1]},{"from":0,"to":1,"label":"after restart: event X again"},{"from":1,"to":2,"label":"write again → duplicate unless idempotent"},{"from":1,"to":0,"label":"commit offset"}]},
    {"type":"p","text":"Each event is processed **one or more** times: nothing is lost, but duplicates happen, so downstream must cope:"},
    {"type":"ul","items":["**Idempotent operations**: an upsert by key gives the same result run once or twice; a plain INSERT duplicates.","**Deduplication by event ID**: store each event's unique ID and skip IDs already seen.","**Naturally idempotent changes**: \"set balance to $100\" is idempotent; \"add $10 to balance\" is not."]},
    {"type":"p","text":"Most production stream processing uses at-least-once: no data loss, slightly more latency than at-most-once, and duplicates handled in your logic. See [idempotency](/learn/idempotency)."},
    {"type":"h3","text":"Exactly-once: no loss, no duplicates"},
    {"type":"p","text":"The processing result and the input acknowledgment commit together **atomically**: both happen or neither. Flink and Kafka Streams do this with **distributed snapshots (checkpoints)**: periodically capture what's been consumed, what's in flight and what's been output. On failure, restore the last checkpoint and resume; events after it are reprocessed, but their outputs sit in a transactional sink and commit only when the next checkpoint completes, so nothing is emitted twice."},
    {"type":"diagram","kind":"sequence","caption":"Exactly-once with checkpoints: outputs are staged in a transaction and committed together with the consumed offsets when a checkpoint completes.","actors":["Kafka (input)","Stream processor","Transactional sink"],"steps":[{"from":0,"to":1,"label":"events 101–150"},{"from":1,"to":2,"label":"stage results (uncommitted)"},{"note":"checkpoint: offsets 150 + state snapshot","over":[0,1]},{"from":1,"to":2,"label":"commit staged results"},{"note":"crash later? restore checkpoint 150, replay 151+, discard uncommitted output","over":[0,2]}]},
    {"type":"p","text":"**The catch**: this guarantee usually holds **inside** the stream processing system. Writing to an external database or API exactly once end to end needs a sink whose transactions coordinate with checkpoints, idempotent writes to the sink, or a way to roll back external writes; otherwise you get exactly-once processing but at-least-once delivery to the sink. Use it where correctness is critical (billing, financial transactions, inventory), accepting checkpoint latency and more complexity."},
    {"type":"table","head":["Guarantee","Data loss","Duplicates","Complexity","Latency"],"rows":[["At-most-once","Possible","No","Low","Lowest"],["At-least-once","No","Possible","Medium","Medium"],["Exactly-once","No","No","High","Highest"]]},
    {"type":"p","text":"Many production systems choose **at-least-once plus idempotent operations**, which gives \"effectively-once\" results with less complexity: upserts instead of inserts, unique event IDs deduplicated at the sink, and naturally idempotent operations. That pushes the complexity into application logic you control rather than distributed transaction protocols that are hard to get right."},
    { type: "h2", text: "Exactly-once is really \"effectively once\"" },
    { type: "p", text: "Delivering a message exactly once over an unreliable network is impossible in general. What systems actually provide is **exactly-once processing effects**: the message may arrive twice, but its effect is applied once. Two techniques get there:" },
    { type: "ul", items: [
      "**Idempotent processing**: record each message ID (or a business key) with the result, in the same transaction as the side effect, and skip IDs already seen. See [idempotency](/learn/idempotency).",
      "**Atomic commit of output and progress**: store the result and the consumer's position together, so they can't diverge. Kafka transactions do this for Kafka-to-Kafka pipelines (consume, produce, and commit offsets atomically); a database consumer can store its offset in the same table transaction as its writes.",
    ] },
    { type: "code", code: `
BEGIN;
  INSERT INTO processed_messages (message_id) VALUES ('msg-81');   -- fails if seen before
  UPDATE accounts SET balance = balance - 500 WHERE id = 'acct-9';
COMMIT;
-- A redelivered msg-81 hits the unique constraint, the transaction rolls back,
-- and the consumer simply acknowledges it.
` },
    { type: "callout", tone: "warning", text: "Exactly-once inside Kafka doesn't extend to side effects outside it. Sending an email or calling a payment API from a Kafka transaction can still happen twice; those calls need their own idempotency keys." },

    { type: "h2", text: "Producers matter too" },
    { type: "p", text: "Duplicates also appear when a **producer** retries a publish because the acknowledgement was lost. Kafka's idempotent producer assigns sequence numbers so the broker discards duplicate writes; elsewhere, include a unique event ID so consumers can deduplicate." },

    { type: "h2", text: "Choosing" },
    { type: "ul", items: [
      "Default to **at-least-once delivery with idempotent consumers**. It's simple, robust and works with every broker.",
      "Use **at-most-once** only where losing data is genuinely fine and duplicates are worse or pointless.",
      "Reach for **transactional exactly-once** in stream processing where counts and sums must be exact and the whole pipeline is inside one system.",
    ] },
  ],
  uses: [
    { name: "Payment processing", text: "Consumers record a payment intent ID before charging and pass an idempotency key to the payment provider, so retries never double-charge." },
    { name: "Kafka Streams and Flink", text: "Provide exactly-once state updates by checkpointing state and input offsets atomically." },
    { name: "AWS SQS", text: "Standard queues are at-least-once; FIFO queues add deduplication by message ID within a 5-minute window." },
    { name: "Telemetry", text: "High-volume metrics often use at-most-once UDP or fire-and-forget pipelines because a few lost points don't matter." },
  ],
  interview: [
    "Say \"at-least-once with idempotent consumers\" and show how deduplication works (message ID table or natural keys).",
    "Explain why exactly-once delivery isn't possible but exactly-once effects are.",
    "Handle producer-side duplicates too: unique event IDs or idempotent producers.",
    "Match the guarantee to the data: losing a metric is fine, losing a payment is not.",
  ],
  related: ["idempotency", "message-queues", "event-streaming-kafka", "outbox-pattern", "retries-and-timeouts"],
  practice: ["payment-platform", "distributed-message-queue", "notification-service", "realtime-analytics"],
};
