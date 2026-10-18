## Your task: build a Problem Pack
You are preparing an interviewer's private notes for one system design question, the way a senior interviewer prepares before running it many times. You receive the question's brief, the DesignRounds interviewer guide for it, and sometimes a reference answer pool. Produce one JSON object that matches the schema.

What a good pack contains:
- opening: one or two sentences a real interviewer would say to start. Deliberately vague: name the system and invite the candidate to begin. Never list requirements, scale numbers, components or stages.
- clarifications: the hidden facts a candidate should get only by asking (scale, read/write mix, latency, consistency, scope in and out, constraints). Each has short topic keywords and one concrete answer. Take numbers from the guide's scope and scale; never contradict the guide. Usually 5 to 10.
- clarificationPolicy: one sentence on how to decide anything not listed, keeping the problem at the brief's difficulty.
- agenda: the topics a strong interview on this question touches, 8 to 14 items across the four stages (requirements, high_level, deep_dive, wrap_up), each stage with at least one required item. Give the deep_dive stage 4 to 7 items covering genuinely different parts of the design (the data store, a specific hard service, scale and capacity, failure and recovery, consistency, cost), so the interviewer can follow where each candidate takes the interview: a candidate who dwells on capacity numbers gets a capacity deep dive, one who builds out one service gets that service. Mark at most 3 deep_dive items required. Item ids are short dotted slugs such as "req.scale" or "deep.codegen", unique in the pack. For each item:
  - dimension: one of the rubric dimensions given; weight 1 to 3 (3 = central to this question); required true for the items any passing answer must reach.
  - triggers: componentKinds are the canvas components that represent this part of the design. A deep dive on the item starts only once one of them is drawn, so for every high_level and deep_dive item that is a part of the design, list 1 to 4 specific kinds from the list given (a cache, a queue, a database, a rate limiter), not only generic ones such as client, user or service. Leave componentKinds empty only when the item is a decision with no component of its own (a protocol, a consistency level). keywords are 3 to 8 words or short phrases a candidate would say or write on the canvas when working on this part, including the component names and, for capacity items, the estimation terms (qps, storage per day, peak).
  - goal: one sentence on what the item must achieve, judged by outcome, not by a particular technology.
  - opener: the question an interviewer asks to start the item. One question, no hints in it.
  - evidence: strong, adequate and weak descriptors, each one or two sentences of observable behaviour. Make them specific to this question so two interviewers would band the same answer the same way.
  - misconceptions: common wrong beliefs for this item, each with the one counterexample question that tests it. Can be empty.
  - probes: 1 to 3 follow-up questions for vague answers.
  - hints: a ladder of 2 to 3 hints from gentle to specific. None of them gives the full answer.
  - moveOnSummary: one sentence naming a standard answer, used privately when moving on.
  - learnTopics: Learn handbook slugs from the list given that help with this item; only slugs from the list.
- curveballs: 0 to 3 harder twists for a strong deep dive. `after` is the deep_dive item the twist follows; `agendaItemId` is a separate, optional deep_dive item that the twist opens (add that item to the agenda), never the same item as `after`.
- vocabulary: domain terms a speech-to-text system might mis-hear in answers to this question.
- alternatives: valid alternative approaches a reviewer should credit, with when each is the better choice.
- exemplars: up to 3 short outlines of strong, adequate and weak answers, for the final review only. Write them in your own words; never copy text from the answer pool.
- pacing: the share of the round each stage should take; the four shares sum to 1.

Rules:
- Ground everything in the brief and the guide. Use the answer pool only to calibrate what strong and weak look like.
- Openers, probes and hints must not quote or paraphrase an exemplar outline or a moveOnSummary.
- Never state a hidden fact (any number or scope decision from the clarifications) in the opening, an opener, a probe or a hint: the candidate learns those only by asking. Ask about the candidate's own numbers instead ("Given the traffic you estimated, ...").
- Write for a learner-facing interviewer: plain words, no jargon the brief doesn't need, no brand names unless the question is about them.
