// Moved from src/content/guides.js (originally published 2026-10-14).
export default {
  "blocks": [
    {
      "type": "p",
      "text": "A system design interview asks you to design a real system, such as a URL shortener, a chat service or a news feed, in about 45 minutes, while explaining your reasoning out loud. There is no single correct answer. The interviewer is judging **how you think**: whether you clarify the problem, make sensible choices for the stated scale, and can defend the trade-offs behind them."
    },
    {"type":"diagram","kind":"flow","caption":"A 45-minute system design interview in four stages. Most of the score is earned in the deep dive, so keep requirements and the first sketch brisk.","nodes":[{"id":"req","label":"Requirements","sub":"about 7 min","col":0,"row":0},{"id":"hld","label":"High-level design","sub":"about 13 min","col":1,"row":0},{"id":"deep","label":"Deep dive","sub":"about 18 min","col":2,"row":0,"tone":"accent"},{"id":"wrap","label":"Wrap-up","sub":"about 7 min","col":3,"row":0}],"edges":[{"from":"req","to":"hld"},{"from":"hld","to":"deep"},{"from":"deep","to":"wrap"}]},
    {
      "type": "p",
      "text": "Most preparation advice tells you what to read. This guide focuses on what actually moves the needle: practicing complete designs, under realistic constraints, and getting honest feedback on your reasoning."
    },
    {
      "type": "h2",
      "text": "What interviewers are actually assessing"
    },
    {
      "type": "p",
      "text": "Interviewers at most companies score some version of the same dimensions. Knowing them tells you where to spend your 45 minutes."
    },
    {
      "type": "ul",
      "items": [
        "**Requirements and scope.** Do you find out who uses the system, what it must do, and at what scale before drawing anything? Do you set sensible limits on scope?",
        "**High-level architecture.** Is there a coherent end-to-end design where each component has a clear job?",
        "**Data model and storage.** Do your storage choices match the access patterns, consistency needs and data volume?",
        "**Scale and performance.** Can you find the bottleneck and explain how the design handles it, with rough numbers?",
        "**Reliability and security.** What happens when a component fails, a region goes down, or traffic spikes? How is abuse handled?",
        "**Trade-offs and reasoning.** Can you say why you chose something, when it would be the wrong choice, and what you rejected? This is the dimension candidates most often underplay."
      ]
    },
    {
      "type": "callout",
      "text": "Naming a technology is not a reason. \"We use Kafka\" earns little; \"we put a queue between ingestion and processing so a slow consumer can't block writes, and we accept that downstream data is a few seconds stale\" earns a lot."
    },
    {
      "type": "h2",
      "text": "A step-by-step framework for a 45-minute round"
    },
    {
      "type": "p",
      "text": "Time pressure is where most designs fall apart. A simple budget keeps you from spending 30 minutes on requirements or diving into one component before the whole system exists."
    },
    {
      "type": "table",
      "head": [
        "Phase",
        "Time",
        "What to do"
      ],
      "rows": [
        [
          "1. Clarify requirements",
          "5 min",
          "Functional requirements, users, the core operations, and what is out of scope."
        ],
        [
          "2. Estimate scale",
          "3–5 min",
          "Requests per second, read/write ratio, data size and growth. Rough orders of magnitude are enough."
        ],
        [
          "3. Define the API",
          "3–5 min",
          "The handful of endpoints or events that matter. It forces precision about inputs and outputs."
        ],
        [
          "4. High-level design",
          "10 min",
          "Draw the end-to-end flow for the core operations: clients, services, storage, caches, queues."
        ],
        [
          "5. Deep dives",
          "15 min",
          "Go deep on the hardest parts: the bottleneck, the data model, consistency, failure handling."
        ],
        [
          "6. Trade-offs and wrap-up",
          "3–5 min",
          "Summarize key decisions, their costs, and what you would do next with more time."
        ]
      ]
    },
    {
      "type": "h3",
      "text": "1. Clarify requirements"
    },
    {
      "type": "p",
      "text": "Ask about users, core use cases and scale before designing. For a [URL shortener](/system-design/url-shortener) that means: do links expire, are custom aliases needed, and how many redirects per second? Write the answers down; they are your yardstick for every later decision."
    },
    {
      "type": "h3",
      "text": "2. Estimate scale"
    },
    {
      "type": "p",
      "text": "Back-of-the-envelope numbers tell you which problems are real. A system with 100 writes per second and 10,000 reads per second is a read-scaling problem, so caching and replicas matter far more than write throughput. Keep the math simple and state your assumptions."
    },
    {
      "type": "h3",
      "text": "3. Define the API"
    },
    {
      "type": "p",
      "text": "List the few operations that matter, such as `POST /links` and `GET /{code}`. A clear API stops the design from drifting and gives the interviewer something concrete to probe."
    },
    {
      "type": "h3",
      "text": "4. Sketch the high-level design"
    },
    {
      "type": "p",
      "text": "Draw the whole path for the core operations before optimizing any part of it. Label the connections: what is sent, whether the call is synchronous or asynchronous, and which direction data flows. An unlabeled box-and-arrow diagram hides your thinking."
    },
    {
      "type": "h3",
      "text": "5. Go deep where it matters"
    },
    {
      "type": "p",
      "text": "Pick the two or three hardest parts and design them properly. For a [chat system](/system-design/chat-system) that is usually connection management, message ordering and offline delivery. For a [news feed](/system-design/news-feed) it is fan-out on write versus fan-out on read, and what happens when a celebrity posts."
    },
    {
      "type": "h3",
      "text": "6. Close with trade-offs"
    },
    {
      "type": "p",
      "text": "Summarize the two or three decisions that shaped the design, what each one costs, and when you would revisit it. This is often what separates a solid answer from a strong one."
    },
    {
      "type": "h2",
      "text": "The most common system design interview mistakes"
    },
    {
      "type": "ul",
      "items": [
        "**Designing before clarifying.** Jumping to components before agreeing on requirements and scale.",
        "**Buzzword architecture.** Adding Kafka, Redis and microservices because they sound senior, not because the problem needs them.",
        "**No numbers.** Claiming a design scales without any estimate of load or data size.",
        "**One-sided choices.** Presenting decisions without their cost, such as eventual consistency or operational overhead.",
        "**Ignoring failure.** Never discussing what happens when a dependency is slow or down.",
        "**Going silent.** The interviewer can only score reasoning you say out loud."
      ]
    },
    {
      "type": "h2",
      "text": "How to practice: the loop that actually works"
    },
    {
      "type": "p",
      "text": "Reading solutions builds recognition. Interviews test production: building a design from a blank page and defending it. That only improves with practice that looks like the real thing."
    },
    {
      "type": "ol",
      "items": [
        "**Pick a realistic prompt** with stated requirements and a time limit.",
        "**Design it end to end** without looking at a solution, on a canvas or whiteboard rather than in your head.",
        "**Write down why** for every significant component and connection, as if the interviewer had asked.",
        "**Get feedback against a rubric**, from a peer, a mentor or an AI reviewer, so you see which dimension is weakest.",
        "**Redo the same prompt** a few days later and compare. Improvement on a repeat attempt is the clearest sign you're learning."
      ]
    },
    {
      "type": "p",
      "text": "That loop is what [DesignRounds](/) is built around: realistic briefs, an architecture canvas, an AI interviewer that asks why, and a [rubric-based review](/#how) of six dimensions. You can [start with a free round](/system-design/url-shortener)."
    },
    {
      "type": "h2",
      "text": "A 4-week system design practice plan"
    },
    {
      "type": "table",
      "head": [
        "Week",
        "Focus",
        "Practice"
      ],
      "rows": [
        [
          "1",
          "Fundamentals and the framework",
          "Two beginner rounds, e.g. a [URL shortener](/system-design/url-shortener) and a [unique ID generator](/system-design/unique-id-generator). Focus on requirements, estimates and a clean high-level design."
        ],
        [
          "2",
          "Classic product systems",
          "A [chat system](/system-design/chat-system), a [notification service](/system-design/notification-service) and [search autocomplete](/system-design/autocomplete). Practice deep dives."
        ],
        [
          "3",
          "Scale and data",
          "A [news feed](/system-design/news-feed), [cloud file storage](/system-design/file-storage) and a [distributed cache](/system-design/distributed-cache). Focus on bottlenecks and storage choices."
        ],
        [
          "4",
          "Your target role",
          "Rounds from your discipline: [data engineering](/library/data-engineering), [ML](/library/machine-learning), [platform](/library/platform-infrastructure), [distributed systems](/library/distributed-systems) or [frontend](/library/frontend-mobile). Redo your weakest round from week 1."
        ]
      ]
    },
    {
      "type": "h2",
      "text": "Start with these system design interview questions"
    },
    {
      "type": "rounds",
      "ids": [
        "url-shortener",
        "chat-system",
        "news-feed",
        "notification-service",
        "autocomplete",
        "unique-id-generator"
      ]
    },
    {
      "type": "p",
      "text": "Browse every question by role and level in the [practice library](/library), or read the [full list of system design interview questions](/learn/system-design-interview-questions)."
    },
    {
      "type": "h2",
      "text": "Frequently asked questions"
    },
    {
      "type": "h3",
      "text": "How long does it take to prepare for a system design interview?"
    },
    {
      "type": "p",
      "text": "It depends on your experience. Many engineers find that four to eight weeks of regular practice, with two or three complete designs a week, is enough to become comfortable with the format. Practicing full rounds matters more than total hours of reading."
    },
    {
      "type": "h3",
      "text": "Do junior engineers get system design interviews?"
    },
    {
      "type": "p",
      "text": "Often a lighter version, more common from mid-level roles up. Juniors are usually expected to produce a reasonable high-level design and explain basic trade-offs. Seniors are expected to drive the conversation, go deep and reason about failure."
    },
    {
      "type": "h3",
      "text": "Do I need to know specific cloud services?"
    },
    {
      "type": "p",
      "text": "No. Generic building blocks, such as load balancers, caches, queues, relational and key-value stores, are fine. Naming a specific technology helps only if you can explain why it fits."
    },
    {
      "type": "h3",
      "text": "Is there a single right answer?"
    },
    {
      "type": "p",
      "text": "No. Two very different designs can both score well if they meet the requirements and the trade-offs are explained. That is why practicing your reasoning matters more than memorizing reference architectures."
    }
  ],
  "related": [
    "back-of-the-envelope-estimation",
    "scalability",
    "cap-theorem",
    "system-design-interview-questions"
  ]
};
