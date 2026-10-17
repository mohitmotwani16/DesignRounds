export default {
  blocks: [
    { type: "p", text: "A payment system must never lose money, create money, or charge a customer twice, even when networks time out and services crash halfway through. The designs that achieve this share a few ideas: a **double-entry ledger** as the source of truth for balances, an explicit **payment state machine**, **idempotency keys** on every external call, asynchronous **webhooks** from payment service providers (PSPs), and daily **reconciliation** that compares your records with the provider's and the bank's." },

    { type: "h2", text: "The flow of a card payment" },
    { type: "diagram", kind: "flow", caption: "Checkout creates a payment with an idempotency key; the payment service calls the PSP, records ledger entries, and confirms asynchronously through webhooks and reconciliation.", nodes: [
      { id: "client", label: "Checkout", col: 0, row: 1, shape: "pill" },
      { id: "pay", label: "Payment service", sub: "state machine", col: 1.3, row: 1, tone: "accent" },
      { id: "psp", label: "PSP / gateway", sub: "card network", col: 2.7, row: 0, tone: "muted" },
      { id: "ledger", label: "Ledger", sub: "double-entry, append-only", col: 2.7, row: 2, shape: "db", tone: "store" },
      { id: "wh", label: "Webhooks", sub: "status updates", col: 4, row: 0, shape: "queue", tone: "queue" },
      { id: "recon", label: "Reconciliation", sub: "daily settlement files", col: 4, row: 2, tone: "ok" },
    ], edges: [
      { from: "client", to: "pay", label: "pay (idem key)" }, { from: "pay", to: "psp", label: "authorise / capture" },
      { from: "pay", to: "ledger" }, { from: "psp", to: "wh", dashed: true }, { from: "wh", to: "pay", dashed: true },
      { from: "recon", to: "ledger", dashed: true }, { from: "psp", to: "recon", dashed: true },
    ] },

    { type: "h2", text: "A payment state machine" },
    { type: "table", head: ["State", "Meaning", "Next states"], rows: [
      ["created", "Intent recorded with amount, currency and idempotency key", "authorising"],
      ["authorising", "Request sent to the PSP; outcome may be unknown", "authorised, failed, unknown"],
      ["authorised", "Funds reserved on the card", "captured, voided"],
      ["captured", "Funds taken; will settle to the merchant", "refunded (partially or fully)"],
      ["failed / voided", "No money moved", "terminal"],
      ["unknown", "Timed out; outcome must be queried, never assumed", "resolved by status query or webhook"],
    ] },
    { type: "p", text: "Only allow valid transitions, store every transition with a timestamp and reason, and never move from **unknown** to **failed** just because a timeout happened. The charge may have succeeded. See [partial failure](/learn/fallacies-of-distributed-computing)." },

    { type: "h2", text: "Idempotency everywhere" },
    { type: "ul", items: [
      "The client sends an **idempotency key** with the payment request; retries with the same key return the same payment instead of creating another. See [idempotency](/learn/idempotency).",
      "The payment service passes its own idempotency key to the PSP, so retrying a timed-out authorisation can't charge twice.",
      "Webhooks can arrive more than once and out of order; handlers deduplicate by event ID and apply state transitions only if valid from the current state.",
    ] },

    { type: "h2", text: "Double-entry ledger" },
    { type: "p", text: "Instead of storing a balance and updating it, record every movement of money as a **transaction with at least two entries** that sum to zero: a debit from one account and a credit to another. Balances are derived by summing entries. The ledger is **append-only**: mistakes are corrected with new reversing entries, never by editing history." },
    { type: "table", head: ["Transaction", "Account", "Debit", "Credit"], rows: [
      ["Customer pays ₹1,000 for an order", "Customer funds receivable (PSP)", "₹1,000", ""],
      ["", "Merchant payable", "", "₹970"],
      ["", "Platform fee revenue", "", "₹30"],
      ["Payout to merchant", "Merchant payable", "₹970", ""],
      ["", "Bank cash", "", "₹970"],
    ] },
    { type: "ul", items: [
      "**Invariant:** the entries of every transaction sum to zero, enforced by the database or the ledger service, so money can't appear or vanish.",
      "**Amounts as integers** in minor units (paise, cents) with a currency; never floating point.",
      "**Auditability:** every balance can be explained by its entries, which regulators and finance teams require.",
      "**Strong consistency:** ledger writes use transactions in a relational or [distributed SQL](/learn/distributed-sql) database.",
    ] },

    { type: "h2", text: "Reconciliation" },
    { type: "p", text: "Every day, compare internal records with the PSP's settlement reports and bank statements: each captured payment should appear in settlement with the expected amount and fees, and each payout should appear in the bank. Mismatches (missing, duplicated, wrong amount) go to an exceptions queue for investigation and correcting entries. Reconciliation catches what idempotency and state machines miss, such as a webhook that never arrived." },
    { type: "callout", tone: "tip", text: "For events to other systems (emails, order fulfilment), publish them with a [transactional outbox](/learn/outbox-pattern) in the same database transaction as the state change, so a crash can't leave the payment captured but the order unfulfilled." },
  ],
  uses: [
    { name: "E-commerce checkout", text: "Idempotent payment creation, a state machine for card and UPI flows, and webhook-driven confirmation." },
    { name: "Marketplaces", text: "Double-entry ledgers split each payment between seller payable, platform fees and taxes, then track payouts." },
    { name: "Wallets and fintech", text: "Balances derived from append-only ledger entries with daily reconciliation against bank statements." },
  ],
  interview: [
    "Model payments as a state machine, including an unknown state after timeouts.",
    "Use idempotency keys from client to PSP and deduplicate webhooks.",
    "Store money movements in an append-only double-entry ledger with integer amounts.",
    "Reconcile daily with PSP and bank reports.",
  ],
  related: ["idempotency", "outbox-pattern", "saga-pattern", "distributed-sql", "webhooks"],
  practice: ["payment-platform"],
  reading: [
    { title: "Avoiding Double Payments in a Distributed Payments System", publisher: "Airbnb Engineering", url: "https://medium.com/airbnb-engineering/avoiding-double-payments-in-a-distributed-payments-system-2981f6b070bb" },
    { title: "Designing robust and predictable APIs with idempotency", publisher: "Stripe Blog", url: "https://stripe.com/blog/idempotency" },
  ],
};
