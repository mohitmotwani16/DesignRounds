// Long-form guides. Each is a list of blocks rendered by src/pages/Guide.jsx.
// Inline syntax in text: [label](/path) for internal links and **bold**.
// Block types: h2, h3, p, ul, ol, callout, rounds (linked list of practice rounds), table.

const PUBLISHED = "2026-10-14";

export const GUIDES = [
  {
    slug: "system-design-interview",
    path: "/guide/system-design-interview",
    title: "How to Prepare for a System Design Interview: A Practice-First Guide",
    short: "How to prepare for a system design interview",
    description: "A practical guide to system design interview preparation: what interviewers assess, a step-by-step framework for 45 minutes, common mistakes, and a 4-week practice plan.",
    published: PUBLISHED,
    updated: PUBLISHED,
    readingMinutes: 12,
    blocks: [
      { type: "p", text: "A system design interview asks you to design a real system, such as a URL shortener, a chat service or a news feed, in about 45 minutes, while explaining your reasoning out loud. There is no single correct answer. The interviewer is judging **how you think**: whether you clarify the problem, make sensible choices for the stated scale, and can defend the trade-offs behind them." },
      { type: "p", text: "Most preparation advice tells you what to read. This guide focuses on what actually moves the needle: practicing complete designs, under realistic constraints, and getting honest feedback on your reasoning." },

      { type: "h2", text: "What interviewers are actually assessing" },
      { type: "p", text: "Interviewers at most companies score some version of the same dimensions. Knowing them tells you where to spend your 45 minutes." },
      { type: "ul", items: [
        "**Requirements and scope.** Do you find out who uses the system, what it must do, and at what scale before drawing anything? Do you set sensible limits on scope?",
        "**High-level architecture.** Is there a coherent end-to-end design where each component has a clear job?",
        "**Data model and storage.** Do your storage choices match the access patterns, consistency needs and data volume?",
        "**Scale and performance.** Can you find the bottleneck and explain how the design handles it, with rough numbers?",
        "**Reliability and security.** What happens when a component fails, a region goes down, or traffic spikes? How is abuse handled?",
        "**Trade-offs and reasoning.** Can you say why you chose something, when it would be the wrong choice, and what you rejected? This is the dimension candidates most often underplay.",
      ] },
      { type: "callout", text: "Naming a technology is not a reason. \"We use Kafka\" earns little; \"we put a queue between ingestion and processing so a slow consumer can't block writes, and we accept that downstream data is a few seconds stale\" earns a lot." },

      { type: "h2", text: "A step-by-step framework for a 45-minute round" },
      { type: "p", text: "Time pressure is where most designs fall apart. A simple budget keeps you from spending 30 minutes on requirements or diving into one component before the whole system exists." },
      { type: "table", head: ["Phase", "Time", "What to do"], rows: [
        ["1. Clarify requirements", "5 min", "Functional requirements, users, the core operations, and what is out of scope."],
        ["2. Estimate scale", "3–5 min", "Requests per second, read/write ratio, data size and growth. Rough orders of magnitude are enough."],
        ["3. Define the API", "3–5 min", "The handful of endpoints or events that matter. It forces precision about inputs and outputs."],
        ["4. High-level design", "10 min", "Draw the end-to-end flow for the core operations: clients, services, storage, caches, queues."],
        ["5. Deep dives", "15 min", "Go deep on the hardest parts: the bottleneck, the data model, consistency, failure handling."],
        ["6. Trade-offs and wrap-up", "3–5 min", "Summarize key decisions, their costs, and what you would do next with more time."],
      ] },
      { type: "h3", text: "1. Clarify requirements" },
      { type: "p", text: "Ask about users, core use cases and scale before designing. For a [URL shortener](/system-design/url-shortener) that means: do links expire, are custom aliases needed, and how many redirects per second? Write the answers down; they are your yardstick for every later decision." },
      { type: "h3", text: "2. Estimate scale" },
      { type: "p", text: "Back-of-the-envelope numbers tell you which problems are real. A system with 100 writes per second and 10,000 reads per second is a read-scaling problem, so caching and replicas matter far more than write throughput. Keep the math simple and state your assumptions." },
      { type: "h3", text: "3. Define the API" },
      { type: "p", text: "List the few operations that matter, such as `POST /links` and `GET /{code}`. A clear API stops the design from drifting and gives the interviewer something concrete to probe." },
      { type: "h3", text: "4. Sketch the high-level design" },
      { type: "p", text: "Draw the whole path for the core operations before optimizing any part of it. Label the connections: what is sent, whether the call is synchronous or asynchronous, and which direction data flows. An unlabeled box-and-arrow diagram hides your thinking." },
      { type: "h3", text: "5. Go deep where it matters" },
      { type: "p", text: "Pick the two or three hardest parts and design them properly. For a [chat system](/system-design/chat-system) that is usually connection management, message ordering and offline delivery. For a [news feed](/system-design/news-feed) it is fan-out on write versus fan-out on read, and what happens when a celebrity posts." },
      { type: "h3", text: "6. Close with trade-offs" },
      { type: "p", text: "Summarize the two or three decisions that shaped the design, what each one costs, and when you would revisit it. This is often what separates a solid answer from a strong one." },

      { type: "h2", text: "The most common system design interview mistakes" },
      { type: "ul", items: [
        "**Designing before clarifying.** Jumping to components before agreeing on requirements and scale.",
        "**Buzzword architecture.** Adding Kafka, Redis and microservices because they sound senior, not because the problem needs them.",
        "**No numbers.** Claiming a design scales without any estimate of load or data size.",
        "**One-sided choices.** Presenting decisions without their cost, such as eventual consistency or operational overhead.",
        "**Ignoring failure.** Never discussing what happens when a dependency is slow or down.",
        "**Going silent.** The interviewer can only score reasoning you say out loud.",
      ] },

      { type: "h2", text: "How to practice: the loop that actually works" },
      { type: "p", text: "Reading solutions builds recognition. Interviews test production: building a design from a blank page and defending it. That only improves with practice that looks like the real thing." },
      { type: "ol", items: [
        "**Pick a realistic prompt** with stated requirements and a time limit.",
        "**Design it end to end** without looking at a solution, on a canvas or whiteboard rather than in your head.",
        "**Write down why** for every significant component and connection, as if the interviewer had asked.",
        "**Get feedback against a rubric**, from a peer, a mentor or an AI reviewer, so you see which dimension is weakest.",
        "**Redo the same prompt** a few days later and compare. Improvement on a repeat attempt is the clearest sign you're learning.",
      ] },
      { type: "p", text: "That loop is what [DesignRounds](/) is built around: realistic briefs, an architecture canvas, an AI interviewer that asks why, and a [rubric-based review](/#how) of six dimensions. You can [start with a free round](/system-design/url-shortener)." },

      { type: "h2", text: "A 4-week system design practice plan" },
      { type: "table", head: ["Week", "Focus", "Practice"], rows: [
        ["1", "Fundamentals and the framework", "Two beginner rounds, e.g. a [URL shortener](/system-design/url-shortener) and a [unique ID generator](/system-design/unique-id-generator). Focus on requirements, estimates and a clean high-level design."],
        ["2", "Classic product systems", "A [chat system](/system-design/chat-system), a [notification service](/system-design/notification-service) and [search autocomplete](/system-design/autocomplete). Practice deep dives."],
        ["3", "Scale and data", "A [news feed](/system-design/news-feed), [cloud file storage](/system-design/file-storage) and a [distributed cache](/system-design/distributed-cache). Focus on bottlenecks and storage choices."],
        ["4", "Your target role", "Rounds from your discipline: [data engineering](/library/data-engineering), [ML](/library/machine-learning), [platform](/library/platform-infrastructure), [distributed systems](/library/distributed-systems) or [frontend](/library/frontend-mobile). Redo your weakest round from week 1."],
      ] },

      { type: "h2", text: "Start with these system design interview questions" },
      { type: "rounds", ids: ["url-shortener", "chat-system", "news-feed", "notification-service", "autocomplete", "unique-id-generator"] },
      { type: "p", text: "Browse every question by role and level in the [practice library](/library), or read the [full list of system design interview questions](/guide/system-design-interview-questions)." },

      { type: "h2", text: "Frequently asked questions" },
      { type: "h3", text: "How long does it take to prepare for a system design interview?" },
      { type: "p", text: "It depends on your experience. Many engineers find that four to eight weeks of regular practice, with two or three complete designs a week, is enough to become comfortable with the format. Practicing full rounds matters more than total hours of reading." },
      { type: "h3", text: "Do junior engineers get system design interviews?" },
      { type: "p", text: "Often a lighter version, more common from mid-level roles up. Juniors are usually expected to produce a reasonable high-level design and explain basic trade-offs. Seniors are expected to drive the conversation, go deep and reason about failure." },
      { type: "h3", text: "Do I need to know specific cloud services?" },
      { type: "p", text: "No. Generic building blocks, such as load balancers, caches, queues, relational and key-value stores, are fine. Naming a specific technology helps only if you can explain why it fits." },
      { type: "h3", text: "Is there a single right answer?" },
      { type: "p", text: "No. Two very different designs can both score well if they meet the requirements and the trade-offs are explained. That is why practicing your reasoning matters more than memorizing reference architectures." },
    ],
  },
  {
    slug: "system-design-interview-questions",
    path: "/guide/system-design-interview-questions",
    title: "System Design Interview Questions to Practice, by Role and Level",
    short: "System design interview questions",
    description: "The most common system design interview questions for backend, data, ML, platform, distributed systems and frontend roles, grouped by level, with what each one tests.",
    published: PUBLISHED,
    updated: PUBLISHED,
    readingMinutes: 9,
    generated: "questions",
    blocks: [
      { type: "p", text: "These are the system design interview questions that come up again and again, grouped by role. For each one you will find what it tests and how long a practice round takes. Every question links to a practice page with the brief, the scale to design for, the deep-dive questions interviewers ask and the most common mistakes." },
      { type: "p", text: "New to the format? Read [how to prepare for a system design interview](/guide/system-design-interview) first, then start with the beginner questions." },
    ],
  },
  {
    slug: "how-to-practice-system-design",
    path: "/guide/how-to-practice-system-design",
    title: "How to Practice System Design: Books vs Mock Interviews vs AI",
    short: "How to practice system design",
    description: "Compare the main ways to practice system design interviews: books and videos, peer and paid mock interviews, and AI practice, with when each one helps most.",
    published: PUBLISHED,
    updated: PUBLISHED,
    readingMinutes: 7,
    blocks: [
      { type: "p", text: "There are four common ways to prepare for system design interviews: reading books and articles, watching videos, doing mock interviews with people, and practicing with an AI interviewer. They are not interchangeable. Each one trains a different part of the skill, and the best preparation combines them." },

      { type: "h2", text: "The comparison at a glance" },
      { type: "table", head: ["Method", "Best for", "Feedback", "Cost", "Availability"], rows: [
        ["Books and articles", "Concepts and vocabulary", "None", "Low", "Any time"],
        ["Videos and walkthroughs", "Seeing a full design explained", "None", "Free to low", "Any time"],
        ["Peer mock interviews", "Realistic pressure", "Varies with your partner", "Free", "Needs scheduling"],
        ["Paid mock interviews", "Expert, calibrated feedback", "High quality", "High per session", "Needs scheduling"],
        ["AI practice", "Frequent full rounds with instant feedback", "Rubric-based and consistent", "Free to low", "Any time"],
      ] },

      { type: "h2", text: "Books, articles and videos" },
      { type: "p", text: "Reading and watching are the fastest way to learn the building blocks: caching strategies, replication, partitioning, queues and consistency models. They are essential early on." },
      { type: "p", text: "Their limit is that they are passive. Watching someone design a news feed teaches you to recognize a good design, not to produce one under time pressure. Many candidates over-invest here and discover the gap only in the real interview." },

      { type: "h2", text: "Mock interviews with people" },
      { type: "p", text: "A mock interview with another engineer is the closest thing to the real experience. You get the pressure, the follow-up questions and the need to think out loud." },
      { type: "p", text: "Peer mocks are free, but feedback quality depends heavily on your partner. Paid mocks with experienced interviewers give calibrated, expert feedback, but cost adds up quickly and sessions need scheduling. Most people can afford only a few, so they are best saved for the final weeks." },

      { type: "h2", text: "AI practice" },
      { type: "p", text: "AI practice fills the gap between passive learning and scarce mock interviews: complete design rounds whenever you have 45 minutes, with immediate feedback. A good AI interviewer asks follow-up questions about your choices, and a rubric-based review shows which dimension is weakest so you know what to fix before the next round." },
      { type: "p", text: "Its limits are worth stating plainly. An AI reviewer is not a senior engineer from your target company, and it can miss nuance. It is most valuable for **volume and consistency**: doing many full rounds and repeating them, which is the part of preparation people usually skip." },
      { type: "callout", text: "[DesignRounds](/) is an AI practice platform: you design on an architecture canvas, an AI interviewer asks why, and a review scores six dimensions. Practice rounds and an AI review for each are free." },

      { type: "h2", text: "A combined plan that works" },
      { type: "ol", items: [
        "**Weeks 1–2:** learn the building blocks from books and videos, and start doing one or two full practice rounds a week.",
        "**Weeks 2–4:** shift most of your time to complete rounds with feedback. Repeat your weakest ones.",
        "**Final week:** do one or two mock interviews with a person to rehearse the pressure and the conversation.",
      ] },
      { type: "p", text: "Ready to start? Pick a question from the [practice library](/library) or begin with a [URL shortener](/system-design/url-shortener), a classic first round." },
    ],
  },
];

export const guideBySlug = (slug) => GUIDES.find((guide) => guide.slug === slug) ?? null;
