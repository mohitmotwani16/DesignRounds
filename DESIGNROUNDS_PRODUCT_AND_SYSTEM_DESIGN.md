# DesignRounds: Product and System Design

## 1. Product vision

**DesignRounds** is a deliberate-practice portal for system design interviews. A learner receives a realistic design prompt, builds a solution on an interactive canvas, and works through a conversation with an AI interviewer that asks focused questions and gives feedback as the design develops.

The product should feel like a well-made engineering tool and a credible interview-preparation product—not a generic AI chat wrapper. The canvas and the learner's reasoning are the center of the experience. AI should guide the learner without taking over the design.

**Product promise:** Practice system design by making decisions, explaining trade-offs, and improving your design with useful feedback.

**Suggested tagline:** *Design. Discuss. Improve.*

### Product principles

1. **Practice before answers:** Encourage the learner to reason before revealing example solutions.
2. **One clear next step:** At any point, make it obvious what the learner can do next.
3. **AI as interviewer and coach:** Ask useful, contextual questions; do not simply generate a complete architecture.
4. **Canvas and conversation stay connected:** Selecting a component or decision should give the AI relevant context.
5. **Specific, actionable feedback:** Explain what is strong, what is missing, why it matters, and how to improve it.
6. **Progress over gamification:** Show evidence of skill growth without distracting badges, streak pressure, or noisy leaderboards.
7. **Trust through transparency:** Clearly distinguish AI-generated guidance from facts, disclose uncertainty, and let learners review how a score was reached.
8. **Save work by default:** A browser refresh or interrupted practice session should not erase meaningful progress.

### Freemium access and fair scoring

Use a freemium model, with a meaningful no-cost practice path and paid access to the deeper coaching experience:

- Make approximately **50–60% of the curated problem library** available on the free plan. Select representative prompts across every discipline and difficulty; do not make the free catalog a low-quality or beginner-only sampler. Show which prompts are included and which require a paid plan before a learner starts.
- A free learner can read an available prompt and use the design canvas. Keep the canvas itself useful rather than disabling essential design actions to force an upgrade.
- The free plan does not include interactive AI conversation during the design round: no AI clarification answers, follow-up questions, component critique, or on-demand hints. Clearly explain this limitation in the interviewer panel before the round.
- After completing a free round, allow **one final rubric-based score/review for that attempt**, within a small monthly review allowance. Make clear before starting that the final review is the only AI evaluation included in the free round. Do not silently start paid AI work or bill users without explicit consent.
- Free reviews show the overall score, every rubric dimension's score and rating, a summary, and the top strength and top risk. Plus reviews add a decision-by-decision analysis of the learner's reasoning (whether each key choice was justified and correct, actually needed, and right-sized for the problem, with alternatives and the question an interviewer would ask), evidence and an improvement for every dimension, all strengths and risks, prioritised next steps, and interviewer follow-up questions. The same complete review is generated and stored for both plans; only what is shown differs, so upgrading unlocks the full detail of past reviews.
- The paid plan unlocks the complete prompt catalog and the contextual, two-way AI interviewer: ongoing design questions, learner-initiated clarification, decision-by-decision discussion, optional hints, and a detailed final review.
- Define plan entitlements on the server and check them on every protected catalog, AI, review, and usage action. A hidden button or frontend-only paywall is not authorization.
- Explain plan limits, billing cadence, renewal, cancellation, AI usage limits, and which content is locked before checkout. Do not imply that an upgrade guarantees an interview outcome.

Scores must reflect the same disclosed rubric and observed evidence regardless of plan. **Never intentionally cap, suppress, or lower free-plan marks to pressure learners into purchasing.** Do not make reviews artificially vague or punitive as an upsell tactic. Monetize the additional coaching, breadth of practice, and convenience—not dishonest evaluation. Scores should show how requirements, architecture, data choices, reliability, scale, security, and trade-off reasoning affected the result; allow the learner to report an inaccurate review.

### AI allowances

Allowances are entitlements enforced on the server before any model call (`server/modules/plans.js`):

| | Free | Plus |
|---|---|---|
| Interviewer replies per round | 0 | 40 (including up to 3 hints) |
| Interviewer replies per month | 0 | 800 |
| Final reviews per round | 1 | 3 |
| Final reviews per calendar month (UTC) | 5 | 60 |

- A credit is reserved in the same transaction that creates the pending review, consumed when the review is saved, and released if generation fails or is abandoned, so failures never cost the learner.
- Requesting a review of an unchanged design returns the existing review without spending a credit. Retried requests carry the same request id and are never charged twice.
- Monthly usage survives deleting a round, so deletion can't be used to win back credits.
- A design needs at least three components and two connections before it can be reviewed.

**Current status:** The catalog contains 49 rounds across six tracks (the original four plus Distributed systems and Frontend & mobile), with 28 (about 57%) labeled free and 21 labeled Plus. Each track has free practice available. Learners sign in with an emailed one-time code; browsing is public but starting a round requires an account. Starting a Plus round is rejected by the server for free accounts. Locked rounds remain browsable, including their requirements and expected work. The AI final review and the live interviewer (Plus) are implemented with the allowances above. The interviewer answers questions, gives hints (3 per round), and asks proactive questions only for significant, unexplained canvas changes after the canvas has been quiet, with cooldowns and at most one open question; its transcript feeds the final review. There is no checkout yet.

## 2. Intended audience and jobs to be done

### Primary audience

- Software engineers preparing for system design interviews.
- Engineers who want structured practice on scalability, reliability, data modeling, APIs, and trade-offs.
- Interviewers or mentors who want a repeatable way to review a design discussion.

### Learner jobs

- Find a practice prompt at the right level and within the time available.
- Clarify requirements before drawing an architecture.
- Capture a design visually and explain important decisions.
- Get challenged with realistic follow-up questions.
- Understand the quality of the design and what to improve next.
- Resume, compare, and learn from previous attempts.

## 3. Product experience

### Main journey

1. **Discover:** The landing page explains the value quickly and offers a prominent “Start practicing” action.
2. **Choose a round:** Browse by engineering discipline, then filter prompts by focus, difficulty, and estimated time. The free/paid availability of each prompt is visible before the learner opens it.
3. **Prepare:** Read the prompt, learn the expected session format, and start when ready.
4. **Clarify:** Ask or record functional and non-functional requirements before designing.
5. **Design:** Add and connect components on a canvas; document key decisions and assumptions.
6. **Discuss:** The AI interviewer asks one relevant question at a time and refers to the current design.
7. **Review:** Receive a structured, evidence-based summary with strengths, gaps, and suggested next steps.
8. **Continue learning:** Save the attempt, revisit the design, or retry the prompt with a different approach.

### Landing page

The front page should feel established, calm, and useful. It should explain the product before asking visitors to trust its AI.

Recommended content order:

1. **Header:** Wordmark, Practice, How it works, Topics, Sign in; one understated primary CTA.
2. **Hero:** A direct headline such as “Get better at system design by doing it.” Supporting copy should explain the prompt → canvas → interviewer → feedback loop. Use a real product preview or a carefully composed interface mockup, not an abstract AI-generated hero image.
3. **Interactive product preview:** Show a believable system-design canvas beside a focused interviewer prompt. Make it clear this is a preview, not a live product, if it is not interactive.
4. **How a round works:** Three or four concrete steps, with a small visual for each.
5. **Practice library preview:** Show recognizable example prompts, topic labels, difficulty, and estimated time.
6. **Feedback example:** Show a sample rubric with evidence and a practical improvement. Avoid unsupported promises or inflated AI claims.
7. **Who it helps / topics:** Explain the interview-preparation use case and the areas learners can practice.
8. **Trust and privacy:** Briefly describe saved sessions and how diagram/conversation data is handled. Link to full privacy details.
9. **Closing CTA and restrained footer:** Clear next action, product links, support, privacy, and terms.

Do not invent customer logos, testimonials, hiring outcomes, user counts, or accuracy claims. Add social proof only when it is real and approved for use.

### Practice library and discipline catalog

Organize the catalog into clear practice tracks; the track is the primary navigation and technical focus is a secondary filter. Start with at least these four disciplines:

| Track | Scope | Representative rounds |
|---|---|---|
| **Software engineering (SDE)** | Application architecture, APIs, storage, traffic, and product behavior | URL shortener; chat; news feed; cloud file storage; API rate limiter; video streaming; ride-hailing; ticketing; notifications; web crawler; autocomplete; collaborative editor; paste sharing; payment processing; task scheduler; distributed cache; API gateway |
| **Data engineering** | Ingestion, transformation, warehousing, streaming, data contracts, and observability | Customer warehouse with SCD Type 2; real-time analytics platform; reusable ETL/ELT framework; clickstream/event tracking at scale; data alerting; fraud detection data platform; data quality and observability framework |
| **Machine learning & AI** | Training data, feature management, inference, retrieval, evaluation, and model operations | Recommendation system; feature store; distributed training platform; low-latency model serving; retrieval-augmented generation; real-time fraud scoring; ML model monitoring |
| **Platform & infrastructure** | Developer platforms, control planes, resilience, networking, security, and operations | Internal developer platform; multi-region failover; service discovery; secrets management; safe deployment platform; metrics/observability platform; configuration control plane |

Each round should be a versioned, curated content record—not just a title. Include:

- **Discipline and focus:** Track, technical subtopic, level, expected duration, and free/paid availability.
- **Scenario:** A specific user, company, or operational setting with enough detail to reason about constraints.
- **Requirements:** Functional needs and measurable or explicitly open non-functional goals; note what the learner should clarify.
- **Expected work:** A rough description of the architecture, data model, interfaces, workflows, failure handling, or trade-offs the learner is expected to produce. This is guidance, not a canonical answer to copy.
- **Evaluation rubric:** Discipline-appropriate dimensions, examples of evidence, and important failure cases, versioned with the prompt.
- **AI interviewer guidance:** Relevant follow-up areas and clarifications. Keep the expected answer private to the evaluator; never reveal it in the learner-facing brief.

Make expectations concrete by discipline:

- **SDE:** Identify requirements and load assumptions; draw services, clients, dependencies, and data stores; describe important APIs/data models; discuss scaling, consistency, availability, security, and trade-offs.
- **Data engineering:** Show source-to-consumer flow; define event/table contracts, keys and time semantics; address batch vs. streaming, idempotency, backfills, late/duplicate data, lineage, quality, SLAs, and ownership as relevant. An SCD Type 2 warehouse brief should expect a business key, effective start/end dates, current-row indicator, change detection, and treatment of late corrections.
- **ML & AI:** Cover data and label lineage, train/serve feature consistency, evaluation, model/artifact versions, inference latency, fallbacks, drift/quality monitoring, privacy, and retraining/rollback where relevant.
- **Platform & infrastructure:** Separate control-plane and data-plane responsibilities where appropriate; cover identity, tenancy, rollout, failure modes, SLOs, observability, security, recovery, and operational ownership.

Each prompt card should show track, title, short scenario, level, estimated duration, and availability. The prompt detail view should explain requirements, expected work, what is intentionally unspecified, and the relevant rubric dimensions. Filters should include track, subtopic, difficulty, duration, and free/paid availability; search should include the scenario and requirements, not just the title.

Do not ship every item as an unstructured hard-coded frontend array long term. Keep a validated prompt schema and versioned catalog module so content can be reviewed and updated without changing session or AI logic.

### Initial prompt set and expected learner work

These are starting prompts, not prescribed solutions. Every round should let the learner ask clarifying questions, state assumptions, build a diagram/data flow, and defend trade-offs.

| Track | Example prompt | Expected learner work |
|---|---|---|
| SDE | URL shortener | Define redirect/create APIs, key generation and storage, read caching, expiry, and growth assumptions. |
| SDE | Chat system | Show connection and message-delivery paths; explain ordering, persistence, retries, and offline delivery. |
| SDE | News feed | Compare fan-out approaches; diagram feed generation, ranking boundaries, and hot-account handling. |
| SDE | Cloud file storage | Design metadata and blob paths, chunked/resumable uploads, sync, and conflict behavior. |
| SDE | API rate limiter | Select and justify a limiting algorithm, counter/partition model, and failure behavior. |
| SDE | Video streaming | Trace ingest through encoding and playback; explain manifests, CDN, and adaptive bitrate. |
| SDE | Ride-hailing | Define location updates, geospatial matching, trip state, and regional scaling. |
| SDE | High-demand ticketing platform | Model event discovery, seat inventory, short-lived reservations, checkout, and contention during a sale spike. |
| SDE | Notification delivery service | Design preference-aware fan-out, prioritization, channel providers, idempotent retries, and delivery status. |
| SDE | Distributed web crawler | Partition a crawl frontier, respect per-host policies, deduplicate URLs/content, and manage freshness and retries. |
| SDE | Search autocomplete service | Serve low-latency prefix suggestions while balancing ranking quality, index freshness, and privacy. |
| SDE | Collaborative document editor | Handle concurrent edits, reconnection, convergence, permissions, and revision history. |
| SDE | Text snippet sharing service | Design snippet creation and retrieval, expiry, access control, caching, and abuse prevention. |
| SDE | Payment processing platform | Define an idempotent payment state machine, processor integration, audit trail, and reconciliation. |
| SDE | Distributed task scheduler | Schedule delayed and recurring work with worker leases, retries, recovery, and explicit delivery guarantees. |
| SDE | Distributed caching service | Choose partitioning, replication, eviction and invalidation behavior; handle hot keys and node failure. |
| SDE | Multi-tenant API gateway | Separate request routing from configuration management; cover authentication, tenant policies, rollout, and overload. |
| Data engineering | Customer warehouse with SCD Type 2 | Model business keys and validity/current-row columns; explain change detection, idempotent loads, and late corrections. |
| Data engineering | Real-time analytics platform | Diagram event ingestion, event-time windows, deduplication, aggregate serving, and replay. |
| Data engineering | Reusable ETL/ELT framework | Define task/DAG contracts, connectors, orchestration, isolation, retries, backfills, and lineage. |
| Data engineering | Clickstream/event tracking at scale | Design SDK buffering and ingestion, schema evolution, deduplication, and PII controls. |
| Data engineering | Data alerting system | Define freshness/volume/quality rules, ownership, alert grouping, routing, and escalation. |
| Data engineering | Fraud detection data platform | Enrich payment streams with historical/online features; explain latency, parity, and auditability. |
| Data engineering | Data quality and observability framework | Define data contracts/tests, freshness and anomaly signals, lineage, incident triage, and ownership. |
| ML & AI | Recommendation system | Separate candidate retrieval and ranking; cover cold start, offline training, and online experiments. |
| ML & AI | Feature store | Design online/offline materialization, point-in-time joins, feature freshness, and training/serving parity. |
| ML & AI | Distributed training platform | Model job submission, accelerator scheduling, checkpointing, artifacts, and experiment lineage. |
| ML & AI | Low-latency model serving | Design model versioning, inference scaling, batching, canary release, rollback, and monitoring. |
| ML & AI | Retrieval-augmented generation | Trace document ingestion/indexing to permission-aware retrieval, source-grounded answers, and evaluation. |
| ML & AI | Real-time fraud scoring | Build a bounded-latency prediction flow with online features, fallbacks, thresholds, and review feedback. |
| ML & AI | Model monitoring | Track service health, drift, delayed labels, model versions, affected cohorts, and response actions. |
| Platform | Internal developer platform | Separate self-service control plane from workloads; define templates, service catalog, paved paths, and escape hatches. |
| Platform | Multi-region failover | State RTO/RPO, replication and routing decisions, failover/failback, and recovery tests. |
| Platform | Service discovery | Design registration, health, lookup caching, endpoint expiry, and control-plane failure behavior. |
| Platform | Secrets management | Define identity-based access, secret delivery, rotation/revocation, and auditability. |
| Platform | Safe deployment platform | Model immutable releases, staged rollout, health gates, pause/rollback, and ownership. |
| Platform | Metrics and observability platform | Design telemetry intake/storage/query, cardinality limits, retention, alert routing, and ownership. |
| Platform | Configuration control plane | Version and validate configuration, stage rollout, revert safely, and serve last-known-good state. |

The expanded SDE topics were selected after reviewing the publicly available [Educative system-design interview course](https://www.educative.io/courses/grokking-the-system-design-interview) and [Exponent, now Aced](https://www.aced.io/), alongside common interview archetypes. The prompts and requirements above are independently written for DesignRounds; do not reproduce third-party lesson text, diagrams, or solutions.

### Practice workspace

The workspace is a two-way design-and-discussion environment, not a chat page with a diagram attached. The diagram is the learner's working artifact; the interviewer stays alongside it and discusses the learner's actual choices.

On desktop, use a draw.io-style canvas as the primary, largest work area, with a docked conversation panel on the right. Keep the prompt and requirements reachable in a collapsible area or drawer so they do not compete with the canvas. The conversation panel is **open and visible by default** throughout a practice round. Provide a clearly labeled, persistent control to hide or reopen it; hiding the panel should give the canvas more room and must not end the conversation or discard its state. Preserve the learner's panel visibility preference for the current session.

The canvas should provide familiar diagram-editor interactions without attempting to replicate every feature of draw.io:

- A component palette with clear, searchable categories for common system-design elements such as clients, load balancers, services, databases, caches, queues, object storage, and external systems.
- Add components by dragging from the palette or using an accessible add action; place, select, move, duplicate, rename, and remove them.
- Connect components with directional edges, label connections, and make data flow and relationship direction clear.
- Edit component details and annotations, including a rationale or decision note; keep detailed explanations available without crowding the diagram.
- Provide selection, connect, undo, redo, zoom, pan, and fit-to-view controls, with clear labels or tooltips.
- Make it easy to select a component or connection and ask the AI about that specific part of the design.
- Support keyboard-accessible alternatives for important drag-and-drop actions.

The conversation panel is a persistent interview workspace, not a generic chatbot. It should feel like a guided, human-paced discussion: the AI asks a focused question, the learner can explain a decision or ask a question in return, and the AI responds in context before the discussion moves on. Keep the current question and the learner's reply easy to follow, while avoiding excessive chat chrome, unrelated assistant capabilities, or a stream of unsolicited messages.

The learner should be able to:

- Explain why they chose a component, connection, technology, or trade-off and receive a specific follow-up.
- Ask the AI questions at any time, including for prompt clarification, explanations of concepts, feedback on a selected part of the diagram, or help understanding an interviewer question.
- Reply in their own words, ask a follow-up, request a hint, or say they are unsure without losing the interview thread.
- See when a question or response relates to a selected canvas component, connection, requirement, or earlier decision.
- Return to the conversation after hiding and reopening its panel, with messages and the current interview state intact.
- See clear sending, responding, retry, and AI-unavailable states; sending a message must not silently discard it.

On smaller screens, keep the same capabilities without squeezing the canvas and conversation side by side. Use explicit Canvas and Conversation tabs or a drawer, preserve conversation state when switching, and make it obvious when a response is waiting in the other view.

The whole workspace should also let the learner:

- Save automatically and see a clear saved/saving/error state.
- Pause and resume, or finish the round.
- Use keyboard navigation and shortcuts where practical.

### Interviewer behavior

The AI interviewer should conduct a contextual back-and-forth conversation:

- Start with a focused opening question and ask **one main question at a time**, while allowing the learner to interrupt with clarification questions or follow-ups.
- Proactively ask the learner to explain significant choices visible in the canvas, for example: “Why did you put a cache here?”, “What trade-off led you to this database?”, or “How would this queue affect delivery guarantees?”
- Trigger proactive questions only for significant additions (data stores, caches, queues, load balancers, gateways and similar, not every element) and for major changes such as several components added or core connections rewired. Wait until the canvas has been quiet for a short time and evaluate the pending changes together.
- Don't ask about a choice the learner has already explained, whether in the conversation before or just after adding it, or in the component's “why” note. A real interviewer doesn't re-ask what the candidate just said.
- Keep at most one open interviewer question, leave a cooldown between unprompted questions, and never interrupt while the learner is typing.
- Listen to and address questions the learner asks. Answer in the context of the prompt, requirements, current design, and interview stage; clarify the prompt when asked instead of treating every learner message as an answer to the current question.
- Use the selected component or connection, current and prior diagram versions, stated requirements, learner explanations, and relevant recent conversation as context. Identify what its question refers to so the learner can connect discussion to the design.
- Follow the learner's reasoning with useful probes about scale, read/write patterns, consistency, latency, failure modes, security, or operational trade-offs when relevant—not a rigid checklist unrelated to their design.
- Acknowledge a reasonable answer, surface a meaningful gap or counterexample, and give the learner room to respond before advancing.
- Avoid repeating a question already answered and avoid penalizing a learner for asking for clarification or saying “I don't know.”
- Offer a hint when requested, with a clear indication that a hint was used.
- Never add, move, or modify diagram elements without the learner's explicit request and confirmation. Any AI-proposed edit should be previewed and accepted or dismissed by the learner.
- Stop introducing new questions when the session is finished or the learner asks to review.
- Avoid presenting guesses as facts; state assumptions, ask for clarification, and distinguish explanation from evaluation when context is missing.

### Session review

The review should be useful even without a single overall score. Include:

- A concise summary of the proposed design.
- What the learner did well, tied to observable decisions or explanations.
- Important omissions or risks and why they matter.
- An assessment across explicit rubric dimensions.
- A small number of prioritized improvements.
- Follow-up questions for the learner to answer or revisit.
- Links or references to the relevant parts of the session, when available.
- A clear distinction between observed evidence and inferred feedback.

If a numeric score is used, explain the rubric, show dimension-level results, and avoid false precision. Do not score solely from diagram appearance; reasoning, assumptions, and trade-offs matter.

## 4. Features

### Essential for a credible first release

1. **Discipline-based prompt library:** Curated SDE, Data Engineering, ML & AI, and Platform & Infrastructure tracks with explicit prompt expectations and free/paid availability.
2. **Guided session flow:** Prompt, requirements, design, interview, and review states.
3. **Draw.io-style system-design canvas:** A component palette, drag-and-drop placement, selectable components, labeled directional connections, notes, and familiar editing controls.
4. **Persistent conversational interviewer:** A right-side panel, visible by default and hideable/reopenable on demand, where the learner can both answer AI follow-ups and ask questions about the prompt, concepts, or selected parts of the design.
5. **Paid AI coaching:** Interactive questions, learner-initiated help, and in-round feedback are an explicit paid-plan benefit; no AI call is triggered by ordinary canvas edits.
6. **Fair end-of-session review:** Free rounds may receive the single disclosed final rubric review; paid rounds may receive a more detailed report. Apply the same honest scoring rubric to both plans.
7. **Autosave and resume:** Session state survives refreshes and can be reopened.
8. **Authentication and ownership:** Users can access only their own saved sessions.
9. **Responsive and accessible interface:** Keyboard support, readable contrast, sensible focus states, and usable narrow-screen layouts.
10. **Clear privacy and AI disclosures:** Explain what data is sent to AI services, what is stored, and how a learner can delete it.
11. **Operational safeguards:** Rate limits, request validation, error handling, and cost monitoring for AI usage.
12. **Freemium entitlements:** Enforce a balanced free catalog, paid conversation access, and one final free review per completed attempt on the server.

### Strong follow-up features

- Session history with search, filters, and replay.
- Retry a prompt while preserving prior attempts for comparison.
- Personal progress by skill area, based on completed rubric dimensions.
- Optional hints that can be requested without ending the interview flow.
- Multiple interview modes, such as guided practice, timed interview, and review-only.
- Prompt collections for common systems (feeds, chat, URL shortener, file storage, and similar problems).
- Export a diagram or review as an image or shareable private link.
- Mentor review or private sharing, with explicit learner-controlled permissions.
- Admin tools for curating prompts, rubrics, and model instructions.
- Optional keyboard-first editing and copy/paste of diagram elements.
- Feedback reporting so users can flag incorrect or unhelpful AI responses.
- Checkout and subscription-management flows after validating willingness to pay and selecting a billing provider.

### Defer until validated

- Public leaderboards and competitive rankings.
- Real-time multi-user collaboration.
- Voice interview mode.
- Large-scale prompt marketplace.
- Complex simulations or automatic load testing.
- Native mobile applications.

These can add substantial product and engineering cost. Prioritize them only when user research shows they solve a real problem.

## 5. Visual and interaction design direction

### Desired impression

- Seasoned, precise, calm, and technically credible.
- More like a focused engineering workspace than a flashy AI landing page.
- Confident typography and hierarchy, generous spacing, and restrained color.
- Realistic product screenshots and diagrams that reflect actual functionality.

### Avoid “AI slop”

- No generic glowing brains, robot faces, neon gradients, floating particles, or decorative circuit patterns.
- No vague hero copy such as “Unlock the future with AI.”
- No gratuitous glassmorphism, gradient text, excessive rounded cards, or animated backgrounds.
- No walls of AI-generated copy, ungrounded claims, or fake testimonials.
- No unnecessary AI badges attached to every UI element.
- No auto-generated architecture diagram as a substitute for the learner's own work.

### Practical design system

- Use a neutral background and high-contrast text, with one restrained accent color and a consistent semantic palette.
- Reserve colors for meaning: selected, success, warning, error, and informational states.
- Use a legible sans-serif for interface text and an optional restrained monospace for technical labels.
- Establish consistent spacing, typography, border, elevation, and focus-token scales.
- Keep motion short and functional; respect reduced-motion preferences.
- Use consistent component shapes and labels in the canvas, supported by shape or text—not color alone.
- Ensure loading, empty, save failure, AI unavailable, and permission-denied states are designed, not improvised.
- Create responsive layouts deliberately. The desktop workspace may be optimized for canvas work; mobile should still support prompt reading, conversation, and review.

### Accessibility baseline

- Meet WCAG 2.2 AA where applicable.
- Ensure keyboard access to navigation, dialogs, forms, and essential canvas operations.
- Provide accessible names and visible focus indicators.
- Do not communicate status by color alone.
- Support zoom and text resizing; test contrast and screen-reader labels.
- Offer a non-drag interaction for creating or connecting canvas elements where feasible.

## 6. Modular system design

The system should be divided by responsibility so that each feature can be understood, tested, and changed without loading the entire codebase or sending unrelated context to an AI model.

### Suggested logical modules

| Module | Responsibility | Owns |
|---|---|---|
| `identity` | Sign-in, session ownership, and authorization | User identity and access checks |
| `prompt-catalog` | Browse, search, and retrieve practice prompts | Prompt content, topics, difficulty, rubric version |
| `practice-session` | Start, pause, resume, and finish a round | Session lifecycle and status |
| `diagram` | Validate, save, load, and version the canvas graph | Nodes, edges, viewport, diagram version |
| `interview` | Track turns and coordinate interviewer questions | Conversation turns and question state |
| `feedback` | Generate and store milestone and final reviews | Rubric results and evidence |
| `progress` | Summarize completed practice and skill trends | Derived learner progress |
| `ai-gateway` | Provide a safe, provider-independent AI interface | Model routing, prompts, schemas, token/cost metadata |
| `web-app` | Present public pages, library, workspace, and review | UI composition and client-side state |
| `operations` | Logging, rate limits, health checks, and usage monitoring | Operational visibility and safeguards |

These are logical boundaries, not a requirement to create a separate service for each. Start with a modular monolith: one deployable application with clear module interfaces. Split a module into a separate service only when scale, reliability, team ownership, or deployment needs justify the added operational cost.

### Data storage: current implementation and future choice

**Current implementation:** An Express API (modular monolith with `identity` and `practice-session` modules) stores data in PostgreSQL. Local development uses PGlite, an embedded Postgres persisted to `.data/pglite`, so no database install is needed; setting `DATABASE_URL` points the same SQL at a hosted Postgres such as Neon or Supabase. Tables: `users` (profile and plan), `login_codes` (HMAC-hashed one-time codes), `auth_sessions` (hashed session tokens), `practice_sessions` (one attempt per prompt with the current diagram as validated JSONB and an optimistic-concurrency version), and `diagram_versions` (periodic checkpoints). Prompt definitions remain versioned source-controlled content shared by client and server.

**Recommended first backend:** When accounts and cross-device saving are required, start with one managed PostgreSQL database (Supabase Postgres is a candidate, not yet selected) behind the application API. Keep the product as a modular monolith; do not add Redis, a vector database, or microservices until measured needs justify them.

| Product area | First storage choice | Reason and boundary |
|---|---|---|
| Identity | Managed auth provider; store the provider's user ID and app profile in PostgreSQL | Do not build password storage or duplicate credentials. Enforce ownership in the API and database policies. |
| Prompt catalog and rubrics | Versioned source-controlled content initially; PostgreSQL tables if editorial workflows require database-backed publishing | Prompts are reviewed product content, not learner-generated records. Keep rubric and prompt versions attached to each attempt. |
| Practice sessions and entitlements | PostgreSQL relational tables | Ownership, lifecycle, plan, usage allowance, and idempotency need transactions and constraints. Billing-provider events update entitlement records; do not store card data. |
| Diagrams | PostgreSQL diagram-version rows with validated JSONB graph snapshots | Diagram data is structured, versioned, and naturally belongs to a session. Save checkpoints/version deltas only if snapshot size or write volume later warrants it. |
| Conversation and final reviews | PostgreSQL turn and review records | Keep ordered, attributable session history and rubric evidence. Retain only what the privacy policy requires; do not store hidden evaluator material in client-visible records. |
| Uploaded assets, if introduced | Managed object storage, with metadata and access references in PostgreSQL | Keep large binary objects out of relational rows; issue short-lived, authorized upload/download URLs. |
| Search | PostgreSQL full-text search to start | It is sufficient for a curated catalog; add a dedicated search service only if relevance, language, or scale demands it. |
| Cache, rate limits, and background work | No separate database initially; add a managed Redis-compatible cache/queue only for measured latency, shared rate-limit, or job-processing needs | A cache is disposable and never the source of truth. Durable AI/review jobs and usage checks must remain recoverable and idempotent. |
| Logs and product analytics | A privacy-reviewed observability/analytics service with bounded retention | Keep operational telemetry separate from canonical session records; redact prompts, credentials, and personal data as appropriate. |

This is a staged recommendation, not a claim that these future stores are already connected or that Supabase has been selected. Before launch, validate provider pricing, region, backups, retention, access controls, and commercial terms.

### Suggested request flow

1. The web app requests a prompt or an authorized practice session from the application API.
2. The API checks identity and session ownership, validates the request, and loads only the context needed for the action.
3. Canvas edits are validated and persisted as diagram state or a new diagram version; they do not trigger an AI call for every drag, move, or keystroke.
4. When the learner sends a message or requests an interviewer turn, the session module records the turn and coordinates the conversation action.
5. When AI is required, the session module calls the AI gateway with a task-specific, minimized context object, including relevant diagram details and any component/edge the learner selected.
6. The AI gateway applies the relevant prompt template, output schema, model policy, limits, and provider configuration.
7. The response is validated before it is stored or returned to the web app with its conversation turn and any relevant design references.
8. The client renders the response in the right-side conversation panel and reports meaningful sending, responding, saved, and error states.

### API surface (illustrative)

Use the conventions of the chosen framework. Keep endpoint names and payloads versionable, validated, and explicit.

- `GET /api/v1/tracks` — list discipline tracks and prompt counts for the caller's plan.
- `GET /api/v1/prompts?track=&topic=&difficulty=&access=` — list only prompts the caller is entitled to see; return lock metadata for discoverable paid prompts without leaking hidden solution material.
- `GET /api/v1/prompts/{promptId}` — fetch an entitled prompt's learner-facing brief, requirements, expected work, and rubric summary.
- `GET /api/v1/me/entitlements` — return the authenticated user's effective plan and usage limits.
- `POST /api/v1/sessions` — create a session for an entitled prompt and mode.
- `GET /api/v1/sessions/{sessionId}` — load an owned session.
- `PATCH /api/v1/sessions/{sessionId}` — update session state or lifecycle.
- `PUT /api/v1/sessions/{sessionId}/diagram` — save a validated diagram version.
- `POST /api/v1/sessions/{sessionId}/turns` — paid-plan conversational AI action: submit an answer, ask a question, request clarification, or ask for a hint and receive one contextual interviewer turn.
- `POST /api/v1/sessions/{sessionId}/final-review` — complete a round and request the one permitted free-tier final report or a paid detailed report. Enforce attempt and entitlement limits server-side and make generation idempotent.
- `GET /api/v1/sessions/{sessionId}/review` — retrieve a saved report the caller is entitled to access.
- `DELETE /api/v1/sessions/{sessionId}` — delete a session and associated learner data as permitted by policy.

Do not expose provider API keys or call a paid model directly from an untrusted browser client.

The `turns` request should distinguish `answer`, `learner_question`, `clarification_request`, and `hint_request`. Include the session ID in the path; optionally include a selected node/edge ID, relevant diagram version, and a client idempotency key. The server loads the canonical prompt, diagram, recent relevant turns, account entitlements, and usage limits. It must not trust a client-supplied user ID, plan, rubric score, or complete AI context.

Return a validated response containing the assistant turn ID and content, turn type, optional next question, related diagram references, saved conversation state, and bounded usage metadata. For free users, reject conversational turn requests with a clear upgrade-required response; do not fall through to an unmetered model call. For a final review, record attempt/report state before returning success so retries cannot create duplicate paid generations or bypass the free allowance.

Example learner-initiated question:

```json
{
  "turnType": "learner_question",
  "message": "Would a queue help if the write service becomes overloaded?",
  "context": {
    "diagramVersion": 8,
    "selectedNodeId": "write-service"
  },
  "idempotencyKey": "client-generated-request-id"
}
```

The response should include a stable turn ID, a plain-text answer, optional follow-up question, diagram references, and bounded usage metadata. Return a machine-readable `UPGRADE_REQUIRED` error for a free-plan conversation request, `429 USAGE_LIMIT_REACHED` when a paid quota is exhausted, and an idempotent existing report for a repeated final-review request. The server-side entitlement check must run before any model call.

## 7. AI design and token efficiency

AI context should be built for the current task, not assembled as a full transcript and full application dump on every request. The model should receive only the minimum relevant context required to produce a reliable result.

### Providers and models

AI calls go through one server module (`server/modules/ai/`) with interchangeable providers selected by configuration:

- **Production target:** Claude Sonnet 5.5 (`claude-sonnet-5-5`) at low effort for interviewer turns and medium effort for final reviews, called through the official Anthropic SDK. This provider is added when paid API access is set up.
- **Development:** Google Gemini's free tier through its OpenAI-compatible endpoint (`AI_PROVIDER=openai-compat`). Free-tier traffic may be used by the provider to improve its products, so it is used with test data only, never real learners. Any other OpenAI-compatible API (for example Groq) can be swapped in with `AI_BASE_URL` and `AI_MODEL`.
- **Tests and offline work:** a `fake` provider returns clearly labelled, schema-valid sample output. It is refused in production; without a configured provider, production runs with AI disabled.

Prompts tuned on one model don't transfer perfectly, so prompt templates are versioned and must be checked against the production model on a small evaluation set before launch.

### Prompt layers and reference content

Every AI request is assembled from four layers, each versioned and recorded with stored results:

1. **Shared policy** (`server/modules/ai/prompts/policy.js`): role, tone, what the AI must and must not do, and the rule that learner text is data, never instructions.
2. **Task instructions**: per task (final review now, interviewer next).
3. **Interviewer guide** (`server/content/guides/<track>.md`): curated notes for the specific prompt covering scope and scale, core components, key trade-offs, common mistakes, deep-dive questions, and what a strong answer looks like. Guides calibrate depth and consistency; they are not a checklist, and valid alternatives earn credit. They live under `server/` so they never reach the browser bundle.
4. **Live context**: the compact diagram summary and, for the interviewer, recent turns and the selected component.

No orchestration framework is used: each task is a single schema-constrained call, and the curated guides replace retrieval because the catalog is small and known in advance.

Prompt changes are checked with `npm run ai:eval`, which runs the review prompt against `server/content/eval/review-cases.js` (weak, medium, and strong designs plus a prompt-injection case) and fails on scores outside expected ranges, missing key risks, leaked component ids, invalid references, or unstable scores across repeats. Add a case whenever a learner reports an inaccurate review, and rerun the eval against the production model before launch.

### Task-specific context

| AI task | Include | Usually exclude |
|---|---|---|
| Next interviewer question | Prompt summary, key requirements, compact diagram summary, recent relevant turns, current interview stage | Full account profile, unrelated attempts, complete raw event history |
| Clarify a design decision | Selected component/connection, related requirements, relevant learner explanation, recent turns | Entire diagram history and unrelated conversation |
| Milestone feedback | Current rubric dimensions, relevant diagram summary, learner's stated decisions, recent evidence | Repeated prompt boilerplate and unrelated past sessions |
| Final review | Prompt and rubric version, final diagram, concise session transcript/evidence, hint usage if rubric-relevant | Other users' data and unrelated personal details |

### Context management

- Store canonical session data in the application database; do not treat the model context as storage.
- Keep a compact, updateable session summary for longer conversations.
- Include recent turns plus relevant older evidence selected by topic or decision, rather than replaying every turn.
- Summarize older conversation with a task-specific, structured summary and preserve important learner statements and unresolved questions.
- Keep stable system instructions and rubric text versioned and referenced by ID. Avoid resending large duplicated boilerplate when the provider supports safe prompt caching; do not rely on caching for correctness.
- Represent the diagram as structured data and send a compact semantic summary unless exact node/edge details are needed.
- Set task-specific input and output token budgets, maximum history, timeout, and retry policy.
- Use smaller/cheaper models for suitable bounded tasks and stronger models only when quality requires it. Select providers/models through configuration, not throughout product code.
- Avoid making a paid AI request on every canvas drag or keystroke. Debounce local persistence, and trigger AI only at an explicit learner action or defined milestone.
- Deduplicate repeated requests where safe, and track latency, token usage, errors, and cost per task.
- Make the AI response schema small and task-specific; reject invalid output and surface a useful retry/error state rather than silently accepting malformed feedback.
- Never include credentials, unrelated personal information, or another user's data in model context.
- Resolve plan entitlements and per-plan usage limits in application code before calling the model. The model must never decide whether a user is paid, whether a quota is exhausted, or what a review costs.

### Structured AI outputs

Use strict, validated response shapes where practical. Example next-question result:

```json
{
  "question": "What happens to writes if the primary database becomes unavailable?",
  "reason": "The current design has a single write path and no stated failover behavior.",
  "relatedAreas": ["reliability", "data-storage"],
  "hintAvailable": true
}
```

Example review dimensions:

```json
{
  "dimensions": [
    {
      "name": "requirements",
      "rating": "developing",
      "evidence": ["The learner identified read-heavy traffic."],
      "improvement": "Clarify the expected write volume and latency target."
    }
  ],
  "strengths": [],
  "risks": [],
  "nextSteps": []
}
```

The application—not the model—should enforce allowed enum values, response size, session ownership, and whether a session is in a state that permits the requested action.

### AI quality and safety

- Treat user-provided prompt text, diagram labels, and chat as untrusted input.
- Keep application instructions and user content clearly separated.
- Prevent the model from changing permissions, calling arbitrary tools, or accessing unrelated records.
- Validate model output, render it safely, and avoid interpreting generated text as executable code or trusted markup.
- Provide a way to report inaccurate or inappropriate feedback.
- Evaluate prompt changes against a small, maintained test set of representative sessions.
- Track feedback quality and failure modes; do not use model confidence claims as proof of correctness.
- State clearly when an answer is AI-generated and encourage verification of consequential technical claims.

### Analytics

Read-only SQL views (migration `003_analytics.sql`) expose ids and metrics only, never design or review text: `analytics_reviews`, `analytics_review_dimensions`, `analytics_review_decisions`, `analytics_ai_usage_daily`, `analytics_prompt_funnel`, and `analytics_users_daily`. Reviews record the plan in effect when they were requested. The embedded local database (PGlite) allows one process at a time, so analytics against shared data should use the hosted Postgres (`DATABASE_URL`) with a read-only role.

### Developer tools

In development, the account menu offers a one-click Free/Plus switch for testing plan-dependent behaviour. It is controlled by configuration rather than code: on by default outside production, disabled with `DEV_TOOLS=false`, and never available in production, where its routes are not mounted.

## 8. Data model

The following entities are a starting point. Use the project's chosen database conventions and avoid storing redundant derived data unless needed for performance.

- **User:** Identity-provider reference, display preferences, timestamps.
- **Prompt:** Track, technical topic, title, scenario, functional requirements, non-functional requirements, expected learner work, access tier, difficulty, duration, prompt version, publication state.
- **Rubric:** Versioned dimensions, descriptions, and evaluation guidance associated with a prompt or prompt version.
- **PlanEntitlement:** User, effective tier, billing status and period, limits, and entitlement version; updated from trusted billing events.
- **PracticeSession:** User, prompt and version, mode, status, timestamps, current stage, and relevant settings.
- **DiagramVersion:** Session, version number, validated nodes and edges, viewport metadata, and creation time.
- **ConversationTurn:** Session, role, content, timestamp, and optional references to a diagram version, selected component/edge, related requirement, or the question being answered.
- **FeedbackReport:** Session, rubric version, validated structured result, generation status, and timestamps.
- **UsageRecord:** AI task type, provider/model identifier, token counts where available, latency, outcome, and cost estimate.

### Data handling rules

- Enforce user ownership in every session read, update, export, and delete path.
- Validate diagram size and content; impose practical limits on nodes, edges, text length, and request size.
- Version prompts and rubrics so an old review remains interpretable after content changes.
- Define retention and deletion behavior for account, conversation, diagram, and AI usage data.
- Do not log full conversation or diagram contents by default. Use redacted identifiers and operational metadata where possible.
- Back up persistent data and test recovery procedures before relying on the service for user history.

## 9. Security, privacy, and reliability

- Use a trusted authentication provider or a carefully implemented established authentication library.
- Apply server-side authorization to every user-owned resource; never rely on client-supplied user IDs.
- Validate and size-limit all input, including diagrams, chat messages, prompt filters, and exports.
- Store secrets in environment-specific secret management, not in source control or browser bundles.
- Rate-limit expensive AI actions by user and IP as appropriate; include quotas and abuse monitoring.
- Protect against cross-site scripting, CSRF where relevant, injection, insecure direct object references, and unsafe file handling.
- Use TLS in production and encrypt sensitive stored data according to the selected hosting/database capabilities.
- Make AI-provider outages recoverable: preserve the learner's work, show a clear retryable error, and do not mark an unsuccessful AI response as a successful review.
- Use timeouts and bounded retries; avoid retry loops that multiply cost.
- Provide health checks, structured error monitoring, and alerts for elevated failures or unexpected usage.
- Document what is sent to AI providers and honor the selected provider's data-handling configuration.
- Give users a clear way to export or delete their data where product policy and applicable law require it.

## 10. Recommended implementation sequence

### Phase 0: Validate the product

- Test the workflow with target learners using a clickable prototype or simple static mockup.
- Validate the prompt format, workspace layout, and rubric with a small number of realistic interview rounds.
- Decide supported login method, hosting, model provider, and data-retention policy before implementation.

### Phase 1: Functional MVP

- Build the design system, public landing page, and responsive prompt library.
- Implement authentication and user-owned session creation, saving, and resume.
- Build the core canvas with nodes, edges, labels, notes, undo/redo, and basic accessibility.
- Implement the session flow and contextual interviewer with one-question-at-a-time behavior.
- Add a saved end-of-session review with a transparent rubric.
- Add rate limits, validation, error states, privacy disclosures, and AI usage tracking.

### Phase 2: Learning loop

- Add session history, retries, review comparisons, prompt search, and learner progress.
- Improve diagram summaries and relevance of AI questions based on observed use.
- Add prompt and rubric administration, response-quality evaluation, and cost dashboards.

### Phase 3: Expand carefully

- Consider private sharing, mentor review, additional practice modes, and voice only after user research supports them.
- Separate services or add more complex infrastructure only when actual scale or reliability requirements justify it.

### Initial deployment approach

- Deploy the Vite frontend as static assets on Vercel's free Hobby plan only while the product is a personal, non-commercial project. Because the intended product is freemium, verify hosting terms before commercial launch and budget for a plan that permits that use (or choose a provider whose applicable plan does).
- Connect the GitHub repository for preview deployments from feature branches and a production deployment from the chosen production branch. The current hash-based navigation needs no server rewrite.
- Keep the first release frontend-only: no paid AI calls, managed database, or authentication service is required while canvas data is stored in the user's browser.
- Clearly disclose that browser-local work does not sync to another device and can be removed by clearing browser storage.
- Add shared persistence and identity only when needed. Before selecting a free-tier backend, compare current pricing, inactivity/sleep behavior, backup and recovery options, region, quotas, and data export.
- When AI is enabled, use a server-side function or API, never expose model credentials to the browser, set per-user quotas and token budgets, and track cost separately from hosting. A free static host does not make model inference free.
- Treat provider free tiers as an initial low-volume option, not an availability or long-term-cost guarantee; recheck terms and usage before accepting real user data or commercial traffic.

## 11. Quality plan

### Product and usability checks

- A first-time user can understand the product and begin a practice round without instructions from a human.
- A learner can complete the core round without losing work or being forced to accept an AI suggestion.
- The UI always explains loading, saving, failure, and completion states.
- The review points to concrete learner evidence and gives a manageable number of next steps.

### Engineering checks

- Unit tests for diagram validation, session state transitions, ownership rules, and rubric parsing.
- API tests for authorization, input validation, rate limits, and expected errors.
- Entitlement tests for the published free-catalog split, representative coverage across all tracks, paid-only interactive AI, and one idempotent final free report per attempt.
- Rubric regression tests showing that a learner's plan does not alter marks for identical evidence and the same rubric version.
- Integration tests for save/resume, diagram versioning, interviewer turn creation, and final review persistence.
- AI contract tests using deterministic fixtures or a mocked provider; keep ordinary tests independent of paid live model calls.
- Evaluation cases for prompt injection, irrelevant questions, repeated questions, malformed model output, and sparse learner input.
- Browser tests for the main desktop workflow, a narrow-screen layout, keyboard navigation, and save/refresh/resume.
- Monitoring for request latency, AI failures, token usage, cost, and save failures.

## 12. Success measures

Measure whether the product helps people practice, not just whether it generates AI output:

- Prompt-to-start conversion.
- Practice-round start and completion rates.
- Percentage of learners who save or resume a session.
- Learner rating of interviewer relevance and review usefulness.
- Reported rate of inaccurate or repetitive questions.
- Improvement across rubric dimensions on repeat attempts, interpreted cautiously.
- AI latency, failure rate, token usage, and cost per completed round.
- Accessibility and usability issues found in testing.

Do not optimize for conversation length, raw AI message count, or time-on-site if those do not improve learning.

## 13. Decisions to make before implementation

These choices affect architecture or user expectations and should be explicitly decided:

1. **Audience and mode:** Interview prep only, or also general architecture learning and mentor-led sessions?
2. **Paid plan details:** Keep the freemium access split described above; validate subscription pricing, renewal terms, AI quotas, and checkout provider with learners before charging.
3. **AI provider and data terms:** *Decided:* Claude Sonnet 5.5 in production; Gemini free tier for development with test data only (see §7, Providers and models).
4. **Authentication:** Which identity provider and sign-in methods are needed for the first release?
5. **Persistence and deployment:** Which application framework, database, hosting environment, and region fit the team?
6. **Retention:** How long are conversations, diagrams, and usage records stored, and what does deletion mean?
7. **Scoring:** *Decided:* a numeric score (0–100 overall, 0–10 per dimension) together with descriptive ratings (Strong, Solid, Developing, Needs work). The overall score is computed in application code from weighted dimension scores, never taken from the model.
8. **Mobile scope:** Should mobile support full diagram editing at launch, or prioritize prompt, chat, and review?

## 14. MVP definition of done

The first release is ready when a user can:

1. Understand the product from the landing page without misleading claims.
2. Sign in and choose a curated system design prompt.
3. Start a session, clarify requirements, and build a diagram using accessible core controls.
4. Receive relevant interviewer questions grounded in the prompt and current design.
5. Save, refresh, and resume without losing the session.
6. Finish the round and receive a transparent, actionable review.
7. Find and delete their own practice data according to the published policy.

The implementation is modular when the above capabilities have clear ownership and interfaces, can be tested independently, and use task-specific AI context—without requiring a premature fleet of microservices or repeatedly sending the entire project to a model.
