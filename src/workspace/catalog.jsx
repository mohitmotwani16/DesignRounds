import {
  Activity, AppWindow, Archive, ArchiveX, ArrowLeftRight, BadgeCheck, Bell, BellRing, Binary, BookOpen, Bot, Box, Boxes,
  BrainCircuit, BrickWall, Building2, Cable, CalendarClock, Car, ChartLine, ClipboardCheck, Clapperboard, Clock, Cloud, Cog,
  Columns3, Compass, Container, Copy, Cpu, CreditCard, Crown, Database, DatabaseBackup, DoorOpen, Earth, Eye, FileBadge,
  FileJson, FileText, Film, Filter, Fingerprint, Flag, FlaskConical, Folder, Gauge, GitBranch, GitFork, GitMerge, Globe, Hash,
  Handshake, HardDrive, HardDriveDownload, HeartPulse, Image, Inbox, Key, KeyRound, KeySquare, Layers, LayoutDashboard,
  LayoutGrid, LayoutTemplate, ListChecks, ListOrdered, Lock, Logs, Mail, Map as MapIcon, MapPin, Megaphone, MemoryStick,
  MessageSquareText, Microchip, Monitor, MonitorCog, MousePointerClick, Network, Orbit, Package, Package2, PhoneCall, Plug,
  Radio, Receipt, RefreshCcw, Repeat, Rocket, Route, Router, ScanSearch, ScrollText, Search, Send, Server, ServerCog, Share2,
  ShieldAlert, ShieldCheck, ShieldHalf, ShoppingCart, Shuffle, Signpost, Siren, SlidersHorizontal, Smartphone, Sparkles,
  Split, SquareDashed, SquareFunction, StickyNote, Table2, Tablet, Tags, ThumbsUp, Ticket, Timer, TrendingDown, Truck, Tv,
  Type, User, UserCog, Users, Vault, Wallet, Warehouse, Watch, Waves, Waypoints, Webhook, Workflow, Zap,
} from "lucide-react";
import {
  siAirbyte, siAkamai, siAmazoncloudwatch, siAmazondynamodb, siAmazonec2, siAmazonredshift, siAmazons3, siAmazonsqs,
  siAnthropic, siApachecassandra, siApachedruid, siApacheflink, siApachehadoop, siApachekafka, siApachepulsar,
  siApachespark, siApacheairflow, siArgo, siAuth0, siAwslambda, siClickhouse, siCloudflare, siCloudflareworkers,
  siCockroachlabs, siConsul, siDatabricks, siDatadog, siDbt, siDocker, siDuckdb, siElasticsearch, siEnvoyproxy, siEtcd,
  siFastly, siFirebase, siGithubactions, siGooglebigquery, siGooglecloud, siGooglecloudstorage, siGooglemaps,
  siGooglepubsub, siGrafana, siGraphql, siHelm, siHuggingface, siInfluxdb, siIstio, siJaeger, siKeycloak, siKibana, siKong,
  siKubernetes, siLangchain, siMailgun, siMetabase, siMinio, siMlflow, siMongodb, siMysql, siNatsdotio, siNeo4j, siNginx,
  siNvidia, siOkta, siOllama, siOpenai, siOpentelemetry, siPagerduty, siPaypal, siPostgresql, siPrometheus, siPytorch,
  siRabbitmq, siRay, siRedis, siScylladb, siSendgrid, siSentry, siSlack, siSnowflake, siSocketdotio, siSplunk, siSqlite,
  siStripe, siSupabase, siTensorflow, siTerraform, siTimescale, siTraefikproxy, siTrino, siTwilio, siVault, siVitess,
  siWebrtc, siWeightsandbiases, siElastic, siLogstash, siFluentd, siNewrelic, siApachehbase, siApachecouchdb,
} from "simple-icons";

// Brand marks render in their own color; generic components use the palette color.
const brandCache = new WeakMap();
function brand(icon) {
  if (brandCache.has(icon)) return brandCache.get(icon);
  const Brand = ({ size = 16 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" role="img" aria-hidden="true">
      <path d={icon.path} fill={`#${icon.hex}`} />
    </svg>
  );
  Brand.isBrand = true;
  brandCache.set(icon, Brand);
  return Brand;
}

const c = (kind, label, icon, color, keywords = "") => ({ kind, label, icon, color, keywords });
const t = (kind, label, icon, keywords = "") => ({ kind, label, icon: brand(icon), color: "slate", keywords, tech: true });
// A data model entity: a table node listing its columns, types and keys. The kinds are
// mirrored in server/modules/ai/data-model.js.
const m = (kind, label, icon, keywords, role) => ({ ...c(kind, label, icon, "teal", `data model schema columns keys erd ${keywords}`), nodeType: "tableNode", role });

export const catalog = [
  {
    id: "data-model", label: "Data model", items: [
      m("table", "Table", Table2, "sql relational entity rows primary key", "Table"),
      m("fact-table", "Fact table", Columns3, "star schema measures grain warehouse", "Fact"),
      m("dimension-table", "Dimension table", Tags, "star schema attributes scd warehouse", "Dimension"),
      m("collection", "Document / key-value", FileJson, "nosql collection item partition key dynamodb mongodb", "Document"),
      m("event-schema", "Event schema", ScrollText, "message payload topic avro protobuf contract", "Event"),
    ],
  },
  {
    id: "clients", label: "Clients & users", items: [
      c("client", "Web client", Globe, "blue", "browser spa frontend website"),
      c("mobile", "Mobile app", Smartphone, "blue", "ios android phone"),
      c("desktop", "Desktop app", Monitor, "blue", "electron native"),
      c("tablet", "Tablet", Tablet, "blue"),
      c("user", "User", User, "blue", "person actor customer"),
      c("users", "User group", Users, "blue", "people team actors"),
      c("admin", "Admin / operator", UserCog, "blue", "operator staff backoffice"),
      c("iot", "IoT device", Cpu, "blue", "sensor embedded edge device"),
      c("tv", "Smart TV", Tv, "blue", "streaming player"),
      c("wearable", "Wearable", Watch, "blue", "watch"),
      c("third-party-client", "Partner app", AppWindow, "blue", "external client integration"),
      c("vehicle", "Vehicle / driver app", Car, "blue", "driver rider gps"),
    ],
  },
  {
    id: "network", label: "Networking & edge", items: [
      c("dns", "DNS", Signpost, "teal", "domain resolver route53"),
      c("cdn", "CDN", Earth, "teal", "edge cache content delivery cloudfront"),
      c("load-balancer", "Load balancer", Split, "teal", "lb alb elb nlb traffic"),
      c("api-gateway", "API gateway", DoorOpen, "teal", "ingress edge routing"),
      c("reverse-proxy", "Reverse proxy", ArrowLeftRight, "teal", "proxy nginx envoy"),
      c("firewall", "Firewall / WAF", BrickWall, "teal", "waf security edge"),
      c("rate-limiter", "Rate limiter", Gauge, "teal", "throttle quota token bucket"),
      c("service-mesh", "Service mesh", Waypoints, "teal", "sidecar istio linkerd"),
      c("router", "Router / NAT", Router, "teal", "nat gateway network"),
      c("websocket", "WebSocket server", Radio, "teal", "realtime socket connection push"),
      c("service-discovery", "Service discovery", Compass, "teal", "registry consul eureka"),
      c("edge-function", "Edge function", Zap, "teal", "worker lambda@edge"),
      c("network", "Network", Network, "teal", "vpc subnet"),
    ],
  },
  {
    id: "compute", label: "Compute & services", items: [
      c("service", "Service", Server, "violet", "backend api app server"),
      c("microservice", "Microservice", Box, "violet", "service domain"),
      c("web-server", "Web server", ServerCog, "violet", "http app"),
      c("function", "Serverless function", SquareFunction, "violet", "lambda faas cloud function"),
      c("container", "Container", Container, "violet", "docker pod"),
      c("cluster", "Container cluster", Boxes, "violet", "kubernetes k8s ecs"),
      c("vm", "Virtual machine", MonitorCog, "violet", "ec2 instance host"),
      c("worker", "Worker", Cog, "violet", "consumer background job processor"),
      c("scheduler", "Scheduler / cron", CalendarClock, "violet", "cron timer delayed jobs"),
      c("batch-job", "Batch job", Layers, "violet", "offline processing"),
      c("bff", "Backend for frontend", LayoutTemplate, "violet", "bff aggregation"),
      c("auth-service", "Auth service", KeyRound, "violet", "login identity token"),
      c("notification-service", "Notification service", Bell, "violet", "push email sms alerts"),
      c("search-service", "Search service", Search, "violet", "query index"),
      c("payment-service", "Payment service", CreditCard, "violet", "billing checkout"),
      c("transcoder", "Media transcoder", Clapperboard, "violet", "video encoding ffmpeg"),
      c("matching-service", "Matching service", Shuffle, "violet", "dispatch matchmaking"),
      c("id-generator", "ID generator", Hash, "violet", "snowflake unique id sequence"),
      c("counter", "Counter service", Timer, "violet", "likes views aggregate"),
      c("cart", "Cart / order service", ShoppingCart, "violet", "ecommerce checkout order"),
      c("location-service", "Location service", MapPin, "violet", "geo gps tracking geohash"),
      c("leader", "Coordinator / leader", Crown, "violet", "leader election master primary"),
    ],
  },
  {
    id: "databases", label: "Databases", items: [
      c("database", "Relational DB", Database, "green", "sql postgres mysql rdbms"),
      c("document-db", "Document DB", FileJson, "green", "nosql mongodb json"),
      c("kv-store", "Key-value store", Key, "green", "dynamodb redis kv nosql"),
      c("wide-column", "Wide-column store", Columns3, "green", "cassandra bigtable hbase"),
      c("graph-db", "Graph DB", Share2, "green", "neo4j social graph relations"),
      c("timeseries-db", "Time-series DB", ChartLine, "green", "metrics influx timescale"),
      c("search-index", "Search index", ScanSearch, "green", "elasticsearch opensearch inverted index"),
      c("vector-db", "Vector DB", Orbit, "green", "embeddings ann similarity"),
      c("replica", "Read replica", Copy, "green", "replication follower secondary"),
      c("shard", "Shard / partition", LayoutGrid, "green", "partitioning sharding"),
      c("in-memory-db", "In-memory DB", MemoryStick, "green", "memory store"),
      c("ledger", "Ledger DB", Receipt, "green", "append-only audit financial"),
      c("db-backup", "Backup / snapshot", DatabaseBackup, "green", "restore pitr"),
    ],
  },
  {
    id: "cache", label: "Caching", items: [
      c("cache", "Cache", Zap, "orange", "redis memcached hot data"),
      c("distributed-cache", "Distributed cache", Layers, "orange", "cluster cache tier"),
      c("session-store", "Session store", Lock, "orange", "sessions tokens"),
      c("local-cache", "Local / in-process cache", MemoryStick, "orange", "lru client cache"),
      c("bloom-filter", "Bloom filter", Filter, "orange", "probabilistic dedupe"),
    ],
  },
  {
    id: "messaging", label: "Messaging & events", items: [
      c("queue", "Message queue", ListOrdered, "teal", "sqs rabbitmq job queue"),
      c("topic", "Pub/sub topic", Megaphone, "teal", "publish subscribe sns fanout"),
      c("stream", "Event stream", Activity, "teal", "kafka kinesis log"),
      c("event-bus", "Event bus", Cable, "teal", "eventbridge events"),
      c("dlq", "Dead-letter queue", ArchiveX, "teal", "dlq failed messages retry"),
      c("webhook", "Webhook", Webhook, "teal", "callback http"),
      c("stream-processor", "Stream processor", Workflow, "teal", "flink spark streaming"),
      c("outbox", "Outbox / CDC", RefreshCcw, "teal", "change data capture debezium"),
      c("retry", "Retry / delay queue", Repeat, "teal", "backoff"),
      c("inbox", "Inbox / mailbox", Inbox, "teal", "per-user messages"),
      c("email", "Email channel", Mail, "teal", "smtp"),
      c("sms", "SMS channel", MessageSquareText, "teal", "text message"),
      c("push", "Push notification", BellRing, "teal", "apns fcm mobile"),
      c("send", "Outbound sender", Send, "teal", "dispatcher"),
    ],
  },
  {
    id: "storage", label: "Storage", items: [
      c("storage", "Object storage", HardDrive, "rose", "s3 blob gcs bucket"),
      c("file-system", "File system", Folder, "rose", "nfs efs shared files"),
      c("block-storage", "Block storage", HardDriveDownload, "rose", "ebs volume disk"),
      c("data-lake", "Data lake", Waves, "rose", "lakehouse parquet raw zone"),
      c("archive", "Cold archive", Archive, "rose", "glacier backup retention"),
      c("image-store", "Image store", Image, "rose", "photos thumbnails"),
      c("video-store", "Video store", Film, "rose", "media segments"),
      c("document-store", "Document files", FileText, "rose", "pdf docs"),
    ],
  },
  {
    id: "data", label: "Data & analytics", items: [
      c("warehouse", "Data warehouse", Warehouse, "blue", "olap snowflake bigquery redshift"),
      c("etl", "ETL / ELT pipeline", Workflow, "blue", "transform load ingest"),
      c("orchestrator", "Orchestrator", GitBranch, "blue", "airflow dag dagster"),
      c("batch-processor", "Batch processor", Cpu, "blue", "spark hadoop mapreduce"),
      c("ingestion", "Ingestion service", HardDriveDownload, "blue", "collector intake"),
      c("data-catalog", "Data catalog", BookOpen, "blue", "metadata discovery"),
      c("dashboard", "BI dashboard", LayoutDashboard, "blue", "reporting looker tableau"),
      c("feature-store", "Feature store", Table2, "blue", "features online offline"),
      c("data-quality", "Data quality check", BadgeCheck, "blue", "tests expectations contracts"),
      c("lineage", "Lineage", GitFork, "blue", "provenance"),
      c("clickstream", "Event tracking SDK", MousePointerClick, "blue", "analytics clicks"),
      c("aggregator", "Aggregator", Layers, "blue", "rollup window"),
    ],
  },
  {
    id: "ml", label: "ML & AI", items: [
      c("training", "Model training", BrainCircuit, "violet", "train fit pipeline"),
      c("model-registry", "Model registry", Package, "violet", "artifacts versions"),
      c("model-serving", "Model serving", Rocket, "violet", "inference endpoint predict"),
      c("llm", "LLM", Bot, "violet", "gpt claude language model generation"),
      c("embedding", "Embedding service", Binary, "violet", "vectors encoder"),
      c("retriever", "Retriever", ScanSearch, "violet", "rag search retrieval"),
      c("experiment", "Experiment tracking", FlaskConical, "violet", "ab test mlflow"),
      c("labeling", "Labeling", Tags, "violet", "annotation ground truth"),
      c("gpu", "GPU cluster", Microchip, "violet", "accelerator tpu"),
      c("recommender", "Recommender", ThumbsUp, "violet", "ranking candidates"),
      c("evaluation", "Evaluation", ClipboardCheck, "violet", "eval metrics offline"),
      c("guardrails", "Guardrails", ShieldCheck, "violet", "safety filter moderation"),
      c("drift-monitor", "Drift monitor", TrendingDown, "violet", "model monitoring skew"),
      c("ai-agent", "AI agent", Sparkles, "violet", "tools planner"),
      c("vision", "Vision model", Eye, "violet", "image classification ocr"),
    ],
  },
  {
    id: "security", label: "Security & identity", items: [
      c("idp", "Identity provider", Fingerprint, "rose", "sso oidc saml okta"),
      c("oauth", "OAuth / token service", Ticket, "rose", "jwt tokens sts"),
      c("secrets", "Secrets manager", Vault, "rose", "vault credentials"),
      c("kms", "Key management", KeySquare, "rose", "kms encryption keys hsm"),
      c("certificate", "Certificates", FileBadge, "rose", "tls ssl pki"),
      c("iam", "Access policy / IAM", ShieldCheck, "rose", "rbac permissions authz"),
      c("ddos", "DDoS protection", ShieldHalf, "rose", "shield scrubbing"),
      c("fraud-check", "Fraud / risk check", ShieldAlert, "rose", "risk scoring abuse"),
      c("audit-log", "Audit log", ScrollText, "rose", "compliance trail"),
    ],
  },
  {
    id: "observability", label: "Observability & ops", items: [
      c("metrics", "Metrics", ChartLine, "orange", "prometheus monitoring"),
      c("logging", "Logging", Logs, "orange", "logs elk"),
      c("tracing", "Tracing", Route, "orange", "distributed tracing spans"),
      c("alerting", "Alerting", Siren, "orange", "alerts pager"),
      c("monitoring-dashboard", "Ops dashboard", Gauge, "orange", "grafana"),
      c("health-check", "Health check", HeartPulse, "orange", "liveness readiness probe"),
      c("on-call", "On-call", PhoneCall, "orange", "pagerduty incident"),
      c("ci-cd", "CI/CD pipeline", GitMerge, "orange", "build deploy pipeline"),
      c("config", "Config service", SlidersHorizontal, "orange", "configuration settings"),
      c("feature-flags", "Feature flags", Flag, "orange", "toggles rollout"),
      c("deployer", "Deployment controller", Rocket, "orange", "canary rollout release"),
      c("registry", "Artifact registry", Package2, "orange", "container images"),
      c("runbook", "Runbook / checks", ListChecks, "orange", "operations"),
      c("clock", "Clock / time sync", Clock, "orange", "ntp"),
    ],
  },
  {
    id: "external", label: "External systems", items: [
      c("external-api", "Third-party API", Plug, "slate", "vendor integration external"),
      c("payment-provider", "Payment provider", Wallet, "slate", "stripe processor psp bank"),
      c("email-provider", "Email provider", Mail, "slate", "ses sendgrid"),
      c("sms-provider", "SMS provider", Smartphone, "slate", "twilio"),
      c("maps", "Maps / geo API", MapIcon, "slate", "geocoding routing"),
      c("partner", "Partner system", Handshake, "slate", "b2b"),
      c("legacy", "Legacy system", Building2, "slate", "mainframe monolith"),
      c("logistics", "Logistics provider", Truck, "slate", "shipping delivery"),
      c("cloud", "Cloud provider", Cloud, "slate", "aws gcp azure"),
    ],
  },
];

export const techCatalog = [
  {
    id: "tech-data", label: "Databases & caches", items: [
      t("t-postgres", "PostgreSQL", siPostgresql, "sql relational"), t("t-mysql", "MySQL", siMysql, "sql relational"),
      t("t-mongodb", "MongoDB", siMongodb, "document nosql"), t("t-redis", "Redis", siRedis, "cache kv"),
      t("t-cassandra", "Cassandra", siApachecassandra, "wide column"), t("t-dynamodb", "DynamoDB", siAmazondynamodb, "aws kv"),
      t("t-scylla", "ScyllaDB", siScylladb, "wide column"), t("t-cockroach", "CockroachDB", siCockroachlabs, "distributed sql"),
      t("t-vitess", "Vitess", siVitess, "mysql sharding"), t("t-hbase", "HBase", siApachehbase, "wide column"),
      t("t-couchdb", "CouchDB", siApachecouchdb, "document"), t("t-neo4j", "Neo4j", siNeo4j, "graph"),
      t("t-elasticsearch", "Elasticsearch", siElasticsearch, "search"), t("t-clickhouse", "ClickHouse", siClickhouse, "olap analytics"),
      t("t-influxdb", "InfluxDB", siInfluxdb, "time series"), t("t-timescale", "TimescaleDB", siTimescale, "time series"),
      t("t-sqlite", "SQLite", siSqlite, "embedded"), t("t-supabase", "Supabase", siSupabase, "postgres"),
      t("t-firebase", "Firebase", siFirebase, "realtime"), t("t-etcd", "etcd", siEtcd, "consensus kv"),
    ],
  },
  {
    id: "tech-messaging", label: "Messaging & streaming", items: [
      t("t-kafka", "Kafka", siApachekafka, "stream log"), t("t-rabbitmq", "RabbitMQ", siRabbitmq, "queue amqp"),
      t("t-sqs", "Amazon SQS", siAmazonsqs, "queue aws"), t("t-pubsub", "Google Pub/Sub", siGooglepubsub, "topic gcp"),
      t("t-pulsar", "Pulsar", siApachepulsar, "stream"), t("t-nats", "NATS", siNatsdotio, "messaging"),
      t("t-flink", "Flink", siApacheflink, "stream processing"), t("t-socketio", "Socket.IO", siSocketdotio, "websocket realtime"),
      t("t-webrtc", "WebRTC", siWebrtc, "realtime media"), t("t-graphql", "GraphQL", siGraphql, "api"),
    ],
  },
  {
    id: "tech-cloud", label: "Cloud & infrastructure", items: [
      t("t-s3", "Amazon S3", siAmazons3, "object storage"), t("t-gcs", "Cloud Storage", siGooglecloudstorage, "object storage gcp"),
      t("t-minio", "MinIO", siMinio, "object storage"), t("t-ec2", "Amazon EC2", siAmazonec2, "vm compute"),
      t("t-lambda", "AWS Lambda", siAwslambda, "serverless"), t("t-gcp", "Google Cloud", siGooglecloud, "cloud"),
      t("t-cloudflare", "Cloudflare", siCloudflare, "cdn edge"), t("t-cf-workers", "CF Workers", siCloudflareworkers, "edge"),
      t("t-akamai", "Akamai", siAkamai, "cdn"), t("t-fastly", "Fastly", siFastly, "cdn"),
      t("t-nginx", "NGINX", siNginx, "proxy lb"), t("t-envoy", "Envoy", siEnvoyproxy, "proxy mesh"),
      t("t-traefik", "Traefik", siTraefikproxy, "proxy"), t("t-kong", "Kong", siKong, "api gateway"),
      t("t-kubernetes", "Kubernetes", siKubernetes, "k8s orchestration"), t("t-docker", "Docker", siDocker, "container"),
      t("t-helm", "Helm", siHelm, "k8s"), t("t-istio", "Istio", siIstio, "mesh"),
      t("t-terraform", "Terraform", siTerraform, "iac"), t("t-argo", "Argo", siArgo, "gitops cd"),
      t("t-gh-actions", "GitHub Actions", siGithubactions, "ci"), t("t-consul", "Consul", siConsul, "discovery"),
      t("t-vault", "Vault", siVault, "secrets"),
    ],
  },
  {
    id: "tech-analytics", label: "Data platforms", items: [
      t("t-spark", "Spark", siApachespark, "batch"), t("t-airflow", "Airflow", siApacheairflow, "orchestration"),
      t("t-dbt", "dbt", siDbt, "transform"), t("t-snowflake", "Snowflake", siSnowflake, "warehouse"),
      t("t-bigquery", "BigQuery", siGooglebigquery, "warehouse"), t("t-redshift", "Redshift", siAmazonredshift, "warehouse"),
      t("t-databricks", "Databricks", siDatabricks, "lakehouse"), t("t-trino", "Trino", siTrino, "query"),
      t("t-druid", "Druid", siApachedruid, "olap"), t("t-duckdb", "DuckDB", siDuckdb, "olap"),
      t("t-hadoop", "Hadoop", siApachehadoop, "hdfs"), t("t-airbyte", "Airbyte", siAirbyte, "ingestion"),
      t("t-metabase", "Metabase", siMetabase, "bi"),
    ],
  },
  {
    id: "tech-ml", label: "ML & AI", items: [
      t("t-openai", "OpenAI", siOpenai, "llm"), t("t-anthropic", "Anthropic", siAnthropic, "llm claude"),
      t("t-huggingface", "Hugging Face", siHuggingface, "models"), t("t-pytorch", "PyTorch", siPytorch, "training"),
      t("t-tensorflow", "TensorFlow", siTensorflow, "training"), t("t-mlflow", "MLflow", siMlflow, "tracking registry"),
      t("t-ray", "Ray", siRay, "distributed"), t("t-wandb", "Weights & Biases", siWeightsandbiases, "experiments"),
      t("t-langchain", "LangChain", siLangchain, "llm"), t("t-ollama", "Ollama", siOllama, "local llm"),
      t("t-nvidia", "NVIDIA GPU", siNvidia, "gpu"),
    ],
  },
  {
    id: "tech-ops", label: "Observability", items: [
      t("t-prometheus", "Prometheus", siPrometheus, "metrics"), t("t-grafana", "Grafana", siGrafana, "dashboards"),
      t("t-datadog", "Datadog", siDatadog, "monitoring"), t("t-otel", "OpenTelemetry", siOpentelemetry, "tracing"),
      t("t-jaeger", "Jaeger", siJaeger, "tracing"), t("t-sentry", "Sentry", siSentry, "errors"),
      t("t-elastic", "Elastic", siElastic, "logs"), t("t-kibana", "Kibana", siKibana, "logs"), t("t-logstash", "Logstash", siLogstash, "logs"),
      t("t-fluentd", "Fluentd", siFluentd, "logs"), t("t-splunk", "Splunk", siSplunk, "logs"),
      t("t-newrelic", "New Relic", siNewrelic, "apm"), t("t-cloudwatch", "CloudWatch", siAmazoncloudwatch, "aws metrics"),
      t("t-pagerduty", "PagerDuty", siPagerduty, "on-call"),
    ],
  },
  {
    id: "tech-saas", label: "SaaS & identity", items: [
      t("t-stripe", "Stripe", siStripe, "payments"), t("t-paypal", "PayPal", siPaypal, "payments"),
      t("t-twilio", "Twilio", siTwilio, "sms"), t("t-sendgrid", "SendGrid", siSendgrid, "email"),
      t("t-mailgun", "Mailgun", siMailgun, "email"), t("t-slack", "Slack", siSlack, "chat"),
      t("t-gmaps", "Google Maps", siGooglemaps, "geo"), t("t-auth0", "Auth0", siAuth0, "identity"),
      t("t-okta", "Okta", siOkta, "identity sso"), t("t-keycloak", "Keycloak", siKeycloak, "identity"),
    ],
  },
];

// Shapes that aren't single components.
export const shapeItems = [
  { kind: "group", label: "Zone / boundary", icon: SquareDashed, color: "slate", nodeType: "groupNode", keywords: "region vpc boundary container group area" },
  { kind: "text", label: "Text label", icon: Type, color: "slate", nodeType: "textNode", keywords: "heading title caption" },
  { kind: "note", label: "Decision note", icon: StickyNote, color: "orange", nodeType: "noteNode", keywords: "assumption rationale sticky" },
];

const allItems = [...catalog.flatMap((group) => group.items), ...techCatalog.flatMap((group) => group.items), ...shapeItems];
const byKind = new Map(allItems.map((item) => [item.kind, item]));
export const componentCount = allItems.length - shapeItems.length;

export function getItem(kind) {
  return byKind.get(kind);
}

export function searchItems(term) {
  const needle = term.trim().toLowerCase();
  if (!needle) return [];
  return allItems.filter((item) => `${item.label} ${item.keywords} ${item.kind}`.toLowerCase().includes(needle)).slice(0, 60);
}

export const nodeColors = ["blue", "violet", "green", "orange", "teal", "rose", "slate"];

export const DATA_MODEL_KINDS = catalog[0].items.map((item) => item.kind);
export const isDataModelKind = (kind) => DATA_MODEL_KINDS.includes(kind);
// Tracks whose rounds usually need a data model: the brief and the empty canvas point at tables.
export const DATA_MODEL_TRACKS = new Set(["data-engineering", "machine-learning"]);

// Column keys a data model table can mark, in display order.
export const COLUMN_KEYS = [
  { id: "pk", label: "PK", title: "Primary key" },
  { id: "fk", label: "FK", title: "Foreign key: references another table" },
  { id: "part", label: "Partition", title: "Partition key (or shard / distribution key)" },
  { id: "sort", label: "Sort", title: "Sort, cluster or range key" },
];
export const COLUMN_TYPES = ["bigint", "int", "string", "varchar", "text", "uuid", "decimal(12,2)", "float", "boolean", "date", "timestamp", "json", "array<string>", "map<string,string>"];
