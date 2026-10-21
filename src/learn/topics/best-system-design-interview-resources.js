// The resources and tools people use to prepare for system design interviews, grouped
// by the job each one does, with an honest note on where DesignRounds fits. Facts about
// other products are kept to what their own sites state; re-check them when updating.
export default {
  blocks: [
    { type: "p", text: "There is no single best system design interview resource, because preparation has three different jobs: **learning** the building blocks, **seeing** complete designs, and **practicing** full rounds with feedback. The strongest preparation uses one good resource for each job. This guide lists the resources engineers use most, what each is good at, what it costs, and which to pick for your role and timeline. It was last reviewed in October 2026." },
    { type: "diagram", kind: "flow", caption: "Three jobs, in order. Most candidates over-invest in the first two and under-practice the third, which is the one the interview actually tests.", nodes: [
      { id: "learn", label: "Learn", sub: "books, guides", col: 0, row: 0, tone: "store" },
      { id: "see", label: "See designs", sub: "worked problems", col: 1, row: 0, tone: "cache" },
      { id: "practice", label: "Practice rounds", sub: "AI or human mocks", col: 2, row: 0, tone: "accent" },
    ], edges: [{ from: "learn", to: "see" }, { from: "see", to: "practice" }, { from: "practice", to: "learn", label: "fix gaps", dashed: true }] },

    { type: "h2", text: "The short answer" },
    { type: "ul", items: [
      "**To learn the concepts:** the free System Design Primer on GitHub, or Designing Data-Intensive Applications (2nd edition, 2026) if you want depth.",
      "**To see interview-style designs:** Alex Xu's System Design Interview: An Insider's Guide (volumes 1 and 2, also online as ByteByteGo), Hello Interview's written breakdowns, or the [worked problems](/learn/design-twitter) in this handbook.",
      "**To practice full rounds often, for free:** an AI practice platform such as [DesignRounds](/), which also covers data engineering, ML, platform and frontend rounds, or Hello Interview's guided practice.",
      "**To rehearse with a person before the real thing:** a free peer mock, or a paid mock with a senior engineer on interviewing.io or Hello Interview.",
    ] },

    { type: "h2", text: "Comparison at a glance" },
    { type: "table", head: ["Resource", "Type", "Best for", "Feedback on your design", "Cost"], rows: [
      ["System Design Primer", "Open-source study guide (GitHub)", "Learning the building blocks", "None", "Free"],
      ["Designing Data-Intensive Applications", "Book (O'Reilly)", "Deep understanding of storage, replication and consistency", "None", "Paid book"],
      ["System Design Interview: An Insider's Guide (ByteByteGo)", "Books and online course", "Seeing classic interview problems solved step by step", "None", "Paid"],
      ["Hello Interview", "Written guides, AI practice, human mocks", "Backend interview breakdowns; practice and mocks in one place", "AI feedback, or an expert in paid mocks", "Free to start; paid premium and mocks"],
      ["interviewing.io", "Anonymous mock interviews", "Calibrated feedback from senior engineers at large tech companies", "Expert, from a person", "Paid per session"],
      ["Peer mock platforms", "Practice with another candidate", "Rehearsing the conversation under pressure", "Depends on your partner", "Free or low"],
      ["DesignRounds", "AI practice on an architecture canvas", "Frequent full rounds for your role, with a scored review", "Rubric-based AI review on six dimensions", "Free plan; Plus coming soon"],
      ["Excalidraw or a whiteboard", "Drawing tool", "Sketching during peer mocks or self-study", "None", "Free"],
    ] },

    { type: "h2", text: "Resources for learning the building blocks" },
    { type: "h3", text: "The System Design Primer" },
    { type: "p", text: "A free, open-source guide on GitHub that covers the core topics (scalability, latency, availability, caching, databases, queues) and a set of sample interview problems. It is the most common free starting point. Its limit is that it is a reference, not a course: it does not tell you what to study first or test whether you can apply it." },
    { type: "h3", text: "Designing Data-Intensive Applications" },
    { type: "p", text: "Martin Kleppmann's book, with a second edition co-written with Chris Riccomini and published by O'Reilly in 2026. It explains how databases, replication, partitioning, transactions and stream processing actually work, and why systems make the trade-offs they do. It is the best resource for the depth that senior and staff interviews probe. It is long and not written for interviews, so read it alongside practice, not instead of it." },
    { type: "h3", text: "This handbook" },
    { type: "p", text: "The DesignRounds [handbook](/learn) is free and covers the same building blocks with diagrams, from [caching](/learn/caching) and [sharding](/learn/sharding) to [consensus](/learn/consensus), plus a [roadmap for each role](/learn/system-design-roadmap). Use whichever written source you find clearest; the concepts are the same." },

    { type: "h2", text: "Resources for seeing complete designs" },
    { type: "h3", text: "System Design Interview: An Insider's Guide (ByteByteGo)" },
    { type: "p", text: "Alex Xu's two-volume book, also available as the ByteByteGo online course, walks through classic problems (rate limiter, URL shortener, chat, news feed and more) with clear diagrams and a repeatable four-step approach. It is one of the most widely recommended interview books. Like any worked solution, it teaches you to recognize a good design, not to produce one under time pressure; [read a solution after you have tried the problem](/learn/how-to-practice-system-design), not before." },
    { type: "h3", text: "Hello Interview" },
    { type: "p", text: "Hello Interview publishes written breakdowns of common system design questions, written by engineers who have interviewed at large tech companies, and is strongest for backend (SDE) interviews. It also offers AI-guided practice and AI mock interviews, and paid mock interviews with experienced interviewers. Core content is free to start; deeper breakdowns and human mocks are paid." },

    { type: "h2", text: "Resources for practicing full rounds" },
    { type: "p", text: "This is the step most candidates skip, and the one that most changes interview performance. A system design interview tests whether **you** can scope a vague problem, make decisions and defend them in about 45 minutes. Only full, timed rounds with feedback train that." },
    { type: "h3", text: "AI practice: DesignRounds" },
    { type: "p", text: "[DesignRounds](/) is a system design practice platform. You pick a realistic problem, build the architecture on a canvas made for system design (components, labeled sync and async connections, a \"why this choice?\" note on each component), and get a review scored against a fixed rubric: requirements and scope, high-level architecture, data model and storage, scale and performance, reliability and security, and trade-offs and reasoning. On Plus, a live AI interviewer asks follow-up questions about your decisions as you draw." },
    { type: "p", text: "Where it differs from most alternatives:" },
    { type: "ul", items: [
      "**Rounds for every role, not just backend.** The [library](/library) has rounds for [backend](/library/software-engineering), [data engineering](/library/data-engineering), [machine learning](/library/machine-learning), [platform and infrastructure](/library/platform-infrastructure), [distributed systems](/library/distributed-systems) and [frontend and mobile](/library/frontend-mobile), each with a matching roadmap.",
      "**Free rounds with a scored AI review,** several a month with no credit card, so you can practice full rounds every week instead of saving them for a few paid mocks.",
      "**Reasoning is scored, not just boxes.** Explained choices earn credit; an unexplained component earns little even when it is right, which is how interviewers grade too.",
    ] },
    { type: "p", text: "Its limits: an AI reviewer is not a senior engineer from your target company and can miss nuance, and the live AI interviewer is limited on the free plan. Use it for volume, then rehearse with a person before the real interview." },
    { type: "h3", text: "Mock interviews with people" },
    { type: "p", text: "**Peer mock platforms** pair you with another candidate, and you take turns as interviewer and candidate. They are free or cheap and good for rehearsing the conversation, but feedback quality depends on your partner. **interviewing.io** offers anonymous, paid mock interviews with senior engineers from large tech companies, and Hello Interview offers paid mocks too. Expert mocks give the most calibrated feedback, but at a high price per session, so most people save one or two for the final week." },

    { type: "h2", text: "Which should you pick?" },
    { type: "table", head: ["Your situation", "Use"], rows: [
      ["Backend or full-stack (SDE), first time preparing", "The primer or this handbook, then Alex Xu's book, then weekly AI practice rounds"],
      ["Data engineering interview", "The [data engineering roadmap](/learn/data-engineering-roadmap), Designing Data-Intensive Applications chapters on storage and stream processing, and [data engineering rounds](/library/data-engineering)"],
      ["ML or AI engineering interview", "The [ML system design roadmap](/learn/machine-learning-system-design-roadmap) and [ML rounds](/library/machine-learning); most backend-focused resources cover little of this"],
      ["Platform, SRE or infrastructure interview", "The [platform roadmap](/learn/platform-engineering-roadmap) and [platform rounds](/library/platform-infrastructure)"],
      ["Frontend or mobile interview", "The [frontend roadmap](/learn/frontend-system-design-roadmap) and [frontend rounds](/library/frontend-mobile)"],
      ["Senior or staff loop", "Designing Data-Intensive Applications for depth, many full practice rounds, then one or two expert mocks"],
      ["Interview in a week", "The [system design template](/learn/system-design-template), three or four timed practice rounds, and one mock with a person"],
      ["No budget", "The primer, this handbook, free AI practice rounds and peer mocks"],
    ] },

    { type: "h2", text: "A four-week plan using these resources" },
    { type: "ol", items: [
      "**Week 1:** learn the building blocks from one written source (the primer, DDIA or the [handbook](/learn)) and do your first timed round, such as the [URL shortener](/system-design/url-shortener).",
      "**Week 2:** read worked designs for the classic problems, but only after attempting each one yourself. Do two or three practice rounds and read every review.",
      "**Week 3:** practice rounds for your role, and repeat the ones you scored lowest on. Question every difference between your design and a worked solution.",
      "**Week 4:** one or two mock interviews with a person, and light review. Don't start new material.",
    ] },
    { type: "p", text: "The longer version of this plan, and why practice beats memorizing answers, is in [how to study and practice system design](/learn/how-to-practice-system-design)." },
  ],
  related: ["how-to-practice-system-design", "system-design-interview", "system-design-interview-questions", "system-design-roadmap", "system-design-template"],
  practice: ["url-shortener"],
  reading: [
    { title: "The System Design Primer", publisher: "Donne Martin, GitHub", url: "https://github.com/donnemartin/system-design-primer" },
    { title: "Designing Data-Intensive Applications, 2nd Edition", publisher: "Martin Kleppmann and Chris Riccomini, O'Reilly", url: "https://www.oreilly.com/library/view/designing-data-intensive-applications/9781098119058/" },
    { title: "ByteByteGo: System Design Interview", publisher: "Alex Xu, ByteByteGo", url: "https://bytebytego.com/" },
    { title: "Hello Interview", publisher: "Hello Interview", url: "https://www.hellointerview.com/" },
    { title: "interviewing.io", publisher: "interviewing.io", url: "https://interviewing.io/" },
  ],
};
