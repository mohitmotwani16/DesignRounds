export default {
  blocks: [
    { type: "p", text: "A **saga** manages a business transaction that spans several services, each with its own database, without a distributed lock or global transaction. It's a sequence of **local transactions**; if a step fails, the saga runs **compensating transactions** to undo the steps that already succeeded. Sagas trade atomic isolation for availability and loose coupling." },

    { type: "h2", text: "Example: placing an order" },
    { type: "p", text: "Placing an order touches Orders, Payments, Inventory and Shipping. Each step commits locally; failures trigger compensations in reverse:" },
    { type: "table", head: ["Step", "Local transaction", "Compensation if a later step fails"], rows: [
      ["1", "Orders: create order (PENDING)", "Mark order CANCELLED"],
      ["2", "Payments: charge the customer", "Refund the charge"],
      ["3", "Inventory: reserve items", "Release the reservation"],
      ["4", "Shipping: schedule delivery", "(last step: nothing after it to fail)"],
      ["5", "Orders: mark order CONFIRMED", "n/a"],
    ] },
    { type: "p", text: "If inventory reservation fails at step 3, the saga refunds the payment and cancels the order. The end state is consistent, but in between, other users could see a charged-but-unconfirmed order: sagas give up **isolation**." },

    { type: "h2", text: "Orchestration vs choreography" },
    { type: "diagram", kind: "flow", caption: "Orchestration: one coordinator tells each service what to do and tracks progress. Choreography: services react to each other's events with no central coordinator.", nodes: [
      { id: "orc", label: "Order saga", sub: "orchestrator", col: 1, row: 0, tone: "accent" },
      { id: "pay", label: "Payments", col: 0, row: 1 },
      { id: "inv", label: "Inventory", col: 1, row: 1 },
      { id: "ship", label: "Shipping", col: 2, row: 1 },
      { id: "o2", label: "Orders", col: 0.25, row: 2.6 },
      { id: "p2", label: "Payments", col: 0.25, row: 3.8 },
      { id: "i2", label: "Inventory", col: 1.75, row: 3.8 },
      { id: "s2", label: "Shipping", col: 1.75, row: 2.6 },
    ], edges: [
      { from: "orc", to: "pay", both: true, label: "charge" }, { from: "orc", to: "inv", both: true, label: "reserve" }, { from: "orc", to: "ship", both: true, label: "schedule" },
      { from: "o2", to: "p2", label: "OrderPlaced" }, { from: "p2", to: "i2", label: "PaymentDone" }, { from: "i2", to: "s2", label: "Reserved" },
    ], zones: [{ label: "Orchestration", from: [0, 0], to: [2, 1], tone: "accent" }, { label: "Choreography", from: [0.25, 2.6], to: [1.75, 3.8] }] },
    { type: "table", head: ["", "Orchestration", "Choreography"], rows: [
      ["Control", "A central orchestrator (state machine) sends commands", "Each service listens for events and decides what to do"],
      ["Visibility", "One place shows the saga's state", "Flow is spread across services; needs tracing to follow"],
      ["Coupling", "Orchestrator knows all participants", "Services only know events"],
      ["Best for", "Complex flows with many steps and branches", "Short, simple flows with few participants"],
      ["Tools", "Temporal, AWS Step Functions, Camunda, Netflix Conductor", "Kafka or a message bus with events"],
    ] },

    { type: "h2", text: "Making sagas reliable" },
    { type: "ul", items: [
      "**Persist saga state** so a crash mid-saga resumes rather than leaving it half done (workflow engines handle this).",
      "**Idempotent steps and compensations**: every step can be retried, and compensating twice must be safe. See [idempotency](/learn/idempotency).",
      "**Reliable messaging**: publish step results with the [outbox pattern](/learn/outbox-pattern).",
      "**Compensations must be possible**: an email already sent can't be unsent. Order steps so irreversible actions come last, or use \"pivot\" steps after which the saga only moves forward.",
      "**Semantic locks** for isolation: mark records as PENDING so other operations treat them carefully until the saga finishes.",
      "**Timeouts**: a step that never answers must eventually trigger compensation.",
    ] },

    { type: "h2", text: "Sagas vs two-phase commit" },
    { type: "table", head: ["", "Saga", "Two-phase commit"], rows: [
      ["Atomicity", "Eventually, via compensations", "Yes, all-or-nothing"],
      ["Isolation", "No: intermediate states are visible", "Yes"],
      ["Availability", "High: no global locks", "Lower: participants block while uncertain"],
      ["Coupling", "Loose, async", "Tight, synchronous"],
      ["Fit", "Microservices and long-running business flows", "A few resources that support XA, short transactions"],
    ] },
    { type: "p", text: "See [two-phase commit](/learn/two-phase-commit) for the alternative." },
  ],
  uses: [
    { name: "Uber, Netflix and Airbnb", text: "Use workflow orchestrators (Cadence/Temporal, Conductor) to run multi-service flows like trips, content pipelines and bookings as durable sagas." },
    { name: "Travel booking", text: "Booking a flight, hotel and car is a classic saga: cancel the earlier reservations if a later one fails." },
    { name: "E-commerce checkout", text: "Payment, inventory and fulfilment are coordinated as a saga with refunds and releases as compensations." },
    { name: "AWS Step Functions", text: "Model sagas as state machines with retry and catch blocks that run compensating Lambda functions." },
  ],
  interview: [
    "When a flow spans services, propose a saga and list each step with its compensation.",
    "Choose orchestration for multi-step flows and explain where saga state is persisted.",
    "Acknowledge the lack of isolation and how you handle intermediate states (PENDING statuses).",
    "Make steps idempotent and publish results reliably (outbox).",
  ],
  related: ["two-phase-commit", "outbox-pattern", "idempotency", "event-sourcing-cqrs", "acid-vs-base", "monolith-vs-microservices"],
  practice: ["payment-platform", "ticket-booking", "ride-hailing"],
};
