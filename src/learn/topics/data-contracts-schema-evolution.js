export default {
  blocks: [
    { type: "p", text: "A **data contract** is an agreement between the producer of data (a service, an app, a source database) and its consumers about the data's schema, meaning and quality: which fields exist, their types and units, which are required, and how changes will be made. **Schema evolution** is how that schema changes over time without breaking consumers. Together they move data problems from 3 a.m. pipeline failures to a review comment on the producer's pull request." },
    {"type":"diagram","kind":"flow","caption":"A data contract enforced in the pipeline: a schema change is checked for compatibility before it is registered, and every event carries the schema it was written with.","nodes":[{"id":"producer","label":"Producer","sub":"orders service","col":0,"row":1},{"id":"ci","label":"CI check","sub":"compatibility","col":1,"row":0,"tone":"accent"},{"id":"registry","label":"Schema registry","col":2,"row":0,"shape":"db","tone":"store"},{"id":"topic","label":"orders topic","sub":"events + schema id","col":1,"row":1,"shape":"queue","tone":"queue"},{"id":"wh","label":"Warehouse","col":2,"row":1},{"id":"ml","label":"ML features","col":2,"row":2}],"edges":[{"from":"producer","to":"ci","label":"new schema"},{"from":"ci","to":"registry","label":"register"},{"from":"producer","to":"topic","label":"events"},{"from":"topic","to":"wh"},{"from":"topic","to":"ml"}]},

    { type: "h2", text: "Why pipelines break" },
    { type: "p", text: "Most data pipelines consume data their owners don't control. A backend team renames `amount` to `amount_paise`, changes a status enum, or starts sending nulls, and a pipeline three teams away silently produces wrong numbers. The producer didn't know anyone depended on the field; the consumer didn't know it was changing. Contracts make the dependency explicit." },

    { type: "h2", text: "What a contract contains" },
    { type: "ul", items: [
      "**Schema:** field names, types, nullability and nested structure, in a machine-readable form (Avro, Protobuf or JSON Schema).",
      "**Semantics:** what each field means, its units and currency, valid values for enums, and the event's trigger (\"emitted once when payment is captured\").",
      "**Keys and ordering:** the unique ID for deduplication and the partition key that defines ordering.",
      "**Quality expectations:** freshness, completeness and volume ranges the consumer can rely on.",
      "**Ownership and versioning:** who owns it, how to request changes, and how breaking changes are announced.",
    ] },
    { type: "code", code: `
# order_completed.v2 (illustrative)
owner: checkout-team
key: order_id            # unique, used for deduplication
partition_key: customer_id
fields:
  order_id:     { type: string, required: true }
  customer_id:  { type: string, required: true }
  amount_minor: { type: long, required: true, unit: "minor currency units" }
  currency:     { type: string, required: true, format: ISO-4217 }
  completed_at: { type: timestamp, required: true, meaning: "event time at checkout service" }
  coupon_code:  { type: string, required: false }
compatibility: backward
freshness: "available in the stream within 60 s, p99"
` },

    { type: "h2", text: "Compatible and breaking changes" },
    { type: "table", head: ["Change", "Safe for old consumers?", "Notes"], rows: [
      ["Add an optional field with a default", "Yes", "Old readers ignore it; new readers use the default for old data"],
      ["Remove an optional field", "Usually", "Consumers that read it break; deprecate first"],
      ["Add a required field", "No for old data", "Old records don't have it; give it a default instead"],
      ["Rename a field", "No", "Treat as add-new + deprecate-old, with both populated for a while"],
      ["Change a type (int → string, units)", "No", "Create a new field or a new versioned event"],
      ["Add an enum value", "Depends", "Consumers with exhaustive switches break; document how unknown values are handled"],
    ] },
    { type: "p", text: "Compatibility modes describe the direction: **backward compatible** means new readers can read old data; **forward compatible** means old readers can read new data; **full** means both. Event streams with long retention usually need at least backward compatibility, because consumers replay old messages with new code." },

    { type: "h2", text: "Enforcing contracts" },
    { type: "ul", items: [
      "**Schema registry:** producers register schemas with a registry that rejects incompatible versions, and messages carry a schema ID. This is common with Kafka and Avro or Protobuf.",
      "**CI checks:** a producer's pull request fails if it changes the schema incompatibly or removes a field with known consumers.",
      "**Runtime validation:** pipelines validate incoming data against the contract and quarantine violations, as in [data quality](/learn/data-quality).",
      "**Versioned events:** for unavoidable breaking changes, publish `order_completed.v3` alongside v2, migrate consumers, then retire v2 on an announced date.",
    ] },

    { type: "h2", text: "Database sources and CDC" },
    { type: "p", text: "When data comes from [change data capture](/learn/outbox-pattern) on a service's database, the database schema becomes an accidental public contract: any column rename breaks the pipeline. Two common fixes are the **outbox pattern**, where the service publishes deliberate, versioned events instead of exposing its tables, and a thin, owned **interface view** over the tables that the producer promises to keep stable." },
    { type: "callout", tone: "tip", text: "Start contracts where breakage is most expensive: the handful of events and tables behind revenue, billing and core product metrics. Contracting every table at once usually stalls." },
  ],
  uses: [
    { name: "Event-driven platforms", text: "Kafka topics with Avro schemas in a registry reject incompatible producer changes before deployment." },
    { name: "Analytics engineering", text: "Model contracts in the warehouse declare column types and constraints, failing a build if an upstream model changes them." },
    { name: "Cross-team data sharing", text: "A data product publishes a documented interface table with a versioned contract and a deprecation policy." },
  ],
  interview: [
    "Explain backward vs forward compatibility and why replayable streams need backward.",
    "Handle renames as add-then-deprecate, never in place.",
    "Use a schema registry or CI check to enforce compatibility.",
    "Prefer outbox events or interface views over CDC on raw service tables.",
  ],
  related: ["data-quality", "outbox-pattern", "event-streaming-kafka", "columnar-file-formats", "api-design"],
  practice: ["clickstream", "data-quality", "etl-framework"],
  reading: [
    { title: "Schema evolution and compatibility", publisher: "Confluent documentation", url: "https://docs.confluent.io/platform/current/schema-registry/fundamentals/schema-evolution.html" },
    { title: "Open Data Contract Standard", publisher: "Bitol (Linux Foundation AI & Data)", url: "https://bitol-io.github.io/open-data-contract-standard/latest/" },
  ],
};
