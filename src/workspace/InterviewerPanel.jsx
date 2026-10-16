import { useEffect, useRef, useState } from "react";
import { AlertTriangle, ArrowRight, Eye, Lightbulb, LoaderCircle, LockKeyhole, MessageSquare, Mic, RefreshCw, Send, X } from "lucide-react";
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
  if (interview.access !== "full") return <LockedInterviewer onShowReview={onShowReview} />;
  return <Conversation interview={interview} roundFinished={roundFinished} selected={selected} onClearSelected={onClearSelected} onFocusNode={onFocusNode} labelFor={labelFor} onShowReview={onShowReview} />;
}

function LockedInterviewer({ onShowReview }) {
  return (
    <div className="interviewer-body">
      <div className="interviewer-empty">
        <span className="interviewer-empty-icon"><LockKeyhole size={19} /></span>
        <h3>The live interviewer is part of Plus.</h3>
        <p>Plus members design alongside an AI interviewer that asks about their choices, answers questions about the brief, and offers hints.</p>
      </div>
      <div className="interviewer-note">
        <MessageSquare size={16} />
        <p><strong>Your free plan includes a final review of each round.</strong> Explain your reasoning in each component's “Why this choice?” note, since the review reads them.</p>
      </div>
      <button className="button button-outline button-small interviewer-cta" onClick={onShowReview}>Go to Review <ArrowRight size={14} /></button>
    </div>
  );
}

function Conversation({ interview, roundFinished, selected, onClearSelected, onFocusNode, labelFor, onShowReview }) {
  const { turns, state, allowance, pending, sendError } = interview;
  const [draft, setDraft] = useState("");
  const listRef = useRef(null);
  const stageIndex = Math.max(0, STAGES.findIndex(([id]) => id === state?.stage));
  const repliesLeft = allowance ? Math.max(0, allowance.turns.limit - allowance.turns.used) : 0;
  const hintsLeft = allowance ? Math.max(0, allowance.hints.limit - allowance.hints.used) : 0;
  const outOfReplies = allowance && (repliesLeft === 0 || allowance.month.used >= allowance.month.limit);
  const canSend = !roundFinished && interview.aiAvailable && !pending && !outOfReplies;
  // Voice answers get no interviewer reply yet, so they don't spend replies; the
  // button follows the same rules as typing to keep the thread consistent.
  const [voiceAvailable] = useState(voiceSupported);
  const voice = interview.voice && voiceAvailable;
  const recorder = useVoiceRecorder({ onRecorded: interview.sendAudio });
  const recording = recorder.status === "recording";

  useEffect(() => {
    const list = listRef.current;
    if (list) list.scrollTop = list.scrollHeight;
  }, [turns.length, pending]);

  // Recording counts as typing, so the interviewer doesn't interrupt; a finished
  // round discards an unsent recording.
  useEffect(() => { interview.typingRef.current = recording; }, [recording, interview.typingRef]);
  useEffect(() => { if (roundFinished) recorder.cancel(); }, [roundFinished]); // eslint-disable-line react-hooks/exhaustive-deps

  // A failed send puts the text back so nothing the learner wrote is lost.
  useEffect(() => {
    if (sendError?.intent === "message") setDraft((current) => current || sendError.draft);
  }, [sendError]);

  async function submit(intent = "message") {
    // A hint request may carry the draft as context for what the learner is stuck on.
    const content = draft.trim();
    if (intent === "message" && !content) return;
    setDraft("");
    await interview.send(content, intent);
  }

  return (
    <>
      <ol className="interview-stages" aria-label="Interview stage">
        {STAGES.map(([id, label], index) => (
          <li key={id} className={index < stageIndex ? "done" : index === stageIndex ? "current" : ""} aria-current={index === stageIndex ? "step" : undefined}>{label}</li>
        ))}
      </ol>

      <div className="interviewer-body interview-thread" ref={listRef} aria-live="polite">
        {turns.map((turn) => <Turn key={turn.id} turn={turn} onFocusNode={onFocusNode} labelFor={labelFor} />)}
        {pending && <div className="interview-turn interviewer typing" role="status"><span className="interview-dots"><i /><i /><i /></span> Interviewer is thinking…</div>}
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
                onChange={(event) => setDraft(event.target.value)}
                onFocus={() => { interview.typingRef.current = true; }}
                onBlur={() => { interview.typingRef.current = false; }}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); if (canSend) submit(); }
                }}
              />
              {/* Like a messaging app: the mic stands in for Send while the box is empty. */}
              {voice && !draft.trim() && !pending ? (
                <button aria-label="Record a voice answer" title="Record a voice answer (up to 2 minutes)" disabled={!canSend || recorder.status === "requesting"} onClick={recorder.start}>
                  {recorder.status === "requesting" ? <LoaderCircle size={16} className="spin" /> : <Mic size={16} />}
                </button>
              ) : (
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

const kindLabels = { hint: "Hint", hint_request: "Asked for a hint" };

function Turn({ turn, onFocusNode, labelFor }) {
  const mine = turn.role === "learner";
  return (
    <div className={`interview-turn ${mine ? "learner" : "interviewer"}`}>
      {!mine && (
        <span className="interview-turn-meta">
          Interviewer
          {turn.trigger === "proactive" && <em><Eye size={11} /> Noticed on your canvas</em>}
          {kindLabels[turn.kind] && <em>{kindLabels[turn.kind]}</em>}
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
