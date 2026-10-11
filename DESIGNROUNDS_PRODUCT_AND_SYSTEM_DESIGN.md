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
2. **Choose a round:** Browse or filter prompts by topic, difficulty, and estimated time.
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

### Practice library

Each prompt card should make the choice understandable at a glance:

- Prompt title and a short scenario.
- Difficulty and estimated duration.
- Main topics, for example caching, feeds, storage, or messaging.
- Whether the prompt is available, in progress, or completed.
- A clear start or resume action.

Useful filters include topic, difficulty, estimated time, and completion status. Keep search and filters simple until the library is large enough to need more.

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

1. **Prompt library:** A small, curated set of high-quality system design prompts with difficulty, topic, and expected duration.
2. **Guided session flow:** Prompt, requirements, design, interview, and review states.
3. **Draw.io-style system-design canvas:** A component palette, drag-and-drop placement, selectable components, labeled directional connections, notes, and familiar editing controls.
4. **Persistent conversational interviewer:** A right-side panel, visible by default and hideable/reopenable on demand, where the learner can both answer AI follow-ups and ask questions about the prompt, concepts, or selected parts of the design.
5. **Incremental feedback:** Useful feedback at milestones or when requested, not an unsolicited stream of expensive evaluations after every mouse movement.
6. **Structured end-of-session review:** Evidence-based strengths, gaps, rubric, and next steps.
7. **Autosave and resume:** Session state survives refreshes and can be reopened.
8. **Authentication and ownership:** Users can access only their own saved sessions.
9. **Responsive and accessible interface:** Keyboard support, readable contrast, sensible focus states, and usable narrow-screen layouts.
10. **Clear privacy and AI disclosures:** Explain what data is sent to AI services, what is stored, and how a learner can delete it.
11. **Operational safeguards:** Rate limits, request validation, error handling, and cost monitoring for AI usage.

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

- `GET /api/prompts` — list prompts with supported filters.
- `GET /api/prompts/{promptId}` — fetch prompt details.
- `POST /api/sessions` — create a session for a prompt and mode.
- `GET /api/sessions/{sessionId}` — load an owned session.
- `PATCH /api/sessions/{sessionId}` — update session state or lifecycle.
- `PUT /api/sessions/{sessionId}/diagram` — save a validated diagram version.
- `POST /api/sessions/{sessionId}/turns` — submit an answer and request the next interviewer turn.
- `POST /api/sessions/{sessionId}/feedback` — request a milestone review.
- `POST /api/sessions/{sessionId}/complete` — finish and generate the final review.
- `GET /api/sessions/{sessionId}/review` — retrieve the saved review.
- `DELETE /api/sessions/{sessionId}` — delete a session and associated learner data as permitted by policy.

Do not expose provider API keys or call a paid model directly from an untrusted browser client.

## 7. AI design and token efficiency

AI context should be built for the current task, not assembled as a full transcript and full application dump on every request. The model should receive only the minimum relevant context required to produce a reliable result.

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

## 8. Data model

The following entities are a starting point. Use the project's chosen database conventions and avoid storing redundant derived data unless needed for performance.

- **User:** Identity-provider reference, display preferences, timestamps.
- **Prompt:** Title, scenario, functional requirements, non-functional requirements, topics, difficulty, expected duration, prompt version, publication state.
- **Rubric:** Versioned dimensions, descriptions, and evaluation guidance associated with a prompt or prompt version.
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

## 11. Quality plan

### Product and usability checks

- A first-time user can understand the product and begin a practice round without instructions from a human.
- A learner can complete the core round without losing work or being forced to accept an AI suggestion.
- The UI always explains loading, saving, failure, and completion states.
- The review points to concrete learner evidence and gives a manageable number of next steps.

### Engineering checks

- Unit tests for diagram validation, session state transitions, ownership rules, and rubric parsing.
- API tests for authorization, input validation, rate limits, and expected errors.
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
2. **Business model:** Free, subscription, usage-based, or a combination? What usage limits are understandable and fair?
3. **AI provider and data terms:** Which provider and model meet quality, cost, latency, and privacy requirements?
4. **Authentication:** Which identity provider and sign-in methods are needed for the first release?
5. **Persistence and deployment:** Which application framework, database, hosting environment, and region fit the team?
6. **Retention:** How long are conversations, diagrams, and usage records stored, and what does deletion mean?
7. **Scoring:** Should the first release use descriptive rubric ratings only, or include a numeric score? Descriptive ratings are recommended until scoring is validated.
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
