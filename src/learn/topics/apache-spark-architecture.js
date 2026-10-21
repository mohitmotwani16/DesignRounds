export default {
  blocks: [
    { type: "p", text: "**Apache Spark** is a distributed engine for processing large datasets in parallel. A **driver** program turns your code into a plan of **stages** and **tasks**, and **executors** on a cluster run those tasks over **partitions** of the data. Understanding how Spark splits work, and especially when it must **shuffle** data across the network, explains almost every Spark performance problem you'll be asked about." },

    {"type":"h2","text":"Why MapReduce became limiting"},
    {"type":"p","text":"MapReduce made distributed batch processing possible, but writing it felt like assembly code. A 10-stage pipeline is 10 separate jobs, with 10 writes and 10 reads of intermediate results to HDFS, even when the whole dataset would fit in the cluster's memory."},
    {"type":"ul","items":["**Rigid structure**: everything must be map → shuffle → reduce. A graph algorithm that updates node values until they converge needs a whole job per iteration; \"iterate until converged\" can't be one job.","**Disk overhead between stages**: map output goes to local disk, is shuffled, and reduce output goes to HDFS. Multi-stage pipelines pay this tax repeatedly, and for small intermediate data it dominates runtime.","**Poor iteration support**: gradient descent may need hundreds of passes over training data; reading and writing HDFS every pass makes iterative ML impractical."]},
    {"type":"h2","text":"How Spark changed the model"},
    {"type":"ul","items":["**Flexible DAG execution**: a job is a directed acyclic graph of operations (filter, map, join, aggregate) that the optimizer arranges: combining steps into stages, pushing filters early, choosing join strategies.","**In-memory caching**: intermediate data can stay in memory across stages, so a 10-stage pipeline reads input once and writes output once. When data doesn't fit, Spark spills to disk instead of failing.","**A richer vocabulary**: joins, aggregations, window functions and SQL out of the box. One engine covers batch ETL, interactive SQL, machine learning and graph processing."]},
    {"type":"diagram","kind":"flow","caption":"The same top-URLs job: MapReduce needs two jobs with HDFS writes in between; Spark runs one DAG, reading once and writing once.","zones":[{"label":"MapReduce: 2 jobs","from":[0,0],"to":[3,0],"tone":"danger"},{"label":"Spark: 1 DAG","from":[0,1.4],"to":[3,1.4],"tone":"ok"}],"nodes":[{"id":"m1","label":"Job 1","sub":"map → shuffle → count","col":0,"row":0},{"id":"h1","label":"HDFS","sub":"write + read","col":1,"row":0,"shape":"db","tone":"danger"},{"id":"m2","label":"Job 2","sub":"sort by count → top N","col":2,"row":0},{"id":"h2","label":"HDFS","sub":"write result","col":3,"row":0,"shape":"db","tone":"store"},{"id":"s1","label":"Read logs","col":0,"row":1.4,"shape":"db","tone":"store"},{"id":"s2","label":"Extract → group → count","sub":"in memory","col":1,"row":1.4,"tone":"ok"},{"id":"s3","label":"Sort → top N","sub":"in memory","col":2,"row":1.4,"tone":"ok"},{"id":"s4","label":"Write once","col":3,"row":1.4,"shape":"db","tone":"store"}],"edges":[{"from":"m1","to":"h1"},{"from":"h1","to":"m2"},{"from":"m2","to":"h2"},{"from":"s1","to":"s2"},{"from":"s2","to":"s3"},{"from":"s3","to":"s4"}]},
    {"type":"code","code":"from pyspark.sql import SparkSession, functions as F\n\nspark = SparkSession.builder.appName(\"top-urls\").getOrCreate()\n\nlogs = spark.read.text(\"hdfs:///data/logs/access.log\")            # or s3a://bucket/logs/\nurls = logs.select(F.split(\"value\", \" \").getItem(6).alias(\"url\"))  # 7th field, like awk '{print $7}'\n\ntop = (urls.groupBy(\"url\").count()                                 # one shuffle for groupBy\n           .orderBy(F.desc(\"count\"))\n           .limit(10))\n\ntop.write.mode(\"overwrite\").parquet(\"hdfs:///reports/top_urls\")    # read once, write once"},
    {"type":"p","text":"**Iteration is where the gap is dramatic.** PageRank with 20 iterations in MapReduce is 20 jobs and 40 HDFS reads and writes. Spark loads the graph once, caches it, and updates scores in memory each iteration (it still writes shuffle files to local disk each round, and recomputes cached partitions if an executor is lost). Spark's original paper focused on iterative machine learning, where speedups of roughly 10–100× are possible, depending on data size, memory and iteration count."},
    {"type":"ul","items":["**Use Spark for**: multi-stage ETL pipelines, machine learning on historical data, interactive queries, and SQL analytics via Spark SQL.","**It still uses distributed storage**: Spark reads and writes HDFS or object storage; what changes is how computation runs between those reads and writes.","**Trade-offs**: caching needs enough cluster memory (otherwise data spills and the advantage shrinks), the optimizer sometimes needs manual tuning, and for a simple one-pass transformation the gain over MapReduce can be negligible."]},
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
