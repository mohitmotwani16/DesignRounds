#!/usr/bin/env node
/**
 * Writes high-quality cursor-sourced nugget files for a fixed prompt batch.
 * Run: node scripts/cursor-nuggets-batch.mjs
 */
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { finishPack } from "../server/modules/pks/schema.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const nuggetDir = path.join(root, "server", "content", "nuggets");
const packDir = path.join(root, "server", "content", "packs");

const PROMPT_IDS = [
  "feature-store", "feed-ranking", "file-storage", "fraud-data-platform", "gdpr-deletion",
  "geo-replicated-database", "image-feed-client", "iot-telemetry", "key-value-store",
  "lakehouse-platform", "leader-election", "llm-eval-platform", "llm-gateway",
  "llm-inference-platform", "log-analytics", "metrics-platform", "micro-frontend-platform",
  "mobile-release-flags",
];

const viewport = { x: 0, y: 0, zoom: 1 };

function node(id, kind, label, x, y) {
  return { id, type: "systemNode", position: { x, y }, data: { kind, label } };
}
function edge(id, source, target, label) {
  return label ? { id, source, target, label } : { id, source, target };
}

/** @type {Record<string, import('../server/modules/nuggets/schema.js').nuggetSchema>} */
const INCIDENTS = {};

function reg(key, spec) {
  INCIDENTS[key] = spec;
}

// --- feature-store ---
reg("feature-store|deep.pit_joins", {
  title: "Training Pipeline Leakage Inflates Offline AUC by 12 Points",
  minutes: 4,
  symptoms: "A new fraud model shows 0.98 offline AUC but only 0.71 in shadow traffic. Data science suspects label leakage in the historical training join.",
  interviewerSetup: "The batch training job joins purchase labels to user features using the latest row per user_id, ignoring when the label event occurred.",
  diagram: {
    nodes: [
      node("node-labels", "warehouse", "Label Table", 80, 150),
      node("node-features", "data-lake", "Offline Feature History", 80, 300),
      node("node-join", "batch-job", "Training Dataset Builder", 320, 220),
      node("node-registry", "registry", "Feature Registry", 320, 380),
    ],
    edges: [
      edge("e-labels", "node-labels", "node-join", "All historical labels"),
      edge("e-features", "node-features", "node-join", "Latest value per user"),
      edge("e-reg", "node-registry", "node-join", "Feature definitions"),
    ],
  },
  incident: {
    nodeIds: ["node-join", "node-features"],
    edgeIds: ["e-features"],
    headline: "Non point-in-time feature join leaks future user state into historical labels",
  },
  agendaId: "incident.fix_pit_joins",
});

reg("feature-store|deep.online_store", {
  title: "Inference P99 Spikes to 800ms During Flash Sale",
  minutes: 4,
  symptoms: "Checkout recommendation models miss latency SLO: P99 feature fetch latency jumps from 12ms to 800ms during a flash sale while online store CPU pegs at 100%.",
  interviewerSetup: "The online store is a sharded relational database executing multi-table joins per inference request instead of flat key lookups.",
  diagram: {
    nodes: [
      node("node-serving", "model-serving", "Model Serving", 80, 150),
      node("node-fs", "kv-store", "Online Feature Store", 320, 150),
      node("node-stream", "stream-processor", "Stream Ingest", 320, 300),
      node("node-kafka", "t-kafka", "Feature Updates", 80, 300),
    ],
    edges: [
      edge("e-serve", "node-serving", "node-fs", "Feature GET per request"),
      edge("e-stream", "node-kafka", "node-stream", "Realtime updates"),
      edge("e-write", "node-stream", "node-fs", "Upsert features"),
    ],
  },
  incident: { nodeIds: ["node-fs"], edgeIds: ["e-serve"], headline: "Online store join-heavy reads blow inference latency budget at peak QPS" },
  agendaId: "incident.fix_online_store",
});

reg("feature-store|deep.parity", {
  title: "Production CTR Drops After Batch Logic Hotfix",
  minutes: 3,
  symptoms: "Click-through rate on the home feed drops 18% after a data engineer fixed a batch aggregation bug without updating the streaming pipeline.",
  interviewerSetup: "Batch Spark jobs and Flink stream jobs maintain separate Python and Java implementations of the same user-engagement feature.",
  diagram: {
    nodes: [
      node("node-batch", "batch-job", "Daily Spark Job", 80, 120),
      node("node-stream", "t-flink", "Flink Stream Job", 80, 260),
      node("node-offline", "data-lake", "Offline Store", 320, 120),
      node("node-online", "kv-store", "Online Store", 320, 260),
    ],
    edges: [
      edge("e-b", "node-batch", "node-offline", "Batch features"),
      edge("e-s", "node-stream", "node-online", "Live features"),
    ],
  },
  incident: { nodeIds: ["node-batch", "node-stream"], edgeIds: [], headline: "Dual batch/stream implementations diverge causing training-serving skew" },
  agendaId: "incident.fix_parity",
});

reg("feature-store|deep.versioning", {
  title: "Silent In-Place Feature Rewrite Breaks Live Model Scores",
  minutes: 3,
  symptoms: "Fraud scores swing wildly for all traffic after a team redeployed feature logic by overwriting rows in the online store without versioning.",
  interviewerSetup: "The feature platform allows in-place updates to feature definitions; production models still expect v1 scale and semantics.",
  diagram: {
    nodes: [
      node("node-registry", "registry", "Feature Registry", 80, 150),
      node("node-backfill", "batch-job", "Backfill Job", 80, 300),
      node("node-online", "kv-store", "Online Store", 320, 220),
      node("node-serving", "model-serving", "Inference Service", 560, 220),
    ],
    edges: [
      edge("e-reg", "node-registry", "node-backfill", "New logic v2"),
      edge("e-write", "node-backfill", "node-online", "Overwrite keys"),
      edge("e-read", "node-serving", "node-online", "Fetch latest"),
    ],
  },
  incident: { nodeIds: ["node-online", "node-registry"], edgeIds: ["e-write"], headline: "In-place feature mutation desynchronizes live models from training semantics" },
  agendaId: "incident.fix_versioning",
});

reg("feature-store|deep.freshness", {
  title: "Stale Engagement Features Go Unnoticed for 36 Hours",
  minutes: 3,
  symptoms: "Personalization quality degrades silently; dashboards show healthy Kafka lag but online engagement features are 36 hours old for 12% of users.",
  interviewerSetup: "Monitoring only tracks consumer lag, not end-to-end freshness of values written to the online store.",
  diagram: {
    nodes: [
      node("node-kafka", "t-kafka", "Event Stream", 80, 150),
      node("node-flink", "t-flink", "Stream Processor", 300, 150),
      node("node-online", "kv-store", "Online Store", 520, 150),
      node("node-mon", "monitoring-dashboard", "Freshness Monitor", 300, 300),
    ],
    edges: [
      edge("e1", "node-kafka", "node-flink", "Consume"),
      edge("e2", "node-flink", "node-online", "Write features"),
      edge("e3", "node-online", "node-mon", "Sample timestamps"),
    ],
  },
  incident: { nodeIds: ["node-mon", "node-online"], edgeIds: ["e3"], headline: "Missing serving-layer freshness checks hide stalled online feature writes" },
  agendaId: "incident.fix_freshness",
});

// --- feed-ranking ---
reg("feed-ranking|deep.features", {
  title: "Ranker Serves Stale Social Graph Features at Peak",
  minutes: 4,
  symptoms: "Feed relevance scores flatline during prime time; feature fetch timeouts cause the ranker to fall back to popularity-only ordering.",
  interviewerSetup: "High-cardinality social graph features are computed in batch nightly while the ranker expects sub-100ms online lookups.",
  diagram: {
    nodes: [
      node("node-feed", "app-server", "Feed API", 80, 150),
      node("node-rank", "model-serving", "Ranking Service", 300, 150),
      node("node-fs", "kv-store", "Feature Store", 520, 150),
      node("node-batch", "batch-job", "Nightly Graph Job", 520, 300),
    ],
    edges: [
      edge("e1", "node-feed", "node-rank", "Rank candidates"),
      edge("e2", "node-rank", "node-fs", "Feature lookup"),
      edge("e3", "node-batch", "node-fs", "Daily refresh"),
    ],
  },
  incident: { nodeIds: ["node-fs", "node-rank"], edgeIds: ["e2"], headline: "Stale batch-only features cause ranker timeouts and generic fallback ranking" },
  agendaId: "incident.fix_features",
});

reg("feed-ranking|deep.integrity", {
  title: "Clickbait Surge Bypasses Static Ranker Weights",
  minutes: 3,
  symptoms: "Policy team reports a 5x spike in low-quality clickbait in top feed slots despite unchanged model weights.",
  interviewerSetup: "Integrity rules live in a separate config service but the ranker only applies a static downrank multiplier baked into model features.",
  diagram: {
    nodes: [
      node("node-rank", "model-serving", "Ranker", 80, 150),
      node("node-policy", "rules-engine", "Policy Rules", 80, 300),
      node("node-feed", "app-server", "Feed API", 320, 150),
      node("node-mod", "content-moderation", "Safety Scores", 320, 300),
    ],
    edges: [
      edge("e1", "node-feed", "node-rank", "Score posts"),
      edge("e2", "node-mod", "node-rank", "Safety features"),
      edge("e3", "node-policy", "node-feed", "Post-filter (unused)"),
    ],
  },
  incident: { nodeIds: ["node-policy", "node-rank"], edgeIds: ["e3"], headline: "Policy downrank rules not applied on hot ranking path" },
  agendaId: "incident.fix_integrity",
});

reg("feed-ranking|deep.freshness", {
  title: "Repeat Visits Show Identical Feed for Hours",
  minutes: 3,
  symptoms: "Users report seeing the same posts after reopening the app; session dedupe cache never expires and blocks new candidates.",
  interviewerSetup: "The feed service caches the entire ranked page keyed only by user_id without session or time bucketing.",
  diagram: {
    nodes: [
      node("node-client", "mobile", "Mobile App", 80, 150),
      node("node-feed", "app-server", "Feed Service", 300, 150),
      node("node-cache", "cache", "Seen-Post Cache", 300, 300),
      node("node-rank", "model-serving", "Ranker", 520, 150),
    ],
    edges: [
      edge("e1", "node-client", "node-feed", "Fetch feed"),
      edge("e2", "node-feed", "node-cache", "Filter seen"),
      edge("e3", "node-feed", "node-rank", "Rank page"),
    ],
  },
  incident: { nodeIds: ["node-cache"], edgeIds: ["e2"], headline: "Unbounded seen-post cache prevents feed refresh between sessions" },
  agendaId: "incident.fix_freshness",
});

reg("feed-ranking|deep.experiments", {
  title: "Short-Term Lift Masks Long-Term Engagement Regression",
  minutes: 4,
  symptoms: "An experiment shows +4% clicks for 3 days but 30-day retention drops 2%; experiment analysis only aggregates daily metrics.",
  interviewerSetup: "Experiment exposure is logged but cohort analysis pipelines join on device_id inconsistently across mobile and web.",
  diagram: {
    nodes: [
      node("node-feed", "app-server", "Feed Service", 80, 150),
      node("node-exp", "experimentation", "Experiment SDK", 300, 150),
      node("node-events", "ingestion", "Event Pipeline", 520, 150),
      node("node-wh", "warehouse", "Metrics Warehouse", 520, 300),
    ],
    edges: [
      edge("e1", "node-feed", "node-exp", "Assign variant"),
      edge("e2", "node-feed", "node-events", "Log impressions"),
      edge("e3", "node-events", "node-wh", "Load metrics"),
    ],
  },
  incident: { nodeIds: ["node-wh", "node-exp"], edgeIds: ["e3"], headline: "Broken exposure join invalidates long-horizon experiment conclusions" },
  agendaId: "incident.fix_experiments",
});

reg("feed-ranking|deep.serving", {
  title: "Peak Traffic Exhausts Ranker Thread Pool",
  minutes: 4,
  symptoms: "During evening peak, feed API P99 exceeds 2s; ranker queue depth grows unbounded and clients receive HTTP 503.",
  interviewerSetup: "The feed API synchronously calls the ranker for 500 candidates per request with no deadline or partial fallback.",
  diagram: {
    nodes: [
      node("node-client", "client", "Clients", 80, 150),
      node("node-feed", "app-server", "Feed API", 280, 150),
      node("node-rank", "model-serving", "Ranker Pool", 480, 150),
      node("node-cache", "cache", "Hot Post Cache", 480, 300),
    ],
    edges: [
      edge("e1", "node-client", "node-feed", "Scroll requests"),
      edge("e2", "node-feed", "node-rank", "Score 500 items"),
      edge("e3", "node-feed", "node-cache", "Optional fallback"),
    ],
  },
  incident: { nodeIds: ["node-rank", "node-feed"], edgeIds: ["e2"], headline: "Synchronous full-candidate ranking exceeds latency budget at peak load" },
  agendaId: "incident.fix_serving",
});

// --- file-storage ---
reg("file-storage|deep.upload_chunking", {
  title: "9GB Upload Restart Forces Full Retry From Zero",
  minutes: 4,
  symptoms: "Users report failed 10GB video uploads after brief Wi-Fi drops; mobile clients restart entire uploads from byte zero.",
  interviewerSetup: "Upload API accepts only single-shot multipart posts with no resumable session tokens or committed part manifests.",
  diagram: { nodes: [node("node-client", "mobile", "Mobile Client", 80, 150), node("node-api", "app-server", "Upload API", 300, 150), node("node-store", "t-s3", "Object Storage", 520, 150), node("node-meta", "database", "Upload Metadata DB", 300, 300)], edges: [edge("e1", "node-client", "node-api", "Single POST"), edge("e2", "node-api", "node-store", "Stream body"), edge("e3", "node-api", "node-meta", "Track status")] },
  incident: { nodeIds: ["node-api", "node-client"], edgeIds: ["e1"], headline: "Non-resumable upload API wastes bandwidth after transient network loss" },
  agendaId: "incident.fix_upload_chunking",
});
reg("file-storage|deep.direct_upload", {
  title: "App Servers OOM During Viral File Drop",
  minutes: 4,
  symptoms: "API fleet memory saturates during a campus-wide file share event; upload throughput collapses despite auto-scaled pods.",
  interviewerSetup: "All file bytes proxy through application servers before reaching object storage.",
  diagram: { nodes: [node("node-client", "client", "Clients", 80, 150), node("node-api", "app-server", "App Servers", 300, 150), node("node-store", "t-s3", "Blob Storage", 520, 150), node("node-sign", "app-server", "Presign Service", 300, 300)], edges: [edge("e1", "node-client", "node-api", "Upload bytes"), edge("e2", "node-api", "node-store", "Forward stream"), edge("e3", "node-client", "node-sign", "Unused presign")] },
  incident: { nodeIds: ["node-api"], edgeIds: ["e1", "e2"], headline: "Proxy uploads through app tier exhaust memory under large file fan-in" },
  agendaId: "incident.fix_direct_upload",
});
reg("file-storage|deep.sync_notifications", {
  title: "Edits on Laptop Invisible on Phone for 20 Minutes",
  minutes: 3,
  symptoms: "Cross-device sync delays spike; users see stale folder listings on secondary devices after edits on primary.",
  interviewerSetup: "Change notifications rely on clients polling every 15 minutes instead of push/webhook fanout.",
  diagram: { nodes: [node("node-a", "mobile", "Device A", 80, 120), node("node-b", "mobile", "Device B", 80, 260), node("node-api", "app-server", "Metadata API", 320, 190), node("node-bus", "event-bus", "Change Events", 520, 190)], edges: [edge("e1", "node-a", "node-api", "Write metadata"), edge("e2", "node-api", "node-bus", "Publish change"), edge("e3", "node-b", "node-api", "Poll listing")] },
  incident: { nodeIds: ["node-b", "node-bus"], edgeIds: ["e3"], headline: "Polling-based sync misses real-time change propagation to peer devices" },
  agendaId: "incident.fix_sync_notifications",
});
reg("file-storage|deep.conflicts", {
  title: "Offline Edit Merge Produces Duplicate Conflicting Copies",
  minutes: 3,
  symptoms: "Support tickets spike for duplicate files named doc (conflict 1) after users edited the same note offline on two devices.",
  interviewerSetup: "Sync merges by last-write-wins using server arrival time without operational transform or user resolution.",
  diagram: { nodes: [node("node-laptop", "client", "Laptop (offline)", 80, 120), node("node-phone", "mobile", "Phone (offline)", 80, 260), node("node-sync", "app-server", "Sync Service", 320, 190), node("node-store", "t-s3", "File Blobs", 520, 190)], edges: [edge("e1", "node-laptop", "node-sync", "Push edit"), edge("e2", "node-phone", "node-sync", "Push edit"), edge("e3", "node-sync", "node-store", "Store both")] },
  incident: { nodeIds: ["node-sync"], edgeIds: ["e1", "e2"], headline: "Naive LWW merge silently forks concurrent offline edits" },
  agendaId: "incident.fix_conflicts",
});
reg("file-storage|deep.deduplication", {
  title: "Identical Viral Video Stored 50,000 Times",
  minutes: 3,
  symptoms: "Storage costs jump 40% after a meme circulates; each user upload creates a unique object key with full byte copy.",
  interviewerSetup: "Deduplication is disabled; content addressing and chunk hashing are not used on ingest.",
  diagram: { nodes: [node("node-client", "client", "Uploaders", 80, 150), node("node-api", "app-server", "Upload API", 300, 150), node("node-store", "t-s3", "Object Storage", 520, 150), node("node-index", "kv-store", "Content Hash Index", 300, 300)], edges: [edge("e1", "node-client", "node-api", "Upload file"), edge("e2", "node-api", "node-store", "Put object"), edge("e3", "node-api", "node-index", "Skip dedupe")] },
  incident: { nodeIds: ["node-store", "node-index"], edgeIds: ["e2"], headline: "Missing content-hash dedupe multiplies storage for identical uploads" },
  agendaId: "incident.fix_deduplication",
});

// --- fraud-data-platform ---
reg("fraud-data-platform|deep.streaming_features", {
  title: "Velocity Check Queries OLTP DB at Checkout",
  minutes: 4,
  symptoms: "Checkout P99 fraud decision latency exceeds 400ms; payment DB CPU spikes correlate with card velocity rule evaluation.",
  interviewerSetup: "The decision service runs SQL COUNT queries on the transactions table for every authorization request.",
  diagram: { nodes: [node("node-checkout", "app-server", "Checkout API", 80, 150), node("node-decision", "rules-engine", "Decision Service", 300, 150), node("node-oltp", "database", "Payments DB", 520, 150), node("node-stream", "stream-processor", "Velocity Aggregator", 520, 300)], edges: [edge("e1", "node-checkout", "node-decision", "Score txn"), edge("e2", "node-decision", "node-oltp", "COUNT last 10m"), edge("e3", "node-stream", "node-decision", "Unused features")] },
  incident: { nodeIds: ["node-decision", "node-oltp"], edgeIds: ["e2"], headline: "OLTP velocity queries on hot path violate 100ms fraud budget" },
  agendaId: "incident.fix_streaming_features",
});
reg("fraud-data-platform|deep.online_offline_parity", {
  title: "Retrained Model Declines 3x More Legitimate Orders",
  minutes: 4,
  symptoms: "New fraud model shows great offline metrics but live false-positive rate triples after deployment.",
  interviewerSetup: "Training pipeline uses batch-computed velocity windows while online serving uses a different sliding-window implementation.",
  diagram: { nodes: [node("node-batch", "batch-job", "Training Features", 80, 150), node("node-online", "kv-store", "Online Feature Store", 80, 300), node("node-train", "model-serving", "Training", 320, 150), node("node-live", "model-serving", "Live Scoring", 320, 300)], edges: [edge("e1", "node-batch", "node-train", "Dataset"), edge("e2", "node-online", "node-live", "Realtime features"), edge("e3", "node-batch", "node-online", "Backfill")] },
  incident: { nodeIds: ["node-batch", "node-online"], edgeIds: [], headline: "Training-serving feature skew inflates false positives in production" },
  agendaId: "incident.fix_online_offline_parity",
});
reg("fraud-data-platform|deep.decision_latency", {
  title: "Sequential Model Chain Blows 100ms Budget",
  minutes: 3,
  symptoms: "40% of checkout authorizations time out at 120ms; tracing shows five sequential remote calls on the fraud path.",
  interviewerSetup: "Feature fetch, rules engine, and two ML models run strictly serially with no caching or parallelization.",
  diagram: { nodes: [node("node-checkout", "app-server", "Checkout", 80, 150), node("node-orch", "app-server", "Decision Orchestrator", 300, 150), node("node-fs", "kv-store", "Feature Store", 520, 80), node("node-model", "model-serving", "ML Models", 520, 220)], edges: [edge("e1", "node-checkout", "node-orch", "Authorize"), edge("e2", "node-orch", "node-fs", "Fetch features"), edge("e3", "node-orch", "node-model", "Score serially")] },
  incident: { nodeIds: ["node-orch"], edgeIds: ["e2", "e3"], headline: "Serial fraud pipeline exceeds strict checkout latency SLO" },
  agendaId: "incident.fix_decision_latency",
});
reg("fraud-data-platform|deep.audit_trail", {
  title: "Investigators Cannot Reconstruct Decline Reasons",
  minutes: 3,
  symptoms: "Compliance audit fails: analysts cannot explain why transaction ID 8842 was declined last Tuesday.",
  interviewerSetup: "Decision logs store only approve/decline bitmap without feature snapshots or model version identifiers.",
  diagram: { nodes: [node("node-decision", "rules-engine", "Decision Service", 80, 150), node("node-log", "ingestion", "Decision Logger", 300, 150), node("node-lake", "data-lake", "Audit Lake", 520, 150), node("node-ui", "app-server", "Investigator UI", 300, 300)], edges: [edge("e1", "node-decision", "node-log", "Minimal event"), edge("e2", "node-log", "node-lake", "Append"), edge("e3", "node-ui", "node-lake", "Query context")] },
  incident: { nodeIds: ["node-log", "node-lake"], edgeIds: ["e1"], headline: "Incomplete decision audit records block regulatory reconstruction" },
  agendaId: "incident.fix_audit_trail",
});
reg("fraud-data-platform|deep.fallback", {
  title: "Feature Store Outage Blocks All Checkouts",
  minutes: 3,
  symptoms: "Feature store regional outage causes 100% checkout hard failures instead of degraded fraud screening.",
  interviewerSetup: "Checkout returns HTTP 503 when feature fetch errors; no cached features or rules-only fallback path exists.",
  diagram: { nodes: [node("node-checkout", "app-server", "Checkout API", 80, 150), node("node-fs", "kv-store", "Feature Store", 300, 150), node("node-rules", "rules-engine", "Rules Engine", 300, 300), node("node-cache", "cache", "Feature Cache", 520, 150)], edges: [edge("e1", "node-checkout", "node-fs", "Required fetch"), edge("e2", "node-checkout", "node-rules", "Bypassed"), edge("e3", "node-fs", "node-cache", "Cold cache")] },
  incident: { nodeIds: ["node-checkout", "node-fs"], edgeIds: ["e1"], headline: "Hard dependency on feature store halts checkout during partial outage" },
  agendaId: "incident.fix_fallback",
});

// --- gdpr-deletion ---
reg("gdpr-deletion|deep.lake", {
  title: "User Erasure Request Misses 30-Day SLA on Petabyte Lake",
  minutes: 4,
  symptoms: "Legal reports 12,000 overdue erasure tickets; lake scans rewrite entire Parquet partitions nightly at unsustainable cost.",
  interviewerSetup: "Deletion job rewrites every file in the lake for each user request instead of targeted partition pruning.",
  diagram: { nodes: [node("node-ticket", "app-server", "Erasure Queue", 80, 150), node("node-job", "batch-job", "Lake Rewrite Job", 300, 150), node("node-lake", "data-lake", "Parquet Lake", 520, 150), node("node-catalog", "registry", "Data Catalog", 300, 300)], edges: [edge("e1", "node-ticket", "node-job", "Per-user rewrite"), edge("e2", "node-job", "node-lake", "Full scan"), edge("e3", "node-catalog", "node-job", "Partition map")] },
  incident: { nodeIds: ["node-job", "node-lake"], edgeIds: ["e2"], headline: "Whole-lake rewrite strategy cannot meet erasure deadlines at scale" },
  agendaId: "incident.fix_lake",
});
reg("gdpr-deletion|deep.snapshots", {
  title: "Time Travel Still Returns Deleted User Rows",
  minutes: 3,
  symptoms: "Privacy review shows deleted accounts visible via table time travel queries used by support tooling.",
  interviewerSetup: "Logical delete flags rows in current snapshot but historical snapshots and manifest files retain raw PII.",
  diagram: { nodes: [node("node-delete", "batch-job", "Delete Worker", 80, 150), node("node-table", "warehouse", "User Table", 300, 150), node("node-snap", "t-s3", "Snapshot Storage", 520, 150), node("node-support", "app-server", "Support Query UI", 300, 300)], edges: [edge("e1", "node-delete", "node-table", "Soft delete"), edge("e2", "node-table", "node-snap", "Retain history"), edge("e3", "node-support", "node-table", "Time travel")] },
  incident: { nodeIds: ["node-snap", "node-table"], edgeIds: ["e2"], headline: "Snapshot retention preserves PII after delete commits" },
  agendaId: "incident.fix_snapshots",
});
reg("gdpr-deletion|deep.backups", {
  title: "DB Restore Resurrects Erased Users",
  minutes: 3,
  symptoms: "Disaster recovery restore from last week's backup reintroduces 4,000 users who completed GDPR erasure.",
  interviewerSetup: "Erasure tombstones live only in primary DB; backups and replicas are restored without replaying delete ledger.",
  diagram: { nodes: [node("node-primary", "database", "Primary DB", 80, 150), node("node-backup", "t-s3", "Backup Vault", 300, 150), node("node-ledger", "kv-store", "Delete Ledger", 300, 300), node("node-restore", "batch-job", "Restore Job", 520, 150)], edges: [edge("e1", "node-primary", "node-backup", "Nightly backup"), edge("e2", "node-ledger", "node-primary", "Not in backup"), edge("e3", "node-restore", "node-backup", "Full restore")] },
  incident: { nodeIds: ["node-restore", "node-ledger"], edgeIds: ["e3"], headline: "Backup restore without delete ledger replay resurrects erased users" },
  agendaId: "incident.fix_backups",
});
reg("gdpr-deletion|deep.shred", {
  title: "Cold Archive Makes Crypto-Shred the Only Option",
  minutes: 3,
  symptoms: "Erasure team cannot rewrite immutable glacier archives within regulatory window; legal asks for cryptographic deletion.",
  interviewerSetup: "Years of backups are WORM-locked; per-row rewrite is impossible within 30 days.",
  diagram: { nodes: [node("node-app", "app-server", "App Tier", 80, 150), node("node-kms", "secrets-platform", "Key Management", 300, 150), node("node-archive", "t-s3", "Immutable Archive", 520, 150), node("node-erase", "batch-job", "Erasure Orchestrator", 300, 300)], edges: [edge("e1", "node-app", "node-archive", "Encrypted blobs"), edge("e2", "node-kms", "node-app", "DEK per user"), edge("e3", "node-erase", "node-kms", "Revoke keys")] },
  incident: { nodeIds: ["node-archive", "node-kms"], edgeIds: ["e3"], headline: "Immutable archives require crypto-shred rather than physical rewrite" },
  agendaId: "incident.fix_shred",
});
reg("gdpr-deletion|deep.retain", {
  title: "Invoice Retention Keeps Deleted User PII",
  minutes: 3,
  symptoms: "Finance compliance requires 7-year invoices but erasure pipeline deletes entire customer records including billing artifacts.",
  interviewerSetup: "Deletion job cascades to invoices table without pseudonymizing legally retained fields.",
  diagram: { nodes: [node("node-erase", "batch-job", "GDPR Worker", 80, 150), node("node-users", "database", "Users DB", 300, 120), node("node-inv", "database", "Invoices DB", 300, 260), node("node-legal", "app-server", "Retention Policy", 520, 190)], edges: [edge("e1", "node-erase", "node-users", "Hard delete"), edge("e2", "node-erase", "node-inv", "Cascade delete"), edge("e3", "node-legal", "node-inv", "7yr retain rule")] },
  incident: { nodeIds: ["node-erase", "node-inv"], edgeIds: ["e2"], headline: "Blanket delete violates finance retention while keeping PII on invoices" },
  agendaId: "incident.fix_retain",
});

// --- geo-replicated-database ---
reg("geo-replicated-database|deep.conflict", {
  title: "Concurrent Cross-Region Writes Fork User Profile",
  minutes: 4,
  symptoms: "Users in EU and APAC simultaneously update profile settings; merged record oscillates between conflicting values.",
  interviewerSetup: "Multi-master replication applies last-writer-wins using region-local clocks without vector clocks or CRDT merge.",
  diagram: { nodes: [node("node-eu", "database", "EU Region DB", 80, 120), node("node-apac", "database", "APAC Region DB", 80, 260), node("node-sync", "stream-processor", "Replicator", 320, 190), node("node-client", "client", "Global Clients", 520, 190)], edges: [edge("e1", "node-eu", "node-sync", "Push writes"), edge("e2", "node-apac", "node-sync", "Push writes"), edge("e3", "node-sync", "node-eu", "Bidirectional")] },
  incident: { nodeIds: ["node-sync", "node-eu", "node-apac"], edgeIds: ["e1", "e2"], headline: "LWW without causal ordering loses concurrent cross-region updates" },
  agendaId: "incident.fix_conflict",
});
reg("geo-replicated-database|deep.clocks", {
  title: "Clock Skew Reorders Events Across Regions",
  minutes: 3,
  symptoms: "Audit log shows purchase B before purchase A despite A happening first globally; support refunds wrong orders.",
  interviewerSetup: "Events are ordered by wall-clock timestamps from each region's NTP without hybrid logical clocks.",
  diagram: { nodes: [node("node-us", "database", "US Primary", 80, 150), node("node-eu", "database", "EU Replica", 80, 300), node("node-order", "app-server", "Order Service", 320, 220), node("node-log", "warehouse", "Event Log", 520, 220)], edges: [edge("e1", "node-order", "node-us", "Write US"), edge("e2", "node-order", "node-eu", "Write EU"), edge("e3", "node-us", "node-log", "Replicate timestamps")] },
  incident: { nodeIds: ["node-log", "node-us"], edgeIds: ["e3"], headline: "Physical clock skew corrupts global event ordering" },
  agendaId: "incident.fix_clocks",
});
reg("geo-replicated-database|deep.consistency", {
  title: "Read-Your-Writes Violated After Region Failover",
  minutes: 3,
  symptoms: "Users post content then immediately refresh and see empty feed; reads hit stale replica seconds after write ACK.",
  interviewerSetup: "Read traffic load-balances randomly across replicas without session stickiness or read-after-write tokens.",
  diagram: { nodes: [node("node-client", "client", "Clients", 80, 150), node("node-lb", "load-balancer", "Read LB", 280, 150), node("node-primary", "database", "Write Primary", 480, 80), node("node-replica", "database", "Async Replica", 480, 220)], edges: [edge("e1", "node-client", "node-primary", "Write"), edge("e2", "node-client", "node-lb", "Read"), edge("e3", "node-lb", "node-replica", "Stale read")] },
  incident: { nodeIds: ["node-lb", "node-replica"], edgeIds: ["e3"], headline: "Random replica reads break read-your-writes after recent updates" },
  agendaId: "incident.fix_consistency",
});
reg("geo-replicated-database|deep.replication", {
  title: "Acknowledged Write Lost in Region Failure",
  minutes: 4,
  symptoms: "Region outage loses 2 minutes of confirmed writes; customers report missing transactions after failover.",
  interviewerSetup: "Primary acknowledges writes before synchronous quorum replication to secondary region completes.",
  diagram: { nodes: [node("node-primary", "database", "Primary Region", 80, 150), node("node-secondary", "database", "Secondary Region", 320, 150), node("node-app", "app-server", "Application", 80, 300), node("node-wal", "t-s3", "Cross-Region WAL", 320, 300)], edges: [edge("e1", "node-app", "node-primary", "Write ACK early"), edge("e2", "node-primary", "node-secondary", "Async replicate"), edge("e3", "node-primary", "node-wal", "Delayed ship")] },
  incident: { nodeIds: ["node-primary", "node-secondary"], edgeIds: ["e2"], headline: "Premature write ACK loses data on regional failure" },
  agendaId: "incident.fix_replication",
});
reg("geo-replicated-database|deep.failover", {
  title: "Automated Failover Promotes Split-Brain Secondary",
  minutes: 4,
  symptoms: "Network blip triggers dual primaries in US and EU; duplicate charge IDs appear for 8 minutes.",
  interviewerSetup: "Failover automation promotes secondary without fencing old primary or verifying quorum.",
  diagram: { nodes: [node("node-us", "database", "US Primary", 80, 120), node("node-eu", "database", "EU Secondary", 80, 260), node("node-orch", "service-discovery", "Failover Controller", 320, 190), node("node-app", "app-server", "Payment API", 520, 190)], edges: [edge("e1", "node-orch", "node-eu", "Promote"), edge("e2", "node-app", "node-us", "Still writing"), edge("e3", "node-app", "node-eu", "Also writing")] },
  incident: { nodeIds: ["node-orch", "node-us", "node-eu"], edgeIds: ["e1", "e2"], headline: "Unfenced failover creates split-brain dual write primaries" },
  agendaId: "incident.fix_failover",
});

// --- image-feed-client ---
reg("image-feed-client|deep.virtualization", {
  title: "Scroll Past 500 Posts Crashes App With OOM",
  minutes: 3,
  symptoms: "Instagram-style feed crashes on mid-tier Android after long scroll sessions; heap dumps show thousands of retained image views.",
  interviewerSetup: "RecyclerView equivalent keeps every fetched row in memory without view recycling or windowed list virtualization.",
  diagram: { nodes: [node("node-ui", "mobile", "Feed UI", 80, 150), node("node-vm", "app-server", "View Model", 300, 150), node("node-mem", "in-memory-db", "In-Memory Item Cache", 520, 150), node("node-api", "api-gateway", "Feed API", 300, 300)], edges: [edge("e1", "node-ui", "node-vm", "Bind all rows"), edge("e2", "node-vm", "node-mem", "Retain items"), edge("e3", "node-vm", "node-api", "Fetch pages")] },
  incident: { nodeIds: ["node-ui", "node-mem"], edgeIds: ["e1", "e2"], headline: "Missing list virtualization exhausts device memory on long feeds" },
  agendaId: "incident.fix_virtualization",
});
reg("image-feed-client|deep.images", {
  title: "Full-Resolution Images Saturate Cellular Bandwidth",
  minutes: 3,
  symptoms: "Data usage complaints spike; feed loads 4K images into 400px thumbnails burning memory and bandwidth.",
  interviewerSetup: "Client requests original CDN URLs without width hints or progressive JPEG/WebP variants.",
  diagram: { nodes: [node("node-app", "mobile", "Feed Client", 80, 150), node("node-cdn", "cdn", "Image CDN", 320, 150), node("node-origin", "t-s3", "Origin Storage", 520, 150), node("node-api", "app-server", "Metadata API", 320, 300)], edges: [edge("e1", "node-app", "node-api", "Post metadata"), edge("e2", "node-app", "node-cdn", "Full size URL"), edge("e3", "node-cdn", "node-origin", "Origin fetch")] },
  incident: { nodeIds: ["node-app", "node-cdn"], edgeIds: ["e2"], headline: "Oversized image requests waste bandwidth and decode memory" },
  agendaId: "incident.fix_images",
});
reg("image-feed-client|deep.caching", {
  title: "Image Cache Eviction Causes Scroll Jank",
  minutes: 3,
  symptoms: "Users see blank tiles when scrolling back up; decoded bitmap cache thrashes under memory pressure.",
  interviewerSetup: "Dual memory and disk cache lacks LRU bounds and duplicates bytes in heap and SQLite blobs.",
  diagram: { nodes: [node("node-ui", "mobile", "Image Views", 80, 150), node("node-mem", "cache", "Memory Cache", 300, 120), node("node-disk", "t-sqlite", "Disk Cache", 300, 260), node("node-net", "cdn", "CDN", 520, 190)], edges: [edge("e1", "node-ui", "node-mem", "Decode bitmap"), edge("e2", "node-mem", "node-disk", "Duplicate store"), edge("e3", "node-ui", "node-net", "Re-download")] },
  incident: { nodeIds: ["node-mem", "node-disk"], edgeIds: ["e2"], headline: "Unbounded image cache thrashing causes jank and redundant downloads" },
  agendaId: "incident.fix_caching",
});
reg("image-feed-client|deep.offline", {
  title: "Airplane Mode Shows Infinite Spinner Feed",
  minutes: 3,
  symptoms: "Offline users see endless loading spinner with no cached content or explicit offline state.",
  interviewerSetup: "Feed API errors propagate as generic loading state; prefetch of next page never runs on Wi-Fi.",
  diagram: { nodes: [node("node-app", "mobile", "Client App", 80, 150), node("node-local", "t-sqlite", "Local Feed DB", 300, 150), node("node-api", "api-gateway", "Feed API", 520, 150), node("node-prefetch", "app-server", "Prefetch Worker", 300, 300)], edges: [edge("e1", "node-app", "node-api", "Blocking fetch"), edge("e2", "node-app", "node-local", "Empty cache"), edge("e3", "node-prefetch", "node-local", "Unused prefetch")] },
  incident: { nodeIds: ["node-app", "node-local"], edgeIds: ["e1"], headline: "No offline cache or prefetch leaves users stuck on network errors" },
  agendaId: "incident.fix_offline",
});
reg("image-feed-client|deep.pagination", {
  title: "Cursor Pagination Skips Posts After Live Edits",
  minutes: 3,
  symptoms: "Users report missing posts when scrolling; offset-based pagination skips items when new content inserts at top.",
  interviewerSetup: "Client uses page=3 offset pagination against a live-updating feed sorted by recency.",
  diagram: { nodes: [node("node-app", "mobile", "Feed Client", 80, 150), node("node-api", "app-server", "Feed API", 300, 150), node("node-rank", "model-serving", "Ranker", 520, 150), node("node-store", "database", "Post Index", 300, 300)], edges: [edge("e1", "node-app", "node-api", "page=3 offset"), edge("e2", "node-api", "node-rank", "Rank slice"), edge("e3", "node-rank", "node-store", "Query index")] },
  incident: { nodeIds: ["node-app", "node-api"], edgeIds: ["e1"], headline: "Offset pagination duplicates and skips rows on live feed updates" },
  agendaId: "incident.fix_pagination",
});

// --- iot-telemetry ---
reg("iot-telemetry|deep.late", {
  title: "Late Bulk Upload Rewrites Historical Rollups Wrong",
  minutes: 4,
  symptoms: "Temperature charts show impossible spikes after devices reconnect; hourly rollups double-count late batches.",
  interviewerSetup: "Rollup jobs treat ingestion time as event time and append instead of upserting by device event timestamp.",
  diagram: { nodes: [node("node-device", "client", "IoT Devices", 80, 150), node("node-ingest", "ingestion", "Ingest Gateway", 300, 150), node("node-stream", "stream-processor", "Rollup Job", 520, 150), node("node-ts", "time-series-db", "Time Series DB", 520, 300)], edges: [edge("e1", "node-device", "node-ingest", "Bulk backlog"), edge("e2", "node-ingest", "node-stream", "Process"), edge("e3", "node-stream", "node-ts", "Append only")] },
  incident: { nodeIds: ["node-stream", "node-ts"], edgeIds: ["e3"], headline: "Ingestion-time rollups corrupt charts when events arrive late" },
  agendaId: "incident.fix_late",
});
reg("iot-telemetry|deep.rollups", {
  title: "One-Year Chart Query Times Out",
  minutes: 4,
  symptoms: "Dashboard year-view queries exceed 60s timeout; raw 1-second samples scanned for single device chart.",
  interviewerSetup: "Long-range queries hit raw high-resolution table without downsampled tier or pre-aggregated rollups.",
  diagram: { nodes: [node("node-ui", "app-server", "Dashboard UI", 80, 150), node("node-query", "app-server", "Query API", 300, 150), node("node-raw", "time-series-db", "Raw Samples", 520, 80), node("node-roll", "time-series-db", "Downsampled Tier", 520, 220)], edges: [edge("e1", "node-ui", "node-query", "1yr range"), edge("e2", "node-query", "node-raw", "Full scan"), edge("e3", "node-roll", "node-query", "Unused tier")] },
  incident: { nodeIds: ["node-query", "node-raw"], edgeIds: ["e2"], headline: "Missing downsampling tier makes long-range charts non-viable" },
  agendaId: "incident.fix_rollups",
});
reg("iot-telemetry|deep.storm", {
  title: "Regional Power Restore Triggers Ingestion Storm",
  minutes: 4,
  symptoms: "After outage, 200k devices reconnect within 60s; ingest gateway returns 503 and drops telemetry batches.",
  interviewerSetup: "Devices upload full offline backlog immediately with no jitter; gateway has fixed connection limits.",
  diagram: { nodes: [node("node-devices", "client", "Device Fleet", 80, 150), node("node-gw", "load-balancer", "Ingest LB", 280, 150), node("node-ingest", "ingestion", "Ingest Workers", 480, 150), node("node-kafka", "t-kafka", "Telemetry Bus", 480, 300)], edges: [edge("e1", "node-devices", "node-gw", "Simultaneous reconnect"), edge("e2", "node-gw", "node-ingest", "Overload"), edge("e3", "node-ingest", "node-kafka", "Produce")] },
  incident: { nodeIds: ["node-gw", "node-ingest"], edgeIds: ["e1", "e2"], headline: "Mass reconnect without backoff overwhelms ingest tier" },
  agendaId: "incident.fix_storm",
});
reg("iot-telemetry|deep.clock", {
  title: "Drifted Device Clocks Scatter Metrics on Timeline",
  minutes: 3,
  symptoms: "Fleet dashboard shows future-dated readings and negative durations; alerting misfires on clock-skewed devices.",
  interviewerSetup: "Server trusts device-reported timestamps without skew detection or server-side normalization.",
  diagram: { nodes: [node("node-device", "client", "Devices", 80, 150), node("node-ingest", "ingestion", "Ingest", 300, 150), node("node-ts", "time-series-db", "Metrics Store", 520, 150), node("node-alert", "alerting", "Alert Engine", 520, 300)], edges: [edge("e1", "node-device", "node-ingest", "Bad timestamps"), edge("e2", "node-ingest", "node-ts", "Store as-is"), edge("e3", "node-ts", "node-alert", "Evaluate rules")] },
  incident: { nodeIds: ["node-ingest", "node-ts"], edgeIds: ["e2"], headline: "Uncorrected device clock skew corrupts time-series ordering" },
  agendaId: "incident.fix_clock",
});
reg("iot-telemetry|deep.alerts", {
  title: "Silent Devices Not Detected Within SLA",
  minutes: 3,
  symptoms: "Critical freezer sensors stop reporting for 45 minutes before anyone notices; SLA requires 1-minute detection.",
  interviewerSetup: "Alerting evaluates threshold rules only on incoming points with no heartbeat or absence detection.",
  diagram: { nodes: [node("node-device", "client", "Sensors", 80, 150), node("node-ingest", "ingestion", "Ingest", 300, 150), node("node-stream", "stream-processor", "Rule Engine", 520, 150), node("node-alert", "alerting", "PagerDuty Bridge", 520, 300)], edges: [edge("e1", "node-device", "node-ingest", "Telemetry"), edge("e2", "node-ingest", "node-stream", "Evaluate"), edge("e3", "node-stream", "node-alert", "Fire alerts")] },
  incident: { nodeIds: ["node-stream"], edgeIds: ["e2"], headline: "Missing absence detection delays silent device alerts" },
  agendaId: "incident.fix_alerts",
});

// --- key-value-store ---
reg("key-value-store|deep.partitioning", {
  title: "Cluster Rebalance Drops 15% of Keys During Scale-Out",
  minutes: 4,
  symptoms: "Adding nodes during peak causes GET misses and 404 spikes; clients hit wrong owners after ring change.",
  interviewerSetup: "Consistent hash ring rebalances without virtual nodes; only minimal key migration protocol implemented.",
  diagram: { nodes: [node("node-client", "client", "Clients", 80, 150), node("node-router", "app-server", "Client Library", 300, 150), node("node-a", "kv-store", "Node A", 520, 80), node("node-b", "kv-store", "Node B", 520, 220)], edges: [edge("e1", "node-client", "node-router", "GET key"), edge("e2", "node-router", "node-a", "Stale route"), edge("e3", "node-router", "node-b", "New owner")] },
  incident: { nodeIds: ["node-router", "node-a"], edgeIds: ["e2"], headline: "Improper consistent hashing migration routes reads to wrong nodes" },
  agendaId: "incident.fix_partitioning",
});
reg("key-value-store|deep.replication", {
  title: "Single Replica Loss Causes Durability Incident",
  minutes: 4,
  symptoms: "Disk failure on one node permanently loses writes that were acknowledged with W=1.",
  interviewerSetup: "Replication factor is 3 but coordinator acknowledges after first local write without quorum.",
  diagram: { nodes: [node("node-coord", "app-server", "Coordinator", 80, 150), node("node-r1", "kv-store", "Replica 1", 300, 80), node("node-r2", "kv-store", "Replica 2", 300, 220), node("node-r3", "kv-store", "Replica 3", 520, 150)], edges: [edge("e1", "node-coord", "node-r1", "W=1 ACK"), edge("e2", "node-coord", "node-r2", "Async"), edge("e3", "node-coord", "node-r3", "Async")] },
  incident: { nodeIds: ["node-coord", "node-r1"], edgeIds: ["e1"], headline: "Sub-quorum writes acknowledged before durable replication" },
  agendaId: "incident.fix_replication",
});
reg("key-value-store|deep.conflict", {
  title: "Concurrent Puts Last-Writer-Wins Loses Updates",
  minutes: 3,
  symptoms: "Cart counters intermittently revert; two clients increment same key and one update vanishes.",
  interviewerSetup: "Conflict resolution uses blind last-write-wins without vector clocks or merge functions.",
  diagram: { nodes: [node("node-c1", "client", "Client A", 80, 120), node("node-c2", "client", "Client B", 80, 260), node("node-coord", "app-server", "Coordinator", 320, 190), node("node-r1", "kv-store", "Replica Set", 520, 190)], edges: [edge("e1", "node-c1", "node-coord", "PUT v=3"), edge("e2", "node-c2", "node-coord", "PUT v=4"), edge("e3", "node-coord", "node-r1", "LWW overwrite")] },
  incident: { nodeIds: ["node-coord", "node-r1"], edgeIds: ["e3"], headline: "Last-write-wins conflict policy drops concurrent counter updates" },
  agendaId: "incident.fix_conflict",
});
reg("key-value-store|deep.repair", {
  title: "Anti-Entropy Never Runs; Replica Divergence Grows",
  minutes: 3,
  symptoms: "Weekly consistency audit finds 0.3% key mismatch across replicas; manual rebuild required.",
  interviewerSetup: "Read repair is off and background Merkle-tree anti-entropy jobs are disabled to save CPU.",
  diagram: { nodes: [node("node-r1", "kv-store", "Replica 1", 80, 150), node("node-r2", "kv-store", "Replica 2", 300, 150), node("node-r3", "kv-store", "Replica 3", 520, 150), node("node-repair", "batch-job", "Repair Scheduler", 300, 300)], edges: [edge("e1", "node-r1", "node-r2", "Divergent"), edge("e2", "node-repair", "node-r1", "Disabled"), edge("e3", "node-repair", "node-r3", "Disabled")] },
  incident: { nodeIds: ["node-repair", "node-r1"], edgeIds: ["e2"], headline: "Disabled repair paths allow silent long-term replica divergence" },
  agendaId: "incident.fix_repair",
});
reg("key-value-store|deep.membership", {
  title: "Gossip Failure Leaves Phantom Nodes in Ring",
  minutes: 3,
  symptoms: "New nodes never receive traffic; routing table still lists decommissioned hosts as alive.",
  interviewerSetup: "Membership gossip stops after network partition; no centralized seed or failure detector cleanup.",
  diagram: { nodes: [node("node-seed", "service-discovery", "Seed Nodes", 80, 150), node("node-gossip", "app-server", "Gossip Protocol", 300, 150), node("node-new", "kv-store", "New Node", 520, 80), node("node-dead", "kv-store", "Dead Node", 520, 220)], edges: [edge("e1", "node-seed", "node-gossip", "Bootstrap"), edge("e2", "node-gossip", "node-dead", "Still alive"), edge("e3", "node-gossip", "node-new", "Unknown")] },
  incident: { nodeIds: ["node-gossip", "node-dead"], edgeIds: ["e2"], headline: "Stale membership gossip routes requests to dead nodes" },
  agendaId: "incident.fix_membership",
});

// --- lakehouse-platform ---
reg("lakehouse-platform|deep.smallfiles", {
  title: "Millions of Tiny Files Crush Metadata and Queries",
  minutes: 4,
  symptoms: "Lake queries that used to take minutes now take hours; metastore CPU pegged after streaming ingest lands micro-files.",
  interviewerSetup: "Streaming writers commit every few seconds creating thousands of 1MB Parquet files per table.",
  diagram: { nodes: [node("node-stream", "stream-processor", "Stream Writer", 80, 150), node("node-lake", "data-lake", "Delta Lake", 300, 150), node("node-meta", "registry", "Metastore", 520, 150), node("node-compact", "batch-job", "Compaction Job", 300, 300)], edges: [edge("e1", "node-stream", "node-lake", "Micro commits"), edge("e2", "node-lake", "node-meta", "File listings"), edge("e3", "node-compact", "node-lake", "Not scheduled")] },
  incident: { nodeIds: ["node-lake", "node-meta"], edgeIds: ["e1"], headline: "Small file problem explodes metadata and scan costs" },
  agendaId: "incident.fix_smallfiles",
});
reg("lakehouse-platform|deep.layout", {
  title: "Unpartitioned Table Full Scans Every BI Query",
  minutes: 4,
  symptoms: "Finance dashboards time out scanning 500TB events table for single-day filters.",
  interviewerSetup: "Events table lacks partition columns and Z-order; queries filter on date but scan all files.",
  diagram: { nodes: [node("node-bi", "app-server", "BI Tool", 80, 150), node("node-engine", "warehouse", "Query Engine", 300, 150), node("node-lake", "data-lake", "Events Table", 520, 150), node("node-layout", "batch-job", "Layout Optimizer", 300, 300)], edges: [edge("e1", "node-bi", "node-engine", "Daily report"), edge("e2", "node-engine", "node-lake", "Full scan"), edge("e3", "node-layout", "node-lake", "No clustering")] },
  incident: { nodeIds: ["node-engine", "node-lake"], edgeIds: ["e2"], headline: "Missing partition layout forces petabyte scans for date filters" },
  agendaId: "incident.fix_layout",
});
reg("lakehouse-platform|deep.timetravel", {
  title: "Training Reproducibility Fails on Old Snapshot",
  minutes: 3,
  symptoms: "ML team cannot reproduce March model; time travel query returns empty after aggressive vacuum deleted history.",
  interviewerSetup: "Retention policy vacuums snapshots older than 7 days while compliance requires 90-day reproducibility.",
  diagram: { nodes: [node("node-ml", "app-server", "ML Pipeline", 80, 150), node("node-lake", "data-lake", "Feature Table", 300, 150), node("node-vacuum", "batch-job", "Vacuum Job", 520, 150), node("node-snap", "t-s3", "Snapshot Storage", 520, 300)], edges: [edge("e1", "node-ml", "node-lake", "AS OF March"), edge("e2", "node-vacuum", "node-lake", "Delete history"), edge("e3", "node-lake", "node-snap", "Pruned files")] },
  incident: { nodeIds: ["node-vacuum", "node-lake"], edgeIds: ["e2"], headline: "Aggressive vacuum breaks time travel reproducibility guarantees" },
  agendaId: "incident.fix_timetravel",
});
reg("lakehouse-platform|deep.governance", {
  title: "Analysts Query Raw PII Despite Column Masking Policy",
  minutes: 3,
  symptoms: "Audit finds analysts selecting raw email column via ad-hoc SQL bypassing approved views.",
  interviewerSetup: "Governance tags exist in catalog but engines enforce no row/column ACLs at scan time.",
  diagram: { nodes: [node("node-analyst", "client", "Analysts", 80, 150), node("node-engine", "warehouse", "SQL Engine", 300, 150), node("node-lake", "data-lake", "Raw Tables", 520, 150), node("node-gov", "registry", "Policy Catalog", 300, 300)], edges: [edge("e1", "node-analyst", "node-engine", "Ad-hoc SQL"), edge("e2", "node-engine", "node-lake", "Unrestricted scan"), edge("e3", "node-gov", "node-engine", "Not enforced")] },
  incident: { nodeIds: ["node-engine", "node-gov"], edgeIds: ["e2"], headline: "Catalog-only governance fails to block sensitive column access" },
  agendaId: "incident.fix_governance",
});
reg("lakehouse-platform|deep.compute", {
  title: "Massive ML Backfill Starves Interactive BI Queries",
  minutes: 4,
  symptoms: "Executive dashboards fail during nightly feature backfill; shared cluster queues BI behind 10k Spark tasks.",
  interviewerSetup: "Single shared compute pool serves both interactive SQL and long batch without workload isolation.",
  diagram: { nodes: [node("node-bi", "app-server", "BI Dashboards", 80, 120), node("node-ml", "batch-job", "ML Backfill", 80, 260), node("node-cluster", "warehouse", "Shared Compute", 320, 190), node("node-lake", "data-lake", "Lake Storage", 520, 190)], edges: [edge("e1", "node-bi", "node-cluster", "Interactive"), edge("e2", "node-ml", "node-cluster", "Monopolize"), edge("e3", "node-cluster", "node-lake", "Scan data")] },
  incident: { nodeIds: ["node-cluster", "node-ml"], edgeIds: ["e2"], headline: "Unisolated compute lets batch backfills starve BI workloads" },
  agendaId: "incident.fix_compute",
});

// --- leader-election ---
reg("leader-election|deep.election", {
  title: "Flapping Leader Churns Every 30 Seconds",
  minutes: 3,
  symptoms: "Downstream job scheduler sees constant leader changes; duplicate cron triggers fire intermittently.",
  interviewerSetup: "Election timeouts are tighter than GC pauses; followers trigger elections on every long pause.",
  diagram: { nodes: [node("node-a", "app-server", "Node A", 80, 120), node("node-b", "app-server", "Node B", 80, 260), node("node-c", "app-server", "Node C", 320, 190), node("node-zk", "kv-store", "Coordination Store", 520, 190)], edges: [edge("e1", "node-a", "node-zk", "Campaign"), edge("e2", "node-b", "node-zk", "Campaign"), edge("e3", "node-c", "node-zk", "Watch leader")] },
  incident: { nodeIds: ["node-a", "node-b", "node-zk"], edgeIds: ["e1", "e2"], headline: "Over-sensitive election timeouts cause spurious leader churn" },
  agendaId: "incident.fix_election",
});
reg("leader-election|deep.split_brain", {
  title: "Network Partition Elects Two Leaders",
  minutes: 4,
  symptoms: "Two scheduler leaders run simultaneously assigning conflicting shard ownership during WAN blip.",
  interviewerSetup: "Quorum requires majority but both halves believe they have majority without fencing tokens.",
  diagram: { nodes: [node("node-p1", "app-server", "Partition A", 80, 120), node("node-p2", "app-server", "Partition B", 80, 260), node("node-zk", "kv-store", "Coordination", 320, 190), node("node-workers", "microservice", "Workers", 520, 190)], edges: [edge("e1", "node-p1", "node-zk", "Self-elect"), edge("e2", "node-p2", "node-zk", "Self-elect"), edge("e3", "node-p1", "node-workers", "Assign"), edge("e4", "node-p2", "node-workers", "Assign")] },
  incident: { nodeIds: ["node-p1", "node-p2"], edgeIds: ["e3", "e4"], headline: "Partitioned cluster elects dual leaders without quorum fencing" },
  agendaId: "incident.fix_split_brain",
});
reg("leader-election|deep.fencing", {
  title: "Zombie Leader Corrupts Shared State After Failover",
  minutes: 4,
  symptoms: "After failover, old leader resumes writing job checkpoints corrupting orchestration metadata.",
  interviewerSetup: "New leader elected but downstream storage accepts writes from old epoch without fencing tokens.",
  diagram: { nodes: [node("node-old", "app-server", "Deposed Leader", 80, 120), node("node-new", "app-server", "New Leader", 80, 260), node("node-store", "database", "Shared Metadata", 320, 190), node("node-zk", "kv-store", "Epoch Registry", 520, 190)], edges: [edge("e1", "node-old", "node-store", "Stale write"), edge("e2", "node-new", "node-store", "Valid write"), edge("e3", "node-new", "node-zk", "Bump epoch")] },
  incident: { nodeIds: ["node-old", "node-store"], edgeIds: ["e1"], headline: "Missing fencing allows deposed leader to corrupt shared state" },
  agendaId: "incident.fix_fencing",
});
reg("leader-election|deep.tuning", {
  title: "Aggressive Timeouts Cause Election Storm on Latency Blip",
  minutes: 3,
  symptoms: "Brief 200ms network jitter triggers cluster-wide re-elections and 5-minute orchestration freeze.",
  interviewerSetup: "Heartbeat interval and election timeout tuned for 1s failover, far below p99 network latency.",
  diagram: { nodes: [node("node-followers", "app-server", "Followers", 80, 150), node("node-leader", "app-server", "Leader", 300, 150), node("node-zk", "kv-store", "Coordination", 520, 150), node("node-mon", "monitoring-dashboard", "Latency Metrics", 300, 300)], edges: [edge("e1", "node-leader", "node-followers", "Heartbeats"), edge("e2", "node-followers", "node-zk", "Trigger election"), edge("e3", "node-mon", "node-followers", "Ignored jitter")] },
  incident: { nodeIds: ["node-followers", "node-leader"], edgeIds: ["e1"], headline: "Over-tuned election timers amplify transient latency into outages" },
  agendaId: "incident.fix_tuning",
});
reg("leader-election|deep.discovery", {
  title: "Clients Keep Sending Work to Former Leader",
  minutes: 3,
  symptoms: "After leader change, 30% of client requests still hit old node returning HTTP 409 for two minutes.",
  interviewerSetup: "Clients cache leader address indefinitely without watching leadership change notifications.",
  diagram: { nodes: [node("node-client", "client", "Clients", 80, 150), node("node-old", "app-server", "Former Leader", 300, 80), node("node-new", "app-server", "New Leader", 300, 220), node("node-zk", "kv-store", "Leader Registry", 520, 150)], edges: [edge("e1", "node-client", "node-old", "Cached leader"), edge("e2", "node-new", "node-zk", "Register"), edge("e3", "node-client", "node-zk", "No watch")] },
  incident: { nodeIds: ["node-client", "node-old"], edgeIds: ["e1"], headline: "Stale client leader cache routes traffic to deposed node" },
  agendaId: "incident.fix_discovery",
});

// --- llm-eval-platform ---
reg("llm-eval-platform|deep.graders", {
  title: "LLM Judge Scores Drift Without Calibration",
  minutes: 3,
  symptoms: "Release quality gate flips pass/fail on identical prompts week to week; grader model updated silently.",
  interviewerSetup: "Automated eval uses raw LLM judge scores without golden-set calibration or human anchor checks.",
  diagram: { nodes: [node("node-eval", "app-server", "Eval Runner", 80, 150), node("node-judge", "model-serving", "Grader Model", 300, 150), node("node-golden", "database", "Golden Answers", 520, 150), node("node-dash", "monitoring-dashboard", "Score Dashboard", 300, 300)], edges: [edge("e1", "node-eval", "node-judge", "Score outputs"), edge("e2", "node-eval", "node-golden", "Compare"), edge("e3", "node-judge", "node-dash", "Unstable metrics")] },
  incident: { nodeIds: ["node-judge", "node-eval"], edgeIds: ["e1"], headline: "Uncalibrated LLM grader produces non-reproducible eval scores" },
  agendaId: "incident.fix_graders",
});
reg("llm-eval-platform|deep.trials", {
  title: "Single-Run Pass Masks Regressive Model Change",
  minutes: 3,
  symptoms: "New prompt template passes eval once then fails in production; eval runs each case only once.",
  interviewerSetup: "Stochastic decoding with temperature 0.7 but no repeated trials or confidence intervals.",
  diagram: { nodes: [node("node-ci", "deployer", "CI Pipeline", 80, 150), node("node-eval", "app-server", "Eval Harness", 300, 150), node("node-model", "model-serving", "Candidate Model", 520, 150), node("node-stats", "warehouse", "Results Store", 300, 300)], edges: [edge("e1", "node-ci", "node-eval", "Gate release"), edge("e2", "node-eval", "node-model", "One sample"), edge("e3", "node-eval", "node-stats", "Store pass")] },
  incident: { nodeIds: ["node-eval", "node-model"], edgeIds: ["e2"], headline: "Single-trial eval accepts flaky stochastic model outputs" },
  agendaId: "incident.fix_trials",
});
reg("llm-eval-platform|deep.agents", {
  title: "Agent Eval Accidentally Issues Real Refunds",
  minutes: 4,
  symptoms: "Staging eval run processes 200 live refund API calls totaling $18k during tool-use agent test.",
  interviewerSetup: "Agent eval environment points at production payment sandbox keys that still settle real money.",
  diagram: { nodes: [node("node-eval", "app-server", "Agent Eval", 80, 150), node("node-agent", "model-serving", "Tool Agent", 300, 150), node("node-tools", "microservice", "Refund API", 520, 150), node("node-mock", "app-server", "Mock Sandbox", 300, 300)], edges: [edge("e1", "node-eval", "node-agent", "Run cases"), edge("e2", "node-agent", "node-tools", "Live calls"), edge("e3", "node-mock", "node-agent", "Bypassed")] },
  incident: { nodeIds: ["node-agent", "node-tools"], edgeIds: ["e2"], headline: "Agent evaluation wired to real side-effecting production tools" },
  agendaId: "incident.fix_agents",
});
reg("llm-eval-platform|deep.ci", {
  title: "Eval Regression Bypasses Broken Quality Gate",
  minutes: 3,
  symptoms: "Known-bad model ships after eval job fails but CI treats eval step as advisory only.",
  interviewerSetup: "Pipeline continues on eval failure; developers override without mandatory score delta review.",
  diagram: { nodes: [node("node-dev", "client", "Developers", 80, 150), node("node-ci", "deployer", "CI/CD", 300, 150), node("node-eval", "app-server", "Eval Service", 520, 150), node("node-prod", "model-serving", "Production", 520, 300)], edges: [edge("e1", "node-dev", "node-ci", "Merge PR"), edge("e2", "node-ci", "node-eval", "Fail ignored"), edge("e3", "node-ci", "node-prod", "Deploy anyway")] },
  incident: { nodeIds: ["node-ci", "node-eval"], edgeIds: ["e2", "e3"], headline: "Non-blocking eval gate allows regressions into production" },
  agendaId: "incident.fix_ci",
});
reg("llm-eval-platform|deep.cost", {
  title: "Eval Spend Blows Monthly Budget in One Day",
  minutes: 4,
  symptoms: "Finance alerts on $40k LLM eval charges after teams rerun full suites with expensive judge models.",
  interviewerSetup: "No caching, stratified sampling, or per-team budget caps on eval orchestrator.",
  diagram: { nodes: [node("node-teams", "client", "Product Teams", 80, 150), node("node-orch", "app-server", "Eval Orchestrator", 300, 150), node("node-judge", "model-serving", "Judge Models", 520, 150), node("node-cache", "cache", "Result Cache", 300, 300)], edges: [edge("e1", "node-teams", "node-orch", "Full matrix"), edge("e2", "node-orch", "node-judge", "Repeat calls"), edge("e3", "node-cache", "node-orch", "Unused")] },
  incident: { nodeIds: ["node-orch", "node-judge"], edgeIds: ["e2"], headline: "Unbounded eval matrix exhausts LLM judge budget" },
  agendaId: "incident.fix_cost",
});

// --- llm-gateway ---
reg("llm-gateway|deep.fallback", {
  title: "Retry Storm Amplifies Provider A Outage",
  minutes: 4,
  symptoms: "Provider A at 50% errors becomes 100% unavailable as gateway retries double traffic with no jitter.",
  interviewerSetup: "Fallback logic immediately retries same provider three times before switching models.",
  diagram: { nodes: [node("node-client", "client", "Apps", 80, 150), node("node-gw", "api-gateway", "LLM Gateway", 300, 150), node("node-a", "microservice", "Provider A", 520, 80), node("node-b", "microservice", "Provider B", 520, 220)], edges: [edge("e1", "node-client", "node-gw", "Requests"), edge("e2", "node-gw", "node-a", "Triple retry"), edge("e3", "node-gw", "node-b", "Delayed fallback")] },
  incident: { nodeIds: ["node-gw", "node-a"], edgeIds: ["e2"], headline: "Aggressive retries without backoff worsen provider failure cascade" },
  agendaId: "incident.fix_fallback",
});
reg("llm-gateway|deep.limits", {
  title: "Team Blows Token Budget Mid-Request",
  minutes: 3,
  symptoms: "Long streaming completion finishes at 2x token budget; finance cannot attribute overage until after response ends.",
  interviewerSetup: "Budget enforcement checks quota only at request start, not incrementally during stream.",
  diagram: { nodes: [node("node-team", "client", "Team App", 80, 150), node("node-gw", "api-gateway", "Gateway", 300, 150), node("node-meter", "kv-store", "Budget Counters", 520, 150), node("node-llm", "model-serving", "Model API", 520, 300)], edges: [edge("e1", "node-team", "node-gw", "Stream request"), edge("e2", "node-gw", "node-meter", "Pre-check only"), edge("e3", "node-gw", "node-llm", "Long stream")] },
  incident: { nodeIds: ["node-meter", "node-gw"], edgeIds: ["e2"], headline: "Post-hoc budget accounting allows runaway streaming token usage" },
  agendaId: "incident.fix_limits",
});
reg("llm-gateway|deep.streaming", {
  title: "Streaming Connections Exhaust Gateway File Descriptors",
  minutes: 4,
  symptoms: "Gateway stops accepting traffic at 10k concurrent streams; long-lived SSE ties up worker threads.",
  interviewerSetup: "Each streaming request holds dedicated thread and socket without async multiplexing or idle timeouts.",
  diagram: { nodes: [node("node-clients", "client", "Clients", 80, 150), node("node-gw", "api-gateway", "Gateway Pool", 300, 150), node("node-llm", "model-serving", "Upstream LLM", 520, 150), node("node-lb", "load-balancer", "Edge LB", 80, 300)], edges: [edge("e1", "node-clients", "node-lb", "SSE connections"), edge("e2", "node-lb", "node-gw", "Pin threads"), edge("e3", "node-gw", "node-llm", "Proxy stream")] },
  incident: { nodeIds: ["node-gw"], edgeIds: ["e2"], headline: "Thread-per-stream gateway design hits connection ceiling" },
  agendaId: "incident.fix_streaming",
});
reg("llm-gateway|deep.observability", {
  title: "Debug Logs Leak Prompt PII to Shared Index",
  minutes: 3,
  symptoms: "Security scan finds user emails and medical prompts in centralized log index used by all teams.",
  interviewerSetup: "Gateway logs full request/response bodies at INFO level to shared Elasticsearch cluster.",
  diagram: { nodes: [node("node-gw", "api-gateway", "LLM Gateway", 80, 150), node("node-log", "ingestion", "Log Pipeline", 300, 150), node("node-es", "search-index", "Shared Log Index", 520, 150), node("node-redact", "app-server", "Redaction Filter", 300, 300)], edges: [edge("e1", "node-gw", "node-log", "Full bodies"), edge("e2", "node-log", "node-es", "Index all"), edge("e3", "node-redact", "node-log", "Bypassed")] },
  incident: { nodeIds: ["node-gw", "node-log"], edgeIds: ["e1"], headline: "Verbose gateway logging exposes sensitive prompt content" },
  agendaId: "incident.fix_observability",
});
reg("llm-gateway|deep.caching", {
  title: "Semantic Cache Returns Wrong Answer for Similar Prompt",
  minutes: 3,
  symptoms: "Support bot gives outdated policy answer; cache key fuzzy-matches distinct user questions.",
  interviewerSetup: "Gateway caches responses by embedding similarity threshold 0.85 without tenant or tool context in key.",
  diagram: { nodes: [node("node-client", "client", "Apps", 80, 150), node("node-gw", "api-gateway", "Gateway", 300, 150), node("node-cache", "cache", "Semantic Cache", 520, 150), node("node-llm", "model-serving", "LLM", 520, 300)], edges: [edge("e1", "node-client", "node-gw", "Query"), edge("e2", "node-gw", "node-cache", "Near-duplicate hit"), edge("e3", "node-gw", "node-llm", "Skipped call")] },
  incident: { nodeIds: ["node-cache", "node-gw"], edgeIds: ["e2"], headline: "Over-broad semantic cache keys serve incorrect stale answers" },
  agendaId: "incident.fix_caching",
});

// --- llm-inference-platform ---
reg("llm-inference-platform|deep.batching", {
  title: "Dynamic Batching Adds 4s Tail Latency for Chat",
  minutes: 4,
  symptoms: "Interactive chat P99 latency hits 4s while GPU utilization looks healthy at 85%.",
  interviewerSetup: "Scheduler waits up to 200ms to fill batches for throughput, applied to all request classes equally.",
  diagram: { nodes: [node("node-chat", "client", "Chat Apps", 80, 150), node("node-router", "app-server", "Request Router", 300, 150), node("node-gpu", "model-serving", "GPU Workers", 520, 150), node("node-batch", "stream-processor", "Batch Queue", 300, 300)], edges: [edge("e1", "node-chat", "node-router", "Interactive"), edge("e2", "node-router", "node-batch", "Wait fill"), edge("e3", "node-batch", "node-gpu", "Infer")] },
  incident: { nodeIds: ["node-batch", "node-router"], edgeIds: ["e2"], headline: "Batching wait policy penalizes latency-sensitive interactive traffic" },
  agendaId: "incident.fix_batching",
});
reg("llm-inference-platform|deep.isolation", {
  title: "Batch Backfill Saturates GPU Shared with Online",
  minutes: 4,
  symptoms: "Nightly embedding job colocated on same GPU pool spikes interactive latency 10x at 2am UTC globally.",
  interviewerSetup: "Batch and online share GPU pool without priority queues or separate autoscaling groups.",
  diagram: { nodes: [node("node-online", "client", "Online API", 80, 120), node("node-batch", "batch-job", "Batch Jobs", 80, 260), node("node-sched", "app-server", "GPU Scheduler", 320, 190), node("node-gpu", "model-serving", "GPU Pool", 520, 190)], edges: [edge("e1", "node-online", "node-sched", "Low latency"), edge("e2", "node-batch", "node-sched", "Fill GPU"), edge("e3", "node-sched", "node-gpu", "Shared queue")] },
  incident: { nodeIds: ["node-sched", "node-gpu"], edgeIds: ["e3"], headline: "Missing workload isolation lets batch jobs steal GPU from online" },
  agendaId: "incident.fix_isolation",
});
reg("llm-inference-platform|deep.adapters", {
  title: "30 LoRA Adapters Require 30 Full Model Loads",
  minutes: 3,
  symptoms: "GPU memory exhausted serving many fine-tunes; platform loads separate full weights per adapter.",
  interviewerSetup: "Each tenant adapter deployed as independent model replica instead of shared base with adapter swap.",
  diagram: { nodes: [node("node-router", "app-server", "Inference Router", 80, 150), node("node-gpu", "model-serving", "GPU Node", 300, 150), node("node-base", "model-serving", "Base Weights", 520, 80), node("node-adapters", "kv-store", "LoRA Adapters", 520, 220)], edges: [edge("e1", "node-router", "node-gpu", "Route tenant"), edge("e2", "node-gpu", "node-base", "Reload full"), edge("e3", "node-adapters", "node-gpu", "Unused swap")] },
  incident: { nodeIds: ["node-gpu", "node-base"], edgeIds: ["e2"], headline: "Per-adapter full model replicas exhaust GPU memory" },
  agendaId: "incident.fix_adapters",
});
reg("llm-inference-platform|deep.autoscaling", {
  title: "Traffic Spike Hits Before Cold GPU Fleet Ready",
  minutes: 4,
  symptoms: "Product launch causes 503s for 12 minutes while new GPU nodes load 70GB checkpoints sequentially.",
  interviewerSetup: "Autoscaler reacts to queue depth but model load takes 8 minutes; no pre-warmed pool or forecast scaling.",
  diagram: { nodes: [node("node-traffic", "client", "Clients", 80, 150), node("node-lb", "load-balancer", "Inference LB", 280, 150), node("node-pool", "model-serving", "GPU Pool", 480, 150), node("node-asg", "deployer", "Autoscaler", 480, 300)], edges: [edge("e1", "node-traffic", "node-lb", "Spike"), edge("e2", "node-asg", "node-pool", "Slow scale"), edge("e3", "node-lb", "node-pool", "503 overflow")] },
  incident: { nodeIds: ["node-asg", "node-pool"], edgeIds: ["e2"], headline: "Slow model load time makes reactive GPU autoscaling too late" },
  agendaId: "incident.fix_autoscaling",
});
reg("llm-inference-platform|deep.rollout", {
  title: "Canary Model Swap Regresses All Traffic Instantly",
  minutes: 3,
  symptoms: "New quantized model promoted to 100% traffic after 5-minute canary with no quality guardrails.",
  interviewerSetup: "Rollout controller promotes on schedule timer rather than error rate or eval score regression.",
  diagram: { nodes: [node("node-deploy", "deployer", "Rollout Controller", 80, 150), node("node-canary", "model-serving", "Canary Pool", 300, 80), node("node-prod", "model-serving", "Production Pool", 300, 220), node("node-mon", "monitoring-dashboard", "Quality Metrics", 520, 150)], edges: [edge("e1", "node-deploy", "node-canary", "5% traffic"), edge("e2", "node-deploy", "node-prod", "Instant 100%"), edge("e3", "node-mon", "node-deploy", "Ignored")] },
  incident: { nodeIds: ["node-deploy", "node-prod"], edgeIds: ["e2"], headline: "Timer-based promotion skips quality gates on model rollout" },
  agendaId: "incident.fix_rollout",
});

// --- log-analytics ---
reg("log-analytics|deep.bursts", {
  title: "Incident Log Storm Backpressures Ingest Pipeline",
  minutes: 4,
  symptoms: "During outage every service logs 50x errors; Kafka consumer lag hits 6 hours and search falls behind.",
  interviewerSetup: "Ingest tier sized for steady state with no burst buffering or dynamic partition expansion.",
  diagram: { nodes: [node("node-svc", "microservice", "Services", 80, 150), node("node-agent", "ingestion", "Log Agents", 300, 150), node("node-kafka", "t-kafka", "Log Kafka", 520, 150), node("node-index", "search-index", "Search Indexer", 520, 300)], edges: [edge("e1", "node-svc", "node-agent", "Error flood"), edge("e2", "node-agent", "node-kafka", "Produce"), edge("e3", "node-kafka", "node-index", "Lag growth")] },
  incident: { nodeIds: ["node-kafka", "node-index"], edgeIds: ["e3"], headline: "Incident log burst overwhelms ingest and indexing capacity" },
  agendaId: "incident.fix_bursts",
});
reg("log-analytics|deep.priority", {
  title: "Low-Priority Debug Logs Crowd Out Audit Trail",
  minutes: 3,
  symptoms: "Security audit logs dropped during spike while verbose debug logs from one team fill retention tier.",
  interviewerSetup: "No priority tiers or shedding policy; FIFO drop when indexer queue full.",
  diagram: { nodes: [node("node-debug", "microservice", "Debug Loggers", 80, 120), node("node-audit", "microservice", "Audit Logger", 80, 260), node("node-ingest", "ingestion", "Ingest Router", 320, 190), node("node-store", "search-index", "Log Store", 520, 190)], edges: [edge("e1", "node-debug", "node-ingest", "Verbose"), edge("e2", "node-audit", "node-ingest", "Critical"), edge("e3", "node-ingest", "node-store", "FIFO drop")] },
  incident: { nodeIds: ["node-ingest", "node-store"], edgeIds: ["e3"], headline: "Undifferentiated shedding drops critical audit logs first" },
  agendaId: "incident.fix_priority",
});
reg("log-analytics|deep.parse", {
  title: "Mixed JSON and Plain Logs Break Unified Search",
  minutes: 3,
  symptoms: "Half of microservices invisible to structured queries; parser drops malformed multiline stack traces.",
  interviewerSetup: "Ingest pipeline assumes single-line JSON; stack traces and plain text routed to dead letter without enrichment.",
  diagram: { nodes: [node("node-svc", "microservice", "Services", 80, 150), node("node-parser", "stream-processor", "Parse Pipeline", 300, 150), node("node-dlq", "dlq", "Parse DLQ", 300, 300), node("node-index", "search-index", "Search Index", 520, 150)], edges: [edge("e1", "node-svc", "node-parser", "Mixed formats"), edge("e2", "node-parser", "node-dlq", "Drop bad"), edge("e3", "node-parser", "node-index", "Partial index")] },
  incident: { nodeIds: ["node-parser", "node-dlq"], edgeIds: ["e2"], headline: "Rigid parsing drops multiline and plain-text logs from search" },
  agendaId: "incident.fix_parse",
});
reg("log-analytics|deep.mapping", {
  title: "Dynamic JSON Keys Explode Index Mapping",
  minutes: 4,
  symptoms: "Cluster health red after team logs random UUID field names; mapping count exceeds cluster limit.",
  interviewerSetup: "Dynamic mapping enabled; no schema guardrails or field name denylist at ingest.",
  diagram: { nodes: [node("node-team", "microservice", "New Service", 80, 150), node("node-ingest", "ingestion", "Ingest", 300, 150), node("node-es", "search-index", "Elasticsearch", 520, 150), node("node-guard", "rules-engine", "Schema Guard", 300, 300)], edges: [edge("e1", "node-team", "node-ingest", "Random keys"), edge("e2", "node-ingest", "node-es", "Dynamic map"), edge("e3", "node-guard", "node-ingest", "Disabled")] },
  incident: { nodeIds: ["node-es", "node-ingest"], edgeIds: ["e2"], headline: "Uncontrolled dynamic mapping causes index cardinality explosion" },
  agendaId: "incident.fix_mapping",
});
reg("log-analytics|deep.redact", {
  title: "Credit Card Numbers Indexed in Plain Text",
  minutes: 3,
  symptoms: "DLP audit finds PAN sequences searchable in production log index accessible to all engineers.",
  interviewerSetup: "Redaction regex runs only in UI layer; raw logs stored unmodified at ingest.",
  diagram: { nodes: [node("node-app", "microservice", "Payment Service", 80, 150), node("node-ingest", "ingestion", "Log Shipper", 300, 150), node("node-store", "search-index", "Log Index", 520, 150), node("node-redact", "app-server", "Redaction Processor", 300, 300)], edges: [edge("e1", "node-app", "node-ingest", "Log PAN"), edge("e2", "node-ingest", "node-store", "Store raw"), edge("e3", "node-redact", "node-ingest", "Not inline")] },
  incident: { nodeIds: ["node-ingest", "node-store"], edgeIds: ["e2"], headline: "Missing ingest-time redaction persists secrets in log index" },
  agendaId: "incident.fix_redact",
});

// --- metrics-platform ---
reg("metrics-platform|deep.cardinality", {
  title: "user_id Label Explodes TSDB Memory",
  minutes: 4,
  symptoms: "Metrics cluster OOM after deploy adds user_id label; active series jump from 2M to 180M.",
  interviewerSetup: "Prometheus accepts high-cardinality labels without enforcement or automatic series dropping.",
  diagram: { nodes: [node("node-svc", "microservice", "Services", 80, 150), node("node-agent", "ingestion", "Scrape Agents", 300, 150), node("node-tsdb", "time-series-db", "Metrics TSDB", 520, 150), node("node-guard", "rules-engine", "Cardinality Limiter", 300, 300)], edges: [edge("e1", "node-svc", "node-agent", "Expose metrics"), edge("e2", "node-agent", "node-tsdb", "Ingest all"), edge("e3", "node-guard", "node-tsdb", "Bypassed")] },
  incident: { nodeIds: ["node-tsdb", "node-agent"], edgeIds: ["e2"], headline: "High-cardinality labels exhaust metrics storage memory" },
  agendaId: "incident.fix_cardinality",
});
reg("metrics-platform|deep.retention", {
  title: "One-Year Retention on Raw Resolution Bankrupts Storage",
  minutes: 4,
  symptoms: "Metrics storage bill up 6x; SRE asked to keep 15s resolution for a year on all series.",
  interviewerSetup: "No downsampling or tiered retention; single long-retention bucket for all resolutions.",
  diagram: { nodes: [node("node-tsdb", "time-series-db", "Primary TSDB", 80, 150), node("node-compact", "batch-job", "Downsample Jobs", 300, 150), node("node-cold", "t-s3", "Cold Archive", 520, 150), node("node-query", "app-server", "Query API", 300, 300)], edges: [edge("e1", "node-tsdb", "node-query", "Long range"), edge("e2", "node-tsdb", "node-cold", "Raw forever"), edge("e3", "node-compact", "node-tsdb", "Not run")] },
  incident: { nodeIds: ["node-tsdb", "node-cold"], edgeIds: ["e2"], headline: "Missing downsampling tier makes year-long raw retention unsustainable" },
  agendaId: "incident.fix_retention",
});
reg("metrics-platform|deep.routing", {
  title: "Service A Alerts Page Wrong On-Call Team",
  minutes: 3,
  symptoms: "Database outage pages mobile team; alert routing rules stale after service ownership migration.",
  interviewerSetup: "Alertmanager routes by static label service name without synced ownership catalog.",
  diagram: { nodes: [node("node-alert", "alerting", "Alertmanager", 80, 150), node("node-rules", "rules-engine", "Routing Rules", 300, 150), node("node-pager", "notification-service", "Pager", 520, 150), node("node-catalog", "registry", "Ownership Catalog", 300, 300)], edges: [edge("e1", "node-alert", "node-rules", "Route alert"), edge("e2", "node-rules", "node-pager", "Wrong team"), edge("e3", "node-catalog", "node-rules", "Out of sync")] },
  incident: { nodeIds: ["node-rules", "node-catalog"], edgeIds: ["e2"], headline: "Stale alert routing sends incidents to incorrect on-call rotation" },
  agendaId: "incident.fix_routing",
});
reg("metrics-platform|deep.bursts", {
  title: "Restart Storm Dropped Metrics Samples",
  minutes: 4,
  symptoms: "Mass pod restart emits metric burst; remote write drops 30% samples and SLO dashboards go blank.",
  interviewerSetup: "Remote write buffer fixed size with drop-on-full during spikes without backoff or aggregation.",
  diagram: { nodes: [node("node-k8s", "microservice", "Pod Fleet", 80, 150), node("node-agent", "ingestion", "Metric Agents", 300, 150), node("node-buffer", "queue", "Remote Write Buffer", 520, 150), node("node-tsdb", "time-series-db", "Central TSDB", 520, 300)], edges: [edge("e1", "node-k8s", "node-agent", "Burst emit"), edge("e2", "node-agent", "node-buffer", "Overflow"), edge("e3", "node-buffer", "node-tsdb", "Drop samples")] },
  incident: { nodeIds: ["node-buffer", "node-agent"], edgeIds: ["e3"], headline: "Fixed ingest buffers drop samples during legitimate metric bursts" },
  agendaId: "incident.fix_bursts",
});
reg("metrics-platform|deep.flapping", {
  title: "CPU Alert Pages Every Two Minutes",
  minutes: 3,
  symptoms: "On-call flooded with resolve/reopen cycles on noisy CPU alert during batch cron overlap.",
  interviewerSetup: "Alert fires on single 1-minute spike without hysteresis, grouping, or multi-window burn rate.",
  diagram: { nodes: [node("node-svc", "microservice", "API Service", 80, 150), node("node-tsdb", "time-series-db", "Metrics", 300, 150), node("node-alert", "alerting", "Alert Rules", 520, 150), node("node-pager", "notification-service", "Pager", 520, 300)], edges: [edge("e1", "node-svc", "node-tsdb", "CPU spikes"), edge("e2", "node-tsdb", "node-alert", "Evaluate"), edge("e3", "node-alert", "node-pager", "Flap notify")] },
  incident: { nodeIds: ["node-alert"], edgeIds: ["e3"], headline: "Sensitive threshold alerts without dampening cause fatigue flapping" },
  agendaId: "incident.fix_flapping",
});

// --- micro-frontend-platform ---
reg("micro-frontend-platform|deep.composition", {
  title: "Runtime Script Tag Order Breaks Shared Shell",
  minutes: 3,
  symptoms: "Checkout micro-frontend loads before shell router; white screen on 20% of page loads due to race.",
  interviewerSetup: "Teams inject bundles via unordered async script tags without module federation manifest orchestration.",
  diagram: { nodes: [node("node-shell", "app-server", "Shell App", 80, 150), node("node-mfe-a", "client", "Team A MFE", 300, 80), node("node-mfe-b", "client", "Team B MFE", 300, 220), node("node-cdn", "cdn", "Bundle CDN", 520, 150)], edges: [edge("e1", "node-shell", "node-mfe-a", "Async script"), edge("e2", "node-shell", "node-mfe-b", "Async script"), edge("e3", "node-cdn", "node-mfe-a", "Serve JS")] },
  incident: { nodeIds: ["node-shell", "node-mfe-a"], edgeIds: ["e1"], headline: "Unorchestrated script loading races break shell composition" },
  agendaId: "incident.fix_composition",
});
reg("micro-frontend-platform|deep.dependencies", {
  title: "Users Download React Four Times on One Page",
  minutes: 3,
  symptoms: "Lighthouse shows 1.2MB duplicate React bundles from four micro-frontends on dashboard.",
  interviewerSetup: "Each MFE bundles its own React version; shared dependency config not enforced in build pipeline.",
  diagram: { nodes: [node("node-user", "user", "Browser", 80, 150), node("node-shell", "app-server", "Shell", 280, 150), node("node-mfe1", "client", "MFE 1", 480, 80), node("node-mfe2", "client", "MFE 2", 480, 220)], edges: [edge("e1", "node-user", "node-shell", "Load shell"), edge("e2", "node-shell", "node-mfe1", "React 18"), edge("e3", "node-shell", "node-mfe2", "React 17")] },
  incident: { nodeIds: ["node-mfe1", "node-mfe2"], edgeIds: ["e2", "e3"], headline: "Duplicate shared library bundles inflate page weight" },
  agendaId: "incident.fix_dependencies",
});
reg("micro-frontend-platform|deep.isolation", {
  title: "Team A Exception Crashes Entire Shell",
  minutes: 3,
  symptoms: "Uncaught TypeError in recommendations widget takes down navigation and payments MFEs.",
  interviewerSetup: "All micro-frontends share same JS realm without error boundaries or iframe sandbox isolation.",
  diagram: { nodes: [node("node-shell", "app-server", "App Shell", 80, 150), node("node-mfe-bug", "client", "Buggy MFE", 300, 80), node("node-mfe-ok", "client", "Healthy MFE", 300, 220), node("node-user", "user", "User Browser", 520, 150)], edges: [edge("e1", "node-user", "node-shell", "Single page"), edge("e2", "node-shell", "node-mfe-bug", "Throw error"), edge("e3", "node-shell", "node-mfe-ok", "Unmount cascade")] },
  incident: { nodeIds: ["node-mfe-bug", "node-shell"], edgeIds: ["e2"], headline: "Missing fault isolation lets one MFE crash entire application shell" },
  agendaId: "incident.fix_isolation",
});
reg("micro-frontend-platform|deep.communication", {
  title: "Global Window Events Break Cross-Team Contracts",
  minutes: 3,
  symptoms: "Cart MFE listens to ad-hoc window events; refactor in checkout team breaks cart count silently.",
  interviewerSetup: "Cross-MFE communication uses undocumented global CustomEvents instead of versioned event bus.",
  diagram: { nodes: [node("node-cart", "client", "Cart MFE", 80, 150), node("node-checkout", "client", "Checkout MFE", 300, 150), node("node-bus", "event-bus", "Shared Event Bus", 520, 150), node("node-shell", "app-server", "Shell", 300, 300)], edges: [edge("e1", "node-checkout", "node-cart", "window.dispatch"), edge("e2", "node-cart", "node-bus", "Not connected"), edge("e3", "node-shell", "node-bus", "Unused contract")] },
  incident: { nodeIds: ["node-cart", "node-checkout"], edgeIds: ["e1"], headline: "Ad-hoc global events create fragile cross-MFE coupling" },
  agendaId: "incident.fix_communication",
});
reg("micro-frontend-platform|deep.deployment", {
  title: "Stale Manifest Serves Old MFE After Deploy",
  minutes: 3,
  symptoms: "Team ships fix but users still hit broken bundle for 30 minutes; CDN and manifest cache not invalidated together.",
  interviewerSetup: "Shell fetches manifest cached 24h at edge while MFE bundle URL version not tied to manifest epoch.",
  diagram: { nodes: [node("node-ci", "deployer", "Team CI", 80, 150), node("node-registry", "registry", "MFE Manifest", 300, 150), node("node-cdn", "cdn", "CDN Edge", 520, 150), node("node-shell", "app-server", "Shell", 300, 300)], edges: [edge("e1", "node-ci", "node-registry", "Publish version"), edge("e2", "node-shell", "node-registry", "Cached manifest"), edge("e3", "node-cdn", "node-shell", "Old bundle URL")] },
  incident: { nodeIds: ["node-registry", "node-cdn"], edgeIds: ["e2", "e3"], headline: "Manifest and asset cache skew delays MFE deploy visibility" },
  agendaId: "incident.fix_deployment",
});

// --- mobile-release-flags ---
reg("mobile-release-flags|deep.eval_location", {
  title: "Server Flag Evaluation Adds 800ms to Cold Start",
  minutes: 3,
  symptoms: "App launch regression after moving all flag evaluation to blocking server round-trip on startup.",
  interviewerSetup: "Mobile client awaits flags API before rendering home screen; no local cache or bootstrap defaults.",
  diagram: { nodes: [node("node-app", "mobile", "Mobile App", 80, 150), node("node-flags", "app-server", "Flags API", 300, 150), node("node-cache", "cache", "Local Flag Cache", 300, 300), node("node-config", "config", "Flag Config", 520, 150)], edges: [edge("e1", "node-app", "node-flags", "Blocking fetch"), edge("e2", "node-flags", "node-config", "Evaluate rules"), edge("e3", "node-app", "node-cache", "Empty on cold start")] },
  incident: { nodeIds: ["node-app", "node-flags"], edgeIds: ["e1"], headline: "Server-only flag evaluation blocks app render on slow networks" },
  agendaId: "incident.fix_eval_location",
});
reg("mobile-release-flags|deep.offline_defaults", {
  title: "First Launch in Airplane Mode Uses Wrong Defaults",
  minutes: 3,
  symptoms: "New installs on flights see experimental checkout enabled; no bundled default flag snapshot.",
  interviewerSetup: "Client has no embedded safe defaults when flag service unreachable on first open.",
  diagram: { nodes: [node("node-app", "mobile", "Mobile App", 80, 150), node("node-flags", "app-server", "Flag Service", 300, 150), node("node-bundle", "config", "Bundled Defaults", 300, 300), node("node-user", "user", "New User", 520, 150)], edges: [edge("e1", "node-user", "node-app", "First open offline"), edge("e2", "node-app", "node-flags", "Timeout"), edge("e3", "node-bundle", "node-app", "Not loaded")] },
  incident: { nodeIds: ["node-app", "node-bundle"], edgeIds: ["e3"], headline: "Missing offline defaults enable risky features on first launch" },
  agendaId: "incident.fix_offline_defaults",
});
reg("mobile-release-flags|deep.kill_switch", {
  title: "Android 12 Crash Feature Still Enabled After Kill Switch",
  minutes: 3,
  symptoms: "Kill switch toggled off bad feature globally but Android 12 clients keep crashing until app update.",
  interviewerSetup: "Kill switch only checked on cold start; clients cache enabled state in memory for session.",
  diagram: { nodes: [node("node-app", "mobile", "Android Client", 80, 150), node("node-flags", "app-server", "Flag Service", 300, 150), node("node-push", "notification-service", "Realtime Push", 520, 150), node("node-crash", "mobile", "Crashy Feature", 300, 300)], edges: [edge("e1", "node-app", "node-flags", "Fetch once"), edge("e2", "node-flags", "node-push", "Kill broadcast"), edge("e3", "node-app", "node-crash", "Still active")] },
  incident: { nodeIds: ["node-app", "node-push"], edgeIds: ["e2"], headline: "Session-cached flags ignore emergency kill switch updates" },
  agendaId: "incident.fix_kill_switch",
});
reg("mobile-release-flags|deep.exposure", {
  title: "A/B Test Missing Exposure Events Skews Results",
  minutes: 3,
  symptoms: "Experiment shows null effect; analytics pipeline logs conversions but not flag exposure impressions.",
  interviewerSetup: "Client applies variant UI but never emits exposure event tied to experiment_id.",
  diagram: { nodes: [node("node-app", "mobile", "Mobile App", 80, 150), node("node-flags", "app-server", "Flag SDK", 300, 150), node("node-events", "ingestion", "Analytics Pipeline", 520, 150), node("node-wh", "warehouse", "Experiment Analysis", 520, 300)], edges: [edge("e1", "node-app", "node-flags", "Assign variant"), edge("e2", "node-app", "node-events", "Conversion only"), edge("e3", "node-events", "node-wh", "Biased join")] },
  incident: { nodeIds: ["node-app", "node-events"], edgeIds: ["e2"], headline: "Missing exposure logging invalidates mobile A/B experiment analysis" },
  agendaId: "incident.fix_exposure",
});
reg("mobile-release-flags|deep.cleanup", {
  title: "Flag Payload Bloat Slows Every App Launch",
  minutes: 3,
  symptoms: "Flags config download grows to 400KB; startup latency rises as hundreds of stale flags ship to clients.",
  interviewerSetup: "No archival process; retired flags remain in config bundle sent to all app versions.",
  diagram: { nodes: [node("node-app", "mobile", "Mobile Clients", 80, 150), node("node-cdn", "cdn", "Config CDN", 300, 150), node("node-flags", "config", "Flag Registry", 520, 150), node("node-gc", "batch-job", "Flag Cleanup Job", 300, 300)], edges: [edge("e1", "node-app", "node-cdn", "Download config"), edge("e2", "node-cdn", "node-flags", "Full history"), edge("e3", "node-gc", "node-flags", "Never runs")] },
  incident: { nodeIds: ["node-flags", "node-cdn"], edgeIds: ["e2"], headline: "Accumulated stale flags inflate client config payload" },
  agendaId: "incident.fix_cleanup",
});


function miniFromAgenda(item, agendaId, referenceFix) {
  return {
    agenda: [{
      id: agendaId,
      stage: "incident",
      dimension: item.dimension,
      weight: 3,
      required: true,
      goal: item.goal,
      opener: item.opener,
      evidence: item.evidence,
      misconceptions: (item.misconceptions ?? []).slice(0, 3),
      probes: item.probes.slice(0, 3),
      hints: item.hints.slice(0, 2),
      referenceFix,
    }],
    pacing: { incident: 0.85, wrap_up: 0.15 },
  };
}

function buildNugget(promptId, item, spec) {
  const nuggetId = `${promptId}/${item.id.replace(/\./g, "-")}`;
  const referenceFix = item.moveOnSummary || spec.referenceFix || item.goal;
  return {
    id: nuggetId,
    title: spec.title,
    minutes: spec.minutes,
    parentAgendaItemId: item.id,
    scenario: { symptoms: spec.symptoms, interviewerSetup: spec.interviewerSetup },
    diagram: { ...spec.diagram, viewport },
    incident: spec.incident,
    miniPack: miniFromAgenda(item, spec.agendaId ?? "incident.fix", referenceFix),
    status: "published",
    source: "cursor",
  };
}

const written = [];
for (const promptId of PROMPT_IDS) {
  const existingPath = path.join(nuggetDir, `${promptId}.json`);
  const existing = JSON.parse(readFileSync(existingPath, "utf8"));
  const packRaw = JSON.parse(readFileSync(path.join(packDir, `${promptId}.json`), "utf8"));
  const pack = finishPack(packRaw, {
    promptId,
    inputsFingerprint: existing.inputsFingerprint,
    builder: "manual",
  });
  const deepItems = pack.agenda.filter((i) => i.stage === "deep_dive").slice(0, 5);
  const nuggets = deepItems.map((item) => {
    const key = `${promptId}|${item.id}`;
    const spec = INCIDENTS[key];
    if (!spec) throw new Error(`Missing incident spec for ${key}`);
    return buildNugget(promptId, item, spec);
  });
  const file = {
    promptId,
    packVersion: existing.packVersion ?? pack.version,
    inputsFingerprint: existing.inputsFingerprint,
    nuggets,
  };
  writeFileSync(existingPath, `${JSON.stringify(file, null, 2)}\n`);
  written.push(`${promptId}.json`);
}

console.log("Wrote:", written.join(", "));
