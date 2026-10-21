// Data layout optimization for lakehouse tables: partitioning, bucketing, Z-ordering, liquid clustering, file sizing and compaction.
export default {
  blocks: [
    {"type":"p","text":"How files are laid out decides how much data a query must read. A query for one day of one country's orders can read a few megabytes or scan the whole table, depending on how the table is **partitioned**, **clustered** and **compacted**. In a design interview, saying how you'll lay out a big table is what turns \"we'll store it in S3\" into a credible answer, and it drives cost directly."},
    {"type":"h2","text":"Partitioning"},
    {"type":"p","text":"Partitioning splits a table into folders by the value of one or more columns. A filter on that column lets the engine skip every other folder (**partition pruning**)."},
    {"type":"code","code":"s3://lake/silver/events/event_date=2026-03-14/part-0001.parquet\ns3://lake/silver/events/event_date=2026-03-14/part-0002.parquet\ns3://lake/silver/events/event_date=2026-03-15/part-0001.parquet\n-- WHERE event_date = '2026-03-15' reads one folder, not the whole table"},
    {"type":"ul","items":["**Default: partition by event date.** Time-series and event data is almost always filtered by date, so this one choice prunes most reads.","**Add a second key only if most queries filter on it**, e.g. if 80% of queries filter by country or region: `event_date / region`.","**Avoid high-cardinality partition keys** (user_id, order_id): millions of tiny folders and files make everything slower. Partitions should hold at least hundreds of MB to a few GB each.","**The catch is rigidity.** Partition columns are fixed up front. If queries shift from filtering by date to filtering by region, the partitioning stops helping, and changing it means rewriting the whole dataset."]},
    {"type":"h2","text":"Bucketing"},
    {"type":"p","text":"Bucketing hashes a column (often a join key such as `customer_id`) into a fixed number of buckets, so rows with the same key always land in the same file. Two tables bucketed the same way on the join key can be joined **without a shuffle**, and equality filters touch one bucket. It suits high-cardinality join keys that are bad partition columns, but the bucket count is fixed and both tables must agree on it. See [Spark architecture](/learn/apache-spark-architecture) for shuffles and join strategies."},
    {"type":"h2","text":"Clustering and data skipping"},
    {"type":"p","text":"Columnar files store min/max **statistics** per file and row group. If rows are sorted or clustered so similar values sit together, those statistics let the engine skip most files for a filter (**data skipping**), even on columns you didn't partition by. See [columnar file formats](/learn/columnar-file-formats)."},
    {"type":"ul","items":["**Sorting / Z-ordering**: rewrite files sorted by one column, or Z-ordered across several (e.g. `OPTIMIZE events ZORDER BY (region, product_id)`) so multi-column filters still skip files.","**Liquid clustering** (Delta Lake on Databricks; Iceberg offers similar sort orders and hidden partitioning): instead of fixed physical partitions, you declare clustering columns and the engine incrementally reorganizes data around them. You can cluster on `event_date` and `region` together, and if query patterns change you just change the clustering columns, with no full rewrite. It removes the up-front rigidity of partitioning."]},
    {"type":"code","code":"-- Delta Lake: liquid clustering instead of fixed partitions\nCREATE TABLE silver.events (event_id STRING, user_id STRING, region STRING, event_type STRING, event_ts TIMESTAMP, event_date DATE)\nCLUSTER BY (event_date, region);\n\nALTER TABLE silver.events CLUSTER BY (event_date, event_type);   -- query patterns changed: no rewrite needed\nOPTIMIZE silver.events;                                          -- incrementally clusters new data"},
    {"type":"h2","text":"File sizes and compaction"},
    {"type":"p","text":"Streaming and frequent small batches create the **small file problem**: thousands of KB-sized files whose open/close overhead dominates query time. Aim for files of roughly 128 MB–1 GB, and run **compaction** regularly (`OPTIMIZE` in Delta, `rewrite_data_files` in Iceberg) to merge small files. Write-side settings (auto-optimize, target file size, fewer output partitions in Spark) reduce how many small files are created in the first place."},
    {"type":"h2","text":"Choosing a strategy"},
    {"type":"table","head":["Situation","Strategy"],"rows":[["Event or time-series data, queries filter by time","Partition by date (or liquid-cluster on date)"],["Most queries also filter by a low-cardinality column (region, country)","Second partition level, or cluster on it"],["Big tables repeatedly joined on a high-cardinality key","Bucket both tables on the join key"],["Filters on several columns that change over time","Liquid clustering or Z-ordering"],["Streaming writes or many small batches","Compaction on a schedule; tune target file size"],["Small tables (a few GB)","Don't partition: one or a few files is fastest"]]},
    {"type":"p","text":"Layout is also a cost lever: on pay-per-scan engines (Athena, BigQuery), pruning and skipping translate directly into lower bills."},
  ],
  uses: [
    {"name":"Clickstream and event tables","text":"Partitioned by event date, clustered by event type or region."},
    {"name":"Fact tables in a lakehouse","text":"Clustered on date plus the most common filter; compacted nightly."},
    {"name":"Large joins","text":"Bucketing both sides on customer_id to avoid shuffles."},
    {"name":"Cost control","text":"Pruning keeps pay-per-scan queries cheap as tables grow."},
  ],
  interview: [
    "State the layout of every large table you propose: partition column, clustering columns, target file size.",
    "Default to date partitioning; justify any second key with query patterns.",
    "Mention liquid clustering or Z-ordering when filters vary, and compaction whenever streams write the table.",
  ],
  related: ["columnar-file-formats","open-table-formats","lakehouse-architecture","apache-spark-architecture","hot-partitions","data-engineering-system-design-interview"],
  practice: ["clickstream","etl-framework"],
};
