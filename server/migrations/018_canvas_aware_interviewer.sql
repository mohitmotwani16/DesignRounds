-- The v3 interviewer asks the learner to draw what they describe, and won't start a
-- deep dive on a part that isn't on the canvas. Additive; v2 rounds ignore it.

-- How often the interviewer has asked for this item's part to be drawn (capped).
alter table interview_agenda_items add column draw_requests integer not null default 0;

-- When the interviewer last asked for drawing, and how big the canvas was then, so it
-- asks again only after a couple of turns without progress.
alter table interview_state
  add column last_draw_ask_seq integer,
  add column components_at_draw_ask integer;
