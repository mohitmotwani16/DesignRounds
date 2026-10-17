export default {
  blocks: [
    { type: "p", text: "**Data quality** is whether data is fit for the decisions made with it: complete, correct, fresh, consistent and unique enough that a dashboard or model can be trusted. **Data observability** is the practice of continuously monitoring datasets for problems, the way application observability monitors services. A pipeline that ran successfully can still deliver wrong data, so quality needs its own checks, alerts and owners." },

    { type: "h2", text: "The dimensions of data quality" },
    { type: "table", head: ["Dimension", "Question", "Example check"], rows: [
      ["Freshness", "Is the data up to date?", "Latest `event_time` in `fact_orders` is within 2 hours"],
      ["Volume / completeness", "Did all the data arrive?", "Today's row count is within 30% of the same weekday's average"],
      ["Schema", "Did the structure change unexpectedly?", "No columns dropped, renamed or changed type"],
      ["Validity", "Do values follow the rules?", "`amount >= 0`, `country` in the ISO list, dates not in the future"],
      ["Uniqueness", "Are there duplicates?", "`order_id` is unique in the fact table"],
      ["Referential integrity", "Do keys match?", "Every `customer_key` exists in `dim_customer`"],
      ["Distribution", "Did values shift unexpectedly?", "Share of null `device_type` jumps from 1% to 40%"],
      ["Accuracy / reconciliation", "Does it match the source of truth?", "Daily revenue equals the payment system's settlement total"],
    ] },

    { type: "h2", text: "Where to check in a pipeline" },
    { type: "diagram", kind: "flow", caption: "Checks at each boundary stop bad data close to where it entered, and failed checks either block publication or quarantine rows.", nodes: [
      { id: "src", label: "Source", shape: "pill", col: 0, row: 1 },
      { id: "in", label: "Ingestion checks", sub: "schema · required fields", col: 1.2, row: 1, tone: "ok" },
      { id: "silver", label: "Transform checks", sub: "unique · keys · rules", col: 2.5, row: 1, tone: "ok" },
      { id: "gold", label: "Business checks", sub: "reconcile · thresholds", col: 3.8, row: 1, tone: "ok" },
      { id: "users", label: "Consumers", shape: "pill", col: 5, row: 1 },
      { id: "q", label: "Quarantine", sub: "bad rows + reason", col: 2.5, row: 2.2, shape: "db", tone: "danger" },
    ], edges: [
      { from: "src", to: "in" }, { from: "in", to: "silver" }, { from: "silver", to: "gold" }, { from: "gold", to: "users", label: "publish" },
      { from: "in", to: "q", dashed: true }, { from: "silver", to: "q", dashed: true },
    ] },
    { type: "ul", items: [
      "**At ingestion:** shape, required fields and types. Reject or quarantine malformed records instead of silently dropping them.",
      "**After transformations:** uniqueness, key integrity, row-count conservation across joins (a join that multiplies rows is a classic bug).",
      "**At the business boundary:** reconciliation against source systems, and thresholds on key metrics.",
      "**Continuously:** freshness and volume monitors on important tables, often with learned baselines instead of fixed thresholds.",
    ] },

    { type: "h2", text: "Blocking vs warning checks" },
    { type: "p", text: "Not every failure should stop the pipeline. Decide per check:" },
    { type: "ul", items: [
      "**Blocking (circuit breaker):** a primary key duplicate or failed reconciliation stops publication, so consumers keep yesterday's correct data rather than today's wrong data.",
      "**Quarantine:** a few invalid rows go to a quarantine table with the reason, and the rest proceeds. Alert if the quarantined share exceeds a threshold.",
      "**Warning:** distribution shifts and soft thresholds notify the owner without blocking, because they may be real changes in the business.",
    ] },
    { type: "callout", tone: "tip", text: "Tie checks to owners. An alert with no owning team, runbook or severity becomes noise and gets muted, which is worse than no alert." },

    { type: "h2", text: "Data SLAs and incidents" },
    { type: "p", text: "Treat important datasets like services. Agree a **data SLA** with consumers, such as \"`fact_orders` for the previous day is complete and checked by 06:00 IST on 99% of days\", and measure it. When something breaks, use [lineage](/learn/data-engineering-architecture) to find which downstream tables, dashboards and models are affected, tell their owners, fix forward, and backfill the affected intervals. Then add a check so the same failure is caught earlier next time." },

    { type: "h2", text: "Preventing problems upstream" },
    { type: "p", text: "Most data quality incidents start with an unannounced change in a source system: a renamed field, a new enum value, a changed unit. [Data contracts](/learn/data-contracts-schema-evolution) move part of the responsibility to producers, who agree a schema and semantics and are warned in CI before they break consumers. Checks catch what contracts miss." },
  ],
  uses: [
    { name: "Finance reporting", text: "Revenue tables reconcile to payment settlements daily; a mismatch blocks the finance mart from refreshing." },
    { name: "ML features", text: "Distribution monitors on feature tables catch a broken upstream join before it silently degrades a model." },
    { name: "Event pipelines", text: "Volume monitors per event type detect when an app release stops sending a key event." },
  ],
  interview: [
    "List checks by dimension: freshness, volume, schema, validity, uniqueness, integrity, reconciliation.",
    "Say which checks block publication and which only warn.",
    "Quarantine bad rows with reasons instead of dropping them.",
    "Define a data SLA and an owner for each critical table.",
  ],
  related: ["data-contracts-schema-evolution", "data-pipeline-orchestration", "medallion-architecture", "observability", "ml-model-monitoring"],
  practice: ["data-quality", "data-alerting", "etl-framework"],
  reading: [
    { title: "Great Expectations documentation", publisher: "Great Expectations", url: "https://docs.greatexpectations.io/docs/home/" },
    { title: "dbt documentation: Data tests", publisher: "dbt Labs", url: "https://docs.getdbt.com/docs/build/data-tests" },
  ],
};
