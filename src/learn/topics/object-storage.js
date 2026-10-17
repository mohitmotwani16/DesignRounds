export default {
  blocks: [
    { type: "p", text: "**Object storage** stores files as **objects** (data plus metadata) in flat **buckets**, addressed by a key and accessed over HTTP. Amazon S3, Google Cloud Storage and Azure Blob Storage are the best-known services. It is the default home for anything big and unstructured: images, videos, backups, logs, ML datasets and static websites." },

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
