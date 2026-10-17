export default {
  blocks: [
    { type: "p", text: "The **medallion architecture** organises a lakehouse into three layers of increasing quality: **bronze** holds raw data as it arrived, **silver** holds cleaned, deduplicated and conformed data, and **gold** holds business-level tables ready for dashboards, applications and models. Each layer has a clear contract, so you always know where to fix a problem and what you can safely rebuild." },

    { type: "h2", text: "The three layers" },
    { type: "diagram", kind: "flow", caption: "Data flows from raw bronze through conformed silver to business-ready gold; each hop is a repeatable job with quality checks.", nodes: [
      { id: "src", label: "Sources", sub: "CDC · events · files", col: 0, row: 1, shape: "pill" },
      { id: "bronze", label: "Bronze", sub: "raw · append-only", col: 1.2, row: 1, shape: "db", tone: "queue" },
      { id: "silver", label: "Silver", sub: "clean · deduped · typed", col: 2.4, row: 1, shape: "db", tone: "store" },
      { id: "gold", label: "Gold", sub: "marts · aggregates", col: 3.6, row: 1, shape: "db", tone: "cache" },
      { id: "bi", label: "BI", col: 4.8, row: 0, shape: "pill" },
      { id: "apps", label: "Apps / APIs", col: 4.8, row: 1, shape: "pill" },
      { id: "ml", label: "ML features", col: 4.8, row: 2, shape: "pill" },
    ], edges: [
      { from: "src", to: "bronze" }, { from: "bronze", to: "silver", label: "clean" }, { from: "silver", to: "gold", label: "model" },
      { from: "gold", to: "bi" }, { from: "gold", to: "apps" }, { from: "silver", to: "ml", dashed: true },
    ] },
    { type: "table", head: ["Layer", "Contents", "Rules", "Who reads it"], rows: [
      ["Bronze", "Source data as received, plus load metadata (load time, source file, batch id)", "Append-only, minimal transformation, long retention, replayable", "Data engineers, for reprocessing and debugging"],
      ["Silver", "One clean table per entity or event: typed columns, deduplicated, invalid rows quarantined, keys conformed across sources", "Schema enforced, quality checks, PII handled, history modelled", "Data engineers, analysts, data scientists"],
      ["Gold", "Business-level tables: facts and dimensions, aggregates, feature tables, product-specific marts", "Owned by a team, documented, tested against business rules", "Dashboards, applications, ML training, business users"],
    ] },

    { type: "h2", text: "What belongs in each layer" },
    { type: "ul", items: [
      "**Bronze** keeps what the source sent, including bad records and duplicates, because it's your recovery point. Store it in an [open table format](/learn/open-table-formats) or as files partitioned by load date, and never edit it in place.",
      "**Silver** is where most of the engineering lives: parse and type columns, drop exact duplicates, apply deduplication by key and event time, map source IDs to shared keys, split invalid rows into a quarantine table, and mask or tokenise sensitive fields.",
      "**Gold** is shaped by questions: [dimensional models](/learn/dimensional-modeling), daily aggregates, one-big-table extracts for a dashboard, or feature tables for training.",
    ] },
    { type: "callout", tone: "tip", text: "Put [data quality checks](/learn/data-quality) on each hop: shape and required fields into silver, uniqueness and referential integrity in silver, and business reconciliation (totals match the source system) into gold." },

    { type: "h2", text: "Why the layering helps" },
    { type: "ul", items: [
      "**Reprocessing is cheap:** a bug in silver logic is fixed by rerunning from bronze, without asking sources to resend data.",
      "**Ownership is clear:** platform teams own bronze and silver standards; domain teams own their gold tables.",
      "**Blast radius is contained:** a bad gold model breaks one mart, not every consumer.",
      "**Access control is simpler:** most people only need gold; restricted raw data stays in bronze.",
    ] },

    { type: "h2", text: "Common mistakes" },
    { type: "ul", items: [
      "**Treating it as three copies of everything.** Not every source needs a gold table; build gold for real consumers only.",
      "**Business logic in bronze.** Once bronze is transformed, you've lost the raw record you'd need to fix that transformation.",
      "**Gold reading bronze directly.** Skipping silver duplicates cleaning logic across marts and lets bad data leak.",
      "**No retention policy.** Bronze grows forever unless you decide how long raw history is kept and how deletion requests (for example under privacy law) reach every layer.",
      "**Many tiny files.** Streaming into bronze creates small files that slow every read; schedule compaction.",
    ] },
    { type: "p", text: "Medallion is a naming convention for an older idea (raw, staging and mart layers, or landing, curated and consumption zones). Teams use different names and sometimes more layers; what matters is that each layer has a contract and a single direction of flow." },
  ],
  uses: [
    { name: "Lakehouse platforms", text: "Bronze tables ingest CDC streams and files; silver conforms customers and orders across sources; gold serves finance and growth marts." },
    { name: "Event analytics", text: "Raw app events land in bronze, silver sessionises and deduplicates them, and gold holds daily funnel and retention tables." },
    { name: "ML", text: "Feature pipelines read silver tables directly for detail, while gold holds curated training datasets with lineage." },
  ],
  interview: [
    "Keep bronze raw and replayable, and say how a backfill reruns silver and gold.",
    "Put deduplication, typing and PII handling in silver.",
    "Name the quality gate between each layer.",
    "Build gold only for named consumers, with owners.",
  ],
  related: ["data-warehouse-vs-data-lake", "etl-vs-elt", "open-table-formats", "data-quality", "dimensional-modeling"],
  practice: ["etl-framework", "clickstream", "data-quality"],
  reading: [
    { title: "What is a medallion architecture?", publisher: "Databricks", url: "https://www.databricks.com/blog/what-is-medallion-architecture" },
    { title: "Delta Lake documentation", publisher: "Delta Lake (Linux Foundation)", url: "https://docs.delta.io/index.html" },
  ],
};
