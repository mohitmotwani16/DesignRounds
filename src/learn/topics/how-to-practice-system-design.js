// Moved from src/content/guides.js (originally published 2026-10-14).
export default {
  "blocks": [
    {
      "type": "p",
      "text": "There are four common ways to prepare for system design interviews: reading books and articles, watching videos, doing mock interviews with people, and practicing with an AI interviewer. They are not interchangeable. Each one trains a different part of the skill, and the best preparation combines them."
    },
    {"type":"diagram","kind":"flow","caption":"The practice loop that builds interview skill: learn one concept, use it in a timed round, read the review, fix the gaps, and go again.","nodes":[{"id":"learn","label":"Learn a concept","sub":"handbook guide","col":0,"row":0},{"id":"mock","label":"Timed mock round","sub":"45 minutes","col":1,"row":0,"tone":"accent"},{"id":"review","label":"Review","sub":"rubric scores","col":1,"row":1},{"id":"fix","label":"Fix the gaps","sub":"re-read, redesign","col":0,"row":1,"tone":"ok"}],"edges":[{"from":"learn","to":"mock"},{"from":"mock","to":"review"},{"from":"review","to":"fix"},{"from":"fix","to":"learn","label":"next round","dashed":true}]},
    {
      "type": "h2",
      "text": "The comparison at a glance"
    },
    {
      "type": "table",
      "head": [
        "Method",
        "Best for",
        "Feedback",
        "Cost",
        "Availability"
      ],
      "rows": [
        [
          "Books and articles",
          "Concepts and vocabulary",
          "None",
          "Low",
          "Any time"
        ],
        [
          "Videos and walkthroughs",
          "Seeing a full design explained",
          "None",
          "Free to low",
          "Any time"
        ],
        [
          "Peer mock interviews",
          "Realistic pressure",
          "Varies with your partner",
          "Free",
          "Needs scheduling"
        ],
        [
          "Paid mock interviews",
          "Expert, calibrated feedback",
          "High quality",
          "High per session",
          "Needs scheduling"
        ],
        [
          "AI practice",
          "Frequent full rounds with instant feedback",
          "Rubric-based and consistent",
          "Free to low",
          "Any time"
        ]
      ]
    },
    {
      "type": "h2",
      "text": "Books, articles and videos"
    },
    {
      "type": "p",
      "text": "Reading and watching are the fastest way to learn the building blocks: caching strategies, replication, partitioning, queues and consistency models. They are essential early on."
    },
    {
      "type": "p",
      "text": "Their limit is that they are passive. Watching someone design a news feed teaches you to recognize a good design, not to produce one under time pressure. Many candidates over-invest here and discover the gap only in the real interview."
    },
    {
      "type": "h2",
      "text": "Mock interviews with people"
    },
    {
      "type": "p",
      "text": "A mock interview with another engineer is the closest thing to the real experience. You get the pressure, the follow-up questions and the need to think out loud."
    },
    {
      "type": "p",
      "text": "Peer mocks are free, but feedback quality depends heavily on your partner. Paid mocks with experienced interviewers give calibrated, expert feedback, but cost adds up quickly and sessions need scheduling. Most people can afford only a few, so they are best saved for the final weeks."
    },
    {
      "type": "h2",
      "text": "AI practice"
    },
    {
      "type": "p",
      "text": "AI practice fills the gap between passive learning and scarce mock interviews: complete design rounds whenever you have 45 minutes, with immediate feedback. A good AI interviewer asks follow-up questions about your choices, and a rubric-based review shows which dimension is weakest so you know what to fix before the next round."
    },
    {
      "type": "p",
      "text": "Its limits are worth stating plainly. An AI reviewer is not a senior engineer from your target company, and it can miss nuance. It is most valuable for **volume and consistency**: doing many full rounds and repeating them, which is the part of preparation people usually skip."
    },
    {
      "type": "callout",
      "text": "[DesignRounds](/) is an AI practice platform: you design on an architecture canvas, an AI interviewer asks why, and a review scores six dimensions. Practice rounds and an AI review for each are free."
    },
    {
      "type": "h2",
      "text": "A combined plan that works"
    },
    {
      "type": "ol",
      "items": [
        "**Weeks 1–2:** learn the building blocks from books and videos, and start doing one or two full practice rounds a week.",
        "**Weeks 2–4:** shift most of your time to complete rounds with feedback. Repeat your weakest ones.",
        "**Final week:** do one or two mock interviews with a person to rehearse the pressure and the conversation."
      ]
    },
    {
      "type": "p",
      "text": "Ready to start? Pick a question from the [practice library](/library) or begin with a [URL shortener](/system-design/url-shortener), a classic first round."
    }
  ],
  "related": [
    "system-design-interview",
    "system-design-interview-questions",
    "back-of-the-envelope-estimation"
  ]
};
