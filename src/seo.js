import { findPrompt, getTrack, prompts, tracks } from "./data/prompts.js";
import { LEARN_PATH, LEARN_UPDATED, TOPICS, categoryById, topicMeta, topicPath } from "./learn/catalog.js";
import { communityArticle, communityArticles } from "./learn/community.js";
import { ROADMAPS, roadmapSlugs } from "./learn/roadmaps.js";
import { FAQS } from "./data/faqs.js";
import { searchIntent } from "./learn/search-intent.js";

// Search and sharing metadata for every route: title, description, canonical URL,
// robots, Open Graph and JSON-LD. Used by the build-time prerenderer (baked into the
// HTML) and in the browser (kept in sync on client-side navigation).

// When the product pages last changed in substance. Bump it with real content changes:
// sitemap lastmod dates are only useful to search engines while they stay accurate.
export const SITE_UPDATED = "2026-10-18";

export const SITE = {
  name: "DesignRounds",
  url: "https://designrounds.in",
  tagline: "System design interview practice with an AI interviewer",
  image: "https://designrounds.in/og.png",
};

// Keyword-targeted copy for each discipline hub (/library/<track>).
export const TRACK_SEO = {
  "software-engineering": {
    h1: "Backend system design interview questions",
    title: "Backend (SDE) System Design Interview Questions",
    description: "Practice the system design interview questions backend and full-stack engineers get asked: URL shortener, chat, news feed, rate limiter, payments and more.",
    intro: [
      "These are the classic system design interview questions for backend, full-stack and generalist software engineers: the URL shortener, chat system, news feed, rate limiter, ticketing and payment systems that show up in interviews at product companies and big tech alike.",
      "Each round gives you a realistic brief and scale to design for. You build the architecture on a canvas, explain why each component is there, and get a rubric-based review of your requirements, data model, scalability, reliability and trade-offs.",
    ],
  },
  "data-engineering": {
    h1: "Data engineering system design interview questions",
    title: "Data Engineering System Design Interview Questions",
    description: "Practice data engineering system design: data warehouses, CDC, streaming analytics, lakehouses, ETL/ELT pipelines and data quality, with a rubric-based review.",
    intro: [
      "Data engineering interviews test whether you can move, model and trust data at scale. These rounds cover star-schema and slowly changing dimension warehouses, change data capture, real-time analytics and ad click aggregation, sessionization, IoT telemetry, log pipelines, lakehouses, reusable ETL and ELT frameworks, payments reconciliation, A/B test analytics, data quality and user data deletion.",
      "You design the pipeline end to end, from sources and ingestion through storage, transformation and serving, and explain the guarantees you chose: batch or streaming, exactly-once or at-least-once, freshness versus cost.",
    ],
  },
  "machine-learning": {
    h1: "ML system design interview questions",
    title: "ML System Design Interview Questions (Machine Learning & AI)",
    description: "Practice ML system design interviews: recommendation systems, feature stores, model training and serving, fraud scoring and RAG systems, with an AI review.",
    intro: [
      "ML system design interviews go beyond the model. These rounds ask you to design recommendation systems, feature stores, distributed training platforms, low-latency model serving, real-time fraud scoring and retrieval-augmented generation.",
      "Practice the parts interviewers probe: training and serving skew, feature freshness, offline and online evaluation, latency budgets, and how the system degrades when a model or data source fails.",
    ],
  },
  "platform-infrastructure": {
    h1: "Platform and infrastructure system design interview questions",
    title: "Platform & Infrastructure System Design Interview Questions",
    description: "Practice platform and infrastructure system design: internal developer platforms, multi-region failover, service discovery, deployment and configuration systems.",
    intro: [
      "Platform, SRE and infrastructure interviews focus on the systems other engineers depend on. These rounds cover internal developer platforms, multi-region failover, service discovery, deployment pipelines, configuration and secrets management, and observability.",
      "Expect to reason about blast radius, rollout safety, control planes versus data planes, and how the platform behaves during partial failures.",
    ],
  },
  "distributed-systems": {
    h1: "Distributed systems design interview questions",
    title: "Distributed Systems Design Interview Questions",
    description: "Practice distributed systems design: key-value stores, unique ID generators, message queues, distributed locks and geo-replicated databases.",
    intro: [
      "Distributed systems rounds test the building blocks underneath every large system: replication, partitioning, consensus, ordering and coordination. Design a distributed key-value store, a unique ID generator, a message queue, a lock service and a geo-replicated database.",
      "Interviewers look for precise reasoning about consistency models, failure detection, leader election, and what each design gives up under network partitions.",
    ],
  },
  "frontend-mobile": {
    h1: "Frontend and mobile system design interview questions",
    title: "Frontend & Mobile System Design Interview Questions",
    description: "Practice frontend and mobile system design: offline-first sync, image-heavy feeds, collaborative clients, micro-frontends, and release and feature flags.",
    intro: [
      "Frontend and mobile system design interviews focus on the client: state management, data fetching and caching, offline behaviour, rendering performance and safe releases. These rounds cover offline-first mobile sync, image-heavy feeds, a collaborative whiteboard client, micro-frontend platforms, and release and feature-flag systems.",
      "You will practice explaining API contracts with the backend, how the client stays fast on slow networks, and how you ship changes without breaking users.",
    ],
  },
};

// The longest title variant that fits in a search result (~65 characters).
const fitTitle = (...variants) => variants.find((title) => title.length <= 65) ?? variants.at(-1);

const absolute = (path) => `${SITE.url}${path === "/" ? "" : path}`;
const clamp = (text, max = 158) => (text.length <= max ? text : `${text.slice(0, max - 1).replace(/\s+\S*$/, "")}…`);
// The one-sentence description of the product, repeated word for word in structured
// data, llms.txt and the About page so search engines and AI assistants see one entity.
export const SITE_SUMMARY = "DesignRounds is a system design interview practice platform: realistic design problems for every engineering role, an architecture canvas, an AI interviewer and a rubric-based review of every round.";

const organization = { "@type": "Organization", "@id": `${SITE.url}/#organization`, name: SITE.name, url: SITE.url, logo: `${SITE.url}/icon-512.png`, description: SITE_SUMMARY };

// Indexable pages allow full-length text snippets and large image previews: Google's AI
// Overviews and AI Mode quote a page only as far as its snippet rules allow.
const INDEXABLE = "index, follow, max-snippet:-1, max-image-preview:large";
const breadcrumbs = (items) => ({
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: items.map(([name, path], index) => ({ "@type": "ListItem", position: index + 1, name, item: absolute(path) })),
});

export const roundPath = (id) => `/system-design/${id}`;
export const trackPath = (id) => `/library/${id}`;

// Routes that require an account: never indexed.
const PRIVATE = /^\/(signin|welcome|profile|start|workspace|admin|invite|learn\/write)(\/|$)/;

// Every indexable URL, for the sitemap and the prerenderer.
export function publicPaths() {
  return [
    "/",
    "/library",
    ...tracks.map((track) => trackPath(track.id)),
    ...prompts.map((prompt) => roundPath(prompt.id)),
    LEARN_PATH,
    ...TOPICS.map((topic) => topicPath(topic.slug)),
    ...communityArticles().map((article) => topicPath(article.slug)),
    "/plus",
    "/about",
    "/privacy",
    "/terms",
  ];
}

export function routeMeta(path) {
  const base = { title: `${SITE.name} — ${SITE.tagline}`, description: "", canonical: absolute(path), robots: INDEXABLE, ogType: "website", jsonLd: [], notFound: false };

  if (PRIVATE.test(path)) return { ...base, title: `${SITE.name}`, robots: "noindex, nofollow", canonical: null };

  if (path === "/") {
    return {
      ...base,
      title: "Mock System Design Interviews with AI | DesignRounds",
      description: "Free mock system design interviews with an AI interviewer: real questions for your role on an architecture canvas, and rubric-scored feedback on every round.",
      jsonLd: [
        { "@context": "https://schema.org", ...organization },
        { "@context": "https://schema.org", "@type": "WebSite", "@id": `${SITE.url}/#website`, name: SITE.name, url: SITE.url, publisher: { "@id": `${SITE.url}/#organization` } },
        {
          "@context": "https://schema.org",
          "@type": "WebApplication",
          name: SITE.name,
          url: SITE.url,
          applicationCategory: "EducationalApplication",
          operatingSystem: "Web browser",
          description: SITE_SUMMARY,
          audience: { "@type": "Audience", audienceType: "Software engineers preparing for system design interviews" },
          featureList: [
            "Practice rounds for backend, data engineering, machine learning, platform and infrastructure, distributed systems, and frontend and mobile roles",
            "Architecture canvas with labeled synchronous and asynchronous connections",
            "AI interviewer that asks follow-up questions about design decisions",
            "Rubric-based review scored on six dimensions",
            "Free system design handbook and role roadmaps",
          ],
          offers: { "@type": "Offer", price: "0", priceCurrency: "INR", description: "Free plan" },
        },
        {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: FAQS.map((faq) => ({ "@type": "Question", name: faq.question, acceptedAnswer: { "@type": "Answer", text: faq.answer } })),
        },
      ],
    };
  }

  if (path === "/library") {
    return {
      ...base,
      title: "System Design Interview Questions to Practice | DesignRounds",
      description: "Practice system design interview questions by role and level: backend, data, ML, platform, distributed systems and frontend. Free rounds, with an AI review.",
      jsonLd: [{ "@context": "https://schema.org", "@type": "CollectionPage", name: "System design interview questions", url: absolute(path) }, breadcrumbs([["Home", "/"], ["Library", "/library"]])],
    };
  }

  const trackMatch = /^\/library\/([a-z-]+)$/.exec(path);
  if (trackMatch) {
    const track = tracks.find((item) => item.id === trackMatch[1]);
    if (!track) return { ...base, notFound: true };
    const seo = TRACK_SEO[track.id];
    const rounds = prompts.filter((prompt) => prompt.track === track.id);
    return {
      ...base,
      title: fitTitle(`${seo.title} | DesignRounds`, seo.title),
      description: seo.description,
      jsonLd: [
        { "@context": "https://schema.org", "@type": "CollectionPage", name: seo.h1, url: absolute(path), description: seo.description },
        { "@context": "https://schema.org", "@type": "ItemList", itemListElement: rounds.map((prompt, index) => ({ "@type": "ListItem", position: index + 1, url: absolute(roundPath(prompt.id)), name: prompt.title })) },
        breadcrumbs([["Home", "/"], ["Library", "/library"], [track.label, path]]),
      ],
    };
  }

  const roundMatch = /^\/system-design\/([a-z0-9-]+)$/.exec(path);
  if (roundMatch) {
    const prompt = findPrompt(roundMatch[1]);
    if (!prompt) return { ...base, notFound: true };
    const track = getTrack(prompt.track);
    const description = clamp(prompt.access === "free"
      ? `${prompt.description} Practice this ${prompt.difficulty.toLowerCase()} ${track.shortLabel} system design interview question: requirements, scale, interview questions and common mistakes.`
      : `${prompt.description} ${/^[aeiou]/i.test(prompt.difficulty) ? "An" : "A"} ${prompt.difficulty.toLowerCase()} ${track.shortLabel} system design interview question, part of DesignRounds Plus. Covers ${prompt.considerations.join(", ").toLowerCase()}.`);
    return {
      ...base,
      title: fitTitle(`${prompt.title} — System Design Interview Question`, `${prompt.title} | System Design Interview`, `${prompt.title} | System Design`, prompt.title),
      description,
      ogType: "article",
      jsonLd: [
        {
          "@context": "https://schema.org",
          "@type": "LearningResource",
          name: `${prompt.title}: system design interview practice`,
          description: prompt.description,
          url: absolute(path),
          learningResourceType: "Practice problem",
          educationalLevel: prompt.difficulty,
          timeRequired: `PT${prompt.minutes}M`,
          teaches: prompt.considerations,
          about: ["System design", prompt.category, track.label],
          isAccessibleForFree: prompt.access === "free",
          inLanguage: "en",
          provider: organization,
        },
        breadcrumbs([["Home", "/"], ["Library", "/library"], [track.label, trackPath(track.id)], [prompt.title, path]]),
      ],
    };
  }

  if (path === LEARN_PATH) {
    return {
      ...base,
      title: "System Design Handbook: Free Tutorials and Roadmaps",
      description: "Free system design tutorials with diagrams on caching, databases, sharding, Kafka and consistency, plus step-by-step roadmaps for every engineering role.",
      jsonLd: [
        {
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: "System Design Handbook",
          url: absolute(path),
          hasPart: TOPICS.map((topic) => ({ "@type": "TechArticle", headline: topic.title, url: absolute(topicPath(topic.slug)) })),
        },
        breadcrumbs([["Home", "/"], ["Learn", LEARN_PATH]]),
      ],
    };
  }

  const community = path.startsWith(`${LEARN_PATH}/`) && !topicMeta(path.slice(LEARN_PATH.length + 1)) ? communityArticle(path.slice(LEARN_PATH.length + 1)) : null;
  if (community) {
    const category = categoryById(community.category);
    const author = community.authorName ? { "@type": "Person", name: community.authorName } : organization;
    return {
      ...base,
      title: fitTitle(`${community.title} | DesignRounds`, community.title, `${community.shortTitle} | DesignRounds`),
      description: clamp(community.description),
      ogType: "article",
      jsonLd: [
        {
          "@context": "https://schema.org",
          "@type": "TechArticle",
          headline: community.title,
          description: community.description,
          url: absolute(path),
          mainEntityOfPage: absolute(path),
          datePublished: community.publishedAt,
          dateModified: community.updatedAt ?? community.publishedAt,
          author,
          publisher: organization,
          image: SITE.image,
          inLanguage: "en",
          isAccessibleForFree: true,
        },
        breadcrumbs([["Home", "/"], ["Learn", LEARN_PATH], [category?.title ?? "Community", `${LEARN_PATH}#${community.category}`], [community.shortTitle || community.title, path]]),
      ],
    };
  }

  const learnTopic = path.startsWith(`${LEARN_PATH}/`) ? topicMeta(path.slice(LEARN_PATH.length + 1)) : null;
  if (learnTopic) {
    const category = categoryById(learnTopic.category);
    const guide = category.id === "interview" || category.id === "roadmaps";
    const roadmap = Object.values(ROADMAPS).find((entry) => entry.page === learnTopic.slug);
    const intent = searchIntent(learnTopic.slug);
    return {
      ...base,
      title: fitTitle(`${learnTopic.title} | DesignRounds`, learnTopic.title, `${learnTopic.short} Explained | DesignRounds`, `${learnTopic.short} Explained`),
      description: clamp(learnTopic.description),
      ogType: "article",
      jsonLd: [
        {
          "@context": "https://schema.org",
          "@type": guide ? "Article" : "TechArticle",
          headline: learnTopic.title,
          description: learnTopic.description,
          url: absolute(path),
          mainEntityOfPage: absolute(path),
          datePublished: learnTopic.published ?? LEARN_UPDATED,
          dateModified: learnTopic.updated ?? LEARN_UPDATED,
          ...(guide ? {} : { about: learnTopic.short, proficiencyLevel: learnTopic.level === "Advanced" ? "Expert" : "Beginner" }),
          ...(intent?.keywords?.length ? { keywords: intent.keywords.join(", ") } : {}),
          author: organization,
          publisher: organization,
          image: SITE.image,
          inLanguage: "en",
          isAccessibleForFree: true,
        },
        breadcrumbs([["Home", "/"], ["Learn", LEARN_PATH], [category.title, `${LEARN_PATH}#${category.id}`], [learnTopic.short, path]]),
        // Matches the visible "Frequently asked questions" section on the page.
        ...(intent?.faq?.length ? [{
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: intent.faq.map((item) => ({ "@type": "Question", name: item.q, acceptedAnswer: { "@type": "Answer", text: item.a } })),
        }] : []),
        ...(roadmap ? [{
          "@context": "https://schema.org",
          "@type": "ItemList",
          name: `${roadmap.title} roadmap`,
          itemListOrder: "https://schema.org/ItemListOrderAscending",
          itemListElement: roadmapSlugs(roadmap).map((slug, index) => ({ "@type": "ListItem", position: index + 1, url: absolute(topicPath(slug)), name: topicMeta(slug)?.title ?? slug })),
        }] : []),
      ],
    };
  }

  if (path === "/plus") {
    return {
      ...base,
      title: "DesignRounds Plus: AI Mock System Design Interviews with Feedback",
      description: "Every system design round, a live AI interviewer you talk your design through with, and feedback on your design and your communication. Request early access.",
      jsonLd: [
        {
          "@context": "https://schema.org",
          "@type": "WebPage",
          name: "DesignRounds Plus",
          description: "System design interview practice with a live AI interviewer, rubric-based reviews and communication feedback.",
          publisher: { "@id": `${SITE.url}/#organization` },
          url: absolute(path),
        },
        breadcrumbs([["Home", "/"], ["Plus", "/plus"]]),
      ],
    };
  }

  if (path === "/about") {
    return {
      ...base,
      title: "About DesignRounds — What It Is, Who It's For, and Pricing",
      description: "DesignRounds is a system design interview practice platform: realistic prompts, an architecture canvas, an AI interviewer and rubric-based reviews. Free to start.",
      jsonLd: [{ "@context": "https://schema.org", "@type": "AboutPage", name: "About DesignRounds", url: absolute(path), about: organization }],
    };
  }

  if (path === "/privacy") {
    return {
      ...base,
      title: `Privacy Policy | ${SITE.name}`,
      description: "What DesignRounds collects, why, who processes it, and how to delete your data. No ads, no third-party tracking.",
    };
  }

  if (path === "/terms") {
    return {
      ...base,
      title: `Terms of Service | ${SITE.name}`,
      description: "The terms for using DesignRounds: your account, acceptable use, ownership of your designs, AI feedback, plans and liability.",
    };
  }

  return { ...base, title: `Page not found | ${SITE.name}`, robots: "noindex", canonical: null, notFound: true };
}

// Applies metadata to the live document (client-side navigation).
export function applyMeta(meta) {
  document.title = meta.title;
  const set = (selector, attribute, value, create) => {
    let element = document.head.querySelector(selector);
    if (value == null) { element?.remove(); return; }
    if (!element) { element = create(); document.head.appendChild(element); }
    element.setAttribute(attribute, value);
  };
  const metaTag = (attr, key) => () => { const element = document.createElement("meta"); element.setAttribute(attr, key); return element; };
  set('meta[name="description"]', "content", meta.description || null, metaTag("name", "description"));
  set('meta[name="robots"]', "content", meta.robots, metaTag("name", "robots"));
  set('link[rel="canonical"]', "href", meta.canonical, () => { const link = document.createElement("link"); link.rel = "canonical"; return link; });
  set('meta[property="og:title"]', "content", meta.title, metaTag("property", "og:title"));
  set('meta[property="og:description"]', "content", meta.description || null, metaTag("property", "og:description"));
  set('meta[property="og:url"]', "content", meta.canonical, metaTag("property", "og:url"));
  set('meta[property="og:type"]', "content", meta.ogType, metaTag("property", "og:type"));
  document.head.querySelectorAll('script[type="application/ld+json"]').forEach((script) => script.remove());
  for (const data of meta.jsonLd) {
    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.textContent = JSON.stringify(data);
    document.head.appendChild(script);
  }
}

// The same metadata as HTML, for the prerenderer.
export function metaHtml(meta) {
  const escape = (value) => String(value).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
  return [
    `<title>${escape(meta.title)}</title>`,
    meta.description && `<meta name="description" content="${escape(meta.description)}" />`,
    `<meta name="robots" content="${meta.robots}" />`,
    meta.canonical && `<link rel="canonical" href="${meta.canonical}" />`,
    `<meta property="og:site_name" content="${SITE.name}" />`,
    `<meta property="og:type" content="${meta.ogType}" />`,
    `<meta property="og:title" content="${escape(meta.title)}" />`,
    meta.description && `<meta property="og:description" content="${escape(meta.description)}" />`,
    meta.canonical && `<meta property="og:url" content="${meta.canonical}" />`,
    `<meta property="og:image" content="${SITE.image}" />`,
    `<meta property="og:image:width" content="1200" />`,
    `<meta property="og:image:height" content="630" />`,
    `<meta property="og:image:alt" content="DesignRounds: system design interview practice" />`,
    `<meta property="og:locale" content="en_IN" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${escape(meta.title)}" />`,
    meta.description && `<meta name="twitter:description" content="${escape(meta.description)}" />`,
    `<meta name="twitter:image" content="${SITE.image}" />`,
    `<link rel="alternate" type="application/atom+xml" title="DesignRounds system design handbook" href="${SITE.url}${LEARN_PATH}/feed.xml" />`,
    ...meta.jsonLd.map((data) => `<script type="application/ld+json">${JSON.stringify(data).replace(/</g, "\\u003c")}</script>`),
  ].filter(Boolean).join("\n    ");
}
