export default {
  blocks: [
    { type: "p", text: "**ETL** (extract, transform, load) and **ELT** (extract, load, transform) are two orders for the same three steps of a data pipeline. In ETL, data is transformed on a separate processing system before it reaches the warehouse. In ELT, raw data is loaded into the warehouse or lakehouse first and transformed there, usually with SQL. The difference sounds small, but it changes where compute runs, what you can reprocess, who can change the logic, and what it costs." },

    { type: "h2", text: "The two pipelines side by side" },
    { type: "diagram", kind: "flow", caption: "ETL transforms in flight on a separate engine; ELT lands raw data first and transforms inside the warehouse, keeping the raw copy for reprocessing.", nodes: [
      { id: "s1", label: "Sources", sub: "DBs · APIs · files", col: 0, row: 0, shape: "pill" },
      { id: "t1", label: "Transform engine", sub: "ETL tool · Spark", col: 1.3, row: 0, tone: "accent" },
      { id: "w1", label: "Warehouse", sub: "modelled tables only", col: 2.6, row: 0, shape: "db", tone: "store" },
      { id: "s2", label: "Sources", sub: "DBs · APIs · files", col: 0, row: 1.4, shape: "pill" },
      { id: "w2", label: "Warehouse / lakehouse", sub: "raw tables", col: 1.3, row: 1.4, shape: "db", tone: "store" },
      { id: "m2", label: "SQL models", sub: "staging → marts", col: 2.6, row: 1.4, tone: "accent" },
    ], edges: [
      { from: "s1", to: "t1", label: "extract" }, { from: "t1", to: "w1", label: "load" },
      { from: "s2", to: "w2", label: "extract + load" }, { from: "w2", to: "m2", label: "transform" },
    ] },

    { type: "h2", text: "ETL vs ELT compared" },
    { type: "table", head: ["", "ETL", "ELT"], rows: [
      ["Where transformation runs", "A separate engine (an ETL tool, Spark, custom code)", "Inside the warehouse or lakehouse engine"],
      ["What lands in the warehouse", "Only cleaned, modelled data", "Raw data first, then modelled layers"],
      ["Reprocessing after a logic bug", "Re-extract from sources, which may no longer have the old data", "Re-run the SQL over the raw tables already stored"],
      ["Who changes the logic", "Usually data engineers in the pipeline code", "Analytics engineers and analysts in versioned SQL"],
      ["Sensitive data", "Can be masked or dropped before it ever reaches the warehouse", "Lands raw, so access controls and masking must be applied in the warehouse"],
      ["Cost driver", "Running and scaling the transform cluster", "Warehouse compute for every transformation run"],
      ["Typical fit", "Heavy non-SQL processing, strict data minimisation, legacy warehouses", "Cloud warehouses and lakehouses with cheap storage and elastic compute"],
    ] },

    { type: "h2", text: "Why ELT became the default" },
    { type: "p", text: "Older on-premise warehouses had expensive, fixed capacity, so it made sense to shrink and clean data before loading it. Cloud warehouses and lakehouses separate cheap storage from elastic compute, which flipped the trade-off. Loading raw data is cheap, and keeping it gives you a **replayable history**: when a business rule changes, you rerun the transformation instead of asking the source team for last year's data again." },
    { type: "p", text: "ELT also moved transformation logic into versioned SQL models that run inside the warehouse, so analysts can read, review and test the logic that produces a number. That's the workflow tools like dbt popularised: staging models clean raw tables, intermediate models join them, and mart models serve a business area." },
    { type: "callout", tone: "tip", text: "ELT doesn't mean \"skip modelling\". It means modelling happens after loading. Without layers, owners and tests, an ELT warehouse becomes a swamp of near-duplicate tables." },

    { type: "h2", text: "When ETL is still the right call" },
    { type: "ul", items: [
      "**Data minimisation or compliance:** personal data must be tokenised or removed before it's stored in an analytics system at all.",
      "**Heavy non-SQL work:** parsing binary formats, image or audio processing, complex ML feature extraction or large graph computations are easier in Spark or custom code.",
      "**Streaming enrichment:** events need to be joined and cleaned in flight because consumers read them in seconds, not after a warehouse job.",
      "**Expensive warehouse compute:** repeated transformations over huge raw tables can cost more inside a warehouse than on a dedicated cluster.",
    ] },
    { type: "p", text: "Most real platforms are hybrid: light extraction and loading into a raw layer, heavy processing in Spark where it's needed, and SQL models for the business layers. The useful question in an interview isn't \"ETL or ELT?\" but \"where should each transformation run, and can I replay it?\"" },

    { type: "h2", text: "Design checklist for either approach" },
    { type: "ol", items: [
      "Keep an immutable raw copy, partitioned by load date, so any transformation can be replayed. See [medallion architecture](/learn/medallion-architecture).",
      "Make each load idempotent: overwrite a partition or MERGE on a key, never blind-append on retry. See [idempotency](/learn/idempotency).",
      "Version transformation code and run it through CI with tests, like application code.",
      "Add [data quality checks](/learn/data-quality) between layers so bad data stops before the marts.",
      "Record lineage so you know which reports a broken source affects.",
    ] },
  ],
  uses: [
    { name: "Product analytics", text: "Raw events and database snapshots load into a lakehouse; SQL models build sessions, funnels and retention tables for dashboards." },
    { name: "Regulated reporting", text: "Personal data is pseudonymised in an ETL step before loading, then finance and risk models are built with ELT on the minimised data." },
    { name: "ML feature pipelines", text: "Spark jobs compute heavy features (ETL), while simpler aggregate features are SQL models over raw tables (ELT)." },
  ],
  interview: [
    "Say where each transformation runs and why, rather than declaring ETL or ELT for the whole platform.",
    "Always keep raw data: explain how a backfill works when a business rule changes.",
    "Mention how sensitive fields are handled differently in ELT, since they land raw.",
    "Tie the choice to cost: warehouse compute per run vs a transform cluster.",
  ],
  related: ["data-engineering-architecture", "medallion-architecture", "data-warehouse-vs-data-lake", "data-pipeline-orchestration", "data-quality"],
  practice: ["etl-framework", "scd2-warehouse"],
  reading: [
    { title: "dbt documentation: What is dbt?", publisher: "dbt Labs", url: "https://docs.getdbt.com/docs/introduction" },
    { title: "Data Warehouse ETL Toolkit techniques", publisher: "Kimball Group", url: "https://www.kimballgroup.com/data-warehouse-business-intelligence-resources/kimball-techniques/etl-architecture-34-subsystems/" },
  ],
};
