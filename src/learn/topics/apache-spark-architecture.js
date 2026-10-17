export default {
  blocks: [
    { type: "p", text: "**Apache Spark** is a distributed engine for processing large datasets in parallel. A **driver** program turns your code into a plan of **stages** and **tasks**, and **executors** on a cluster run those tasks over **partitions** of the data. Understanding how Spark splits work, and especially when it must **shuffle** data across the network, explains almost every Spark performance problem you'll be asked about." },

    { type: "h2", text: "Driver, executors and the cluster manager" },
    { type: "diagram", kind: "flow", caption: "The driver plans the job and schedules tasks; executors run tasks on partitions and keep data in memory or spill to disk.", nodes: [
      { id: "app", label: "Your job", sub: "SQL · DataFrames", col: 0, row: 1, shape: "pill" },
      { id: "driver", label: "Driver", sub: "plan · schedule", col: 1.3, row: 1, tone: "accent" },
      { id: "cm", label: "Cluster manager", sub: "YARN · Kubernetes", col: 1.3, row: 0, tone: "muted" },
      { id: "e1", label: "Executor 1", sub: "tasks · cache", col: 2.7, row: 0 },
      { id: "e2", label: "Executor 2", sub: "tasks · cache", col: 2.7, row: 1 },
      { id: "e3", label: "Executor 3", sub: "tasks · cache", col: 2.7, row: 2 },
      { id: "data", label: "Storage", sub: "object store · tables", col: 4, row: 1, shape: "db", tone: "store" },
    ], edges: [
      { from: "app", to: "driver" }, { from: "driver", to: "cm", label: "request executors", dashed: true },
      { from: "driver", to: "e1" }, { from: "driver", to: "e2" }, { from: "driver", to: "e3" },
      { from: "e1", to: "data" }, { from: "e2", to: "data" }, { from: "e3", to: "data" },
    ] },
    { type: "ul", items: [
      "The **driver** holds the logical plan, asks the cluster manager for executors, and assigns tasks. If it fails, the job fails, so never `collect()` a huge result to it.",
      "**Executors** are processes with a fixed number of cores and memory. Each core runs one **task** at a time, and each task processes one **partition**.",
      "A **partition** is a chunk of the dataset. Parallelism equals the number of partitions in a stage, capped by total executor cores.",
    ] },

    { type: "h2", text: "Lazy evaluation, stages and shuffles" },
    { type: "p", text: "Transformations (`filter`, `select`, `join`, `groupBy`) build a plan without running anything. Only an **action** (writing a table, `count`, `collect`) triggers execution. Spark's optimizer then rewrites the plan: it pushes filters down to the scan, prunes unused columns, and picks join strategies." },
    { type: "table", head: ["Transformation", "Type", "What happens"], rows: [
      ["`filter`, `select`, `withColumn`, `map`", "Narrow", "Each output partition depends on one input partition; runs in the same stage, no network"],
      ["`groupBy` + aggregate, `join` (non-broadcast), `distinct`, `repartition`", "Wide", "Rows with the same key must meet, so data is **shuffled** across executors and a new stage starts"],
    ] },
    { type: "p", text: "A **shuffle** writes intermediate data to disk on every executor, sends it over the network grouped by key, and reads it back. It's usually the most expensive part of a job, so most tuning is about having fewer, smaller and evenly balanced shuffles." },

    { type: "h2", text: "Join strategies" },
    { type: "table", head: ["Strategy", "How it works", "When Spark uses it"], rows: [
      ["Broadcast hash join", "Copy the small table to every executor; join locally with no shuffle of the large table", "One side is small enough to fit in memory (configurable threshold, or a broadcast hint)"],
      ["Sort-merge join", "Shuffle both sides by join key, sort, then merge", "Both sides are large; the default for big equi-joins"],
      ["Shuffle hash join", "Shuffle both sides, build a hash table per partition", "One side is moderately small per partition"],
    ] },

    { type: "h2", text: "Data skew" },
    { type: "p", text: "If one join or grouping key has far more rows than others (a default \"unknown\" customer, one giant merchant), one task gets most of the data. The stage then waits for that single straggler while every other executor sits idle, or the task runs out of memory. Fixes:" },
    { type: "ul", items: [
      "**Adaptive query execution (AQE):** Spark 3 can detect skewed partitions at runtime and split them, and can also coalesce many tiny partitions after a shuffle.",
      "**Broadcast** the smaller side if it fits, removing the shuffle entirely.",
      "**Salting:** append a random suffix to the hot key on the big side, replicate the matching rows on the small side for each suffix, join, then aggregate back.",
      "**Handle the hot key separately:** filter it out, process it on its own path, and union the results.",
      "**Fix it upstream:** nulls or placeholder keys are often data-quality bugs that shouldn't be joined at all.",
    ] },
    { type: "p", text: "Skew is the batch version of [hot partitions](/learn/hot-partitions) in databases, and the fixes are similar." },

    { type: "h2", text: "Tuning checklist" },
    { type: "ol", items: [
      "Read less: store data in [columnar formats](/learn/columnar-file-formats), partition by common filters, select only needed columns.",
      "Shuffle less: filter and aggregate early, broadcast small dimensions, avoid unnecessary `repartition`.",
      "Size partitions sensibly, typically around 100-200 MB each after a shuffle, rather than thousands of tiny ones or a few huge ones.",
      "Watch the Spark UI: look for stages with one long task (skew), heavy spill to disk (too little memory per task), or many tiny tasks.",
      "Avoid Python UDFs on hot paths when built-in functions exist; they force data out of Spark's optimised format.",
      "Write output with a sensible number of files, and compact small files in [table formats](/learn/open-table-formats).",
    ] },
    { type: "callout", tone: "tip", text: "Spark Structured Streaming runs the same engine in micro-batches over a stream. The same rules about shuffles and skew apply, plus the time semantics in [windows and watermarks](/learn/stream-processing-windows-watermarks)." },
  ],
  uses: [
    { name: "Batch ETL", text: "Nightly jobs join orders, customers and products from the raw layer and write curated warehouse tables." },
    { name: "Feature engineering", text: "Spark computes aggregate features over months of events to build ML training datasets." },
    { name: "Backfills", text: "A fixed transformation is re-run over a year of partitions in parallel instead of day by day." },
  ],
  interview: [
    "Explain narrow vs wide transformations and why shuffles dominate cost.",
    "Pick a join strategy by table size, and broadcast small dimensions.",
    "Recognise skew from the symptom (one slow task) and give two fixes.",
    "Size partitions and output files, and mention adaptive query execution.",
  ],
  related: ["batch-vs-stream-processing", "columnar-file-formats", "open-table-formats", "hot-partitions", "data-pipeline-orchestration"],
  practice: ["etl-framework", "clickstream"],
  reading: [
    { title: "Spark SQL performance tuning", publisher: "Apache Spark documentation", url: "https://spark.apache.org/docs/latest/sql-performance-tuning.html" },
    { title: "Cluster mode overview", publisher: "Apache Spark documentation", url: "https://spark.apache.org/docs/latest/cluster-overview.html" },
  ],
};
