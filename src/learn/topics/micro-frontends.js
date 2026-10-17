export default {
  blocks: [
    { type: "p", text: "**Micro-frontends** split a large web application into smaller frontend pieces owned and deployed independently by different teams, then compose them into one experience for the user. A checkout team might own the cart and payment pages while a discovery team owns search and product pages. It's the frontend version of microservices, and it solves the same organisational problem, many teams blocked on one codebase and one release, at a similar cost in complexity." },

    { type: "h2", text: "When they make sense" },
    { type: "ul", items: [
      "**Many teams** (often dozens of engineers or more) work on one product and step on each other in a single repository and release.",
      "**Clear domain boundaries** exist, such as search, product, cart, account, so pieces can be owned end to end.",
      "**Independent deployment matters:** teams need to ship on their own schedule without coordinating a global release.",
      "**Gradual migration:** replacing a legacy frontend piece by piece.",
    ] },
    { type: "callout", tone: "warning", text: "For one or two teams, micro-frontends usually cost more than they save. A well-structured monolith with clear modules and good CI is simpler and faster. See [monolith vs microservices](/learn/monolith-vs-microservices)." },

    { type: "h2", text: "Composition approaches" },
    { type: "table", head: ["Approach", "How", "Pros", "Cons"], rows: [
      ["Route-based (separate apps)", "Each team owns whole pages; links or a reverse proxy route between them", "Strong isolation, simplest", "Full page loads between areas; shared header and state duplicated"],
      ["Build-time integration", "Teams publish packages that a container app imports and builds", "One optimised bundle, simple runtime", "Not independently deployable: every change needs a container rebuild"],
      ["Runtime integration (module federation)", "The container loads remote modules from each team's deployed bundle at runtime", "Independent deploys, shared dependencies", "Version coupling at runtime, harder debugging"],
      ["Server-side composition", "A server or edge layer assembles HTML fragments from team services", "Fast first paint, SEO-friendly", "Infrastructure complexity, coordinated caching"],
      ["Web components / iframes", "Each piece is a custom element or iframe", "Framework-agnostic, strong isolation (iframes)", "Iframes hurt UX and accessibility; web components need careful styling and state"],
    ] },
    { type: "diagram", kind: "flow", caption: "Runtime composition: a shell app owns layout, routing and shared services, and loads each team's micro-frontend from its own deployment.", nodes: [
      { id: "user", label: "Browser", col: 0, row: 1, shape: "pill" },
      { id: "shell", label: "Shell app", sub: "layout · routing · auth", col: 1.3, row: 1, tone: "accent" },
      { id: "search", label: "Search MFE", sub: "team A · own deploy", col: 2.7, row: 0 },
      { id: "product", label: "Product MFE", sub: "team B · own deploy", col: 2.7, row: 1 },
      { id: "cart", label: "Cart MFE", sub: "team C · own deploy", col: 2.7, row: 2 },
      { id: "ds", label: "Design system", sub: "shared components", col: 4, row: 1, tone: "cache" },
    ], edges: [
      { from: "user", to: "shell" }, { from: "shell", to: "search" }, { from: "shell", to: "product" }, { from: "shell", to: "cart" },
      { from: "search", to: "ds", dashed: true }, { from: "product", to: "ds", dashed: true }, { from: "cart", to: "ds", dashed: true },
    ] },

    { type: "h2", text: "The hard parts" },
    { type: "ul", items: [
      "**Consistent look and feel:** a shared design system, distributed as versioned components and tokens, keeps pieces from diverging.",
      "**Shared dependencies:** loading three copies of a framework kills performance; share libraries as singletons with agreed version ranges, and budget bundle sizes. See [Core Web Vitals](/learn/core-web-vitals).",
      "**Communication between pieces:** keep it minimal and explicit, through the URL, custom events or a tiny shared event bus, not a shared global store that couples teams again.",
      "**Shared concerns:** authentication, routing, analytics, error tracking and feature flags belong to the shell or shared libraries.",
      "**Failure isolation:** one micro-frontend failing to load should show a fallback in its area, not a blank page.",
      "**Testing:** contract tests between shell and pieces, plus end-to-end tests of critical journeys across them.",
    ] },

    { type: "h2", text: "Ownership and governance" },
    { type: "p", text: "Micro-frontends work when each team owns a slice **vertically**: its UI, its backend-for-frontend or APIs, and its data. A platform or core team owns the shell, design system, build tooling and performance budgets, and sets a small number of rules every piece must follow. Without that, independence turns into inconsistency." },
  ],
  uses: [
    { name: "Large e-commerce sites", text: "Search, product, cart and account pages are owned and deployed by separate teams behind one shell." },
    { name: "Enterprise dashboards", text: "Product teams contribute modules to a shared admin portal, loaded at runtime." },
    { name: "Legacy migration", text: "New micro-frontends replace parts of an old application route by route." },
  ],
  interview: [
    "Justify micro-frontends by team scale and domain boundaries, or argue against them.",
    "Compare route-based, build-time, runtime and server-side composition.",
    "Address shared dependencies, design consistency and communication.",
    "Put shared concerns in the shell and isolate failures per piece.",
  ],
  related: ["monolith-vs-microservices", "core-web-vitals", "rendering-strategies", "feature-flags", "frontend-system-design-interview"],
  practice: ["micro-frontend-platform"],
  reading: [
    { title: "Micro Frontends", publisher: "Cam Jackson, martinfowler.com", url: "https://martinfowler.com/articles/micro-frontends.html" },
    { title: "Module Federation concepts", publisher: "webpack documentation", url: "https://webpack.js.org/concepts/module-federation/" },
  ],
};
