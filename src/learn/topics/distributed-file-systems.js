// Distributed file systems (HDFS): blocks and replicas, NameNode vs DataNodes, read and
// pipelined write paths, failure handling, rack awareness and data locality.
export default {
  blocks: [
    { type: "p", text: "MapReduce spreads computation over a cluster, but the data has to live somewhere, and no single machine holds petabytes. A **distributed file system** stores huge files across many ordinary servers and survives their failures by replication. The classic example is **HDFS** (Hadoop Distributed File System), modeled on Google's GFS; today cloud object stores such as S3 often play the same role." },

    { type: "h2", text: "Blocks and replicas" },
    { type: "p", text: "HDFS splits each file into large fixed-size **blocks** (typically **128 MB**) and stores each block on several machines (**3 replicas** by default), so a dead disk loses nothing." },
    { type: "diagram", kind: "flow", caption: "A 384 MB file becomes three 128 MB blocks; each block is stored on three different DataNodes.", nodes: [
      { id: "f", label: "access.log (384 MB)", col: 0, row: 1, tone: "accent" },
      { id: "b1", label: "Block 1", sub: "128 MB", col: 1.4, row: 0, tone: "cache" },
      { id: "b2", label: "Block 2", sub: "128 MB", col: 1.4, row: 1, tone: "cache" },
      { id: "b3", label: "Block 3", sub: "128 MB", col: 1.4, row: 2, tone: "cache" },
      { id: "d1", label: "DataNode 1", sub: "B1 · B3", col: 2.9, row: 0, shape: "db", tone: "store" },
      { id: "d2", label: "DataNode 2", sub: "B1 · B2", col: 2.9, row: 1, shape: "db", tone: "store" },
      { id: "d3", label: "DataNode 3", sub: "B2 · B3", col: 2.9, row: 2, shape: "db", tone: "store" },
      { id: "d4", label: "DataNode 4", sub: "B1 · B2 · B3", col: 4.1, row: 1, shape: "db", tone: "store" },
    ], edges: [{ from: "f", to: "b1" }, { from: "f", to: "b2" }, { from: "f", to: "b3" }, { from: "b1", to: "d1", dashed: true }, { from: "b2", to: "d2", dashed: true }, { from: "b3", to: "d3", dashed: true }] },
    { type: "p", text: "Why such big blocks? **Less metadata**: a petabyte is only about 8 million 128 MB blocks to track, not trillions of tiny entries. **Amortized seeks**: reading 128 MB sequentially is efficient, while thousands of tiny files mean thousands of seeks. (The flip side: HDFS handles huge numbers of small files badly.)" },

    { type: "h2", text: "Two kinds of nodes" },
    { type: "ul", items: [
      "**DataNodes** store the blocks. Every commodity server runs a DataNode that manages its local disks and serves block reads and writes over the network; thousands of them add up to petabytes.",
      "**The NameNode** keeps the **metadata**: which files exist, which blocks make up each file, and which DataNodes hold each block's replicas. It keeps all of it in memory, so it can handle tens of thousands of metadata operations per second.",
    ] },
    { type: "p", text: "Separating metadata from data is what makes HDFS scale. The NameNode only answers \"where are the blocks?\"; the bytes flow directly between clients and DataNodes. Adding DataNodes adds storage and throughput without loading the NameNode." },

    { type: "h2", text: "Reading a file" },
    { type: "diagram", kind: "sequence", caption: "HDFS read: one small metadata request to the NameNode, then block data streams straight from the nearest DataNodes.", actors: ["Client", "NameNode", "DataNode A", "DataNode B"], steps: [
      { from: 0, to: 1, label: "where are the blocks of /data/logs/access.log?" },
      { from: 1, to: 0, label: "block 1 → A, C, D · block 2 → B, C, E", dashed: true },
      { from: 0, to: 2, label: "read block 1 (closest replica)" },
      { from: 2, to: 0, label: "128 MB stream", dashed: true },
      { from: 0, to: 3, label: "read block 2" },
      { from: 3, to: 0, label: "128 MB stream", dashed: true },
      { note: "client concatenates blocks in order", over: [0] },
    ] },
    { type: "p", text: "The NameNode is never on the data path: one lightweight RPC at the start, then terabytes can flow between clients and DataNodes." },

    { type: "h2", text: "Writing a file: pipeline replication" },
    { type: "ol", items: [
      "The client asks the NameNode to create the file; the NameNode allocates block IDs and picks DataNodes for the replicas.",
      "The client streams data to the **first** DataNode only.",
      "That DataNode forwards to the second, which forwards to the third: a **pipeline**.",
      "Each DataNode acknowledges after writing to its disk, and acks flow back along the pipeline.",
      "When all blocks are done, the client tells the NameNode the file is complete.",
    ] },
    { type: "diagram", kind: "flow", caption: "Pipelined write: the client sends each byte once; DataNodes copy it along the chain using the cluster's internal bandwidth, and acks flow back.", nodes: [
      { id: "c", label: "Client", col: 0, row: 0, shape: "pill" },
      { id: "d1", label: "DataNode 1", col: 1.3, row: 0, shape: "db", tone: "store" },
      { id: "d2", label: "DataNode 2", col: 2.6, row: 0, shape: "db", tone: "store" },
      { id: "d3", label: "DataNode 3", sub: "other rack", col: 3.9, row: 0, shape: "db", tone: "store" },
      { id: "nn", label: "NameNode", sub: "allocates blocks, records completion", col: 1.95, row: 1.2, tone: "accent", w: 260 },
    ], edges: [{ from: "c", to: "d1", label: "data" }, { from: "d1", to: "d2", label: "forward" }, { from: "d2", to: "d3", label: "forward" }, { from: "c", to: "nn", dashed: true, label: "create / complete" }] },

    { type: "h2", text: "Failures and recovery" },
    { type: "ul", items: [
      "**DataNode failures are routine** (disks die, machines crash, networks partition). DataNodes send periodic **heartbeats**; when they stop, the NameNode marks the node dead and tells other DataNodes to copy its blocks elsewhere until every block is back to its replication factor.",
      "**NameNode failure is serious**: on its own it's a single point of failure. Production clusters run a **standby NameNode** that shares the edit log (usually through a quorum of JournalNodes) and takes over within seconds to minutes. See [health checks and failover](/learn/health-checks-failover).",
      "**Rack awareness**: replicas are placed on different racks, so losing a whole rack (switch or power failure) never loses every copy of a block.",
    ] },

    { type: "h2", text: "Why it matters for MapReduce: data locality" },
    { type: "p", text: "Because the NameNode knows where every block lives, the scheduler runs each map task **on a node that already holds its input block**: the computation moves to the data instead of terabytes moving across the network. Large blocks support this too: 128 MB keeps a mapper busy long enough to make scheduling worthwhile. See [MapReduce](/learn/mapreduce)." },
    { type: "table", head: ["", "HDFS", "Cloud object storage (S3, GCS)"], rows: [
      ["Model", "File system with directories, append-only files", "Flat buckets of immutable objects over HTTP"],
      ["Data locality", "Compute runs next to the data", "Compute and storage separate; scale independently"],
      ["Operations", "You run NameNodes, DataNodes, JournalNodes", "Fully managed, 11 nines durability"],
      ["Typical today", "On-premises Hadoop clusters", "Data lakes read by Spark, Trino, warehouses. See [object storage](/learn/object-storage)"],
    ] },
  ],
  uses: [
    { name: "Hadoop data lakes", text: "Petabytes of logs and events stored as large files for MapReduce, Hive and Spark." },
    { name: "HBase", text: "Stores its files on HDFS and inherits its replication." },
    { name: "Google (GFS → Colossus)", text: "The original design HDFS copied: big chunks, a metadata master, replicated chunk servers." },
    { name: "Cloud-era lakes", text: "The same ideas inside S3, GCS and Azure Data Lake Storage, now separated from compute." },
  ],
  interview: [
    "Describe the split: metadata server (NameNode) vs data servers (DataNodes), and why the metadata server stays off the data path.",
    "Explain large blocks, 3× replication with rack awareness, and heartbeat-driven re-replication.",
    "Mention data locality as the reason compute was scheduled on storage nodes.",
    "Note that modern designs usually use object storage and separate compute.",
  ],
  related: ["mapreduce", "apache-spark-architecture", "object-storage", "replication", "data-warehouse-vs-data-lake"],
  practice: ["file-storage", "etl-framework"],
};
