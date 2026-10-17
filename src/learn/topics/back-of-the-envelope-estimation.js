export default {
  blocks: [
    { type: "p", text: "**Back-of-the-envelope estimation** is quick, rough arithmetic that tells you which problems are real before you design for them. Is this a read-heavy or write-heavy system? Will the data fit on one machine? Is bandwidth or storage the expensive part? The goal is the right **order of magnitude**, not precision." },

    { type: "h2", text: "The numbers to have in your head" },
    { type: "h3", text: "Time" },
    { type: "table", head: ["Shortcut", "Value"], rows: [
      ["Seconds in a day", "86,400 ≈ **100,000** (10^5)"],
      ["Seconds in a month", "≈ 2.6 million ≈ **2.5 × 10^6**"],
      ["Seconds in a year", "≈ 31.5 million ≈ **3 × 10^7**"],
      ["1 million requests/day", "≈ **12 requests/s** on average"],
      ["1 billion requests/day", "≈ **12,000 requests/s** on average"],
    ] },
    { type: "h3", text: "Size" },
    { type: "table", head: ["Unit", "Bytes", "Rough example"], rows: [
      ["1 KB", "10^3", "A short text record, a tweet with metadata"],
      ["1 MB", "10^6", "A compressed photo, a minute of MP3"],
      ["1 GB", "10^9", "A movie at low quality"],
      ["1 TB", "10^12", "Fits on one large SSD"],
      ["1 PB", "10^15", "Thousands of disks; a big company's warehouse"],
    ] },
    { type: "h3", text: "Throughput of one machine (very roughly)" },
    { type: "table", head: ["Component", "Order of magnitude"], rows: [
      ["Simple stateless web server", "1,000–10,000 requests/s"],
      ["Relational database, simple indexed queries", "1,000s–10,000s queries/s"],
      ["Redis / in-memory cache", "100,000+ operations/s"],
      ["Kafka broker", "100s of MB/s, 100,000s messages/s"],
      ["Network card", "10–25 Gbit/s ≈ 1–3 GB/s"],
    ] },
    { type: "p", text: "Latency figures (memory, SSD, network round trips) are in [latency vs throughput](/learn/latency-vs-throughput)." },

    { type: "h2", text: "A repeatable method" },
    { type: "ol", items: [
      "**Users**: daily active users (DAU) and how many actions each takes per day.",
      "**Traffic**: average QPS = daily actions ÷ 100,000 s. Peak QPS ≈ 2–5× average (traffic is not flat).",
      "**Read/write ratio**: how many reads per write? This decides between caching/replicas and write scaling.",
      "**Storage**: new records per day × record size × retention, plus replication (×3) and indexes.",
      "**Bandwidth**: QPS × response size, for both ingress and egress.",
      "**Memory for caching**: the hot fraction (often ~20% of daily data, by the 80/20 rule) × record size.",
      "**Machines**: peak load ÷ capacity per machine, with headroom (run at ~50–70%).",
    ] },

    { type: "h2", text: "Worked example: a URL shortener" },
    { type: "p", text: "Assume **100 million new links per month** and **100 redirects per link created** (read-heavy)." },
    { type: "table", head: ["Quantity", "Calculation", "Result"], rows: [
      ["Writes", "100M ÷ 2.5M s/month", "**~40 writes/s** average, ~200 at peak"],
      ["Reads", "40 × 100", "**~4,000 redirects/s** average, ~20,000 at peak"],
      ["Record size", "short code + long URL + metadata", "~500 bytes"],
      ["Storage per year", "100M × 12 × 500 B", "**~600 GB** (×3 replicas ≈ 1.8 TB)"],
      ["Storage, 5 years", "600 GB × 5", "~3 TB raw: fits on a few machines; sharding is optional"],
      ["Cache", "20% of a day's reads' unique URLs, ~1M × 500 B", "~0.5 GB of hot data: a small Redis"],
      ["Short-code space", "62^7 base-62 codes", "3.5 trillion: 7 characters is plenty"],
    ] },
    { type: "p", text: "Conclusions fall out directly: writes are trivial, reads dominate, so a cache in front of the store is the key component. Storage is modest, so a single database with replicas works for years. This is why estimates come **before** the architecture. Try it in the [URL shortener round](/system-design/url-shortener)." },

    { type: "h2", text: "Worked example: storage for a photo app" },
    { type: "p", text: "**10 million DAU**, **10%** upload one photo per day, average **2 MB** after compression, plus 3 thumbnails of ~50 KB." },
    { type: "ul", items: [
      "Uploads: 1M photos/day ≈ **12 uploads/s** average.",
      "New storage: 1M × (2 MB + 150 KB) ≈ **2.15 TB/day** ≈ **800 TB/year**: this is an [object storage](/learn/object-storage) problem, not a database problem.",
      "Metadata: 1M rows/day × ~1 KB ≈ 1 GB/day: tiny compared to the blobs.",
      "Egress: if each photo is viewed 50 times, mostly as thumbnails, serving from a [CDN](/learn/cdn) is essential.",
    ] },

    { type: "h2", text: "Tips" },
    { type: "ul", items: [
      "Round aggressively: 86,400 becomes 100,000; 2.6 million becomes 2.5 million. Say that you're rounding.",
      "Work in powers of ten and write the units down; most estimation errors are unit errors (bits vs bytes, per day vs per second).",
      "Always state **peak**, not just average, and say what multiplier you used.",
      "Finish each estimate with a **design consequence**: \"so a single primary can take the writes\" or \"so we must shard storage\".",
    ] },
  ],
  uses: [
    { name: "Capacity planning", text: "Infrastructure teams forecast peak QPS and storage growth to buy or reserve capacity months ahead." },
    { name: "Choosing a datastore", text: "A dataset that fits in one machine's memory or disk can use a simple, strongly consistent store; one that grows by terabytes a day can't." },
    { name: "Cost estimates", text: "Egress bandwidth and storage often dominate cloud bills; rough numbers catch an expensive design before it's built." },
    { name: "Interviews", text: "Interviewers use estimation to see whether you can tell a real bottleneck from an imaginary one." },
  ],
  interview: [
    "Spend about 3–5 minutes; state assumptions, compute QPS, read/write ratio and storage, and stop.",
    "Use round numbers and say so; nobody wants long division.",
    "Turn every number into a decision (cache needed, sharding not needed yet, CDN essential).",
    "Revisit estimates when the interviewer changes the scale; it shows your design follows the numbers.",
  ],
  related: ["latency-vs-throughput", "scalability", "system-design-interview", "caching", "sharding"],
  practice: ["url-shortener", "paste-service", "news-feed", "file-storage"],
};
