export default {
  blocks: [
    { type: "p", text: "**Data pipeline orchestration** is the scheduling and coordination of the jobs that move and transform data: running them in the right order, on time, with retries, and with a record of what ran. Pipelines are modelled as a **DAG** (directed acyclic graph) of tasks, and an orchestrator such as **Apache Airflow**, **Dagster** or **Prefect** decides when each task can run. The design questions are less about the tool and more about making tasks **idempotent**, dependencies explicit, and **backfills** safe." },

    { type: "h2", text: "DAGs, tasks and runs" },
    { type: "diagram", kind: "flow", caption: "A daily DAG: extracts run in parallel, a transform waits for both, quality checks gate publication, and the publish step makes the new partition visible.", nodes: [
      { id: "orders", label: "Extract orders", col: 0, row: 0 },
      { id: "users", label: "Extract customers", col: 0, row: 1.2 },
      { id: "transform", label: "Build fact_orders", sub: "partition = run date", col: 1.4, row: 0.6, tone: "accent" },
      { id: "checks", label: "Quality checks", sub: "row counts · keys", col: 2.8, row: 0.6, tone: "ok" },
      { id: "publish", label: "Publish", sub: "swap / mark ready", col: 4.1, row: 0.6, tone: "cache" },
    ], edges: [
      { from: "orders", to: "transform" }, { from: "users", to: "transform" }, { from: "transform", to: "checks" }, { from: "checks", to: "publish" },
    ] },
    { type: "ul", items: [
      "A **task** is one unit of work: run a SQL model, launch a Spark job, call an API.",
      "A **DAG run** executes the graph for one **logical date** or data interval, for example \"the data for 2026-10-16\". That interval is not the same as the time the run actually starts.",
      "The scheduler starts a task when its upstream tasks succeed, and retries failed tasks with backoff.",
    ] },

    { type: "h2", text: "Make tasks idempotent" },
    { type: "p", text: "Orchestrators retry, operators re-run, and backfills rerun history. A task must produce the same result whether it runs once or five times for the same interval." },
    { type: "ul", items: [
      "**Write by partition and overwrite it:** a run for 2026-10-16 replaces that day's partition instead of appending.",
      "**Or MERGE on a key** when the target is updated in place.",
      "**Parameterise by the run's interval,** never by \"now\". A task that reads `current_date` produces different results when rerun tomorrow.",
      "**Publish atomically:** write to a staging location and swap, or commit through a [table format](/learn/open-table-formats), so readers never see half a partition.",
    ] },
    { type: "callout", tone: "warning", text: "Blind appends are the most common orchestration bug: a retry after a partial failure double counts a day's revenue, and nobody notices until finance reconciles." },

    { type: "h2", text: "Backfills" },
    { type: "p", text: "A **backfill** re-runs a pipeline for past intervals, for example after fixing a bug or adding a column. With idempotent, interval-parameterised tasks, a backfill is just many DAG runs for older dates. Plan for:" },
    { type: "ul", items: [
      "**Concurrency limits** so a year of backfill doesn't overwhelm the warehouse or source systems.",
      "**Ordering** when each day depends on the previous one (running balances, SCD loads).",
      "**Source availability:** you can only backfill from data you still have, which is why raw history is kept in a [bronze layer](/learn/medallion-architecture).",
      "**Downstream effects:** consumers of the corrected tables may need to rerun too; lineage tells you which.",
    ] },

    { type: "h2", text: "Scheduling: time-based, data-aware and event-driven" },
    { type: "table", head: ["Trigger", "How it works", "Trade-off"], rows: [
      ["Time-based (cron)", "Run at 02:00 every day", "Simple, but runs even if the upstream data isn't ready"],
      ["Sensors / waits", "Poll until an upstream file, partition or table is ready", "Correct, but idle sensors can hold worker slots"],
      ["Data-aware (datasets / assets)", "Run when an upstream dataset is updated", "Captures real dependencies between pipelines owned by different teams"],
      ["Event-driven", "A message or webhook triggers a run", "Low latency, but needs deduplication of triggers"],
    ] },
    { type: "p", text: "Airflow models pipelines as task DAGs and has added dataset-based scheduling. Dagster centres on **software-defined assets**: you declare the tables you want and how each is computed, and it derives the graph. Prefect emphasises Python-native flows with dynamic tasks. All of them can run the same well-designed pipeline." },

    { type: "h2", text: "Operating pipelines" },
    { type: "ul", items: [
      "**Alert on data SLAs, not just failures:** \"fact_orders for yesterday is not ready by 06:00\" catches stuck sensors and silent delays.",
      "**Keep orchestration light:** the orchestrator schedules work; heavy compute runs in Spark, the warehouse or containers.",
      "**Separate environments:** test DAG changes on staging data before production.",
      "**Version DAG code** and deploy it like application code, with review and CI.",
      "**Gate publication on [quality checks](/learn/data-quality),** so bad data stops before consumers see it.",
    ] },
  ],
  uses: [
    { name: "Nightly warehouse loads", text: "Extract, transform and quality-check DAGs build each day's partitions before business hours." },
    { name: "ML retraining", text: "A weekly DAG builds a training set, trains, evaluates against the current model and registers the winner." },
    { name: "Partner feeds", text: "Sensors wait for daily partner files, then validate and load them, alerting if a file is late." },
  ],
  interview: [
    "Parameterise every task by its data interval and make writes idempotent.",
    "Explain how a backfill works and what limits its concurrency.",
    "Alert on freshness SLAs as well as task failures.",
    "Gate publishing behind data quality checks.",
  ],
  related: ["idempotency", "data-quality", "medallion-architecture", "etl-vs-elt", "distributed-task-scheduler"],
  practice: ["etl-framework", "data-alerting", "scd2-warehouse"],
  reading: [
    { title: "Apache Airflow: Core concepts", publisher: "Apache Software Foundation", url: "https://airflow.apache.org/docs/apache-airflow/stable/core-concepts/index.html" },
    { title: "Dagster: Software-defined assets", publisher: "Dagster Labs", url: "https://dagster.io/docs/guides/build/assets" },
  ],
};
