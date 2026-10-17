export default {
  blocks: [
    { type: "p", text: "This **system design roadmap** is an ordered path through the concepts that system design interviews and real architecture work rely on. It starts with how interviews are run and how to estimate scale, moves through networking, storage, caching and asynchronous processing, and ends with distributed systems, reliability and full practice designs. Every step links to a free guide in the handbook, and most steps end with a design round that tests what you just read." },
    { type: "callout", tone: "tip", text: "Tick the box on a topic once you can explain it out loud without notes. Your progress is saved in this browser, and it carries over to the discipline roadmaps that share the same topics." },

    { type: "roadmap", id: "system-design" },

    { type: "h2", text: "How to use this roadmap" },
    { type: "p", text: "Work top to bottom. The early steps are the vocabulary that the later ones assume: you can't argue about [sharding](/learn/sharding) until [replication](/learn/replication) and [indexing](/learn/database-indexing) are second nature, and [consensus](/learn/consensus) makes little sense before [consistency models](/learn/consistency-models). Solid cards are core topics that come up in almost every interview. Dashed cards are good to know: read them on a second pass or when a practice round needs them." },
    { type: "ul", items: [
      "**Read, then explain.** After each guide, close it and explain the idea in two minutes, including one trade-off and one place it's used. If you can't, re-read the section you stumbled on.",
      "**Practise at the end of every step.** The practice rounds under a step are chosen so the topics you just read are the ones the interviewer will probe.",
      "**Don't memorise architectures.** Interviewers reward reasoning about requirements and trade-offs, not a recited diagram. Use the roadmap to build the reasoning.",
    ] },

    { type: "h2", text: "A realistic study plan" },
    { type: "table", head: ["Week", "Steps", "Goal by the end of the week"], rows: [
      ["1", "1-3", "Run the interview framework, estimate QPS and storage, and explain a request's path through DNS, load balancers and a CDN."],
      ["2", "4-5", "Choose a database for a given access pattern and explain how replicas, shards and caches change it."],
      ["3", "6-7", "Decide when work should be asynchronous, and explain delivery guarantees and why consumers must be idempotent."],
      ["4", "8-9", "Add rate limits, timeouts and failover to a design, and describe how it is deployed and observed."],
      ["5+", "10", "Two or three full practice designs a week, reviewing what the interviewer pushed on each time."],
    ] },
    { type: "p", text: "Five weeks at about an hour a day is enough for most mid-level interviews if you already write backend code. If you're newer to the field, spend twice as long on steps 3 to 5; they carry most of the weight in junior and mid-level rounds. Senior candidates should spend more time on steps 7 to 9, where the follow-up questions get harder." },

    { type: "h2", text: "Which roadmap should I follow?" },
    { type: "p", text: "This roadmap is the general path that every software engineer benefits from. If you're interviewing for a specific discipline, follow its roadmap after (or alongside) this one:" },
    { type: "table", head: ["You're interviewing for", "Follow"], rows: [
      ["Backend or general SDE roles, including low-level design rounds", "[Backend (SDE) roadmap](/learn/backend-system-design-roadmap)"],
      ["Data engineering", "[Data engineering roadmap](/learn/data-engineering-roadmap)"],
      ["Machine learning, ML platform or AI engineering", "[ML system design roadmap](/learn/machine-learning-system-design-roadmap)"],
      ["Platform, infrastructure, DevOps or SRE", "[Platform and SRE roadmap](/learn/platform-engineering-roadmap)"],
      ["Storage, databases or infrastructure at the distributed-systems level", "[Distributed systems roadmap](/learn/distributed-systems-roadmap)"],
      ["Frontend, web or mobile", "[Frontend system design roadmap](/learn/frontend-system-design-roadmap)"],
    ] },

    { type: "h2", text: "Frequently asked questions" },
    { type: "h3", text: "How long does it take to learn system design?" },
    { type: "p", text: "Expect four to eight weeks of steady practice to be comfortable in an interview, longer for senior roles. The concepts themselves can be read in a couple of weeks; the time goes into practising full designs until the framework and the trade-offs come naturally." },
    { type: "h3", text: "Can a beginner or fresher learn system design?" },
    { type: "p", text: "Yes. Start at step 1 and don't skip the foundations. Junior interviews focus on a clean high-level design, sensible data storage and basic scaling (load balancing, caching, replication), which steps 1 to 5 cover. Start with [the URL shortener](/system-design/url-shortener) and [paste service](/system-design/paste-service) rounds." },
    { type: "h3", text: "What is the difference between HLD and LLD?" },
    { type: "p", text: "High-level design (HLD) is the architecture of a whole system: services, data stores, queues and how requests flow. Low-level design (LLD) is the code inside one component: classes, interfaces and design patterns. See [HLD vs LLD](/learn/hld-vs-lld) for what each round expects." },
    { type: "h3", text: "Do I need to know specific technologies like Kafka or Redis?" },
    { type: "p", text: "Know what a category of technology does and its trade-offs: a log-based broker, an in-memory cache, a wide-column store. Naming a product is fine as an example, but interviewers care that you know *why* it fits. The guides on [Kafka](/learn/event-streaming-kafka) and [Redis](/learn/redis) are written that way." },
  ],
  related: ["backend-system-design-roadmap", "system-design-interview", "system-design-interview-questions", "how-to-practice-system-design", "hld-vs-lld"],
  practice: ["url-shortener", "chat-system", "news-feed", "rate-limiter"],
  reading: [
    { title: "Designing Data-Intensive Applications", publisher: "Martin Kleppmann, O'Reilly", url: "https://dataintensive.net/" },
    { title: "The System Design Primer", publisher: "Donne Martin, GitHub", url: "https://github.com/donnemartin/system-design-primer" },
    { title: "Site Reliability Engineering (free online book)", publisher: "Google", url: "https://sre.google/sre-book/table-of-contents/" },
  ],
};
