export default {
  blocks: [
    { type: "p", text: "Video streaming platforms such as YouTube and Netflix don't send one video file. They **transcode** each upload into many versions at different resolutions and bitrates, split each into short **segments**, and describe them in a **manifest** using **HLS** or **DASH**. The player downloads segments over plain HTTP from a **CDN** and uses **adaptive bitrate (ABR)** logic to switch quality segment by segment as network conditions change, so playback starts fast and rarely stalls." },

    { type: "h2", text: "From upload to playback" },
    { type: "diagram", kind: "flow", caption: "Uploads are transcoded into a bitrate ladder of segmented renditions; manifests and segments are stored and served through the CDN to adaptive players.", nodes: [
      { id: "up", label: "Upload", sub: "resumable", col: 0, row: 1, shape: "pill" },
      { id: "raw", label: "Original", sub: "object storage", col: 1.2, row: 1, shape: "db", tone: "store" },
      { id: "q", label: "Transcode jobs", col: 2.4, row: 1, shape: "queue", tone: "queue" },
      { id: "tx", label: "Transcoders", sub: "parallel per segment", col: 3.6, row: 1, tone: "accent" },
      { id: "out", label: "Renditions + manifests", sub: "240p … 4K", col: 4.8, row: 1, shape: "db", tone: "store" },
      { id: "cdn", label: "CDN", col: 4.8, row: 2.3, tone: "cache" },
      { id: "player", label: "Player", sub: "ABR", col: 3.6, row: 2.3, shape: "pill" },
    ], edges: [
      { from: "up", to: "raw" }, { from: "raw", to: "q" }, { from: "q", to: "tx" }, { from: "tx", to: "out" },
      { from: "out", to: "cdn" }, { from: "cdn", to: "player" },
    ] },

    { type: "h2", text: "Upload and transcoding" },
    { type: "ul", items: [
      "**Uploads** of large files use chunked, resumable uploads straight to object storage. See [resumable uploads](/learn/resumable-file-uploads).",
      "**A bitrate ladder** defines the renditions, for example 240p at 300 kbps up to 1080p at 5 Mbps and 4K at 15+ Mbps. Smarter platforms tune the ladder per title, since a cartoon needs fewer bits than a sports match.",
      "**Codecs:** H.264 for compatibility, with newer codecs (HEVC, VP9, AV1) for better compression on devices that support them. More codecs mean more storage and compute.",
      "**Parallelism:** split the source into chunks and transcode them on many workers at once, then stitch the results. A queue distributes the work; failed chunks are retried. See [message queues](/learn/message-queues).",
      "**Extras:** thumbnails, captions, audio tracks in several languages, and content checks run as part of the same pipeline.",
    ] },

    { type: "h2", text: "HLS and DASH" },
    { type: "p", text: "Both formats split each rendition into segments of a few seconds and publish a manifest. **HLS** (HTTP Live Streaming) uses `.m3u8` playlists and is required on Apple platforms; **DASH** uses an XML media presentation description. With the CMAF container, one set of segments can serve both, halving storage." },
    { type: "code", code: `
#EXTM3U                                  # master playlist (HLS)
#EXT-X-STREAM-INF:BANDWIDTH=800000,RESOLUTION=640x360
360p/index.m3u8
#EXT-X-STREAM-INF:BANDWIDTH=2500000,RESOLUTION=1280x720
720p/index.m3u8
#EXT-X-STREAM-INF:BANDWIDTH=5000000,RESOLUTION=1920x1080
1080p/index.m3u8
` },
    { type: "p", text: "Because segments are ordinary HTTP files, they're cached by CDNs like any static asset, which is what makes streaming to millions of viewers affordable." },

    { type: "h2", text: "Adaptive bitrate" },
    { type: "ul", items: [
      "The player measures download throughput and watches its **buffer** (seconds of video downloaded ahead).",
      "It picks the rendition for each next segment: higher quality when throughput is high and the buffer is healthy, lower when the buffer drains.",
      "**Start-up:** begin with a low or medium rendition to start quickly, then step up.",
      "**Goals in tension:** start fast, avoid rebuffering (the worst experience), maximise quality, and avoid switching quality too often.",
    ] },

    { type: "h2", text: "Delivery at scale" },
    { type: "ul", items: [
      "**CDNs serve almost all traffic:** popular titles are cached at the edge; large platforms also place caches inside internet service providers' networks.",
      "**The long tail** of rarely watched videos is served from regional caches or origin, so origin capacity and cost per GB still matter.",
      "**Cache keys** per segment and rendition; segments are immutable, so they can be cached for a long time.",
      "**Live streaming** adds tight latency: shorter segments or low-latency HLS/DASH modes, and transcoding in real time.",
      "**Protection:** signed URLs and DRM for paid content.",
      "**Quality metrics:** start-up time, rebuffering ratio, average bitrate and playback failures, measured from players.",
    ] },
  ],
  uses: [
    { name: "On-demand streaming", text: "Per-title bitrate ladders and CDN-cached segments serve films and series worldwide." },
    { name: "User-generated video", text: "Massive parallel transcoding of uploads, with fast low-resolution versions published first." },
    { name: "Live sports and events", text: "Low-latency HLS or DASH with real-time transcoding and huge synchronised audiences." },
  ],
  interview: [
    "Walk through upload, transcoding into a bitrate ladder, segmenting and manifests.",
    "Explain how ABR picks segments from throughput and buffer level.",
    "Put a CDN in front and treat segments as immutable cached files.",
    "Size storage and transcoding compute, and mention live streaming differences.",
  ],
  related: ["cdn", "object-storage", "resumable-file-uploads", "message-queues", "image-optimization"],
  practice: ["video-streaming", "file-storage"],
  reading: [
    { title: "HTTP Live Streaming", publisher: "Apple Developer", url: "https://developer.apple.com/streaming/" },
    { title: "Per-Title Encode Optimization", publisher: "Netflix Technology Blog", url: "https://netflixtechblog.com/per-title-encode-optimization-7e99442b62a2" },
  ],
};
