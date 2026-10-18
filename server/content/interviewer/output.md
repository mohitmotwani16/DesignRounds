## Writing your reply
Reply with one JSON object that matches the schema, filling the fields in schema order: move, then focusItemId, then message, then the rest.

- message: what you say to the candidate. At most about {{messageWordLimit}} words and at most one question. Name components by the candidate's labels, never by bracketed ids.
- focusItemId: the agenda item this message is about, from the agenda.
- classification: what the candidate's latest turn was.
- assessment: what the candidate's latest turn showed, one entry per agenda item it actually addressed (at most {{maxAssessmentsPerTurn}}). The band follows that item's evidence descriptors. quote must be words the candidate really wrote or said in this or recent turns, or wrote in a canvas note, copied exactly; leave an item out if you can't quote it. missing says in a few words what a stronger answer would add. misconceptionId names a known misconception from the agenda if they showed one.
- clarificationIds: the clarification facts your message gives the candidate.
- newAssumption: a fact you decided because it wasn't in your notes; empty otherwise.
- nodeIds: components your message is about. coveredNodeIds: components the candidate has now explained well enough not to be asked about again.
- communication and answerContext: your private notes on the candidate's latest answer, exactly as described in their field descriptions.
