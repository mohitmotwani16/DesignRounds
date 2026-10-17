export default {
  blocks: [
    { type: "p", text: "This **frontend system design roadmap** is for web and mobile engineers preparing for client-side design rounds, where the system is the app on the user's device rather than the servers behind it. It covers how the web delivers pages, rendering strategies (CSR, SSR, SSG), Core Web Vitals and performance, state and data fetching, offline-first sync, browser security, and how releases reach millions of devices safely." },
    { type: "callout", tone: "tip", text: "Frontend interviewers expect you to design the API contract you need from the backend, not just the components. Step 4 is where that comes together." },

    { type: "roadmap", id: "frontend" },

    { type: "h2", text: "What frontend system design interviews ask" },
    { type: "table", head: ["Prompt", "What's really being tested", "Guides"], rows: [
      ["Design a news feed or [image-heavy feed client](/system-design/image-feed-client)", "Pagination, virtualization, image loading, caching, perceived performance", "[Virtualization](/learn/list-virtualization), [images](/learn/image-optimization)"],
      ["Design an autocomplete component", "Debouncing, request cancellation, caching results, accessibility", "[State management](/learn/frontend-state-management)"],
      ["Design [offline-first mobile sync](/system-design/offline-first-sync)", "Local storage, an outbox, conflict resolution, background sync", "[Offline-first sync](/learn/offline-first-sync)"],
      ["Design a [collaborative whiteboard](/system-design/collaborative-whiteboard)", "Real-time channels, CRDTs, presence, rendering performance", "[CRDTs](/learn/crdts), [WebSockets](/learn/real-time-communication)"],
      ["Design [mobile release and feature flags](/system-design/mobile-release-flags)", "Phased rollouts, kill switches, minimum versions", "[Mobile releases](/learn/mobile-release-engineering)"],
    ] },

    { type: "h2", text: "A four-week plan" },
    { type: "ol", items: [
      "**Week 1:** steps 1 and 2. Practise the [frontend interview framework](/learn/frontend-system-design-interview) on a news feed, and justify the rendering strategy you'd choose for its landing page.",
      "**Week 2:** step 3. Take a slow page and list the changes that would improve LCP, INP and CLS, in order of impact.",
      "**Week 3:** steps 4 and 5. Design the data layer for a chat app, including optimistic sends and what happens offline.",
      "**Week 4:** steps 6 and 7. Add a CSP and auth model to one design, and plan a staged rollout with a kill switch.",
    ] },

    { type: "h2", text: "Frequently asked questions" },
    { type: "h3", text: "Is frontend system design different from backend system design?" },
    { type: "p", text: "Yes. Backend rounds focus on servers, storage and scale across machines. Frontend rounds focus on the client: component architecture, state, network efficiency, rendering performance, offline behaviour and accessibility, plus the API you need. Both expect clear requirements and trade-offs." },
    { type: "h3", text: "Should mobile engineers follow this roadmap?" },
    { type: "p", text: "Yes. Steps 4 to 7 apply directly to iOS and Android: local databases, sync, push notifications and release engineering. Steps 2 and 3 are web-specific, but their principles (do less work up front, measure what users feel) carry over." },
    { type: "h3", text: "Which framework should I talk about?" },
    { type: "p", text: "Whichever you know best. Interviewers care about the ideas (server vs client rendering, normalised caches, virtualization), not whether you use React, Vue, Angular, Swift or Kotlin." },
  ],
  related: ["frontend-system-design-interview", "rendering-strategies", "core-web-vitals", "frontend-state-management", "offline-first-sync"],
  practice: ["image-feed-client", "offline-first-sync", "mobile-release-flags", "collaborative-whiteboard"],
  reading: [
    { title: "web.dev: Learn Performance", publisher: "Google Chrome team", url: "https://web.dev/learn/performance" },
    { title: "MDN Web Docs: HTTP caching", publisher: "Mozilla", url: "https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Caching" },
    { title: "OWASP Cheat Sheet Series", publisher: "OWASP Foundation", url: "https://cheatsheetseries.owasp.org/" },
  ],
};
