import { useEffect, useRef, useState } from "react";
import { AlertTriangle, ArrowRight, Check, Clock, Crown, Eye, Gift, Lightbulb, LoaderCircle, Mic, PenLine, RefreshCw, Send, ThumbsDown, X } from "lucide-react";
import { api } from "../api.js";
import { RecordingBar, VoiceNote, useVoiceRecorder, voiceSupported } from "./VoiceRecorder.jsx";

const STAGES = [
  ["requirements", "Requirements"],
  ["high_level", "High-level"],
  ["deep_dive", "Deep dive"],
  ["wrap_up", "Wrap-up"],
];

// The live interviewer conversation. State comes from useInterview so it survives
// the panel being hidden or the Review tab being open.
export function InterviewerPanel({ interview, roundFinished, selected, onClearSelected, onFocusNode, labelFor, onShowReview }) {
  if (interview.status === "loading") return <div className="interviewer-body interviewer-center"><LoaderCircle size={18} className="spin" /></div>;
  if (interview.status === "error") {
    return (
      <div className="interviewer-body interviewer-center">
        <p className="interviewer-muted">{interview.error.message}</p>
        <button className="button button-outline button-small" onClick={interview.reload}>Try again</button>
      </div>
    );
  }
  if (interview.access !== "full") return <LockedInterviewer interview={interview} onShowReview={onShowReview} />;
  return <Conversation interview={interview} roundFinished={roundFinished} selected={selected} onClearSelected={onClearSelected} onFocusNode={onFocusNode} labelFor={labelFor} onShowReview={onShowReview} />;
}

// Free plans. The interviewer is a Plus feature, and the panel says so first: one
// accent (the Plus amber), one primary action per state, and the free alternative
// (the written review) as a quiet link at the end.
//   available    -> the learner's one free interviewer round, with a confirm step
//   used / other -> Plus (opens in a new tab so the round stays where it is)
function LockedInterviewer({ interview, onShowReview }) {
  const trial = interview.trial;
  const [confirming, setConfirming] = useState(false);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState("");

  async function startTrial() {
    setStarting(true);
    setError("");
    try {
      await api.startInterviewerTrial(interview.sessionId);
      await interview.reload();
    } catch (startError) {
      setError(startError.message);
      setStarting(false);
      setConfirming(false);
      // The server's answer is the truth: reload so a used trial stops being offered.
      interview.reload();
    }
  }

  return (
    <div className="interviewer-body locked-interviewer">
      <header className="locked-head">
        <span className="locked-icon" aria-hidden="true"><Mic size={18} /></span>
        <span className="locked-badge"><Crown size={12} aria-hidden="true" /> Plus feature</span>
      </header>
      <div>
        <h3 className="locked-title">Practise out loud with an AI interviewer</h3>
        <p className="locked-lede">Explain your design by voice or chat while you draw. The interviewer asks why, pushes on weak spots and moves you through the round, like a real one.</p>
      </div>
      <ul className="locked-perks">
        <li><Check size={14} aria-hidden="true" /> Follow-up questions on every choice</li>
        <li><Check size={14} aria-hidden="true" /> Feedback on how clearly you explain</li>
        <li><Check size={14} aria-hidden="true" /> Hints when you're stuck</li>
      </ul>

      {trial === "available" ? (
        <section className="locked-offer" aria-labelledby="locked-offer-title">
          <h4 id="locked-offer-title"><Gift size={15} aria-hidden="true" /> Your first round is free</h4>
          <p>One per account, on any free question. It covers this whole round, and can't be moved once started.</p>
          {confirming ? (
            <div className="locked-actions" role="group" aria-label="Confirm free interviewer round">
              <button className="button button-plus button-small" onClick={startTrial} disabled={starting} autoFocus>
                {starting && <LoaderCircle size={14} className="spin" />} Use it on this question
              </button>
              <button className="button button-outline button-small" onClick={() => setConfirming(false)} disabled={starting}>Cancel</button>
            </div>
          ) : (
            <div className="locked-actions">
              <button className="button button-plus button-small" onClick={() => setConfirming(true)}>Start free interviewer round <ArrowRight size={14} /></button>
            </div>
          )}
          {error && <p className="form-error" role="alert">{error} Refresh the page if this keeps happening.</p>}
        </section>
      ) : (
        <section className="locked-offer" aria-labelledby="locked-offer-title">
          <h4 id="locked-offer-title"><Crown size={15} aria-hidden="true" /> {trial === "used" ? "You've had your free interviewer round" : "The interviewer is part of Plus"}</h4>
          <p>{trial === "used"
            ? "Keep practising out loud with Plus: the interviewer on every round, feedback on how you explain your design, and every question in the library."
            : "Plus includes the interviewer on every round, feedback on how you explain your design, and every question in the library."}</p>
          <div className="locked-actions">
            <a className="button button-plus button-small interviewer-cta" href="/plus" target="_blank" rel="noopener">Get Plus <ArrowRight size={14} /></a>
          </div>
        </section>
      )}

      <footer className="locked-foot">
        {trial === "available" ? (
          <p>Not now? Finish the round and get a written review of your design. It reads each component's “Why this choice?” note.</p>
        ) : (
          <>
            <h4 className="locked-foot-title">Your design still gets a review</h4>
            <p>Finish the round for a written review of what you drew. Without the interviewer, it's based on your diagram and the “Why this choice?” notes alone, so it can't judge how you explain your design. Put your reasoning in those notes.</p>
          </>
        )}
        <div className="locked-links">
          <button type="button" className="locked-link" onClick={onShowReview}>Go to Review</button>
          {trial === "available" && <a className="locked-link" href="/plus" target="_blank" rel="noopener">What's in Plus</a>}
        </div>
      </footer>
    </div>
  );
}

function Conversation({ interview, roundFinished, selected, onClearSelected, onFocusNode, labelFor, onShowReview }) {
  const { turns, state, allowance, pending, pendingAudio, outgoing, replyText, sendError } = interview;
  const [draft, setDraft] = useState("");
  const listRef = useRef(null);
  const stageIndex = Math.max(0, STAGES.findIndex(([id]) => id === state?.stage));
  const repliesLeft = allowance ? Math.max(0, allowance.turns.limit - allowance.turns.used) : 0;
  const hintsLeft = allowance ? Math.max(0, allowance.hints.limit - allowance.hints.used) : 0;
  const outOfReplies = allowance && (repliesLeft === 0 || allowance.month.used >= allowance.month.limit);
  const v3 = state?.engine === "v3";
  const learnerSpoke = turns.some((turn) => turn.role === "learner");
  const canSend = !roundFinished && interview.aiAvailable && !pending && !outOfReplies;
  // A voice answer is a reply like a typed one, so the mic follows the same rules.
  const [voiceAvailable] = useState(voiceSupported);
  const voice = interview.voice && voiceAvailable;
  const recorder = useVoiceRecorder({ onRecorded: interview.sendAudio });
  const recording = recorder.status === "recording";
  const voiceTip = useVoiceTip(interview.sessionId, voice && canSend);
  const [voiceUsed, markVoiceUsed] = useVoiceUsed();

  useEffect(() => {
    const list = listRef.current;
    if (list) list.scrollTop = list.scrollHeight;
  }, [turns.length, pending, pendingAudio, outgoing, replyText]);

  // Recording counts as typing, so the interviewer doesn't interrupt; a finished
  // round discards an unsent recording.
  useEffect(() => { interview.typingRef.current = recording; }, [recording, interview.typingRef]);
  useEffect(() => { if (roundFinished) recorder.cancel(); }, [roundFinished]); // eslint-disable-line react-hooks/exhaustive-deps

  // A failed send puts the text back so nothing the learner wrote is lost.
  useEffect(() => {
    if (sendError?.intent === "message") setDraft((current) => current || sendError.draft);
  }, [sendError]);

  function startRecording() {
    voiceTip.hide();
    markVoiceUsed();
    recorder.start();
  }

  async function submit(intent = "message") {
    // A hint request may carry the draft as context for what the learner is stuck on.
    const content = draft.trim();
    if (intent === "message" && !content) return;
    voiceTip.hide();
    setDraft("");
    await interview.send(content, intent);
  }

  return (
    <>
      <div className="interview-stagebar">
        <ol className="interview-stages" aria-label="Interview stage">
          {STAGES.map(([id, label], index) => (
            <li key={id} className={index < stageIndex ? "done" : index === stageIndex ? "current" : ""} aria-current={index === stageIndex ? "step" : undefined}>{label}</li>
          ))}
        </ol>
        {v3 && <RoundClock clock={state.clock} receivedAt={interview.receivedAt} paused={roundFinished} />}
      </div>

      <div className="interviewer-body interview-thread" ref={listRef} role="log" aria-relevant="additions" aria-label="Interview conversation">
        {v3 && !learnerSpoke && !roundFinished && <ModeChoice mode={state.mode} onChange={interview.setMode} />}
        {turns.map((turn) => <Turn key={turn.id} turn={turn} onFocusNode={onFocusNode} labelFor={labelFor} onFeedback={interview.sendFeedback} />)}
        {outgoing && (
          <div className="interview-turn learner">
            {outgoing.kind === "hint_request"
              ? <p className="interview-hint-request"><Lightbulb size={13} /> {outgoing.content}</p>
              : <p>{outgoing.content}</p>}
          </div>
        )}
        {pendingAudio && <div className="interview-turn learner sending"><VoiceNote durationMs={pendingAudio.durationMs} /></div>}
        {replyText ? (
          <div className="interview-turn interviewer" aria-busy="true">
            <span className="interview-turn-meta">Interviewer</span>
            <p>{replyText}<span className="stream-caret" aria-hidden="true" /></p>
          </div>
        ) : pending && (
          <div className="interview-turn interviewer typing" role="status"><span className="interview-dots"><i /><i /><i /></span> {pendingAudio ? "Interviewer is listening…" : "Interviewer is thinking…"}</div>
        )}
      </div>

      <div className="interviewer-compose">
        {roundFinished ? (
          <div className="interview-ended">
            <p>This round is finished, so the interview has ended.</p>
            <button className="button button-outline button-small" onClick={onShowReview}>See your review <ArrowRight size={14} /></button>
          </div>
        ) : (
          <>
            {sendError && (
              <div className="interview-error" role="alert">
                <AlertTriangle size={14} />
                <span>{sendError.message}</span>
                {sendError.retryable && (
                  <button onClick={() => {
                    if (sendError.intent === "audio") { interview.sendAudio(sendError.recording); return; }
                    const text = sendError.draft; setDraft(""); interview.send(text, sendError.intent);
                  }}><RefreshCw size={12} /> Retry</button>
                )}
                <button className="interview-error-close" aria-label="Dismiss" onClick={interview.clearError}><X size={13} /></button>
              </div>
            )}
            {recorder.error && (
              <div className="interview-error" role="alert">
                <AlertTriangle size={14} />
                <span>{recorder.error}</span>
                <button className="interview-error-close" aria-label="Dismiss" onClick={recorder.dismissError}><X size={13} /></button>
              </div>
            )}
            {!interview.aiAvailable && <p className="interviewer-muted">The AI interviewer is unavailable right now.</p>}
            {selected && (
              <div className="interview-context">
                <span>About</span><strong>{selected.label}</strong>
                <button aria-label="Don't attach the selected component" onClick={onClearSelected}><X size={13} /></button>
              </div>
            )}
            {voiceTip.visible && !recording && (
              <p className="voice-tip" role="note"><Mic size={12} /> Tip: answer out loud with the mic, like in a real interview. Your review will include feedback on how you explain.</p>
            )}
            {recording ? (
              <RecordingBar elapsed={recorder.elapsed} onCancel={recorder.cancel} onSend={recorder.send} />
            ) : (
            <div className="compose-box">
              <textarea
                aria-label="Message to interviewer"
                placeholder={outOfReplies ? "No interviewer replies left this round" : "Explain a decision or ask a question…"}
                rows={2}
                value={draft}
                maxLength={2000}
                disabled={!canSend && !pending}
                onChange={(event) => { setDraft(event.target.value); voiceTip.offer(); }}
                onFocus={() => { interview.typingRef.current = true; voiceTip.offer(); }}
                onBlur={() => { interview.typingRef.current = false; }}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); if (canSend) submit(); }
                }}
              />
              {/* The mic stays available while typing (a typed draft is kept); with an
                  empty box it is the main action, like a messaging app. */}
              {voice && !pending && (
                <button
                  className={draft.trim() ? "voice-secondary" : !voiceUsed && canSend ? "voice-heartbeat" : ""}
                  aria-label="Record a voice answer"
                  title="Answer out loud (up to 2 minutes)"
                  disabled={!canSend || recorder.status === "requesting"}
                  onClick={startRecording}
                >
                  {recorder.status === "requesting" ? <LoaderCircle size={16} className="spin" /> : <Mic size={16} />}
                </button>
              )}
              {(!voice || draft.trim() || pending) && (
                <button aria-label="Send message" disabled={!canSend || !draft.trim()} onClick={() => submit()}>{pending ? <LoaderCircle size={16} className="spin" /> : <Send size={16} />}</button>
              )}
            </div>
            )}
            <div className="interview-footer">
              <button className="interview-hint" disabled={!canSend || hintsLeft === 0} onClick={() => submit("hint")} title="Ask for a nudge, not the answer">
                <Lightbulb size={14} /> Hint {allowance ? `(${hintsLeft} left)` : ""}
              </button>
              {allowance && <span>{repliesLeft} of {allowance.turns.limit} replies left</span>}
            </div>
          </>
        )}
      </div>
    </>
  );
}

// Until a learner has tried voice once, the mic beats gently so it's easy to find.
// Remembered per browser, so it stops for good after the first recording.
const VOICE_USED_KEY = "designrounds:voice-used";

function useVoiceUsed() {
  const [used, setUsed] = useState(() => {
    try { return Boolean(window.localStorage.getItem(VOICE_USED_KEY)); } catch { return false; }
  });
  const mark = () => {
    setUsed(true);
    try { window.localStorage.setItem(VOICE_USED_KEY, "1"); } catch { /* the heartbeat just shows again next visit */ }
  };
  return [used, mark];
}

// A one-line nudge toward answering out loud: once per round, the first time the
// learner starts writing. It fades on its own and never needs dismissing.
const VOICE_TIP_MS = 15_000;

function useVoiceTip(sessionId, available) {
  const [visible, setVisible] = useState(false);
  const timer = useRef(0);
  const key = `designrounds:voice-tip:${sessionId}`;
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const hide = () => { window.clearTimeout(timer.current); setVisible(false); };
  const offer = () => {
    if (!available || visible || !sessionId) return;
    try {
      if (window.localStorage.getItem(key)) return;
      window.localStorage.setItem(key, "1");
    } catch {
      // Without storage the tip may show again next visit; that's harmless.
    }
    setVisible(true);
    timer.current = window.setTimeout(() => setVisible(false), VOICE_TIP_MS);
  };
  return { visible: visible && available, offer, hide };
}

const kindLabels = { hint: "Hint", hint_request: "Asked for a hint", time_check: "Time check", nudge: "Check-in", wrap_up: "Wrap-up" };
// Check-ins and time checks come from the clock, not from what you said: quieter.
const QUIET_KINDS = new Set(["time_check", "nudge"]);
const FEEDBACK_REASONS = [
  ["already_asked", "Already asked or repeating itself"],
  ["not_relevant", "Not relevant to my design"],
  ["wrong", "Technically wrong"],
  ["too_harsh", "Too harsh"],
  ["other", "Something else"],
];

function Turn({ turn, onFocusNode, labelFor, onFeedback }) {
  const mine = turn.role === "learner";
  const noticed = turn.trigger === "proactive" || (turn.trigger === "tick" && !QUIET_KINDS.has(turn.kind) && turn.kind !== "wrap_up");
  return (
    <div className={`interview-turn ${mine ? "learner" : "interviewer"}${QUIET_KINDS.has(turn.kind) ? " quiet" : ""}`}>
      {!mine && (
        <span className="interview-turn-meta">
          Interviewer
          {noticed && <em><Eye size={11} /> Noticed on your canvas</em>}
          {turn.asksToDraw && <em><PenLine size={11} /> Draw it on the canvas</em>}
          {kindLabels[turn.kind] && <em>{QUIET_KINDS.has(turn.kind) && <Clock size={11} />} {kindLabels[turn.kind]}</em>}
          {onFeedback && !QUIET_KINDS.has(turn.kind) && turn.kind !== "opening" && <TurnFeedback turnId={turn.id} onFeedback={onFeedback} />}
        </span>
      )}
      {mine && turn.kind === "audio" ? <VoiceNote durationMs={turn.audio?.durationMs} />
        : mine && turn.kind === "hint_request" ? <p className="interview-hint-request"><Lightbulb size={13} /> {turn.content}</p>
        : <p>{turn.content}</p>}
      {turn.nodeIds?.length > 0 && (
        <div className="review-node-chips">
          {turn.nodeIds.map((id) => <button key={id} onClick={() => onFocusNode(id)} title="Show on canvas">{labelFor(id)}</button>)}
        </div>
      )}
    </div>
  );
}

// A thumbs-down with a reason on one interviewer message, so repeats and misses can be
// measured. Remembered for this page only.
function TurnFeedback({ turnId, onFeedback }) {
  const [open, setOpen] = useState(false);
  const [sent, setSent] = useState(false);
  async function choose(reason) {
    setOpen(false);
    setSent(true);
    try { await onFeedback(turnId, reason); } catch { setSent(false); }
  }
  if (sent) return <span className="turn-feedback-sent">Thanks</span>;
  return (
    <span className="turn-feedback">
      <button aria-label="This message wasn't helpful" title="Not helpful?" aria-expanded={open} onClick={() => setOpen(!open)}><ThumbsDown size={11} /></button>
      {open && (
        <span className="turn-feedback-menu" role="menu">
          {FEEDBACK_REASONS.map(([reason, label]) => <button key={reason} role="menuitem" onClick={() => choose(reason)}>{label}</button>)}
        </span>
      )}
    </span>
  );
}

// Guided or realistic: chosen before the learner says anything, since it changes how
// the round is judged.
const MODES = [
  ["guided", "Guided", "The interviewer tells you what was good and points you to what to read when something's missed."],
  ["realistic", "Realistic", "Like a real loop: neutral acknowledgements, fewer follow-ups, no pointers."],
];

function ModeChoice({ mode, onChange }) {
  const [busy, setBusy] = useState(null);
  async function pick(next) {
    if (next === mode || busy) return;
    setBusy(next);
    try { await onChange(next); } finally { setBusy(null); }
  }
  return (
    <div className="interview-mode" role="radiogroup" aria-label="Interview mode">
      <span className="interview-mode-label">How should this interview run?</span>
      {MODES.map(([id, label, text]) => (
        <button key={id} role="radio" aria-checked={mode === id} className={mode === id ? "active" : ""} onClick={() => pick(id)} disabled={Boolean(busy)}>
          <strong>{busy === id ? <LoaderCircle size={12} className="spin" /> : null}{label}</strong>
          <span>{text}</span>
        </button>
      ))}
    </div>
  );
}

// Active round time against the question's budget. The server keeps the real clock;
// this only moves forward between updates while the tab is open.
function RoundClock({ clock, receivedAt, paused }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (paused) return undefined;
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, [paused]);
  if (!clock) return null;
  const drift = paused || !receivedAt ? 0 : Math.min(Math.max(0, now - receivedAt), 5 * 60_000);
  const minutes = Math.floor((clock.elapsedMs + drift) / 60_000);
  const budget = Math.round(clock.budgetMs / 60_000);
  return (
    <span className={`interview-clock${minutes >= budget ? " over" : minutes >= budget * 0.8 ? " late" : ""}`} title="Active time in this round">
      <Clock size={12} /> {minutes} / {budget} min
    </span>
  );
}
