export default {
  blocks: [
    { type: "p", text: "An operation is **idempotent** if doing it several times has the same effect as doing it once. In distributed systems, retries are unavoidable (timeouts, dropped connections, redelivered messages), and idempotency is what makes those retries **safe**: a user who taps \"Pay\" twice, or a client that retries after a timeout, must not be charged twice." },

    { type: "h2", text: "Naturally idempotent vs not" },
    { type: "table", head: ["Operation", "Idempotent?", "Why"], rows: [
      ["`GET /orders/42`", "Yes", "Reading changes nothing"],
      ["`PUT /users/42 {email: \"a@b.com\"}`", "Yes", "Setting a value to X twice leaves it X"],
      ["`DELETE /carts/7`", "Yes (in effect)", "Deleting something already deleted leaves it deleted"],
      ["`POST /payments {amount: 500}`", "No", "Each call creates a new payment"],
      ["`UPDATE balance = balance - 500`", "No", "Each call subtracts again"],
      ["`UPDATE balance = 1500 WHERE version = 7`", "Yes", "The conditional write applies at most once"],
    ] },

    { type: "h2", text: "Idempotency keys" },
    { type: "p", text: "For operations that aren't naturally idempotent, the client generates a unique **idempotency key** (a UUID) per logical action and sends it with every retry. The server stores the key with the result and, on a repeat, returns the stored result instead of acting again." },
    { type: "diagram", kind: "sequence", caption: "The first attempt succeeds but the response is lost. The retry carries the same key, so the server returns the original result instead of charging again.", actors: ["Client", "Payments API", "Key store", "Card network"], steps: [
      { from: 0, to: 1, label: "POST /charges, Idempotency-Key: k-7f3" },
      { from: 1, to: 2, label: "insert k-7f3 (status: in progress)" },
      { from: 1, to: 3, label: "charge ₹500" },
      { from: 1, to: 2, label: "k-7f3 → charge ch_91 (done)" },
      { from: 1, to: 0, label: "201 ch_91 (response lost)", dashed: true, tone: "danger" },
      { from: 0, to: 1, label: "retry, same key k-7f3" },
      { from: 1, to: 2, label: "lookup k-7f3 → ch_91" },
      { from: 1, to: 0, label: "201 ch_91 (replayed, no new charge)", tone: "accent" },
    ] },
    { type: "h3", text: "Implementation details that matter" },
    { type: "ul", items: [
      "**Atomically claim the key** before doing the work (a unique constraint or `SET NX`), so two concurrent retries can't both proceed. A second request that finds the key \"in progress\" should wait or get a 409.",
      "**Store the response** (status and body) and replay it exactly for repeats.",
      "**Scope keys** per client or account, and **expire** them after a sensible window (Stripe keeps them 24 hours).",
      "**Validate the payload**: if a key is reused with different parameters, reject it rather than replaying an unrelated result.",
      "**Record the key in the same transaction as the business change** where possible, so \"did it happen?\" and \"is the key stored?\" can't disagree.",
    ] },

    { type: "h2", text: "Idempotent consumers" },
    { type: "p", text: "Message consumers face the same problem because queues deliver **at least once**. Common techniques:" },
    { type: "ul", items: [
      "**Deduplication table**: store processed message IDs with a unique constraint, in the same transaction as the side effect. See [delivery guarantees](/learn/delivery-semantics).",
      "**Natural keys**: `INSERT … ON CONFLICT DO NOTHING` on a business key (one shipment per order ID).",
      "**Conditional updates and versions**: apply an event only if its version is newer than the stored one, which also handles out-of-order delivery.",
      "**Set state, don't increment**: \"order status = shipped\" is idempotent; \"increment shipped count\" is not.",
    ] },

    { type: "h2", text: "Designing idempotent APIs" },
    { type: "ul", items: [
      "Accept an `Idempotency-Key` header on every POST that creates something or moves money.",
      "Let clients create resources with **client-generated IDs** (`PUT /orders/{uuid}`), which turns creation into an idempotent upsert.",
      "Make retries safe end to end: if your service calls another (a payment provider), pass an idempotency key derived from yours.",
    ] },
  ],
  uses: [
    { name: "Stripe", text: "Every POST accepts an Idempotency-Key; repeated requests with the same key return the original response for 24 hours." },
    { name: "Payment and ride-booking apps", text: "Double taps and flaky mobile networks are handled with client-generated keys so a ride or payment is created once." },
    { name: "Kafka consumers writing to databases", text: "Upserts keyed by event or entity ID make reprocessing after a rebalance harmless." },
    { name: "AWS APIs", text: "Many create calls take a `ClientToken` so retried requests don't launch duplicate resources." },
  ],
  interview: [
    "Any time you add retries or a queue, say how duplicates are prevented: idempotency keys, dedup tables or natural keys.",
    "For payments and orders, propose an Idempotency-Key header and explain storing the response.",
    "Claim the key atomically to handle concurrent retries.",
    "Prefer state-setting operations over increments in event handlers.",
  ],
  related: ["delivery-semantics", "retries-and-timeouts", "message-queues", "transactions-isolation-levels", "webhooks", "api-styles"],
  practice: ["payment-platform", "ticket-booking", "notification-service", "ride-hailing"],
};
