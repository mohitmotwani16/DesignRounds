export default {
  blocks: [
    { type: "p", text: "The **Domain Name System (DNS)** translates names like `api.example.com` into IP addresses. It is a globally distributed, heavily cached, hierarchical database, and it is the first step of almost every request on the internet. In system design it also matters as a tool: DNS is how traffic is steered between regions and failed over between data centers." },

    { type: "h2", text: "How a lookup works" },
    { type: "p", text: "Your device asks a **recursive resolver** (run by your ISP, or public ones like 8.8.8.8 and 1.1.1.1). If the resolver has the answer cached, it replies immediately. Otherwise it walks the hierarchy from the top:" },
    { type: "diagram", kind: "sequence", caption: "A cold lookup walks root → TLD → authoritative servers. Every answer is cached for its TTL, so most lookups never leave the resolver.", actors: ["Browser", "Resolver", "Root", ".com TLD", "example.com NS"], steps: [
      { from: 0, to: 1, label: "api.example.com?" },
      { from: 1, to: 2, label: "api.example.com?" },
      { from: 2, to: 1, label: "ask .com servers", dashed: true },
      { from: 1, to: 3, label: "api.example.com?" },
      { from: 3, to: 1, label: "ask ns1.example.com", dashed: true },
      { from: 1, to: 4, label: "api.example.com?" },
      { from: 4, to: 1, label: "A 203.0.113.10, TTL 60", tone: "accent" },
      { from: 1, to: 0, label: "203.0.113.10 (cached 60 s)", tone: "accent" },
    ] },
    { type: "ol", items: [
      "The **root servers** (13 named root server identities, served by hundreds of anycast instances) point to the servers for the top-level domain, like `.com`.",
      "The **TLD servers** point to the domain's **authoritative name servers**, the ones the domain owner configured (for example Route 53 or Cloudflare).",
      "The **authoritative server** returns the actual record. The resolver caches every step, so next time it skips straight to the answer.",
    ] },
    { type: "p", text: "Browsers and operating systems keep their own caches too. DNS mostly runs over [UDP](/learn/tcp-vs-udp) on port 53 because a lookup fits in one small packet; encrypted variants (DNS over HTTPS and over TLS) protect privacy." },

    { type: "h2", text: "Record types you'll use" },
    { type: "table", head: ["Record", "Maps", "Example use"], rows: [
      ["A / AAAA", "Name → IPv4 / IPv6 address", "`api.example.com → 203.0.113.10`"],
      ["CNAME", "Name → another name", "`www.example.com → example.cdn-provider.net` to point at a CDN"],
      ["ALIAS / ANAME", "Root domain → name, flattened to IPs", "Point `example.com` itself at a load balancer (CNAME isn't allowed at the root)"],
      ["MX", "Domain → mail servers with priorities", "Email delivery"],
      ["TXT", "Name → arbitrary text", "Domain ownership verification, SPF and DKIM for email"],
      ["NS", "Domain → its authoritative servers", "Delegating a domain or subdomain"],
      ["SRV", "Service → host and port", "Service discovery in some systems. See [service discovery](/learn/service-discovery)"],
    ] },

    { type: "h2", text: "TTL: the knob that matters" },
    { type: "p", text: "Every record has a **time to live**: how long resolvers may cache it. The trade-off is direct:" },
    { type: "ul", items: [
      "**Long TTL** (hours): fewer lookups, faster page loads, less load on name servers, but changes and failovers take hours to reach everyone.",
      "**Short TTL** (30–60 s): fast failover and traffic shifting, but more lookups. Also, some resolvers and clients ignore TTLs or enforce minimums, so DNS failover is never instant.",
    ] },
    { type: "callout", text: "Before a planned migration, lower the TTL a day ahead so the old long TTL expires everywhere; switch the record; raise the TTL again afterwards." },

    { type: "h2", text: "DNS as a traffic tool" },
    { type: "table", head: ["Technique", "What it does", "Example"], rows: [
      ["Round-robin DNS", "Return several IPs; clients spread across them", "Simple load spreading, with no health awareness"],
      ["Weighted records", "Return IPs in proportion to weights", "Send 5% of traffic to a new region"],
      ["Latency / geo routing", "Answer based on the resolver's location", "Users in Mumbai get the Asia region's address"],
      ["Health-checked failover", "Stop returning an endpoint whose health check fails", "Fail over from a dead region to a standby"],
      ["Anycast", "Many servers share one IP; the network routes to the nearest", "Public resolvers, CDNs and DDoS protection"],
    ] },
    { type: "diagram", kind: "flow", caption: "GeoDNS sends each user to their nearest healthy region; if a region fails its health checks, its users are answered with another region.", nodes: [
      { id: "u1", label: "User in Europe", col: 0, row: 0, shape: "pill" },
      { id: "u2", label: "User in India", col: 0, row: 1, shape: "pill" },
      { id: "dns", label: "GeoDNS", sub: "health-checked", col: 1, row: 0.5, tone: "accent" },
      { id: "eu", label: "eu-west region", col: 2, row: 0 },
      { id: "ap", label: "ap-south region", col: 2, row: 1 },
    ], edges: [
      { from: "u1", to: "dns" }, { from: "u2", to: "dns" },
      { from: "dns", to: "eu", label: "EU users" }, { from: "dns", to: "ap", label: "India users" },
    ] },

    { type: "h2", text: "DNS as a failure point" },
    { type: "p", text: "Because everything starts with DNS, a DNS outage looks like the whole internet is down for your users. Large outages (the 2016 Dyn attack, several cloud DNS incidents) took down many big sites at once. Mitigations: use a provider with a strong track record and anycast, consider two independent DNS providers for critical domains, and keep TTLs reasonable so cached answers keep working through short outages." },
  ],
  uses: [
    { name: "Netflix and global services", text: "Use DNS-based routing (for example Route 53 latency and failover records) to send users to the nearest healthy region and to evacuate a failing region." },
    { name: "CDNs", text: "Customers CNAME their hostnames to the CDN, which then answers with the closest edge location's address. See [CDN](/learn/cdn)." },
    { name: "Cloudflare 1.1.1.1 and Google 8.8.8.8", text: "Public recursive resolvers served from hundreds of locations via anycast." },
    { name: "Kubernetes", text: "CoreDNS gives every service a stable name like `orders.default.svc.cluster.local` that resolves to its current address." },
  ],
  interview: [
    "Mention DNS as the first hop when you walk through a request, and use GeoDNS or latency routing for multi-region designs.",
    "Know the TTL trade-off and that DNS failover takes at least the TTL (often longer) to take effect.",
    "Use CNAMEs to point your domain at a CDN or managed load balancer.",
    "Don't use plain round-robin DNS as your only load balancer: it has no health checks and clients cache answers.",
  ],
  related: ["cdn", "load-balancing", "tcp-vs-udp", "http", "service-discovery", "disaster-recovery"],
  practice: ["multi-region", "service-discovery", "url-shortener"],
};
