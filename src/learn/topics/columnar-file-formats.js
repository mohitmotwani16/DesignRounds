export default {
  blocks: [
    { type: "p", text: "Analytical data is usually stored in **columnar file formats** such as **Apache Parquet** and **Apache ORC**, which store each column's values together, compress them well and let queries read only the columns and row ranges they need. **Apache Avro** is a row-based format used mostly for events and messages, where whole records are written and read at once. Choosing the format, and how files are **partitioned** and sized, often matters more for query cost than the engine you run." },

    { type: "h2", text: "Row vs columnar storage" },
    { type: "p", text: "Consider a table of orders with 40 columns. A report asks for revenue by country, which needs two columns." },
    { type: "table", head: ["", "Row-oriented (Avro, CSV, JSON)", "Columnar (Parquet, ORC)"], rows: [
      ["Layout", "All columns of a row stored together", "All values of a column stored together, in row groups"],
      ["Reading 2 of 40 columns", "Reads every column of every row", "Reads only the 2 columns"],
      ["Compression", "Mixed types side by side compress poorly", "Similar values together compress very well (dictionary, run-length)"],
      ["Writing one record", "Cheap: append it", "Expensive: buffered into row groups"],
      ["Best for", "Event streams, messages, write-heavy logs, full-record reads", "Analytics, scans and aggregations over few columns"],
    ] },

    { type: "h2", text: "Parquet vs ORC vs Avro" },
    { type: "table", head: ["", "Parquet", "ORC", "Avro"], rows: [
      ["Orientation", "Columnar", "Columnar", "Row"],
      ["Schema", "Embedded in the file footer", "Embedded in the file footer", "Embedded or referenced; strong schema evolution rules"],
      ["Nested data", "Strong support", "Supported", "Strong support"],
      ["Ecosystem", "The most widely used: Spark, warehouses, Python, table formats", "Strong in Hive and some warehouses", "Kafka and event pipelines, often with a schema registry"],
      ["Typical role", "Default analytics storage", "Analytics, especially Hive-based stacks", "Messages, landing zones, data exchange"],
    ] },

    { type: "h2", text: "How columnar files skip work" },
    { type: "ul", items: [
      "**Column pruning:** the reader decodes only requested columns.",
      "**Row groups and statistics:** each file is split into row groups, and each column chunk stores min, max and null counts. A query for `order_date = '2026-10-01'` can skip row groups whose min and max exclude that date. This is **predicate pushdown**.",
      "**Encodings:** dictionary encoding stores repeated strings once; run-length encoding compresses long runs of equal values. Sorting data by a common filter column makes statistics far more selective.",
      "**Compression codecs:** Snappy is fast and light; Zstandard compresses better at moderate CPU cost; choose by whether queries are CPU-bound or I/O-bound.",
    ] },

    { type: "h2", text: "Partitioning" },
    { type: "p", text: "Partitioning splits a table into directories by a column value, such as `event_date=2026-10-01/`. A query filtering on that column reads only matching partitions." },
    { type: "ul", items: [
      "**Partition by columns most queries filter on**, usually a date, sometimes a region or tenant.",
      "**Keep cardinality low.** Partitioning by `user_id` creates millions of tiny directories and makes every query slower.",
      "**Avoid partitions that are too small.** Aim for partitions holding at least hundreds of megabytes; otherwise partition more coarsely (by month instead of day).",
      "**Combine with sorting or clustering** inside partitions for columns that are filtered often but have high cardinality.",
      "Modern [table formats](/learn/open-table-formats) such as Iceberg support **hidden partitioning**, where queries filter on the original column and the format maps it to partitions automatically.",
    ] },

    { type: "h2", text: "The small files problem" },
    { type: "p", text: "Streaming jobs and frequent small batches write many tiny files. Each file costs a metadata lookup, an open and a footer read, so a table of a million 100 KB files is far slower to query than the same data in a few thousand files of 128 MB to 1 GB. Fix it by buffering writes, reducing output partitions before writing, and running regular **compaction** jobs that rewrite small files into large ones." },
    { type: "callout", tone: "tip", text: "A good default for analytics: Parquet files of roughly 128 MB to 1 GB, partitioned by date, sorted by the next most common filter, compressed with Snappy or Zstandard, and managed by a table format." },
  ],
  uses: [
    { name: "Lakehouse tables", text: "Parquet files under an Iceberg or Delta table store years of events cheaply and serve fast scans." },
    { name: "Kafka pipelines", text: "Avro messages with a schema registry carry events between services; a sink job converts them to Parquet for analytics." },
    { name: "Data exchange", text: "Partners deliver daily Parquet extracts that preserve types and compress far better than CSV." },
  ],
  interview: [
    "Use Parquet or ORC for analytics and Avro for events, and explain why.",
    "Partition by low-cardinality filter columns, usually date.",
    "Explain predicate pushdown via row-group statistics.",
    "Raise the small files problem and compaction for streaming writes.",
  ],
  related: ["open-table-formats", "data-warehouse-vs-data-lake", "apache-spark-architecture", "object-storage", "data-contracts-schema-evolution"],
  practice: ["clickstream", "realtime-analytics"],
  reading: [
    { title: "Apache Parquet documentation", publisher: "Apache Software Foundation", url: "https://parquet.apache.org/docs/" },
    { title: "Apache Avro specification", publisher: "Apache Software Foundation", url: "https://avro.apache.org/docs/" },
  ],
};
