export default {
  blocks: [
    { type: "p", text: "**Object storage** stores files as **objects** (data plus metadata) in flat **buckets**, addressed by a key and accessed over HTTP. Amazon S3, Google Cloud Storage and Azure Blob Storage are the best-known services. It is the default home for anything big and unstructured: images, videos, backups, logs, ML datasets and static websites." },

    { type: "h2", text: "The problem with files and databases" },
    { type: "p", text: "A video service stores millions of videos, each megabytes to gigabytes; Netflix-scale catalogs hold on the order of 100 million video files, and YouTube hosts billions of thumbnails. Where should these bytes live?" },
    { type: "ul", items: [
      "**File systems don't scale out.** Directories like `/videos/2024/01/video1.mp4` must be traversed, and \"list all January uploads\" scans thousands of subdirectories; file systems weren't built for billions of files. One server holds limited storage, adding servers needs manual partitioning, replication is complex, and clients must know which server holds a file.",
      "**Databases aren't built for big binaries.** You can store BLOBs, but a 1 GB video in PostgreSQL strains memory, makes backups enormous and slows replication. Databases are optimized for structured queries.",
      "**Global users need nearby copies.** A user in Tokyo requesting a video stored in a US data center sees high latency, and file systems have no built-in global distribution.",
    ] },

    { type: "h2", text: "How object storage works" },
    { type: "p", text: "Each file becomes an independent **object** in a **flat namespace**: no directories, no hierarchy. An object has three parts: the **data** (the bytes), **metadata** (content type, size, upload date, custom tags) and a **unique key** such as `videos/paris.mp4`." },
    { type: "code", code: `{
  "ObjectKey": "videos/paris.mp4",
  "Metadata": { "ContentType": "video/mp4", "UploadDate": "2024-01-15", "Duration": "120s" },
  "Data": "<binary video data>"
}` },
    { type: "diagram", kind: "flow", caption: "PUT an object: the client sends key + bytes + metadata to a bucket over HTTP; the service replicates it across servers and zones before acknowledging.", nodes: [
      { id: "c", label: "Client", col: 0, row: 1, shape: "pill" },
      { id: "b", label: "Bucket: my-videos", sub: "flat key → object map", col: 1.6, row: 1, tone: "accent" },
      { id: "z1", label: "Zone A copy", col: 3.1, row: 0, shape: "db", tone: "store" },
      { id: "z2", label: "Zone B copy", col: 3.1, row: 1, shape: "db", tone: "store" },
      { id: "z3", label: "Zone C copy", col: 3.1, row: 2, shape: "db", tone: "store" },
    ], edges: [{ from: "c", to: "b", label: "PUT key + bytes + metadata" }, { from: "b", to: "z1", dashed: true }, { from: "b", to: "z2", dashed: true }, { from: "b", to: "z3", dashed: true }] },
    { type: "ul", items: [
      "**Buckets** are top-level containers: create `my-videos` and store millions of objects in it, each with a key unique within the bucket.",
      "**No real folders**: `images/2024/cat.jpg` looks like a path but is just a string; no `/images/` directory exists. Lookups by key use hash-table-like indexes, so performance stays flat from 1,000 objects to a billion.",
      "**RESTful HTTP API**: upload with PUT, download with GET, delete with DELETE, e.g. `https://storage.example.com/my-videos/paris.mp4`. The API hides the distributed storage behind it, and [CDNs](/learn/cdn) can cache objects at edge locations for low latency worldwide.",
      "**Built-in durability**: an upload is automatically copied to several servers (often 3+) across availability zones; if one fails, another copy serves the file. Services such as S3 are designed for 99.999999999% (11 nines) annual durability.",
      "**Versioning**: overwrite `report.pdf` or delete it and the old version is kept, protecting against application bugs and user mistakes.",
      "**Lifecycle policies**: move objects to cheaper tiers automatically (say after 90 days) or delete them (say after a year).",
      "**Consistency**: S3 now offers strong read-after-write consistency (upload, then read immediately); some systems are eventually consistent, which is cheaper but may briefly return stale data.",
    ] },

    { type: "h2", text: "When to use object storage" },
    { type: "ul", items: [
      "**Multimedia**: YouTube stores billions of videos and Netflix serves petabytes of streaming content; each file is an object with an HTTP URL browsers can fetch directly, no application server in the path.",
      "**Backups and disaster recovery**: terabyte-scale database backups stored cheaply, with geographic replication against data-center loss. See [disaster recovery](/learn/disaster-recovery).",
      "**Static website hosting**: upload HTML, CSS, JavaScript and images and let the bucket serve them; cheaper than running web servers.",
      "**Data lakes**: IoT sensors produce millions of events a day; store raw JSON or CSV as objects and let Spark or a query engine read them in place, separating storage from compute.",
    ] },
    { type: "p", text: "Don't use it for frequently updated files, appends or low-latency small reads and writes; use a database or block storage for those." },
    { type: "table", head: ["Service", "Highlights"], rows: [
      ["**Amazon S3**", "The industry standard: virtually unlimited storage, versioning, lifecycle policies, cross-region replication; most AWS services integrate (Lambda can trigger on uploads, analytics tools read S3 directly)"],
      ["**Google Cloud Storage**", "Multi-regional storage with strong consistency; BigQuery can query data in it directly, no ETL"],
      ["**Azure Blob Storage**", "Hot, cool and archive tiers with different prices and access speeds; fits Azure and hybrid-cloud setups"],
    ] },
    { type: "code", code: `import boto3

s3 = boto3.client("s3")
s3.upload_file("video.mp4", "my-bucket", "videos/video.mp4")              # upload
s3.download_file("my-bucket", "videos/video.mp4", "local-video.mp4")      # download

# Share it for 1 hour without making the bucket public
url = s3.generate_presigned_url("get_object", Params={"Bucket": "my-bucket", "Key": "videos/video.mp4"}, ExpiresIn=3600)

s3.delete_object(Bucket="my-bucket", Key="videos/video.mp4")              # delete` },

    { type: "h2", text: "Object vs block vs file storage" },
    { type: "table", head: ["", "Object storage", "Block storage", "File storage"], rows: [
      ["Abstraction", "Objects in buckets, by key", "Raw disk volumes", "Files in a directory tree"],
      ["Access", "HTTP API (PUT, GET, DELETE)", "Attached to one machine as a disk", "Mounted over the network (NFS, SMB)"],
      ["Scale", "Practically unlimited", "One volume, up to tens of TB", "Large but bounded"],
      ["Updates", "Replace whole objects (no in-place edits)", "Random reads and writes", "Random reads and writes"],
      ["Typical use", "Media, backups, data lakes, static assets", "Databases, boot disks (EBS)", "Shared files for legacy apps (EFS)"],
      ["Cost", "Lowest per GB", "Higher", "Highest"],
    ] },

    { type: "h2", text: "Key properties" },
    { type: "ul", items: [
      "**Durability**: objects are stored redundantly (replicas or erasure coding across devices and data centers). S3 is designed for 99.999999999% (eleven nines) durability.",
      "**Flat namespace**: `photos/2026/10/abc.jpg` is one key; the slashes only look like folders. Listing by prefix emulates directories.",
      "**Metadata**: content type, custom tags and user-defined metadata travel with each object.",
      "**Strong read-after-write consistency**: S3, GCS and Azure now return the new object immediately after a successful write.",
      "**Storage classes**: hot, infrequent-access and archive tiers (S3 Glacier) trade retrieval speed for much lower cost; **lifecycle rules** move or delete objects by age automatically.",
    ] },

    { type: "h2", text: "Uploads and downloads without your servers" },
    { type: "p", text: "Streaming large files through your application servers wastes bandwidth and ties up workers. Instead, issue **presigned URLs**: short-lived URLs signed with your credentials that let a client upload or download one specific object directly." },
    { type: "diagram", kind: "sequence", caption: "Direct upload with a presigned URL: the app only authorises the upload; the bytes go straight from the client to the bucket.", actors: ["Client", "App server", "Object store", "Processor"], steps: [
      { from: 0, to: 1, label: "POST /uploads (file name, size)" },
      { from: 1, to: 0, label: "presigned PUT URL (expires 15 min)" },
      { from: 0, to: 2, label: "PUT bytes directly", tone: "accent" },
      { from: 2, to: 3, label: "event: object created", dashed: true },
      { from: 3, to: 2, label: "write thumbnails, transcode", dashed: true },
      { from: 3, to: 1, label: "mark media ready", dashed: true },
    ] },
    { type: "ul", items: [
      "**Multipart upload** splits large files into parts uploaded in parallel and retried individually; essential for video and multi-GB files.",
      "**Event notifications** (object created) trigger processing: thumbnails, transcoding, virus scanning, indexing. See [message queues](/learn/message-queues).",
      "Serve downloads through a [CDN](/learn/cdn) with the bucket as origin, using signed URLs or cookies for private content.",
    ] },

    { type: "h2", text: "Design patterns" },
    { type: "ul", items: [
      "**Store bytes in object storage, metadata in a database**: the database row holds the object key, owner, size, status and permissions; never store large blobs in the database itself.",
      "**Content-addressed keys**: name objects by a hash of their content to deduplicate identical uploads (common in backup and file-sync systems).",
      "**Immutability**: write new keys instead of overwriting; enable versioning for accidental-delete protection.",
      "**Data lakes**: store analytics data as Parquet files in buckets and query them with Spark, Trino or Athena.",
    ] },
    { type: "callout", tone: "warning", text: "Object storage is not a file system. Renaming a \"folder\" means copying every object, appends require rewriting the object, and small random reads are slow. Don't put a database's data files on it." },
  ],
  uses: [
    { name: "Netflix, YouTube and Spotify", text: "Store media masters and encoded files in object storage, serving them through CDNs." },
    { name: "Dropbox", text: "Splits files into content-addressed blocks stored in its own object storage system (Magic Pocket), deduplicating identical blocks." },
    { name: "Data lakes", text: "Companies keep raw and processed analytics data as Parquet files in S3 or GCS, queried by Spark, Athena or BigQuery." },
    { name: "Backups and logs", text: "Database backups and archived logs move to cheap archive tiers through lifecycle rules." },
  ],
  interview: [
    "Put images, video and files in object storage and keep only metadata and the key in your database.",
    "Use presigned URLs for direct client uploads and downloads, and multipart upload for big files.",
    "Trigger async processing (thumbnails, transcoding) from upload events.",
    "Serve public or signed downloads via a CDN in front of the bucket.",
  ],
  related: ["cdn", "back-of-the-envelope-estimation", "message-queues", "encryption", "disaster-recovery"],
  practice: ["file-storage", "video-streaming", "image-feed-client", "paste-service"],
};
