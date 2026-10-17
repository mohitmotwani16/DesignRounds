export default {
  blocks: [
    { type: "p", text: "Uploading large files reliably means not sending them as one giant request. A robust design **splits files into chunks**, uploads chunks directly to object storage with **presigned URLs**, tracks which chunks arrived so an interrupted upload **resumes** instead of restarting, verifies integrity with **checksums**, and often **deduplicates** chunks that the system already has. This is the core of cloud storage products like Dropbox and Google Drive, and of video upload pipelines." },

    { type: "h2", text: "Why a single request fails" },
    { type: "ul", items: [
      "A 4 GB upload over a mobile network will be interrupted, and restarting from zero each time may never finish.",
      "Proxying gigabytes through application servers ties up their connections and bandwidth for no benefit.",
      "Request size and timeout limits on load balancers and gateways reject large bodies.",
      "Without integrity checks, a corrupted transfer is stored silently.",
    ] },

    { type: "h2", text: "The chunked upload flow" },
    { type: "diagram", kind: "sequence", caption: "The client creates an upload session, uploads chunks directly to object storage with presigned URLs, and completes the upload once all chunks are confirmed.", actors: ["Client", "Upload API", "Object storage"], steps: [
      { from: 0, to: 1, label: "create upload (name, size, file hash)" },
      { from: 1, to: 0, label: "upload id + presigned URLs per chunk", dashed: true },
      { from: 0, to: 2, label: "PUT chunk 1..N (parallel, with checksum)" },
      { from: 2, to: 0, label: "ETag per chunk", dashed: true },
      { from: 0, to: 1, label: "complete (chunk list + ETags)" },
      { from: 1, to: 2, label: "assemble / commit object" },
      { note: "metadata row: status = available", over: [1] },
    ] },
    { type: "ol", items: [
      "**Create a session:** the client tells the API the file's name, size and hash; the API records an upload in the metadata database with status `uploading` and returns an upload ID.",
      "**Upload chunks** (often 5-100 MB) directly to object storage using presigned URLs or a multipart upload API, several in parallel. See [object storage](/learn/object-storage).",
      "**Track progress:** the service (or the storage system) knows which parts completed, so after a network drop the client asks which chunks are missing and uploads only those.",
      "**Complete:** the client sends the list of parts; the service verifies them, commits the object, marks the file `available`, and triggers processing (thumbnails, virus scans, transcoding).",
      "**Clean up:** abandoned sessions expire and their parts are deleted after a timeout.",
    ] },

    { type: "h2", text: "Integrity" },
    { type: "ul", items: [
      "Send a checksum with each chunk so storage rejects corrupted parts.",
      "Verify the whole file's hash on completion against what the client declared.",
      "Store the hash in metadata so later downloads and sync can be verified too.",
    ] },

    { type: "h2", text: "Deduplication and sync" },
    { type: "p", text: "Cloud storage systems split files into chunks and identify each chunk by its content hash. Before uploading, the client asks which hashes the server already has, and uploads only new chunks. A file is stored as a list of chunk hashes in the metadata database." },
    { type: "ul", items: [
      "**Fixed-size chunks** are simple, but inserting one byte at the start of a file shifts every chunk boundary, so nothing deduplicates.",
      "**Content-defined chunking** uses a rolling hash to choose boundaries based on the content itself, so an insertion changes only nearby chunks. Editing a large document then uploads a few chunks, not the whole file.",
      "**Sync:** a file version is a new list of chunk hashes; devices compare lists and download only missing chunks. [Merkle-style hashes](/learn/merkle-trees) over directories find changes quickly.",
      "**Privacy:** cross-user deduplication can leak whether someone else has a file; many systems deduplicate only within one account, or encrypt per user.",
    ] },

    { type: "h2", text: "Metadata and access" },
    { type: "ul", items: [
      "Keep file metadata (owner, name, folder, version, chunk list, size, hash, status) in a database, separate from the bytes in object storage.",
      "Serve downloads through short-lived presigned URLs or a CDN, after an authorisation check.",
      "Version files by keeping old chunk lists, which gives history and restore almost for free.",
    ] },
  ],
  uses: [
    { name: "Cloud storage and sync", text: "Content-defined chunks, deduplication by hash and delta sync between devices." },
    { name: "Video platforms", text: "Resumable multipart uploads straight to storage, then transcoding. See [video streaming](/learn/video-streaming-adaptive-bitrate)." },
    { name: "Enterprise document systems", text: "Chunked uploads with integrity checks, versioning and virus scanning on completion." },
  ],
  interview: [
    "Split into chunks and upload directly to object storage with presigned URLs.",
    "Track parts so interrupted uploads resume, and expire abandoned sessions.",
    "Verify integrity with per-chunk and whole-file checksums.",
    "Deduplicate with content hashes and content-defined chunking for sync.",
  ],
  related: ["object-storage", "merkle-trees", "cdn", "idempotency", "video-streaming-adaptive-bitrate"],
  practice: ["file-storage", "video-streaming"],
  reading: [
    { title: "Uploading and copying objects using multipart upload", publisher: "Amazon S3 documentation", url: "https://docs.aws.amazon.com/AmazonS3/latest/userguide/mpuoverview.html" },
    { title: "tus: resumable upload protocol", publisher: "tus.io", url: "https://tus.io/protocols/resumable-upload" },
  ],
};
