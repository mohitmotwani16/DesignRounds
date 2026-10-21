// Unix pipelines as the model for batch processing, then MapReduce: map, shuffle, reduce,
// word count, why the shuffle dominates, fault tolerance, and the multi-stage limitation.
export default {
  blocks: [
    { type: "p", text: "**MapReduce** is the programming model that made it practical to process datasets far bigger than one machine: split the input, run a **map** function on every piece in parallel, **shuffle** the results so equal keys meet, then **reduce** each key's values. Its ideas come straight from a much older tool: the Unix pipeline." },

    { type: "h2", text: "The foundation: Unix pipelines" },
    { type: "p", text: "In the 1970s, Unix engineers processed data by chaining small programs: each reads standard input, transforms it and writes standard output, and the shell connects them with pipes (`|`). To find the 10 most requested URLs in a web server's access log (millions of lines of timestamp, client IP, method, URL and status):" },
    { type: "code", code: `cat access.log | awk '{print $7}' | sort | uniq -c | sort -rn | head -10` },
    { type: "ol", items: [
      "`cat access.log`: stream the file's lines.",
      "`awk '{print $7}'`: keep just the URL (7th field).",
      "`sort`: sort URLs so identical ones are adjacent.",
      "`uniq -c`: count each run of identical lines.",
      "`sort -rn`: sort by count, highest first.",
      "`head -10`: keep the top 10.",
    ] },
    { type: "diagram", kind: "flow", caption: "A Unix pipeline: each small program does one job and streams its output to the next.", nodes: [
      { id: "a", label: "cat", sub: "read log", col: 0, row: 0 },
      { id: "b", label: "awk $7", sub: "extract URL", col: 1, row: 0 },
      { id: "c", label: "sort", sub: "group equal URLs", col: 2, row: 0, tone: "accent" },
      { id: "d", label: "uniq -c", sub: "count", col: 3, row: 0 },
      { id: "e", label: "sort -rn | head", sub: "top 10", col: 4, row: 0, tone: "ok" },
    ], edges: [{ from: "a", to: "b" }, { from: "b", to: "c" }, { from: "c", to: "d" }, { from: "d", to: "e" }] },
    { type: "p", text: "Each program does one thing: `sort` knows nothing about URLs and `uniq` nothing about logs, yet together they analyze traffic. And the whole file never sits in memory: lines stream through. Counting a 100 GB log with an in-memory hash map would need 100 GB+ of RAM; the pipeline needs little (only `sort` buffers, spilling to disk for big inputs). The general lesson: **streaming through data beats loading it into memory** when data exceeds RAM." },
    { type: "ul", items: [
      "**Composability**: want top URLs by response time instead? Change the `awk` step and add an aggregation; the rest stays.",
      "**Process isolation**: each step is its own process, so a CPU-bound `sort` and an I/O-bound `cat` run in parallel, scheduled by the kernel.",
      "**Restartability**: if `sort` crashes, rerun it; its input can be regenerated from the original file. This matters enormously once failures are routine.",
      "**Implicit backpressure**: if a producer outpaces its consumer, the pipe buffer fills and the producer blocks, so memory never blows up. See [backpressure](/learn/backpressure).",
    ] },
    { type: "p", text: "The wall: a pipeline runs on **one machine**. Sorting 100 GB takes hours, 10 TB won't fit on one disk, and a petabyte is out of the question. MapReduce takes the same ideas (streaming transformations, isolated steps, restartability) and spreads them across hundreds of machines." },

    { type: "h2", text: "The three phases of MapReduce" },
    { type: "p", text: "Input lives in a [distributed file system](/learn/distributed-file-systems) such as HDFS, split into blocks." },
    { type: "ul", items: [
      "**Map**: the framework launches one mapper per input block across the cluster. Each reads its block, applies your function and emits key-value pairs. It's like 1,000 copies of `awk`, each on a different chunk.",
      "**Shuffle**: the framework routes every pair so that all pairs with the same key reach the same reducer, which means heavy network transfer from every mapper to every reducer. It's `sort`, but across machines.",
      "**Reduce**: each reducer gets all values for its keys and aggregates them (sum, count, join…). Reducers run in parallel, each owning part of the key space. It's `uniq -c`, split across the cluster.",
    ] },
    { type: "diagram", kind: "flow", caption: "Word count in MapReduce: mappers emit (word, 1), the shuffle routes each word to one reducer, reducers sum.", nodes: [
      { id: "b1", label: "Block 1", sub: "\"hello world hello\"", col: 0, row: 0, shape: "db", tone: "store" },
      { id: "b2", label: "Block 2", sub: "\"world of hello\"", col: 0, row: 1.3, shape: "db", tone: "store" },
      { id: "m1", label: "Mapper 1", sub: "(hello,1)(world,1)(hello,1)", col: 1.5, row: 0, tone: "accent", w: 220 },
      { id: "m2", label: "Mapper 2", sub: "(world,1)(of,1)(hello,1)", col: 1.5, row: 1.3, tone: "accent", w: 210 },
      { id: "r1", label: "Reducer A", sub: "hello → [1,1,1] = 3", col: 3.1, row: 0, tone: "ok" },
      { id: "r2", label: "Reducer B", sub: "world → [1,1] = 2 · of → 1", col: 3.1, row: 1.3, tone: "ok", w: 210 },
    ], edges: [{ from: "b1", to: "m1", label: "map" }, { from: "b2", to: "m2", label: "map" }, { from: "m1", to: "r1", label: "shuffle" }, { from: "m1", to: "r2", dashed: true }, { from: "m2", to: "r1", dashed: true }, { from: "m2", to: "r2" }] },
    { type: "h3", text: "Word count, end to end" },
    { type: "code", code: `Map input:    "hello world hello"
Map output:   (hello, 1), (world, 1), (hello, 1)

Reduce input: hello -> [1, 1, 1, 1, 1, 1, 1, 1, 1, 1]   (from 10 mappers)
Reduce output: (hello, 10)` },
    { type: "p", text: "If \"hello\" appears in documents read by 10 mappers, each emits `(hello, 1)`; the shuffle sends all ten to one reducer, which outputs `(hello, 10)`. The same flow, simulated in Python with a combiner:" },
    { type: "code", code: `from collections import Counter, defaultdict

blocks = ["hello world hello", "world of hello", "hello again"]   # input splits
NUM_REDUCERS = 2

def map_fn(text):                        # user code: emit (word, 1)
    for word in text.split():
        yield word, 1

def combine(pairs):                      # optional: pre-aggregate on the mapper
    return Counter(k for k, _ in pairs).items()

def reduce_fn(word, counts):             # user code: sum counts for one key
    return word, sum(counts)

# Map (+ combine) runs independently per block, in parallel on a real cluster
mapped = [list(combine(map_fn(b))) for b in blocks]

# Shuffle: route every key to one reducer by hash
partitions = [defaultdict(list) for _ in range(NUM_REDUCERS)]
for pairs in mapped:
    for word, count in pairs:
        partitions[hash(word) % NUM_REDUCERS][word].append(count)

# Reduce: each reducer handles its keys
result = dict(reduce_fn(w, c) for part in partitions for w, c in part.items())
print(result)   # {'hello': 4, 'world': 2, 'of': 1, 'again': 1} (key order may vary)` },

    { type: "h2", text: "Why the shuffle is the bottleneck" },
    { type: "p", text: "Map and reduce run locally (mappers read nearby HDFS blocks; reducers write locally), but the shuffle moves data from every mapper to every reducer over the network. On large jobs terabytes cross the cluster, and that network I/O, not computation, usually sets the job's duration. Three standard optimizations:" },
    { type: "ul", items: [
      "**Combiners** pre-aggregate on each mapper: send `(hello, 47)` instead of 47 copies of `(hello, 1)`.",
      "**Compression** of map output trades CPU for network bandwidth.",
      "**Partitioning** controls which keys go to which reducer, enabling locality and balancing skewed keys.",
    ] },

    { type: "h2", text: "Fault tolerance through determinism" },
    { type: "p", text: "Map and reduce functions are deterministic, so any task can simply be re-run:" },
    { type: "ul", items: [
      "**Mapper fails**: restart it on another node; its input is still in HDFS, which keeps several replicas of each block.",
      "**Reducer fails**: re-run it; mapper outputs were written to local disk, so it re-reads them (or the mappers re-run).",
      "**Machine fails**: its tasks move to healthy nodes and only those tasks repeat.",
    ] },
    { type: "p", text: "That's why jobs can span thousands of machines even though failures are routine; Google's original MapReduce paper describes clusters where hardware failed during every significant job." },

    { type: "h2", text: "The limitation: multi-stage pipelines" },
    { type: "p", text: "One map–shuffle–reduce is rigid. Iterative algorithms such as PageRank need a separate MapReduce job per iteration, and between jobs every intermediate result is written to HDFS and read back. A 10-stage pipeline is 10 jobs, each materializing to distributed storage before the next starts, and that disk I/O adds a lot of latency. [Spark](/learn/apache-spark-architecture) removes most of it by keeping data in memory between stages." },
  ],
  uses: [
    { name: "Log analysis", text: "Top URLs, error counts and per-customer usage over terabytes of logs." },
    { name: "Search indexing", text: "Google built its web index with MapReduce: map documents to (term, doc) pairs, reduce into postings lists." },
    { name: "ETL and aggregation", text: "Hadoop jobs that join and summarize raw data into warehouse tables (now mostly on Spark)." },
    { name: "Unix one-liners", text: "The same map/sort/count shape on a single machine for files that fit on one disk." },
  ],
  interview: [
    "Explain map, shuffle and reduce with word count in under a minute.",
    "Point out that the shuffle (network) dominates cost, and mention combiners.",
    "Explain fault tolerance by re-running deterministic tasks on replicated input.",
    "Know why Spark replaced most MapReduce jobs: in-memory multi-stage pipelines.",
  ],
  related: ["batch-vs-stream-processing", "distributed-file-systems", "apache-spark-architecture", "backpressure", "search-and-inverted-index"],
  practice: ["etl-framework", "web-crawler", "clickstream"],
  reading: [
    { title: "MapReduce: Simplified Data Processing on Large Clusters", publisher: "Google Research", url: "https://research.google/pubs/mapreduce-simplified-data-processing-on-large-clusters/" },
  ],
};
