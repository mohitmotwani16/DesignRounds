export default {
  blocks: [
    { type: "p", text: "A **data warehouse** stores structured, modelled data in a managed engine built for fast analytical SQL. A **data lake** stores raw files of any shape in cheap object storage and lets many engines read them. A **lakehouse** keeps data in open files on object storage but adds a table layer (transactions, schemas, time travel) so the lake can be queried and governed like a warehouse. Most modern platforms use more than one, and the interesting design work is deciding which data lives where." },

    { type: "h2", text: "How the three compare" },
    { type: "table", head: ["", "Data warehouse", "Data lake", "Lakehouse"], rows: [
      ["Storage", "Managed, proprietary storage inside the engine", "Files (Parquet, JSON, CSV, images) on object storage", "Open columnar files on object storage plus a table format"],
      ["Schema", "Schema-on-write: data must fit tables before loading", "Schema-on-read: structure applied when queried", "Schema enforced and evolved by the table format"],
      ["Transactions", "ACID, concurrent reads and writes", "None: readers can see half-written files", "ACID commits through a metadata log or catalog"],
      ["Engines", "The warehouse's own SQL engine", "Any: Spark, Presto/Trino, Python, ML tools", "Many engines over the same tables"],
      ["Best at", "Interactive BI, governed reporting, concurrency", "Cheap retention, raw and unstructured data, data science", "One copy of data for BI, ML and streaming"],
      ["Watch out for", "Cost at very large scale, lock-in, unstructured data", "The \"data swamp\": no ownership, no quality, duplicate files", "Operational care: compaction, catalog, small files"],
    ] },

    { type: "h2", text: "Schema-on-write vs schema-on-read" },
    { type: "p", text: "A warehouse rejects data that doesn't match its tables at load time, which is **schema-on-write**. That's friction for producers, but every consumer gets clean, typed columns. A lake accepts anything and pushes interpretation to the reader, which is **schema-on-read**. That's flexible for exploration and for data whose use isn't known yet, but every reader re-solves parsing, typing and deduplication, often differently." },
    { type: "p", text: "Lakehouses move the lake towards schema-on-write for curated tables while still allowing raw landing zones. A common split is raw data in open files with minimal rules, and cleaned, conformed tables with enforced schemas and [data contracts](/learn/data-contracts-schema-evolution)." },

    { type: "h2", text: "What makes a lakehouse possible" },
    { type: "p", text: "Plain files on object storage have no transactions: a job that writes 500 files can fail after 300, and a reader can see a mix. [Open table formats](/learn/open-table-formats) such as Apache Iceberg, Delta Lake and Apache Hudi fix this by tracking which files make up each version of a table in metadata. A commit atomically swaps the table to a new set of files, so readers always see a complete snapshot. The same metadata enables schema evolution, time travel to older versions, and efficient file pruning." },
    { type: "diagram", kind: "flow", caption: "A lakehouse: files stay open on object storage; the table format and catalog give engines a consistent, versioned view of each table.", nodes: [
      { id: "files", label: "Object storage", sub: "Parquet data files", col: 0, row: 1, shape: "db", tone: "store" },
      { id: "meta", label: "Table metadata", sub: "snapshots · schema", col: 1.3, row: 1, tone: "accent" },
      { id: "cat", label: "Catalog", sub: "table → current metadata", col: 2.6, row: 1, tone: "cache" },
      { id: "bi", label: "SQL / BI engine", col: 3.9, row: 0, shape: "pill" },
      { id: "spark", label: "Spark / batch", col: 3.9, row: 1, shape: "pill" },
      { id: "ml", label: "ML / Python", col: 3.9, row: 2, shape: "pill" },
    ], edges: [
      { from: "meta", to: "files" }, { from: "cat", to: "meta" },
      { from: "bi", to: "cat" }, { from: "spark", to: "cat" }, { from: "ml", to: "cat" },
    ] },

    { type: "h2", text: "How to choose" },
    { type: "ul", items: [
      "**Mostly BI on structured business data, modest scale, a small team:** a managed warehouse is the fastest path to trustworthy dashboards.",
      "**Large volumes of raw, semi-structured or unstructured data, plus data science:** a lake or lakehouse avoids paying warehouse prices to store everything.",
      "**Many engines and teams on the same data, and a wish to avoid lock-in:** a lakehouse with an open table format and a shared catalog.",
      "**Both:** land and retain everything in the lake, and serve the hottest curated marts from a warehouse. This is common and perfectly reasonable.",
    ] },
    { type: "callout", tone: "warning", text: "A lake without ownership, documentation and quality checks becomes a data swamp: lots of files nobody trusts. The technology choice matters less than having curated layers with owners, such as the [medallion layers](/learn/medallion-architecture)." },

    { type: "h2", text: "Costs that decide real designs" },
    { type: "ul", items: [
      "**Storage:** object storage is far cheaper per terabyte than warehouse storage, which matters for years of raw history.",
      "**Compute:** warehouses usually bill per query or per running cluster; lakes pay for whatever engine runs. Scanning fewer bytes ([partitioning and columnar formats](/learn/columnar-file-formats)) cuts both.",
      "**Operations:** a lakehouse needs compaction, snapshot expiry and catalog management that a warehouse does for you.",
      "**Egress and duplication:** copying the same data into several systems doubles storage and creates consistency problems.",
    ] },
  ],
  uses: [
    { name: "Startup analytics", text: "A single cloud warehouse holds replicated product data and marketing data, modelled with SQL for a small analytics team." },
    { name: "Large consumer apps", text: "Billions of events a day land in a lakehouse; curated tables feed BI, experimentation and ML training from one copy." },
    { name: "Hybrid enterprise", text: "Raw history lives in the lake for compliance and reprocessing, while finance marts are served from a warehouse for fast, governed reporting." },
  ],
  interview: [
    "State the consumers first (BI, ML, applications) and choose storage to fit them.",
    "Explain that a lakehouse is files plus a transactional table format, not a product.",
    "Mention governance: ownership, access control and quality are what prevent a data swamp.",
    "Compare costs in terms of storage, bytes scanned and operational effort.",
  ],
  related: ["lakehouse-architecture", "data-engineering-architecture", "open-table-formats", "columnar-file-formats", "medallion-architecture", "etl-vs-elt"],
  practice: ["realtime-analytics", "clickstream", "etl-framework"],
  reading: [
    { title: "Lakehouse: A New Generation of Open Platforms (CIDR 2021)", publisher: "Armbrust et al.", url: "https://www.cidrdb.org/cidr2021/papers/cidr2021_paper17.pdf" },
    { title: "Apache Iceberg documentation", publisher: "Apache Software Foundation", url: "https://iceberg.apache.org/docs/latest/" },
  ],
};
