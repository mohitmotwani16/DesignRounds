// Backfill and reprocessing: why pipelines rerun, full reload vs incremental backfill vs
// parallel versioning, idempotent writes and atomic partitions, designing for replays.
export default {
  blocks: [
    { type: "p", text: "Data pipelines have to rerun. A bug corrupted last month's output, a schema change needs historical records updated, or analysts want a new metric across all history. **Backfilling** (reprocessing data the pipeline already handled) isn't an exception; it's routine. The question is how gracefully your pipeline does it." },

    { type: "h2", text: "Why you reprocess" },
    { type: "ul", items: [
      "**Bug fixes**: a logic error produced wrong output for the past month; after the fix, reprocess the affected data.",
      "**Schema evolution**: a new field in the model must be filled in for existing records from raw data.",
      "**New derived data**: a metric that didn't exist when the pipeline was built must cover history, not just new events.",
      "**System migration**: a new warehouse or storage system must be populated with history.",
      "**Compliance or audit**: specific historical records must be corrected for regulatory reasons.",
    ] },

    { type: "h2", text: "Strategy 1: full reload" },
    { type: "p", text: "Delete the output and rerun the pipeline from the beginning of time." },
    { type: "diagram", kind: "flow", caption: "Full reload: drop everything and recompute all history into the same table. Simple, but slow and disruptive for big datasets.", nodes: [
      { id: "src", label: "All raw history", col: 0, row: 0, shape: "db", tone: "store" },
      { id: "job", label: "Pipeline (fixed logic)", col: 1.5, row: 0, tone: "accent" },
      { id: "out", label: "Output table", sub: "truncated, then refilled", col: 3, row: 0, shape: "db", tone: "danger" },
    ], edges: [{ from: "src", to: "job", label: "read everything" }, { from: "job", to: "out", label: "replace all" }] },
    { type: "p", text: "**Works when** the dataset is small enough to reprocess quickly, consumers can tolerate a complete replacement, and simplicity beats speed. **Trade-offs**: slow for years of data, the destination may be empty or inconsistent during the reload, and it costs a lot of compute." },

    { type: "h2", text: "Strategy 2: incremental backfill" },
    { type: "p", text: "Reprocess in bounded chunks, usually time partitions (day, week, month), and record which chunks are done so a failure resumes instead of restarting. To backfill 90 days:" },
    { type: "ol", items: [
      "List the partitions to redo: 2024-01-01 through 2024-03-31.",
      "Process each partition independently into its own output location.",
      "Record each finished partition in a checkpoint table.",
      "If the job dies on day 45, restart at day 45, not day 1.",
    ] },
    { type: "diagram", kind: "segments", caption: "Incremental backfill over 90 daily partitions: completed days are checkpointed, the failed day is retried, the rest are pending.", width: 640, total: 90, lanes: [{ label: "Jan–Mar 2024", parts: [
      { label: "days 1–44 done", size: 44, tone: "ok" },
      { label: "day 45 retry", size: 4, tone: "danger" },
      { label: "days 46–90 pending", size: 42, tone: "muted" },
    ] }] },
    { type: "code", code: `from datetime import date, timedelta

def backfill(start: date, end: date, run_partition, checkpoints):
    """Reprocess one day at a time; skip days already done so reruns resume."""
    day = start
    while day <= end:
        if not checkpoints.is_done(day):
            run_partition(day)          # must be idempotent: overwrites that day's output
            checkpoints.mark_done(day)  # only after the partition fully succeeded
        day += timedelta(days=1)

# backfill(date(2024, 1, 1), date(2024, 3, 31), rebuild_sales_summary, checkpoint_table)` },
    { type: "p", text: "**Works when** a full reload would take too long, you want progress and time estimates, and you can't afford long downtime (data becomes correct day by day). **Trade-offs**: more coordination logic, partial state if you crash mid-partition, and dependencies between partitions (such as slowly changing dimensions) need careful ordering. Orchestrators like Airflow run backfills per partition natively; see [pipeline orchestration](/learn/data-pipeline-orchestration)." },

    { type: "h2", text: "Strategy 3: parallel versioning" },
    { type: "p", text: "Build a complete new output beside the old one, validate it, then switch atomically:" },
    { type: "ol", items: [
      "Production reads `sales_summary_v1`.",
      "The backfill writes `sales_summary_v2` (same schema).",
      "Validation queries compare v1 and v2.",
      "When satisfied, repoint the view or alias to v2.",
      "Keep v1 briefly for rollback, then delete it.",
    ] },
    { type: "diagram", kind: "flow", caption: "Parallel versioning: v2 is rebuilt and validated while v1 keeps serving; a view swap makes the switch atomic and reversible.", nodes: [
      { id: "users", label: "Dashboards / consumers", col: 0, row: 0.6, shape: "pill", w: 200 },
      { id: "view", label: "View: sales_summary", sub: "points to v1 → v2", col: 1.6, row: 0.6, tone: "accent" },
      { id: "v1", label: "sales_summary_v1", sub: "old, kept for rollback", col: 3.2, row: 0, shape: "db", tone: "muted" },
      { id: "v2", label: "sales_summary_v2", sub: "rebuilt + validated", col: 3.2, row: 1.2, shape: "db", tone: "ok" },
    ], edges: [{ from: "users", to: "view" }, { from: "view", to: "v1", dashed: true, label: "before" }, { from: "view", to: "v2", label: "after swap" }] },
    { type: "code", code: `-- Validate before switching
SELECT date, v1.total AS old_total, v2.total AS new_total
FROM sales_summary_v1 v1 FULL JOIN sales_summary_v2 v2 USING (date)
WHERE v1.total IS DISTINCT FROM v2.total;

-- Atomic switch (and an equally quick rollback)
CREATE OR REPLACE VIEW sales_summary AS SELECT * FROM sales_summary_v2;` },
    { type: "p", text: "**Works when** you need zero downtime, validation before users see results, and easy rollback. **Trade-offs**: double storage during the migration, an atomic swap mechanism (view, alias, symlink, table rename), and consumers that read through that indirection. [Kappa architecture](/learn/lambda-vs-kappa-architecture) uses the same idea for streams." },

    { type: "h2", text: "The foundation: idempotent writes" },
    { type: "p", text: "Whatever the strategy, reprocessing is only safe if **processing the same input twice gives the same result**, with no duplicates. See [idempotency](/learn/idempotency)." },
    { type: "code", code: `-- Not idempotent: every rerun adds another row
INSERT INTO sales_summary (date, total) VALUES ('2024-01-15', 1500);

-- Idempotent: a rerun overwrites the same row
INSERT INTO sales_summary (date, total) VALUES ('2024-01-15', 1500)
ON CONFLICT (date) DO UPDATE SET total = EXCLUDED.total;` },
    { type: "p", text: "Batch pipelines usually partition output by time and **replace whole partitions atomically** (`/output/date=2024-01-15/` is swapped as a unit). Each partition is entirely the old version or entirely the new one, never a mix, and rewriting it twice just produces the same data." },
    { type: "code", code: `# Spark: overwrite only the partitions being reprocessed, atomically per partition
spark.conf.set("spark.sql.sources.partitionOverwriteMode", "dynamic")
(fixed_df.where("date BETWEEN '2024-01-01' AND '2024-03-31'")
    .write.mode("overwrite").partitionBy("date")
    .parquet("s3a://warehouse/sales_summary/"))` },

    { type: "h2", text: "Designing for reprocessing from day one" },
    { type: "ul", items: [
      "**Keep the source data.** If you only store transformed output, you can't recompute with new logic. ELT helps because raw data stays in the warehouse; see [ETL vs ELT](/learn/etl-vs-elt).",
      "**Version transformations.** Record which logic version produced each output (a version column or a path segment), so you know exactly which outputs are stale after a change.",
      "**Partition by time.** Replacing one day without touching others makes incremental backfill natural and matches \"reprocess the last N days\" workflows.",
      "**Test replays regularly.** Periodically run history through the pipeline to catch non-idempotent writes or missing source retention before an incident forces you to.",
    ] },
  ],
  uses: [
    { name: "Fixing a metric bug", text: "Reprocess the affected 30 days partition by partition, idempotently, then notify consumers." },
    { name: "Warehouse migration", text: "Parallel-build the new warehouse tables, compare totals with the old ones, then switch." },
    { name: "New ML features", text: "Compute a new feature over two years of history with the same code used in production." },
    { name: "Streaming pipelines", text: "Replay a Kafka topic or raw files from object storage into a v2 table." },
  ],
  interview: [
    "Say how you'd fix wrong historical data: keep raw data, rerun idempotent jobs per partition, validate, then switch.",
    "Mention checkpoints so a backfill resumes after failure, and isolate backfill resources from live jobs.",
    "Use parallel versioning with an atomic view swap when consumers must never see half-fixed data.",
  ],
  related: ["etl-vs-elt", "pipeline-error-handling", "idempotency", "lambda-vs-kappa-architecture", "data-pipeline-orchestration", "data-quality"],
  practice: ["etl-framework", "scd2-warehouse", "data-quality"],
};
