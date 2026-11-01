#!/usr/bin/env node
/** Writes cursor nuggets for the 15 scaffold prompt batch. Run: node scripts/cursor-nuggets-15.mjs */
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { finishPack } from "../server/modules/pks/schema.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const nuggetDir = path.join(root, "server", "content", "nuggets");
const packDir = path.join(root, "server", "content", "packs");

const PROMPT_IDS = [
  "search-ranking", "secrets-platform", "service-discovery", "service-platform", "support-ai-agent",
  "task-scheduler", "text-to-image", "ticket-booking", "training-platform", "unique-id-generator",
  "video-recommendations", "video-streaming", "visual-search", "voice-ai-agent", "web-crawler",
];

const viewport = { x: 0, y: 0, zoom: 0.85 };
function node(id, kind, label, x, y) {
  return { id, type: "systemNode", position: { x, y }, data: { kind, label } };
}
function edge(id, source, target, label) {
  return label ? { id, source, target, label } : { id, source, target };
}
const INCIDENTS = {};
function reg(key, spec) {
  INCIDENTS[key] = spec;
}

// --- search-ranking ---
reg("search-ranking|deep.labels", {
  title: "Ranker Learns Position Bias After Click-Only Retrain",
  minutes: 3,
  symptoms: "Search CTR rises 8% but add-to-cart per search falls 5%. Offline NDCG looks flat while top slots show irrelevant sponsored-looking results.",
  interviewerSetup: "The new ranker trained on raw click labels without position features or debiasing; slot-one items always win clicks regardless of relevance.",
  diagram: { nodes: [node("n-clicks", "clickstream", "Click Logs", 60, 140), node("n-train", "batch-job", "LTR Trainer", 280, 140), node("n-rank", "search-service", "Search Ranker", 500, 140), node("n-raters", "labeling", "Human Grades", 280, 280)], edges: [edge("e1", "n-clicks", "n-train", "Raw clicks"), edge("e2", "n-train", "n-rank", "Deploy model"), edge("e3", "n-raters", "n-train", "Unused for training")] },
  incident: { nodeIds: ["n-train", "n-clicks"], edgeIds: ["e1"], headline: "Click-only labels teach the ranker to prefer top positions over relevance" },
  agendaId: "incident.fix_labels",
});
reg("search-ranking|deep.query", {
  title: "Typo Queries Return Zero Results After Parser Deploy",
  minutes: 3,
  symptoms: "Zero-result rate jumps from 2% to 11% for head queries containing typos like 'runing shoes'. Spell correction service shows healthy uptime.",
  interviewerSetup: "Query understanding extracts strict brand filters before spell correction runs, so misspelled tokens never match the catalog index.",
  diagram: { nodes: [node("n-user", "user", "Shopper", 60, 140), node("n-qu", "search-service", "Query Understanding", 280, 140), node("n-index", "shard", "Product Index", 500, 140), node("n-spell", "service", "Spell Service", 280, 280)], edges: [edge("e1", "n-user", "n-qu", "Search query"), edge("e2", "n-qu", "n-index", "Strict filters"), edge("e3", "n-spell", "n-qu", "Not invoked")] },
  incident: { nodeIds: ["n-qu", "n-spell"], edgeIds: ["e2"], headline: "Attribute extraction before normalization blocks typo queries from retrieving" },
  agendaId: "incident.fix_query",
});
reg("search-ranking|deep.serving", {
  title: "One Slow Shard Sets P99 Search Latency to 2.4s",
  minutes: 4,
  symptoms: "During peak, search P99 exceeds 2s SLO while P50 stays 120ms. One shard replica shows 95% CPU and timeouts in scatter-gather traces.",
  interviewerSetup: "Scatter-gather waits for all shards with no per-shard timeout; a hot partition overloads a single replica while head-query cache misses spike.",
  diagram: { nodes: [node("n-gw", "load-balancer", "Search Gateway", 60, 140), node("n-s1", "shard", "Shard A", 280, 80), node("n-s2", "shard", "Shard B (hot)", 280, 200), node("n-cache", "cache", "Head Query Cache", 500, 140)], edges: [edge("e1", "n-gw", "n-s1", "Scatter"), edge("e2", "n-gw", "n-s2", "Slow shard"), edge("e3", "n-gw", "n-cache", "Cache miss")] },
  incident: { nodeIds: ["n-gw", "n-s2"], edgeIds: ["e2"], headline: "Scatter-gather blocked by one overloaded shard without timeout or fallback" },
  agendaId: "incident.fix_serving",
});
reg("search-ranking|deep.eval", {
  title: "Average NDCG Hides Tail Query Regression",
  minutes: 3,
  symptoms: "Launch review shows +0.4% average NDCG gain but revenue per search drops on long-tail queries; reformulation rate up 12% on torso segment.",
  interviewerSetup: "Offline eval averaged all queries; the new ranker improved head queries while hurting rare intents with no segment guardrails in the A/B test.",
  diagram: { nodes: [node("n-off", "evaluation", "Offline Eval", 60, 140), node("n-ab", "experiment", "A/B Test", 280, 140), node("n-dash", "monitoring-dashboard", "Search Metrics", 500, 140), node("n-seg", "warehouse", "Query Segments", 280, 280)], edges: [edge("e1", "n-off", "n-ab", "Ship decision"), edge("e2", "n-ab", "n-dash", "Aggregate only"), edge("e3", "n-seg", "n-dash", "Not monitored")] },
  incident: { nodeIds: ["n-off", "n-dash"], edgeIds: ["e2"], headline: "Single average metric masked tail-query quality loss after ranker launch" },
  agendaId: "incident.fix_eval",
});
reg("search-ranking|deep.coldstart", {
  title: "New Listings Invisible in Search for First Week",
  minutes: 3,
  symptoms: "Merchants report zero impressions for SKUs listed yesterday despite in-stock inventory. Behaviour features default to zero and bury new products.",
  interviewerSetup: "Ranking relies on click counts with no content embeddings or category priors; new products cannot accumulate engagement without exposure.",
  diagram: { nodes: [node("n-prod", "catalog", "New SKU", 60, 140), node("n-feats", "feature-store", "Behaviour Features", 280, 140), node("n-rank", "search-service", "Ranker", 500, 140), node("n-emb", "embedding", "Content Vectors", 280, 280)], edges: [edge("e1", "n-prod", "n-feats", "Zero clicks"), edge("e2", "n-feats", "n-rank", "Low score"), edge("e3", "n-emb", "n-rank", "Not wired")] },
  incident: { nodeIds: ["n-feats", "n-rank"], edgeIds: ["e2"], headline: "Cold-start products starved without content features or exploration boost" },
  agendaId: "incident.fix_coldstart",
});

// --- secrets-platform ---
reg("secrets-platform|deep.identity", {
  title: "Compromised Pod Assumes Production DB Role",
  minutes: 4,
  symptoms: "Audit finds staging workload fetched production database credentials. IAM policy allowed any service account in the namespace to read all paths.",
  interviewerSetup: "Secrets platform maps Kubernetes SA to vault role with overly broad path prefix; no workload identity attestation per environment.",
  diagram: { nodes: [node("n-pod", "service", "Staging Pod", 60, 140), node("n-vault", "secrets-manager", "Secrets Vault", 280, 140), node("n-iam", "auth", "Policy Engine", 500, 140), node("n-db", "database", "Prod DB Secret", 280, 280)], edges: [edge("e1", "n-pod", "n-vault", "Fetch secret"), edge("e2", "n-vault", "n-iam", "Evaluate policy"), edge("e3", "n-vault", "n-db", "Wrong path allowed")] },
  incident: { nodeIds: ["n-iam", "n-vault"], edgeIds: ["e2"], headline: "Over-broad workload identity policy leaked production credentials to staging" },
  agendaId: "incident.fix_identity",
});
reg("secrets-platform|deep.rotation", {
  title: "DB Password Rotation Drops Active Connections",
  minutes: 4,
  symptoms: "During scheduled rotation, checkout error rate hits 40% for three minutes until apps restart. Old password invalidated before all clients picked up the new one.",
  interviewerSetup: "Rotation replaces secret atomically with no overlap window; connection pools cache old password until process restart.",
  diagram: { nodes: [node("n-vault", "secrets-manager", "Secrets Vault", 60, 140), node("n-apps", "service", "App Fleet", 280, 140), node("n-db", "database", "Database", 500, 140), node("n-agent", "sidecar", "Rotation Agent", 280, 280)], edges: [edge("e1", "n-vault", "n-apps", "Single-version push"), edge("e2", "n-apps", "n-db", "Auth failures"), edge("e3", "n-agent", "n-apps", "No hot reload")] },
  incident: { nodeIds: ["n-vault", "n-apps"], edgeIds: ["e1", "e2"], headline: "Non-overlapping rotation broke in-flight connections using cached credentials" },
  agendaId: "incident.fix_rotation",
});
reg("secrets-platform|deep.caching", {
  title: "Vault Outage Cascades When Client Cache Disabled",
  minutes: 3,
  symptoms: "Brief vault control-plane blip causes global 503s; every pod hammered vault on each request with cache TTL set to zero for freshness.",
  interviewerSetup: "Teams disabled sidecar cache fearing stale secrets; no graceful degradation or last-known-good fallback.",
  diagram: { nodes: [node("n-pod", "service", "Microservices", 60, 140), node("n-sidecar", "sidecar", "Secret Sidecar", 280, 140), node("n-vault", "secrets-manager", "Vault Cluster", 500, 140), node("n-cache", "cache", "Local Secret Cache", 280, 280)], edges: [edge("e1", "n-pod", "n-sidecar", "Every request"), edge("e2", "n-sidecar", "n-vault", "Hard dependency"), edge("e3", "n-cache", "n-sidecar", "Bypassed")] },
  incident: { nodeIds: ["n-sidecar", "n-vault"], edgeIds: ["e2"], headline: "Missing client-side cache amplified vault outage into fleet-wide failures" },
  agendaId: "incident.fix_caching",
});
reg("secrets-platform|deep.revocation", {
  title: "Revoked API Key Still Accepted for 20 Minutes",
  minutes: 3,
  symptoms: "Security revokes leaked partner API key but edge gateways keep honoring it until sidecar cache TTL expires.",
  interviewerSetup: "Revocation updates vault immediately but clients only refresh on TTL with no push invalidation channel.",
  diagram: { nodes: [node("n-sec", "user", "Security Ops", 60, 140), node("n-vault", "secrets-manager", "Vault", 280, 140), node("n-gw", "api-gateway", "API Gateway", 500, 140), node("n-cache", "cache", "Gateway Cache", 500, 280)], edges: [edge("e1", "n-sec", "n-vault", "Revoke key"), edge("e2", "n-vault", "n-gw", "Stale read"), edge("e3", "n-gw", "n-cache", "20m TTL")] },
  incident: { nodeIds: ["n-gw", "n-cache"], edgeIds: ["e3"], headline: "Cached secrets ignored emergency revocation until TTL expiry" },
  agendaId: "incident.fix_revocation",
});
reg("secrets-platform|deep.audit", {
  title: "Secret Access Missing From Compliance Export",
  minutes: 3,
  symptoms: "SOC audit cannot prove who read payment keys during incident; audit stream dropped 6 hours of access logs during broker failover.",
  interviewerSetup: "Audit events written to best-effort Kafka topic with no durable WAL; consumers lagged and truncated under disk pressure.",
  diagram: { nodes: [node("n-vault", "secrets-manager", "Vault", 60, 140), node("n-kafka", "t-kafka", "Audit Topic", 280, 140), node("n-siem", "warehouse", "SIEM Store", 500, 140), node("n-wal", "database", "Immutable WAL", 280, 280)], edges: [edge("e1", "n-vault", "n-kafka", "Access events"), edge("e2", "n-kafka", "n-siem", "Gap on failover"), edge("e3", "n-wal", "n-vault", "Not used")] },
  incident: { nodeIds: ["n-kafka", "n-siem"], edgeIds: ["e2"], headline: "Non-durable audit pipeline lost secret access evidence during outage" },
  agendaId: "incident.fix_audit",
});

// --- service-discovery ---
reg("service-discovery|deep.caching", {
  title: "Registry Outage Blackholes All Client Traffic",
  minutes: 3,
  symptoms: "Five-minute registry outage drops success rate to 0% despite healthy backends. Clients refuse last-known endpoints when watch stream dies.",
  interviewerSetup: "Discovery client clears cache on disconnect instead of serving stale endpoints with health checks.",
  diagram: { nodes: [node("n-client", "service", "Service Clients", 60, 140), node("n-sd", "registry", "Registry", 280, 140), node("n-be", "web-server", "Healthy Backends", 500, 140), node("n-cache", "cache", "Endpoint Cache", 280, 280)], edges: [edge("e1", "n-client", "n-sd", "Watch failed"), edge("e2", "n-client", "n-be", "No routes"), edge("e3", "n-cache", "n-client", "Cleared")] },
  incident: { nodeIds: ["n-client", "n-cache"], edgeIds: ["e3"], headline: "Aggressive cache flush on registry blip removed all routable endpoints" },
  agendaId: "incident.fix_caching",
});
reg("service-discovery|deep.state_store", {
  title: "Split Brain Registers Duplicate Primary Endpoints",
  minutes: 4,
  symptoms: "Two payment pods both receive write traffic; reconciliation finds double charges. Registry quorum lost during network partition.",
  interviewerSetup: "Registry backed by non-consensus store; split leaders accepted conflicting registrations without fencing.",
  diagram: { nodes: [node("n-reg-a", "registry", "Registry Leader A", 60, 120), node("n-reg-b", "registry", "Registry Leader B", 60, 220), node("n-pay1", "service", "Payment Pod 1", 300, 120), node("n-pay2", "service", "Payment Pod 2", 300, 220)], edges: [edge("e1", "n-reg-a", "n-pay1", "Register primary"), edge("e2", "n-reg-b", "n-pay2", "Register primary"), edge("e3", "n-pay1", "n-pay2", "Split writes")] },
  incident: { nodeIds: ["n-reg-a", "n-reg-b"], edgeIds: ["e1", "e2"], headline: "Registry split brain published conflicting primary endpoints" },
  agendaId: "incident.fix_state_store",
});
reg("service-discovery|deep.propagation", {
  title: "Rolling Deploy DDoS Registry With Poll Storm",
  minutes: 3,
  symptoms: "Large deploy triggers 50k rps on registry API; watch API disabled so every client polls full service list every second.",
  interviewerSetup: "Propagation uses long-poll fallback without jitter; fleet restart synchronized poll interval.",
  diagram: { nodes: [node("n-clients", "service", "10k Clients", 60, 140), node("n-reg", "registry", "Registry", 280, 140), node("n-watch", "stream", "Watch Stream", 500, 80), node("n-poll", "load-balancer", "Poll Loop", 500, 200)], edges: [edge("e1", "n-clients", "n-poll", "1s poll"), edge("e2", "n-poll", "n-reg", "Overload"), edge("e3", "n-watch", "n-clients", "Unused")] },
  incident: { nodeIds: ["n-reg", "n-poll"], edgeIds: ["e2"], headline: "Synchronized polling overwhelmed registry during mass client restart" },
  agendaId: "incident.fix_propagation",
});
reg("service-discovery|deep.outlier_detection", {
  title: "Flapping Instance Stays in Rotation Until Heartbeat Timeout",
  minutes: 3,
  symptoms: "Users see intermittent 500s for 90s after pod starts failing health checks; registry removes instance only after 3 missed heartbeats.",
  interviewerSetup: "Clients rely solely on registry TTL; no passive outlier detection on error rate or latency.",
  diagram: { nodes: [node("n-client", "service", "Calling Service", 60, 140), node("n-reg", "registry", "Registry", 280, 140), node("n-bad", "web-server", "Failing Instance", 500, 140), node("n-out", "monitoring-dashboard", "Outlier Detector", 280, 280)], edges: [edge("e1", "n-client", "n-bad", "Retries"), edge("e2", "n-reg", "n-bad", "Slow deregister"), edge("e3", "n-out", "n-client", "Not wired")] },
  incident: { nodeIds: ["n-client", "n-bad"], edgeIds: ["e1"], headline: "Heartbeat-only discovery kept routing to already-failing instances" },
  agendaId: "incident.fix_outlier",
});
reg("service-discovery|deep.dns_integration", {
  title: "Stale SRV Records Route Traffic to Drained Nodes",
  minutes: 3,
  symptoms: "After scale-down, 15% requests still hit terminated VMs for up to TTL minutes. Ops relied on DNS SRV with 300s cache at resolvers.",
  interviewerSetup: "DNS facade publishes SRV records but TTL and resolver caching exceed acceptable drain window.",
  diagram: { nodes: [node("n-reg", "registry", "Registry", 60, 140), node("n-dns", "dns", "DNS Facade", 280, 140), node("n-res", "cache", "Resolver Cache", 500, 140), node("n-dead", "web-server", "Drained Node", 500, 280)], edges: [edge("e1", "n-reg", "n-dns", "Update SRV"), edge("e2", "n-dns", "n-res", "TTL 300s"), edge("e3", "n-res", "n-dead", "Stale route")] },
  incident: { nodeIds: ["n-dns", "n-res"], edgeIds: ["e2", "e3"], headline: "Long DNS TTL cached endpoints after instances were drained" },
  agendaId: "incident.fix_dns",
});

// --- service-platform ---
reg("service-platform|deep.templates", {
  title: "Template Fix Never Reaches 200 Legacy Services",
  minutes: 3,
  symptoms: "Platform ships secure base image patch but only new services pick it up; legacy stacks still run vulnerable sidecar from 2022 template fork.",
  interviewerSetup: "Each team copied template repo once; no automated reconciliation or version pin propagation.",
  diagram: { nodes: [node("n-plat", "deployer", "Platform Templates", 60, 140), node("n-new", "service", "New Services", 280, 80), node("n-old", "service", "Legacy Forks", 280, 200), node("n-ci", "batch-job", "Reconcile Job", 500, 140)], edges: [edge("e1", "n-plat", "n-new", "Scaffold"), edge("e2", "n-old", "n-plat", "No sync"), edge("e3", "n-ci", "n-old", "Never scheduled")] },
  incident: { nodeIds: ["n-old", "n-plat"], edgeIds: ["e2"], headline: "Forked service templates missed platform-wide security updates" },
  agendaId: "incident.fix_templates",
});
reg("service-platform|deep.escape_hatches", {
  title: "Unsupported Custom Ingress Bypasses WAF",
  minutes: 3,
  symptoms: "Team uses escape hatch to mount custom nginx config; production traffic skips corporate WAF and fails pen test.",
  interviewerSetup: "Escape hatch allowed raw manifest overlay without guardrails on required security annotations.",
  diagram: { nodes: [node("n-team", "user", "Product Team", 60, 140), node("n-idp", "app-server", "Internal Dev Portal", 280, 140), node("n-k8s", "service", "Workload", 500, 140), node("n-waf", "api-gateway", "Required WAF", 280, 280)], edges: [edge("e1", "n-team", "n-idp", "Custom overlay"), edge("e2", "n-idp", "n-k8s", "Deploy"), edge("e3", "n-waf", "n-k8s", "Bypassed")] },
  incident: { nodeIds: ["n-idp", "n-k8s"], edgeIds: ["e1"], headline: "Unconstrained escape hatch deployed ingress outside platform guardrails" },
  agendaId: "incident.fix_escape",
});
reg("service-platform|deep.guardrails", {
  title: "Public S3 Bucket Slips Past Manual Review",
  minutes: 3,
  symptoms: "Customer data bucket exposed publicly for 6 hours; change merged without policy check because guardrail ran only on main branch.",
  interviewerSetup: "Policy-as-code scanner skipped feature branches; terraform apply from branch bypassed OPA.",
  diagram: { nodes: [node("n-dev", "user", "Developer", 60, 140), node("n-pr", "deployer", "CI Pipeline", 280, 140), node("n-opa", "auth", "Policy Engine", 500, 80), node("n-aws", "object-storage", "S3 Bucket", 500, 200)], edges: [edge("e1", "n-dev", "n-pr", "Branch apply"), edge("e2", "n-pr", "n-aws", "Public ACL"), edge("e3", "n-opa", "n-pr", "Skipped")] },
  incident: { nodeIds: ["n-pr", "n-opa"], edgeIds: ["e3"], headline: "Policy guardrails not enforced on all deploy paths allowed public storage" },
  agendaId: "incident.fix_guardrails",
});
reg("service-platform|deep.iac", {
  title: "Manual Console Change Reverts on Next Terraform Apply",
  minutes: 3,
  symptoms: "On-call scales DB manually during incident; next nightly apply drops capacity and recreates outage. Drift not detected before apply.",
  interviewerSetup: "Terraform state per service but no drift detection job; apply always authoritative.",
  diagram: { nodes: [node("n-tf", "deployer", "Terraform Apply", 60, 140), node("n-state", "database", "Remote State", 280, 140), node("n-cloud", "database", "Live Database", 500, 140), node("n-drift", "monitoring-dashboard", "Drift Scanner", 280, 280)], edges: [edge("e1", "n-tf", "n-state", "Plan"), edge("e2", "n-tf", "n-cloud", "Revert scale"), edge("e3", "n-drift", "n-tf", "Not blocking")] },
  incident: { nodeIds: ["n-tf", "n-cloud"], edgeIds: ["e2"], headline: "Undetected IaC drift caused automated apply to undo emergency scaling" },
  agendaId: "incident.fix_iac",
});
reg("service-platform|deep.cve", {
  title: "Platform CVE Rollout Stalls at 30% Adoption",
  minutes: 4,
  symptoms: "Critical openssl patch announced; phased rollout pauses because canary cluster fails unrelated test and blocks all waves.",
  interviewerSetup: "Mass update pipeline uses single global gate; no per-team visibility or rollback isolation.",
  diagram: { nodes: [node("n-cve", "deployer", "CVE Orchestrator", 60, 140), node("n-canary", "service", "Canary Cluster", 280, 140), node("n-fleet", "service", "Service Fleet", 500, 140), node("n-dash", "monitoring-dashboard", "Rollout Dashboard", 280, 280)], edges: [edge("e1", "n-cve", "n-canary", "Wave 1"), edge("e2", "n-canary", "n-fleet", "Blocked"), edge("e3", "n-dash", "n-cve", "Stale status")] },
  incident: { nodeIds: ["n-cve", "n-canary"], edgeIds: ["e2"], headline: "Monolithic CVE gate halted fleet-wide patch after unrelated canary failure" },
  agendaId: "incident.fix_cve",
});

// --- support-ai-agent ---
reg("support-ai-agent|deep.authz", {
  title: "Agent Refunds Another Customer Order",
  minutes: 4,
  symptoms: "Support bot issues refund on order belonging to different account after user pasted wrong order ID. Tool call lacked ownership check.",
  interviewerSetup: "LLM agent has broad refund tool; session user_id not bound to tool arguments validation.",
  diagram: { nodes: [node("n-user", "user", "Customer", 60, 140), node("n-agent", "llm", "Support Agent", 280, 140), node("n-tools", "service", "Refund Tool", 500, 140), node("n-auth", "auth", "Policy Check", 280, 280)], edges: [edge("e1", "n-user", "n-agent", "Chat"), edge("e2", "n-agent", "n-tools", "Refund order X"), edge("e3", "n-auth", "n-tools", "Skipped")] },
  incident: { nodeIds: ["n-tools", "n-auth"], edgeIds: ["e2"], headline: "Missing per-tool authorization let agent act outside customer scope" },
  agendaId: "incident.fix_authz",
});
reg("support-ai-agent|deep.eval", {
  title: "Shadow Launch Hides 12% Wrong Answer Rate",
  minutes: 3,
  symptoms: "Leadership approves GA based on CSAT proxy; manual review finds 12% answers contradict policy on billing disputes.",
  interviewerSetup: "Eval relied on aggregate thumbs-up without scenario suite or policy violation grading.",
  diagram: { nodes: [node("n-agent", "llm", "Support Agent", 60, 140), node("n-shadow", "experiment", "Shadow Mode", 280, 140), node("n-metrics", "monitoring-dashboard", "CSAT Proxy", 500, 140), node("n-suite", "evaluation", "Scenario Suite", 280, 280)], edges: [edge("e1", "n-agent", "n-shadow", "Live traffic"), edge("e2", "n-shadow", "n-metrics", "Only CSAT"), edge("e3", "n-suite", "n-shadow", "Not run")] },
  incident: { nodeIds: ["n-metrics", "n-shadow"], edgeIds: ["e2"], headline: "Weak pre-launch eval missed systematic policy violations" },
  agendaId: "incident.fix_eval",
});
reg("support-ai-agent|deep.handoff", {
  title: "Human Agent Receives Empty Context After Escalation",
  minutes: 3,
  symptoms: "Customers repeat issue three times after bot escalates; CRM ticket has no transcript or attempted actions.",
  interviewerSetup: "Handoff creates ticket with generic subject; conversation history and tool audit not attached.",
  diagram: { nodes: [node("n-user", "user", "Customer", 60, 140), node("n-bot", "llm", "Support Bot", 280, 140), node("n-queue", "service", "Human Queue", 500, 140), node("n-crm", "database", "CRM Ticket", 280, 280)], edges: [edge("e1", "n-user", "n-bot", "Long thread"), edge("e2", "n-bot", "n-queue", "Escalate"), edge("e3", "n-queue", "n-crm", "Empty body")] },
  incident: { nodeIds: ["n-queue", "n-crm"], edgeIds: ["e3"], headline: "Escalation dropped conversation context needed for human takeover" },
  agendaId: "incident.fix_handoff",
});
reg("support-ai-agent|deep.idempotency", {
  title: "Retry Storm Creates Triple Refund",
  minutes: 3,
  symptoms: "Payment gateway timeout causes agent to retry refund tool; customer receives three credits for one return.",
  interviewerSetup: "Tool layer has no idempotency keys; agent retries on ambiguous errors without checking prior outcome.",
  diagram: { nodes: [node("n-agent", "llm", "Support Agent", 60, 140), node("n-tool", "service", "Refund API", 280, 140), node("n-pay", "payment-gateway", "Payment Gateway", 500, 140), node("n-idem", "database", "Idempotency Store", 280, 280)], edges: [edge("e1", "n-agent", "n-tool", "3 retries"), edge("e2", "n-tool", "n-pay", "Duplicate POST"), edge("e3", "n-idem", "n-tool", "Absent")] },
  incident: { nodeIds: ["n-tool", "n-pay"], edgeIds: ["e2"], headline: "Non-idempotent tool retries duplicated financial side effects" },
  agendaId: "incident.fix_idempotency",
});
reg("support-ai-agent|deep.cost", {
  title: "Long Threads Burn $40 LLM Cost Per Ticket",
  minutes: 3,
  symptoms: "Finance flags support AI spend 6x budget; average conversation sends full history to GPT-4 on every turn without caps.",
  interviewerSetup: "No token budget, model routing, or summarization; each turn replays entire chat plus tool JSON.",
  diagram: { nodes: [node("n-user", "user", "Customers", 60, 140), node("n-agent", "llm", "Agent Orchestrator", 280, 140), node("n-llm", "llm", "Large Model", 500, 140), node("n-cap", "config", "Token Budget", 280, 280)], edges: [edge("e1", "n-user", "n-agent", "Many turns"), edge("e2", "n-agent", "n-llm", "Full context"), edge("e3", "n-cap", "n-agent", "Disabled")] },
  incident: { nodeIds: ["n-agent", "n-llm"], edgeIds: ["e2"], headline: "Unbounded context and model choice drove runaway per-conversation cost" },
  agendaId: "incident.fix_cost",
});

// --- task-scheduler ---
reg("task-scheduler|deep.store", {
  title: "Due Task Scan Locks Table for 45 Seconds",
  minutes: 4,
  symptoms: "Scheduler lag grows to minutes; DB shows full table scan on tasks table every tick. Inserts from API time out.",
  interviewerSetup: "Workers query `WHERE run_at <= now()` without time bucket index; table has 400M rows.",
  diagram: { nodes: [node("n-api", "app-server", "Task API", 60, 140), node("n-db", "database", "Task Store", 280, 140), node("n-sched", "service", "Scheduler", 500, 140), node("n-idx", "database", "Time Index", 280, 280)], edges: [edge("e1", "n-sched", "n-db", "Full scan"), edge("e2", "n-api", "n-db", "Blocked writes"), edge("e3", "n-idx", "n-db", "Missing")] },
  incident: { nodeIds: ["n-sched", "n-db"], edgeIds: ["e1"], headline: "Unindexed due-time queries saturated task store during scheduling" },
  agendaId: "incident.fix_store",
});
reg("task-scheduler|deep.leases", {
  title: "Crashed Worker Leaves Tasks Stuck Until Manual Purge",
  minutes: 3,
  symptoms: "After worker OOM, 12k tasks stay `running` forever; no automatic retry until ops runs cleanup script.",
  interviewerSetup: "Leases never expire on worker death; ack required but process killed mid-execution.",
  diagram: { nodes: [node("n-worker", "service", "Worker", 60, 140), node("n-store", "database", "Task Store", 280, 140), node("n-sched", "service", "Scheduler", 500, 140), node("n-lease", "config", "Lease TTL", 280, 280)], edges: [edge("e1", "n-sched", "n-worker", "Dispatch"), edge("e2", "n-worker", "n-store", "No ack"), edge("e3", "n-lease", "n-store", "Not enforced")] },
  incident: { nodeIds: ["n-worker", "n-store"], edgeIds: ["e2"], headline: "Missing lease expiry left orphaned running tasks after worker crash" },
  agendaId: "incident.fix_leases",
});
reg("task-scheduler|deep.scheduler", {
  title: "Dual Schedulers Dispatch Same Task Twice",
  minutes: 3,
  symptoms: "Billing job runs duplicate charges at midnight; two scheduler leaders both claim dispatch window after failover.",
  interviewerSetup: "Horizontal schedulers lack partition ownership; both poll same due slice.",
  diagram: { nodes: [node("n-s1", "service", "Scheduler A", 60, 120), node("n-s2", "service", "Scheduler B", 60, 220), node("n-store", "database", "Task Store", 280, 170), node("n-lock", "distributed-lock", "Dispatch Lock", 500, 170)], edges: [edge("e1", "n-s1", "n-store", "Claim task"), edge("e2", "n-s2", "n-store", "Claim task"), edge("e3", "n-lock", "n-s1", "Not used")] },
  incident: { nodeIds: ["n-s1", "n-s2"], edgeIds: ["e1", "e2"], headline: "Unpartitioned schedulers double-dispatched the same due tasks" },
  agendaId: "incident.fix_scheduler",
});
reg("task-scheduler|deep.recurring", {
  title: "Recurring Job Explodes Queue With Precomputed Instances",
  minutes: 3,
  symptoms: "Daily report job materialized 10 years of future rows after bug; queue depth hits millions overnight.",
  interviewerSetup: "Recurring scheduler pre-inserts all future occurrences instead of scheduling next on completion.",
  diagram: { nodes: [node("n-cron", "service", "Recurring Def", 60, 140), node("n-gen", "batch-job", "Instance Generator", 280, 140), node("n-q", "t-kafka", "Task Queue", 500, 140), node("n-worker", "service", "Workers", 500, 280)], edges: [edge("e1", "n-cron", "n-gen", "Expand all"), edge("e2", "n-gen", "n-q", "Flood"), edge("e3", "n-q", "n-worker", "Backlog")] },
  incident: { nodeIds: ["n-gen", "n-q"], edgeIds: ["e2"], headline: "Eager recurring expansion flooded the queue with far-future tasks" },
  agendaId: "incident.fix_recurring",
});
reg("task-scheduler|deep.hotkeys", {
  title: "Midnight Cron Hot Partition Saturates One Shard",
  minutes: 4,
  symptoms: "At 00:00 UTC, one Dynamo partition throttles; 80% of cron tasks share same partition key `daily`.",
  interviewerSetup: "Shard key is task type only; all daily jobs collide on single partition.",
  diagram: { nodes: [node("n-jobs", "service", "Cron Emitters", 60, 140), node("n-shard", "shard", "Hot Partition", 280, 140), node("n-shard2", "shard", "Other Shards", 280, 280), node("n-w", "service", "Workers", 500, 140)], edges: [edge("e1", "n-jobs", "n-shard", "Midnight spike"), edge("e2", "n-shard", "n-w", "Throttled"), edge("e3", "n-jobs", "n-shard2", "Idle")] },
  incident: { nodeIds: ["n-shard", "n-jobs"], edgeIds: ["e1"], headline: "Poor shard key choice created hot partition on global cron burst" },
  agendaId: "incident.fix_hotkeys",
});

// --- text-to-image ---
reg("text-to-image|deep.scheduling", {
  title: "Cold LoRA Load Adds 90s to First Request",
  minutes: 3,
  symptoms: "P99 latency for rare style adapters hits 120s while base model stays under 8s. GPU nodes swap weights on every request.",
  interviewerSetup: "Scheduler routes jobs without model affinity; adapters loaded from disk per job with no warm pool.",
  diagram: { nodes: [node("n-api", "app-server", "Generation API", 60, 140), node("n-q", "t-kafka", "Job Queue", 280, 140), node("n-gpu", "gpu", "GPU Worker", 500, 140), node("n-warm", "cache", "Model Cache", 500, 280)], edges: [edge("e1", "n-api", "n-q", "Submit"), edge("e2", "n-q", "n-gpu", "Random routing"), edge("e3", "n-gpu", "n-warm", "Cold load")] },
  incident: { nodeIds: ["n-gpu", "n-q"], edgeIds: ["e2"], headline: "Model-unaware scheduling caused repeated cold adapter loads on GPUs" },
  agendaId: "incident.fix_scheduling",
});
reg("text-to-image|deep.safety", {
  title: "NSFW Image Stored Before Classifier Runs",
  minutes: 4,
  symptoms: "Moderation backlog exposes policy-violating images in user galleries for minutes. Output filter runs async after upload to CDN.",
  interviewerSetup: "Pipeline writes object to public bucket then enqueues safety check; race allows share links before block.",
  diagram: { nodes: [node("n-gen", "gpu", "Diffusion Worker", 60, 140), node("n-store", "object-storage", "Object Storage", 280, 140), node("n-cdn", "cdn", "CDN", 500, 140), node("n-safe", "service", "Safety Classifier", 280, 280)], edges: [edge("e1", "n-gen", "n-store", "Immediate put"), edge("e2", "n-store", "n-cdn", "Public URL"), edge("e3", "n-safe", "n-gen", "Async only")] },
  incident: { nodeIds: ["n-store", "n-cdn"], edgeIds: ["e2"], headline: "Public upload before safety check allowed violating images to leak" },
  agendaId: "incident.fix_safety",
});
reg("text-to-image|deep.capacity", {
  title: "Viral Trend Exhausts GPU Queue for 6 Hours",
  minutes: 4,
  symptoms: "Wait time banner shows 6h ETA; autoscaling added nodes but image pull and model init lag 40 minutes behind demand.",
  interviewerSetup: "Fleet sized on average QPS; no forecast from social trend signal; cold GPU scale too slow for spike.",
  diagram: { nodes: [node("n-users", "user", "Users", 60, 140), node("n-api", "app-server", "API", 280, 140), node("n-q", "t-kafka", "GPU Queue", 500, 140), node("n-asg", "deployer", "GPU Autoscaler", 280, 280)], edges: [edge("e1", "n-users", "n-api", "Spike"), edge("e2", "n-api", "n-q", "Deep backlog"), edge("e3", "n-asg", "n-q", "Slow scale")] },
  incident: { nodeIds: ["n-q", "n-asg"], edgeIds: ["e2"], headline: "Undersized GPU fleet and slow scale-out could not absorb viral demand" },
  agendaId: "incident.fix_capacity",
});
reg("text-to-image|deep.priority", {
  title: "Free Tier Starves Paid Users During Peak",
  minutes: 3,
  symptoms: "Enterprise SLA missed while free queue drains slowly; single FIFO queue serves all tiers fairly by arrival time.",
  interviewerSetup: "No weighted queues or per-tier concurrency; free users dominate queue depth.",
  diagram: { nodes: [node("n-free", "user", "Free Users", 60, 80), node("n-paid", "user", "Paid Users", 60, 200), node("n-q", "t-kafka", "Single Queue", 280, 140), node("n-gpu", "gpu", "GPU Pool", 500, 140)], edges: [edge("e1", "n-free", "n-q", "High volume"), edge("e2", "n-paid", "n-q", "Blocked"), edge("e3", "n-q", "n-gpu", "FIFO")] },
  incident: { nodeIds: ["n-q", "n-paid"], edgeIds: ["e2"], headline: "Single-tier FIFO queue let free traffic starve paying customers at peak" },
  agendaId: "incident.fix_priority",
});
reg("text-to-image|deep.speed", {
  title: "Quality Regression After Aggressive Step Reduction",
  minutes: 3,
  symptoms: "Leadership cut inference steps 50% to save GPUs; user preference tests show 18% drop in thumbs-up with no monitoring gate.",
  interviewerSetup: "Speed change shipped without offline preference eval or gradual rollout.",
  diagram: { nodes: [node("n-prod", "gpu", "Inference", 60, 140), node("n-dist", "batch-job", "Distilled Model", 280, 140), node("n-eval", "evaluation", "Preference Eval", 500, 140), node("n-dash", "monitoring-dashboard", "Quality Metrics", 280, 280)], edges: [edge("e1", "n-dist", "n-prod", "Deploy"), edge("e2", "n-prod", "n-dash", "Latency only"), edge("e3", "n-eval", "n-prod", "Skipped")] },
  incident: { nodeIds: ["n-prod", "n-eval"], edgeIds: ["e1"], headline: "Inference speed optimization shipped without quality validation" },
  agendaId: "incident.fix_speed",
});

// --- ticket-booking ---
reg("ticket-booking|deep.concurrency", {
  title: "Two Users Assigned Same Seat on Checkout",
  minutes: 4,
  symptoms: "Arena show sells 500 seats but 512 confirmations issued; support finds duplicate seat_id in confirmed orders.",
  interviewerSetup: "Seat hold uses read-modify-write without conditional update or row lock.",
  diagram: { nodes: [node("n-u1", "user", "User A", 60, 80), node("n-u2", "user", "User B", 60, 200), node("n-api", "app-server", "Booking API", 280, 140), node("n-db", "database", "Seat Inventory", 500, 140)], edges: [edge("e1", "n-u1", "n-api", "Select seat"), edge("e2", "n-u2", "n-api", "Select seat"), edge("e3", "n-api", "n-db", "Race write")] },
  incident: { nodeIds: ["n-api", "n-db"], edgeIds: ["e3"], headline: "Non-atomic seat reservation allowed double booking under concurrency" },
  agendaId: "incident.fix_concurrency",
});
reg("ticket-booking|deep.holds", {
  title: "Abandoned Carts Lock Seats Until Showtime",
  minutes: 3,
  symptoms: "Popular section shows sold out while analytics sees 40% seats stuck in `held` state from expired sessions.",
  interviewerSetup: "Hold TTL job failed silently; no queue to release seats when payment not completed.",
  diagram: { nodes: [node("n-user", "user", "Shopper", 60, 140), node("n-api", "app-server", "Hold Service", 280, 140), node("n-db", "database", "Seat Map", 500, 140), node("n-exp", "t-kafka", "Expiry Worker", 280, 280)], edges: [edge("e1", "n-user", "n-api", "Abandon cart"), edge("e2", "n-api", "n-db", "Held forever"), edge("e3", "n-exp", "n-db", "Stopped")] },
  incident: { nodeIds: ["n-db", "n-exp"], edgeIds: ["e3"], headline: "Broken hold expiry left seats unavailable despite abandoned checkouts" },
  agendaId: "incident.fix_holds",
});
reg("ticket-booking|deep.read_scale", {
  title: "Seat Map API Melts Primary DB on Sale Open",
  minutes: 4,
  symptoms: "On-sale minute: seat map endpoint P99 8s and DB CPU 100%. Millions poll availability directly from transactional database.",
  interviewerSetup: "No edge cache for read-heavy map; every refresh hits primary with strong consistency.",
  diagram: { nodes: [node("n-fans", "user", "Fans", 60, 140), node("n-edge", "cdn", "Edge Cache", 280, 140), node("n-api", "app-server", "Map API", 500, 140), node("n-db", "database", "Primary DB", 500, 280)], edges: [edge("e1", "n-fans", "n-api", "Poll map"), edge("e2", "n-api", "n-db", "Every request"), edge("e3", "n-edge", "n-api", "Bypassed")] },
  incident: { nodeIds: ["n-api", "n-db"], edgeIds: ["e2"], headline: "Uncached seat map reads overwhelmed primary database at on-sale" },
  agendaId: "incident.fix_read_scale",
});
reg("ticket-booking|deep.payment_reliability", {
  title: "Charged Card With No Ticket After Gateway Timeout",
  minutes: 4,
  symptoms: "Customers charged but orders stay pending; payment succeeded at processor while booking API timed out and never confirmed.",
  interviewerSetup: "No idempotent payment reconciliation job; client retry creates duplicate charge attempts.",
  diagram: { nodes: [node("n-user", "user", "Buyer", 60, 140), node("n-book", "app-server", "Booking Svc", 280, 140), node("n-pay", "payment-gateway", "Payment GW", 500, 140), node("n-rec", "batch-job", "Reconciliation", 280, 280)], edges: [edge("e1", "n-book", "n-pay", "Timeout"), edge("e2", "n-pay", "n-user", "Charged"), edge("e3", "n-rec", "n-book", "Not running")] },
  incident: { nodeIds: ["n-book", "n-pay"], edgeIds: ["e1"], headline: "Payment-booking split without reconciliation left paid users without tickets" },
  agendaId: "incident.fix_payment",
});

// --- training-platform ---
reg("training-platform|deep.scheduling", {
  title: "GPU Cluster Sits Idle While Jobs Queue for Days",
  minutes: 4,
  symptoms: "800 GPUs free but job queue 72h deep; scheduler pins multi-node jobs to single faulty rack.",
  interviewerSetup: "Gang scheduling requires contiguous rack; bad nodes not excluded from placement algorithm.",
  diagram: { nodes: [node("n-q", "service", "Job Queue", 60, 140), node("n-sched", "service", "Scheduler", 280, 140), node("n-rack", "gpu", "Faulty Rack", 500, 80), node("n-free", "gpu", "Free GPUs", 500, 200)], edges: [edge("e1", "n-q", "n-sched", "Large job"), edge("e2", "n-sched", "n-rack", "Retry fail"), edge("e3", "n-free", "n-sched", "Unused")] },
  incident: { nodeIds: ["n-sched", "n-rack"], edgeIds: ["e2"], headline: "Rigid gang scheduling stranded jobs while healthy GPUs stayed idle" },
  agendaId: "incident.fix_scheduling",
});
reg("training-platform|deep.checkpoint_recovery", {
  title: "Preempted Job Restarts From Epoch Zero",
  minutes: 4,
  symptoms: "Spot preemption loses 18 hours of training; checkpoints written to local SSD on worker only.",
  interviewerSetup: "Checkpoint path not on shared durable storage; resume logic missing after pod kill.",
  diagram: { nodes: [node("n-worker", "gpu", "Training Worker", 60, 140), node("n-local", "database", "Local SSD", 280, 140), node("n-s3", "object-storage", "Durable Store", 500, 140), node("n-sched", "service", "Scheduler", 280, 280)], edges: [edge("e1", "n-worker", "n-local", "Checkpoint"), edge("e2", "n-worker", "n-s3", "Not synced"), edge("e3", "n-sched", "n-worker", "Preempt")] },
  incident: { nodeIds: ["n-worker", "n-local"], edgeIds: ["e1"], headline: "Non-durable checkpoints lost all progress on spot preemption" },
  agendaId: "incident.fix_checkpoint",
});
reg("training-platform|deep.data_storage", {
  title: "Data Loader Starves 8-GPU Node at 12% Util",
  minutes: 3,
  symptoms: "Training step GPU util 12%; traces show workers blocked on remote NFS small-file reads.",
  interviewerSetup: "Dataset on NFS without local cache or sequential read pipeline; millions of tiny files.",
  diagram: { nodes: [node("n-gpu", "gpu", "GPU Node", 60, 140), node("n-loader", "service", "Data Loader", 280, 140), node("n-nfs", "object-storage", "Remote NFS", 500, 140), node("n-cache", "cache", "Local Shard Cache", 280, 280)], edges: [edge("e1", "n-loader", "n-nfs", "Random I/O"), edge("e2", "n-loader", "n-gpu", "Starved"), edge("e3", "n-cache", "n-loader", "Absent")] },
  incident: { nodeIds: ["n-loader", "n-nfs"], edgeIds: ["e1"], headline: "Remote small-file I/O bottlenecked accelerators despite available GPU capacity" },
  agendaId: "incident.fix_data_storage",
});
reg("training-platform|deep.lineage", {
  title: "Production Model Cannot Be Reproduced From Registry",
  minutes: 3,
  symptoms: "Compliance asks for training data snapshot for deployed model v3; registry links to deleted dataset version.",
  interviewerSetup: "Experiment tracking logs metrics but not immutable data hash or git SHA at train time.",
  diagram: { nodes: [node("n-reg", "registry", "Model Registry", 60, 140), node("n-run", "batch-job", "Training Run", 280, 140), node("n-data", "data-lake", "Dataset", 500, 140), node("n-git", "config", "Code Version", 280, 280)], edges: [edge("e1", "n-run", "n-reg", "Register model"), edge("e2", "n-run", "n-data", "Mutable path"), edge("e3", "n-git", "n-run", "Not recorded")] },
  incident: { nodeIds: ["n-reg", "n-run"], edgeIds: ["e2"], headline: "Missing lineage metadata broke reproducibility for shipped model" },
  agendaId: "incident.fix_lineage",
});
reg("training-platform|deep.network_failure", {
  title: "Transient Heartbeat Blip Kills 6-Hour Training Job",
  minutes: 3,
  symptoms: "Job marked failed after 30s network partition though workers still computing; cluster frees GPUs and loses work.",
  interviewerSetup: "Orchestrator kills job on first missed heartbeat without grace period or checkpoint trigger.",
  diagram: { nodes: [node("n-orch", "service", "Orchestrator", 60, 140), node("n-worker", "gpu", "Worker", 280, 140), node("n-net", "load-balancer", "Network", 500, 140), node("n-hb", "monitoring-dashboard", "Heartbeat", 280, 280)], edges: [edge("e1", "n-worker", "n-orch", "Missed HB"), edge("e2", "n-net", "n-worker", "Blip"), edge("e3", "n-orch", "n-worker", "Kill job")] },
  incident: { nodeIds: ["n-orch", "n-worker"], edgeIds: ["e3"], headline: "Over-aggressive heartbeat failure policy terminated healthy long jobs" },
  agendaId: "incident.fix_network",
});

// --- unique-id-generator ---
reg("unique-id-generator|deep.layout", {
  title: "Sequence Bits Exhausted One Millisecond Into Sale",
  minutes: 3,
  symptoms: "ID service returns errors at flash sale start; sequence field overflows because timestamp bits too narrow for burst QPS.",
  interviewerSetup: "64-bit layout allocates 8 bits to sequence; peak needs 512 IDs per ms per worker.",
  diagram: { nodes: [node("n-clients", "client", "Services", 60, 140), node("n-gen", "service", "ID Generator", 280, 140), node("n-bits", "config", "Bit Layout", 500, 140), node("n-clock", "service", "Clock", 280, 280)], edges: [edge("e1", "n-clients", "n-gen", "Burst"), edge("e2", "n-gen", "n-bits", "Overflow"), edge("e3", "n-clock", "n-gen", "Same ms")] },
  incident: { nodeIds: ["n-gen", "n-bits"], edgeIds: ["e2"], headline: "Undersized sequence field could not sustain peak ID generation rate" },
  agendaId: "incident.fix_layout",
});
reg("unique-id-generator|deep.worker_id", {
  title: "Duplicate IDs After Worker ID Registry Split",
  minutes: 4,
  symptoms: "Two new pods assigned worker_id 42 after etcd partition; duplicate order IDs appear in payments.",
  interviewerSetup: "Worker IDs allocated from registry without consensus fencing; local cache reused stale ID.",
  diagram: { nodes: [node("n-p1", "service", "Generator Pod A", 60, 120), node("n-p2", "service", "Generator Pod B", 60, 220), node("n-etcd", "registry", "Worker Registry", 280, 170), node("n-ids", "database", "Issued IDs", 500, 170)], edges: [edge("e1", "n-p1", "n-etcd", "ID 42"), edge("e2", "n-p2", "n-etcd", "ID 42"), edge("e3", "n-p1", "n-ids", "Collision")] },
  incident: { nodeIds: ["n-p1", "n-p2"], edgeIds: ["e1", "e2"], headline: "Unsafe worker ID assignment produced duplicate snowflake identifiers" },
  agendaId: "incident.fix_worker_id",
});
reg("unique-id-generator|deep.clock", {
  title: "NTP Step Back Generates Duplicate Snowflake IDs",
  minutes: 3,
  symptoms: "After host clock correction, monitoring alerts duplicate primary keys in orders table for 200ms window.",
  interviewerSetup: "Generator does not wait out clock rollback; reuses timestamp with reset sequence.",
  diagram: { nodes: [node("n-host", "service", "ID Node", 60, 140), node("n-ntp", "config", "NTP", 280, 140), node("n-gen", "service", "Snowflake Gen", 500, 140), node("n-last", "database", "Last Timestamp", 280, 280)], edges: [edge("e1", "n-ntp", "n-host", "Step back"), edge("e2", "n-host", "n-gen", "Generate"), edge("e3", "n-last", "n-gen", "Not enforced")] },
  incident: { nodeIds: ["n-gen", "n-host"], edgeIds: ["e2"], headline: "Clock rollback handling missing caused snowflake ID reuse" },
  agendaId: "incident.fix_clock",
});
reg("unique-id-generator|deep.throughput", {
  title: "Per-Millisecond Cap Blocks Checkout Spike",
  minutes: 3,
  symptoms: "Flash sale throttles at 4096 IDs/sec per node though CPU idle; sequence spins waiting next ms.",
  interviewerSetup: "Single-threaded generator busy-waits on clock instead of batching or adding nodes.",
  diagram: { nodes: [node("n-sale", "client", "Checkout", 60, 140), node("n-gen", "service", "Embedded SDK", 280, 140), node("n-seq", "config", "Sequence", 500, 140), node("n-scale", "service", "More Nodes", 280, 280)], edges: [edge("e1", "n-sale", "n-gen", "High QPS"), edge("e2", "n-gen", "n-seq", "Spin wait"), edge("e3", "n-scale", "n-sale", "Not added")] },
  incident: { nodeIds: ["n-gen", "n-seq"], edgeIds: ["e2"], headline: "Sequence overflow handling became throughput bottleneck at peak" },
  agendaId: "incident.fix_throughput",
});
reg("unique-id-generator|deep.client_integration", {
  title: "Central ID Service Outage Stops All Writes",
  minutes: 3,
  symptoms: "Regional network blip to ID RPC service halts order creation fleet-wide; embedded SDK not deployed.",
  interviewerSetup: "All services call remote ID service synchronously on hot path with no local fallback.",
  diagram: { nodes: [node("n-svc", "service", "Business Services", 60, 140), node("n-rpc", "service", "ID RPC Service", 280, 140), node("n-sdk", "client", "Embedded SDK", 500, 80), node("n-net", "load-balancer", "Network", 500, 200)], edges: [edge("e1", "n-svc", "n-rpc", "Sync call"), edge("e2", "n-net", "n-rpc", "Blip"), edge("e3", "n-sdk", "n-svc", "Not used")] },
  incident: { nodeIds: ["n-svc", "n-rpc"], edgeIds: ["e1"], headline: "Remote-only ID generation created hard availability dependency" },
  agendaId: "incident.fix_client_integration",
});

// --- video-recommendations ---
reg("video-recommendations|deep.retrieval", {
  title: "Home Feed Latency Blows SLO at 80ms ANN Query",
  minutes: 4,
  symptoms: "Feed P99 450ms; retrieval alone spends 80ms on single unsharded vector index with 200M videos.",
  interviewerSetup: "Two-tower ANN not partitioned; no prefilter by subscription or language before vector search.",
  diagram: { nodes: [node("n-feed", "app-server", "Feed API", 60, 140), node("n-ann", "vector-db", "ANN Index", 280, 140), node("n-shard", "shard", "Sharded ANN", 500, 80), node("n-pre", "service", "Candidate Filters", 500, 200)], edges: [edge("e1", "n-feed", "n-ann", "Top 500"), edge("e2", "n-ann", "n-feed", "Slow"), edge("e3", "n-shard", "n-feed", "Not used")] },
  incident: { nodeIds: ["n-ann", "n-feed"], edgeIds: ["e1"], headline: "Monolithic ANN retrieval missed latency budget for home feed" },
  agendaId: "incident.fix_retrieval",
});
reg("video-recommendations|deep.ranking", {
  title: "Ranker Overfits to Autoplay Position Bias",
  minutes: 3,
  symptoms: "Watch time up in autoplay rail but satisfaction down; model trained with slot index leaking into features at serve time.",
  interviewerSetup: "Position feature included in online scoring though only valid offline during training.",
  diagram: { nodes: [node("n-log", "clickstream", "Watch Logs", 60, 140), node("n-train", "batch-job", "Ranker Train", 280, 140), node("n-serve", "model-serving", "Ranker Serve", 500, 140), node("n-pos", "feature-store", "Position Feature", 280, 280)], edges: [edge("e1", "n-log", "n-train", "Biased labels"), edge("e2", "n-train", "n-serve", "Deploy"), edge("e3", "n-pos", "n-serve", "Live feature")] },
  incident: { nodeIds: ["n-serve", "n-pos"], edgeIds: ["e3"], headline: "Serving position features amplified layout bias in recommendations" },
  agendaId: "incident.fix_ranking",
});
reg("video-recommendations|deep.coldstart", {
  title: "New Creator Uploads Get Zero Home Feed Impressions",
  minutes: 3,
  symptoms: "Fresh videos stay in limbo unless user searches channel name; behaviour-only ranker ignores content embeddings.",
  interviewerSetup: "No exploration slot or content tower features for uploads under 24h old.",
  diagram: { nodes: [node("n-vid", "catalog", "New Upload", 60, 140), node("n-rank", "model-serving", "Ranker", 280, 140), node("n-feed", "app-server", "Home Feed", 500, 140), node("n-emb", "embedding", "Video Tower", 280, 280)], edges: [edge("e1", "n-vid", "n-rank", "Zero stats"), edge("e2", "n-rank", "n-feed", "Filtered out"), edge("e3", "n-emb", "n-rank", "Unused")] },
  incident: { nodeIds: ["n-rank", "n-vid"], edgeIds: ["e2"], headline: "Cold-start uploads never surfaced without content features or exploration" },
  agendaId: "incident.fix_coldstart",
});
reg("video-recommendations|deep.feedback", {
  title: "Filter Bubble Amplified After Diversity Removed",
  minutes: 3,
  symptoms: "Users report repetitive recommendations; concentration metric shows top 10 videos 40% of watch time post change.",
  interviewerSetup: "Re-ranker diversity penalty removed for short-term watch time experiment; no long-term holdout.",
  diagram: { nodes: [node("n-user", "user", "Viewer", 60, 140), node("n-rank", "model-serving", "Ranker", 280, 140), node("n-rerank", "service", "Re-rank", 500, 140), node("n-div", "evaluation", "Diversity Rules", 280, 280)], edges: [edge("e1", "n-rank", "n-rerank", "Candidates"), edge("e2", "n-rerank", "n-user", "Narrow feed"), edge("e3", "n-div", "n-rerank", "Disabled")] },
  incident: { nodeIds: ["n-rerank", "n-div"], edgeIds: ["e2"], headline: "Removed diversity controls caused harmful feedback loop in feed" },
  agendaId: "incident.fix_feedback",
});
reg("video-recommendations|deep.evaluation", {
  title: "Offline Recall Gain Hides Online Satisfaction Drop",
  minutes: 3,
  symptoms: "Team ships retrieval tweak with +3% recall@50 but week-long A/B shows lower return visits.",
  interviewerSetup: "Launch gated only on offline retrieval metrics without online guardrails on satisfaction.",
  diagram: { nodes: [node("n-off", "evaluation", "Offline Eval", 60, 140), node("n-ab", "experiment", "Online A/B", 280, 140), node("n-ret", "vector-db", "Retrieval", 500, 140), node("n-guard", "monitoring-dashboard", "Guardrails", 280, 280)], edges: [edge("e1", "n-off", "n-ret", "Ship"), edge("e2", "n-ret", "n-ab", "Live"), edge("e3", "n-guard", "n-ab", "Ignored")] },
  incident: { nodeIds: ["n-off", "n-ab"], edgeIds: ["e1"], headline: "Offline-only retrieval metrics missed negative online engagement impact" },
  agendaId: "incident.fix_evaluation",
});

// --- video-streaming ---
reg("video-streaming|deep.transcoding", {
  title: "VOD Publish Stuck 6 Hours Behind Live Event",
  minutes: 4,
  symptoms: "Highlight clips unavailable hours after game ends; transcoding queue serial on single worker pool.",
  interviewerSetup: "Upload triggers monolithic transcode job; no chunk parallelization or priority lane for live replays.",
  diagram: { nodes: [node("n-up", "ingestion", "Upload", 60, 140), node("n-q", "t-kafka", "Transcode Queue", 280, 140), node("n-w", "service", "Worker Pool", 500, 140), node("n-par", "batch-job", "Parallel Chunks", 280, 280)], edges: [edge("e1", "n-up", "n-q", "Enqueue"), edge("e2", "n-q", "n-w", "Serial"), edge("e3", "n-par", "n-w", "Not used")] },
  incident: { nodeIds: ["n-q", "n-w"], edgeIds: ["e2"], headline: "Non-parallel transcoding pipeline could not keep up with live publish volume" },
  agendaId: "incident.fix_transcoding",
});
reg("video-streaming|deep.abr", {
  title: "Clients Stall on Buffering After Manifest Error",
  minutes: 3,
  symptoms: "Android players freeze on mid-quality rung; manifest lists segment URL with wrong CDN host after partial deploy.",
  interviewerSetup: "HLS manifest generated from mixed old/new template; ABR switches to broken rendition.",
  diagram: { nodes: [node("n-client", "mobile", "Player", 60, 140), node("n-man", "config", "Manifest", 280, 140), node("n-cdn", "cdn", "CDN", 500, 140), node("n-origin", "object-storage", "Origin", 280, 280)], edges: [edge("e1", "n-client", "n-man", "ABR switch"), edge("e2", "n-man", "n-cdn", "Bad URL"), edge("e3", "n-origin", "n-man", "Mixed template")] },
  incident: { nodeIds: ["n-man", "n-cdn"], edgeIds: ["e2"], headline: "Inconsistent manifest URLs broke adaptive bitrate playback" },
  agendaId: "incident.fix_abr",
});
reg("video-streaming|deep.cdn", {
  title: "Viral Clip Thundering Herd Crushes Origin",
  minutes: 4,
  symptoms: "Trending video triggers 500k rps cache miss storm; origin egress capped and playback fails globally.",
  interviewerSetup: "No origin shield; TTL zero on first request; all edges fetch same object simultaneously.",
  diagram: { nodes: [node("n-users", "user", "Viewers", 60, 140), node("n-edge", "cdn", "CDN Edges", 280, 140), node("n-shield", "cdn", "Origin Shield", 500, 80), node("n-origin", "object-storage", "Origin", 500, 200)], edges: [edge("e1", "n-users", "n-edge", "Spike"), edge("e2", "n-edge", "n-origin", "Miss storm"), edge("e3", "n-shield", "n-origin", "Bypassed")] },
  incident: { nodeIds: ["n-edge", "n-origin"], edgeIds: ["e2"], headline: "Uncollapsed cache misses overloaded origin during viral playback" },
  agendaId: "incident.fix_cdn",
});
reg("video-streaming|deep.analytics", {
  title: "Beacon Flood Degrades Playback CPU on Low-End TVs",
  minutes: 3,
  symptoms: "Smart TV app stutters; client sends per-segment analytics synchronously on main thread during playback.",
  interviewerSetup: "Telemetry not batched; pipeline couples to player thread instead of async fire-and-forget queue.",
  diagram: { nodes: [node("n-tv", "client", "TV Client", 60, 140), node("n-beacon", "ingestion", "Analytics API", 280, 140), node("n-kafka", "t-kafka", "Event Bus", 500, 140), node("n-batch", "client", "Batch Buffer", 280, 280)], edges: [edge("e1", "n-tv", "n-beacon", "Sync POST"), edge("e2", "n-beacon", "n-kafka", "Ingest"), edge("e3", "n-batch", "n-tv", "Missing")] },
  incident: { nodeIds: ["n-tv", "n-beacon"], edgeIds: ["e1"], headline: "Synchronous analytics beacons stole CPU from video playback" },
  agendaId: "incident.fix_analytics",
});
reg("video-streaming|deep.cost", {
  title: "Egress Bill Spikes After Adding 4K Ladder Rung",
  minutes: 3,
  symptoms: "Monthly CDN cost up 35% though view count flat; most users still on 720p but origin stores all renditions prefetched.",
  interviewerSetup: "Transcode policy generates 4K for all uploads; CDN prefetches unused high bitrate segments.",
  diagram: { nodes: [node("n-tc", "service", "Transcoder", 60, 140), node("n-origin", "object-storage", "Origin Storage", 280, 140), node("n-cdn", "cdn", "CDN", 500, 140), node("n-abr", "client", "ABR Stats", 280, 280)], edges: [edge("e1", "n-tc", "n-origin", "All renditions"), edge("e2", "n-origin", "n-cdn", "High egress"), edge("e3", "n-abr", "n-tc", "Ignored")] },
  incident: { nodeIds: ["n-origin", "n-cdn"], edgeIds: ["e2"], headline: "Unused high-bitrate renditions drove runaway storage and egress cost" },
  agendaId: "incident.fix_cost",
});

// --- visual-search ---
reg("visual-search|deep.index", {
  title: "Billion-Vector Index Misses P99 Latency Target",
  minutes: 4,
  symptoms: "Visual search P99 800ms vs 200ms SLO; full-precision index exceeds RAM and triggers disk thrash.",
  interviewerSetup: "Single flat index without product quantization or sharding with parallel query.",
  diagram: { nodes: [node("n-q", "app-server", "Query API", 60, 140), node("n-idx", "vector-db", "Flat Index", 280, 140), node("n-pq", "shard", "PQ Shards", 500, 80), node("n-rerank", "service", "Re-rank", 500, 200)], edges: [edge("e1", "n-q", "n-idx", "k-NN"), edge("e2", "n-idx", "n-q", "Slow"), edge("e3", "n-pq", "n-q", "Not deployed")] },
  incident: { nodeIds: ["n-idx", "n-q"], edgeIds: ["e1"], headline: "Uncompressed monolithic index exceeded memory and latency budgets" },
  agendaId: "incident.fix_index",
});
reg("visual-search|deep.freshness", {
  title: "New Product Photos Searchable Only After Weekly Rebuild",
  minutes: 3,
  symptoms: "Merchants wait 7 days for visual search to find new SKUs; only batch index rebuild updates corpus.",
  interviewerSetup: "No incremental fresh index; deletes not filtered at query time.",
  diagram: { nodes: [node("n-ing", "ingestion", "Image Ingest", 60, 140), node("n-main", "vector-db", "Main Index", 280, 140), node("n-fresh", "vector-db", "Fresh Index", 500, 80), node("n-q", "app-server", "Search API", 500, 200)], edges: [edge("e1", "n-ing", "n-main", "Weekly only"), edge("e2", "n-q", "n-main", "Stale"), edge("e3", "n-fresh", "n-q", "Missing")] },
  incident: { nodeIds: ["n-main", "n-ing"], edgeIds: ["e1"], headline: "Batch-only indexing left new images invisible until full rebuild" },
  agendaId: "incident.fix_freshness",
});
reg("visual-search|deep.reembed", {
  title: "Encoder Upgrade Drops Recall Until Rollback",
  minutes: 4,
  symptoms: "New vision encoder deployed to queries only; index still old embedding space—recall@10 halves overnight.",
  interviewerSetup: "Query encoder updated without dual-write re-embed or atomic index swap.",
  diagram: { nodes: [node("n-qenc", "model-serving", "Query Encoder v2", 60, 140), node("n-idx", "vector-db", "Index v1", 280, 140), node("n-new", "vector-db", "Index v2", 500, 140), node("n-mig", "batch-job", "Re-embed Job", 280, 280)], edges: [edge("e1", "n-qenc", "n-idx", "M mismatch"), edge("e2", "n-mig", "n-new", "Incomplete"), edge("e3", "n-new", "n-qenc", "Not switched")] },
  incident: { nodeIds: ["n-qenc", "n-idx"], edgeIds: ["e1"], headline: "Query-index embedding version skew broke retrieval after encoder upgrade" },
  agendaId: "incident.fix_reembed",
});
reg("visual-search|deep.rerank", {
  title: "Near-Duplicate Images Dominate Results Page",
  minutes: 3,
  symptoms: "Users see ten variants of same dress; engagement drops. ANN returns many near-identical vectors without dedupe.",
  interviewerSetup: "No visual dedupe or diversity re-rank; quality and stock filters missing.",
  diagram: { nodes: [node("n-ann", "vector-db", "ANN Results", 60, 140), node("n-dedupe", "service", "Dedupe", 280, 140), node("n-ui", "client", "Results UI", 500, 140), node("n-rank", "service", "Business Re-rank", 280, 280)], edges: [edge("e1", "n-ann", "n-ui", "Raw neighbours"), edge("e2", "n-dedupe", "n-ann", "Bypassed"), edge("e3", "n-rank", "n-ui", "Not applied")] },
  incident: { nodeIds: ["n-ann", "n-ui"], edgeIds: ["e1"], headline: "Missing re-rank and dedupe showed redundant visual neighbours" },
  agendaId: "incident.fix_rerank",
});
reg("visual-search|deep.eval", {
  title: "Offline mAP Gain Masks Wrong Category Matches",
  minutes: 3,
  symptoms: "Launch approved on average mAP; apparel queries return kitchen items after encoder change on one category slice.",
  interviewerSetup: "Eval set not stratified by category; online save rate not monitored in A/B.",
  diagram: { nodes: [node("n-off", "evaluation", "Offline Eval", 60, 140), node("n-ab", "experiment", "Online Test", 280, 140), node("n-slice", "warehouse", "Category Slices", 500, 140), node("n-save", "monitoring-dashboard", "Save Rate", 280, 280)], edges: [edge("e1", "n-off", "n-ab", "Go live"), edge("e2", "n-slice", "n-off", "Not used"), edge("e3", "n-save", "n-ab", "Declining")] },
  incident: { nodeIds: ["n-off", "n-slice"], edgeIds: ["e2"], headline: "Aggregate offline metrics hid category-level retrieval regressions" },
  agendaId: "incident.fix_eval",
});

// --- voice-ai-agent ---
reg("voice-ai-agent|deep.latency", {
  title: "Voice Agent Blows 800ms Response Budget",
  minutes: 4,
  symptoms: "Users complain of awkward pauses; traces show 600ms waiting for full LLM completion before TTS starts.",
  interviewerSetup: "Pipeline batch mode: ASR → full LLM → TTS with no streaming or early speak.",
  diagram: { nodes: [node("n-user", "user", "Caller", 60, 140), node("n-asr", "service", "ASR", 280, 80), node("n-llm", "llm", "LLM", 280, 200), node("n-tts", "service", "TTS", 500, 140)], edges: [edge("e1", "n-user", "n-asr", "Audio"), edge("e2", "n-asr", "n-llm", "Wait full"), edge("e3", "n-llm", "n-tts", "Block")] },
  incident: { nodeIds: ["n-llm", "n-tts"], edgeIds: ["e3"], headline: "Non-streaming LLM-to-TTS path exceeded voice latency budget" },
  agendaId: "incident.fix_latency",
});
reg("voice-ai-agent|deep.turns", {
  title: "Agent Keeps Talking Over Barge-In",
  minutes: 3,
  symptoms: "Callers shout stop but bot speaks 3 more seconds; cancellation not wired from VAD to TTS stream.",
  interviewerSetup: "Half-duplex pipeline ignores interrupt events; playback buffer not flushed on barge-in.",
  diagram: { nodes: [node("n-user", "user", "Caller", 60, 140), node("n-vad", "service", "VAD / Barge-in", 280, 140), node("n-tts", "service", "TTS Stream", 500, 140), node("n-cancel", "event-bus", "Cancel Bus", 280, 280)], edges: [edge("e1", "n-user", "n-vad", "Interrupt"), edge("e2", "n-vad", "n-cancel", "Event dropped"), edge("e3", "n-tts", "n-user", "Still playing")] },
  incident: { nodeIds: ["n-tts", "n-vad"], edgeIds: ["e3"], headline: "Missing barge-in cancellation left agent talking over the user" },
  agendaId: "incident.fix_turns",
});
reg("voice-ai-agent|deep.safety", {
  title: "Medical Question Answered Instead of Transfer",
  minutes: 4,
  symptoms: "Regulator flags call where bot gave dosage advice; emergency keyword detector missed paraphrase.",
  interviewerSetup: "Safety routing uses brittle keyword list; no escalation to human for medical intents.",
  diagram: { nodes: [node("n-user", "user", "Caller", 60, 140), node("n-agent", "llm", "Voice Agent", 280, 140), node("n-safe", "service", "Safety Router", 500, 80), node("n-human", "service", "Human Queue", 500, 200)], edges: [edge("e1", "n-user", "n-agent", "Medical ask"), edge("e2", "n-agent", "n-user", "Unsafe answer"), edge("e3", "n-safe", "n-human", "No transfer")] },
  incident: { nodeIds: ["n-agent", "n-safe"], edgeIds: ["e2"], headline: "Inadequate safety routing allowed prohibited medical guidance on call" },
  agendaId: "incident.fix_safety",
});
reg("voice-ai-agent|deep.capacity", {
  title: "Marketing Campaign Exhausts Concurrent Call Capacity",
  minutes: 4,
  symptoms: "Outbound dialer launches 20k calls; ASR pool capped at 2k sessions—80% callers hear busy signal.",
  interviewerSetup: "Media servers scale but shared ASR/TTS pools sized for inbound only; no session pinning plan.",
  diagram: { nodes: [node("n-dial", "service", "Dialer", 60, 140), node("n-media", "service", "Media Servers", 280, 140), node("n-asr", "service", "ASR Pool", 500, 140), node("n-cap", "monitoring-dashboard", "Capacity Plan", 280, 280)], edges: [edge("e1", "n-dial", "n-media", "20k calls"), edge("e2", "n-media", "n-asr", "Exhausted"), edge("e3", "n-cap", "n-dial", "Ignored")] },
  incident: { nodeIds: ["n-asr", "n-dial"], edgeIds: ["e2"], headline: "Undersized shared speech pools blocked concurrent campaign calls" },
  agendaId: "incident.fix_capacity",
});
reg("voice-ai-agent|deep.eval", {
  title: "Regression Ships After Prompt-Only Change",
  minutes: 3,
  symptoms: "Booking success rate drops 9% after prompt tweak; no simulated-call regression suite in CI.",
  interviewerSetup: "Eval manual spot checks only; latency and entity error metrics not gated on deploy.",
  diagram: { nodes: [node("n-ci", "deployer", "Deploy", 60, 140), node("n-prod", "llm", "Voice Agent", 280, 140), node("n-sim", "evaluation", "Sim Call Tests", 500, 140), node("n-met", "monitoring-dashboard", "Success Metrics", 280, 280)], edges: [edge("e1", "n-ci", "n-prod", "Prompt change"), edge("e2", "n-prod", "n-met", "Drop"), edge("e3", "n-sim", "n-ci", "Skipped")] },
  incident: { nodeIds: ["n-ci", "n-sim"], edgeIds: ["e3"], headline: "Missing regression eval allowed prompt change to hurt booking success" },
  agendaId: "incident.fix_eval",
});

// --- web-crawler ---
reg("web-crawler|deep.frontier", {
  title: "Single Host Hammered by Uncoordinated Fetchers",
  minutes: 3,
  symptoms: "Partner site blocks crawler IP; politeness violated with 50 parallel fetchers hitting same domain.",
  interviewerSetup: "Frontier not partitioned by host; no per-host queue or single-worker ownership.",
  diagram: { nodes: [node("n-urls", "stream", "URL Stream", 60, 140), node("n-front", "service", "Frontier", 280, 140), node("n-fetch", "service", "Fetchers", 500, 140), node("n-host", "web-server", "Partner Site", 500, 280)], edges: [edge("e1", "n-urls", "n-front", "Unordered"), edge("e2", "n-front", "n-fetch", "Same host x50"), edge("e3", "n-fetch", "n-host", "Rate limit ban")] },
  incident: { nodeIds: ["n-front", "n-fetch"], edgeIds: ["e2"], headline: "Unpartitioned frontier caused politeness violations on single hosts" },
  agendaId: "incident.fix_frontier",
});
reg("web-crawler|deep.url_dedupe", {
  title: "Crawler Re-Fetches Same URLs Millions of Times",
  minutes: 4,
  symptoms: "Storage costs 3x estimate; dedupe DB lookups peg I/O. URL variants differ only by tracking query params.",
  interviewerSetup: "Dedupe key is raw URL string without normalization; no bloom filter fronting store.",
  diagram: { nodes: [node("n-fetch", "service", "Fetcher", 60, 140), node("n-dedupe", "database", "Seen URL DB", 280, 140), node("n-bloom", "cache", "Bloom Filter", 500, 80), node("n-norm", "service", "URL Normalizer", 500, 200)], edges: [edge("e1", "n-fetch", "n-dedupe", "Every URL"), edge("e2", "n-dedupe", "n-fetch", "Miss variants"), edge("e3", "n-bloom", "n-fetch", "Absent")] },
  incident: { nodeIds: ["n-dedupe", "n-fetch"], edgeIds: ["e2"], headline: "Missing normalization and bloom prefilter caused massive duplicate fetches" },
  agendaId: "incident.fix_url_dedupe",
});
reg("web-crawler|deep.content_dedupe", {
  title: "Mirror Sites Fill Index With Duplicate Content",
  minutes: 3,
  symptoms: "Search index 40% redundant pages from syndicated mirrors; crawl budget wasted on identical HTML.",
  interviewerSetup: "URL dedupe passes; no simhash or checksum compare on body content.",
  diagram: { nodes: [node("n-fetch", "service", "Fetcher", 60, 140), node("n-parse", "service", "Parser", 280, 140), node("n-idx", "search-service", "Index", 500, 140), node("n-sim", "service", "Simhash Dedupe", 280, 280)], edges: [edge("e1", "n-fetch", "n-parse", "HTML"), edge("e2", "n-parse", "n-idx", "All stored"), edge("e3", "n-sim", "n-parse", "Skipped")] },
  incident: { nodeIds: ["n-idx", "n-parse"], edgeIds: ["e2"], headline: "Content-level dedupe missing let mirror pages bloat the index" },
  agendaId: "incident.fix_content_dedupe",
});
reg("web-crawler|deep.dns", {
  title: "Fetcher Fleet Stalls on DNS Resolver Saturation",
  minutes: 3,
  symptoms: "Crawl rate drops 70% though CPU idle; fetchers block on synchronous DNS with shared resolver limit.",
  interviewerSetup: "No local DNS cache on fetcher nodes; central resolver rate limited at 1k qps.",
  diagram: { nodes: [node("n-fetch", "service", "Fetcher Fleet", 60, 140), node("n-dns", "dns", "Central Resolver", 280, 140), node("n-cache", "cache", "Local DNS Cache", 500, 140), node("n-url", "stream", "URL Queue", 500, 280)], edges: [edge("e1", "n-url", "n-fetch", "Ready"), edge("e2", "n-fetch", "n-dns", "Blocked"), edge("e3", "n-cache", "n-fetch", "Not deployed")] },
  incident: { nodeIds: ["n-fetch", "n-dns"], edgeIds: ["e2"], headline: "Central DNS became bottleneck without per-fetcher caching" },
  agendaId: "incident.fix_dns",
});
reg("web-crawler|deep.fault_tolerance", {
  title: "Worker Crash Loses In-Flight Frontier Batch",
  minutes: 4,
  symptoms: "After deploy restart, 2M URLs never retried; frontier messages acked before fetch completed.",
  interviewerSetup: "No visibility timeout; frontier checkpoint not persisted on worker death.",
  diagram: { nodes: [node("n-q", "t-kafka", "Frontier Queue", 60, 140), node("n-w", "service", "Worker", 280, 140), node("n-store", "database", "Checkpoint", 500, 140), node("n-vis", "config", "Visibility Timeout", 280, 280)], edges: [edge("e1", "n-q", "n-w", "Early ack"), edge("e2", "n-w", "n-store", "No checkpoint"), edge("e3", "n-vis", "n-q", "Zero")] },
  incident: { nodeIds: ["n-q", "n-w"], edgeIds: ["e1"], headline: "Non-durable frontier acks lost URLs when workers crashed mid-fetch" },
  agendaId: "incident.fix_fault_tolerance",
});


function miniFromAgenda(item, agendaId, referenceFix) {
  return {
    agenda: [{
      id: agendaId,
      stage: "incident",
      dimension: item.dimension,
      weight: item.weight ?? 3,
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
  const referenceFix = spec.referenceFix ?? item.moveOnSummary ?? item.goal;
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
  writeFileSync(existingPath, `${JSON.stringify({
    promptId,
    packVersion: existing.packVersion ?? pack.version,
    inputsFingerprint: existing.inputsFingerprint,
    nuggets,
  }, null, 2)}\n`);
  written.push(`${promptId}.json`);
}
console.log("Wrote:", written.join(", "));
