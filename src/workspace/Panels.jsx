import { useState } from "react";
import { ArrowRight, Check, ClipboardCheck, Clock3, Crown, GraduationCap, Keyboard, Layers2, LoaderCircle, LockKeyhole, MessageSquare, Network, Sparkles, Table2, X } from "lucide-react";
import { getTrack } from "../data/prompts.js";
import { DATA_MODEL_TRACKS } from "./catalog.jsx";
import { shortcutGroups } from "./shortcuts.js";
import { useEscape } from "../components/ui.jsx";
import { MotionModal, useClosableMotion } from "../motion/MotionModal.jsx";
import { InterviewerPanel } from "./InterviewerPanel.jsx";
import { CommunicationSection, InterviewDebrief, ReviewPanel } from "./ReviewPanel.jsx";

import { Link } from "../router.js";

import { nuggetDebriefBody, nuggetDebriefInTurns } from "./nuggetInterview.js";

function NuggetReviewPanel({ roundFinished, nugget, promptId, drillReview, onReload, onFinishRound }) {
  const ready = Boolean(drillReview?.debrief);
  const fallbackReference = drillReview?.referenceFix ?? nuggetDebriefBody([]);
  if (!ready && !fallbackReference) {
    return (
      <div className="interviewer-body interviewer-center">
        <p className="interviewer-muted">Finish the incident conversation in the Interviewer tab. When the drill closes, your response analysis and debrief appear here.</p>
      </div>
    );
  }
  return (
    <div className="review-body">
      <div className="review-card review-intro">
        <span className="review-kicker"><Sparkles size={13} /> DRILL REVIEW</span>
        <h3>How you handled this incident</h3>
        <p>Here’s how clearly you explained yourself, what the interviewer credited on the fix, and the reference answer for this drill.</p>
      </div>

      {drillReview?.communicationPending && !drillReview.communication && (
        <div className="review-card review-progress" role="status">
          <LoaderCircle size={18} className="spin" />
          <div><strong>Reviewing how you explained it…</strong><p>This usually takes a few seconds.</p></div>
        </div>
      )}

      {drillReview?.communication && <CommunicationSection communication={drillReview.communication} />}

      {drillReview?.debrief && <InterviewDebrief debrief={drillReview.debrief} />}

      {fallbackReference && (
        <section className="review-card debrief" aria-label="Reference fix">
          <span className="review-kicker"><ClipboardCheck size={13} /> REFERENCE FIX</span>
          <h3>What a strong answer includes</h3>
          <p className="debrief-lede">{fallbackReference}</p>
        </section>
      )}

      {!roundFinished && ready && onFinishRound && (
        <div className="modal-actions" style={{ marginTop: "0.25rem" }}>
          <button type="button" className="button button-dark" onClick={onFinishRound}>Finish round</button>
        </div>
      )}

      {roundFinished && (
        <>
          <p className="interviewer-muted" style={{ marginTop: "0.5rem" }}>This drill is complete.</p>
          <div className="modal-actions" style={{ marginTop: "0.75rem", flexWrap: "wrap", gap: "0.5rem" }}>
            <Link className="button button-dark" to="/nuggets">Random nugget</Link>
            {promptId && <Link className="button button-outline" to={`/nuggets?q=${encodeURIComponent(promptId)}`}>More from this question</Link>}
            {promptId && <Link className="button button-outline" to={`/start/${promptId}`}>Full design round</Link>}
          </div>
        </>
      )}

      {!ready && onReload && (
        <button type="button" className="button button-outline button-small" onClick={onReload}>Refresh review</button>
      )}
    </div>
  );
}

// Right-hand panel: the interviewer conversation and the round's final review.
export function SidePanel({ tab, onTab, onClose, interview, unread, selected, onClearSelected, sessionId, roundFinished, onFocusNode, labelFor, promptTrack, sessionKind = "full", nugget, promptId, onFinishRound }) {
  const nuggetDebriefReady = sessionKind === "nugget" && interview.status === "ready" && nuggetDebriefInTurns(interview.turns ?? []);
  const tabs = sessionKind === "nugget"
    ? (nuggetDebriefReady
      ? [["interviewer", "Interviewer", MessageSquare], ["review", "Review", ClipboardCheck]]
      : [["interviewer", "Interviewer", MessageSquare]])
    : [["interviewer", "Interviewer", MessageSquare], ["review", "Review", ClipboardCheck]];
  // On free plans the interviewer is a Plus feature (or the one free round), and the tab says so.
  const interviewerLocked = interview.status === "ready" && interview.access !== "full";
  return (
    <aside className={`interviewer-panel ${tab === "review" ? "panel-wide" : ""}`} data-tour="panel">
      <div className="interviewer-header side-panel-header">
        <div className="side-panel-tabs" role="tablist" aria-label="Side panel">
          {tabs.map(([id, label, Icon]) => (
            <button key={id} role="tab" aria-selected={tab === id} className={tab === id ? "active" : ""} onClick={() => onTab(id)}>
              <Icon size={14} /> {label}
              {id === "interviewer" && interviewerLocked && <span className="tab-plus" title="Plus feature"><Crown size={11} aria-hidden="true" /><span className="sr-only">, Plus feature</span></span>}
              {id === "interviewer" && unread > 0 && tab !== "interviewer" && <span className="tab-badge" aria-label={`${unread} new`}>{unread}</span>}
            </button>
          ))}
        </div>
        <button className="panel-close" onClick={onClose} title="Hide panel (I)" aria-label="Hide panel"><X size={17} /></button>
      </div>
      {tab === "review"
        ? (sessionKind === "nugget"
          ? <NuggetReviewPanel roundFinished={roundFinished} nugget={nugget} promptId={promptId} drillReview={interview.drillReview} onReload={interview.reload} onFinishRound={onFinishRound} />
          : <ReviewPanel sessionId={sessionId} roundFinished={roundFinished} onFocusNode={onFocusNode} labelFor={labelFor} promptTrack={promptTrack} />)
        : <InterviewerPanel sessionKind={sessionKind} interview={interview} roundFinished={roundFinished} selected={selected} onClearSelected={onClearSelected} onFocusNode={onFocusNode} labelFor={labelFor} onShowReview={() => onTab("review")} onFinishRound={onFinishRound} promptId={promptId} />}
    </aside>
  );
}

export function NuggetBriefModal({ nugget, parentPrompt, onClose }) {
  const { present, requestClose, onExitComplete } = useClosableMotion(onClose);
  useEscape(requestClose);
  const parentTitle = parentPrompt?.title ?? "Design round";
  return (
    <MotionModal present={present} onExitComplete={onExitComplete} onBackdropClose={requestClose}>
      <section className="prompt-modal" role="dialog" aria-modal="true" aria-labelledby="nugget-brief-title">
        <header className="modal-header">
          <div className="modal-heading">
            <span className="modal-kicker">Incident drill · {parentTitle}</span>
            <h2 id="nugget-brief-title">{nugget.title}</h2>
            {nugget.incident?.headline && <p className="modal-description">{nugget.incident.headline}</p>}
            <div className="modal-meta">
              <span><Clock3 size={15} /> {nugget.minutes} min</span>
            </div>
          </div>
          <button className="icon-button modal-close" onClick={requestClose} aria-label="Close brief"><X size={20} /></button>
        </header>
        <div className="modal-content">
          <h3 className="modal-section-title">What you're seeing</h3>
          <p>{nugget.symptoms}</p>
          <div className="modal-nudge"><Sparkles size={18} /><p><strong>Your job:</strong> explain what failed on the highlighted parts of the diagram and how you'd fix it. The interviewer stays on this incident only.</p></div>
        </div>
        <footer className="modal-footer">
          <span>Reopen from <strong>Brief</strong> anytime.</span>
          <button className="button button-dark" onClick={requestClose}>Back to canvas <ArrowRight size={16} /></button>
        </footer>
      </section>
    </MotionModal>
  );
}

export function PromptModal({ prompt, onClose, fresh = false }) {
  const [tab, setTab] = useState("brief");
  const { present, requestClose, onExitComplete } = useClosableMotion(onClose);
  useEscape(requestClose);
  const track = getTrack(prompt.track);
  const free = prompt.access === "free";
  return (
    <MotionModal present={present} onExitComplete={onExitComplete} onBackdropClose={requestClose}>
      <section className="prompt-modal" role="dialog" aria-modal="true" aria-labelledby="prompt-modal-title">
        <header className="modal-header">
          <div className="modal-heading">
            <span className="modal-kicker">{track.label}</span>
            <h2 id="prompt-modal-title">{prompt.title}</h2>
            <p className="modal-description">{prompt.description}</p>
            <div className="modal-meta">
              <span><Clock3 size={15} /> {prompt.minutes} min</span>
              <span><Layers2 size={15} /> {prompt.difficulty}</span>
              <span><Network size={15} /> {prompt.category}</span>
              <span className={free ? "meta-free" : "meta-plus"}>{free ? <Check size={14} /> : <LockKeyhole size={14} />}{free ? "Free round" : "Plus round"}</span>
            </div>
          </div>
          <button className="icon-button modal-close" onClick={requestClose} aria-label="Close brief"><X size={20} /></button>
        </header>

        <div className="modal-tabs" role="tablist">
          <button role="tab" aria-selected={tab === "brief"} className={tab === "brief" ? "active" : ""} onClick={() => setTab("brief")}>The brief</button>
          <button role="tab" aria-selected={tab === "approach"} className={tab === "approach" ? "active" : ""} onClick={() => setTab("approach")}>A good place to start</button>
        </div>

        {tab === "brief" ? (
          <div className="modal-content">
            {prompt.prerequisites?.length > 0 && (
              <section className="prereq-block" aria-labelledby="prereq-title">
                <div className="prereq-head">
                  <GraduationCap size={18} />
                  <h3 id="prereq-title">Before you start</h3>
                </div>
                <p>You'll get more out of this round if you're comfortable with:</p>
                <ul className="prereq-list">
                  {prompt.prerequisites.map((item) => <li key={item}><Check size={14} />{item}</li>)}
                </ul>
              </section>
            )}
            <h3 className="modal-section-title">Requirements to consider</h3>
            <ol className="requirement-list">
              {(prompt.requirements ?? []).map((requirement, index) => <li key={requirement}><span>{index + 1}</span>{requirement}</li>)}
            </ol>
            <div className="expected-outcome">
              <span>What you're practicing</span>
              <p>{prompt.expectedOutcome}</p>
            </div>
            <div className="modal-nudge"><Sparkles size={18} /><p><strong>Tip:</strong> start by clarifying what matters most. Who uses the system, and what does “working well” mean to them?</p></div>
            {DATA_MODEL_TRACKS.has(prompt.track) && (
              <div className="modal-nudge"><Table2 size={18} /><p><strong>Data model:</strong> when your tables matter, sketch them on the canvas. Open <strong>Data model</strong> in the component library (or press <kbd>D</kbd>), then add columns and mark keys in the panel on the right.</p></div>
            )}
          </div>
        ) : (
          <div className="modal-content approach-content">
            <p className="approach-intro">There isn't one right answer. These areas usually shape a strong design for this round:</p>
            <div className="consideration-list">
              {prompt.considerations.map((item, index) => <div key={item}><span>{String(index + 1).padStart(2, "0")}</span>{item}</div>)}
            </div>
            <p className="approach-footnote">Starting points, not a checklist. Follow the design where your reasoning takes you.</p>
          </div>
        )}

        <footer className="modal-footer">
          <span>You can reopen this anytime from <strong>Brief</strong>.</span>
          <button className="button button-dark" onClick={requestClose}>{fresh ? "Start designing" : "Back to canvas"} <ArrowRight size={16} /></button>
        </footer>
      </section>
    </MotionModal>
  );
}

export function ShortcutsDialog({ onClose }) {
  const { present, requestClose, onExitComplete } = useClosableMotion(onClose);
  useEscape(requestClose);
  return (
    <MotionModal present={present} onExitComplete={onExitComplete} onBackdropClose={requestClose} instant>
      <section className="shortcuts-dialog" role="dialog" aria-modal="true" aria-labelledby="shortcuts-title">
        <header className="shortcuts-header">
          <span className="shortcuts-icon"><Keyboard size={18} /></span>
          <h2 id="shortcuts-title">Keyboard shortcuts</h2>
          <button className="icon-button" onClick={requestClose} aria-label="Close shortcuts"><X size={19} /></button>
        </header>
        <div className="shortcuts-body">
          {shortcutGroups.map((group) => (
            <section key={group.title} className="shortcut-group">
              <h3>{group.title}</h3>
              <dl>
                {group.items.map(([keys, label]) => (
                  <div key={label} className="shortcut-row">
                    <dt>{label}</dt>
                    <dd>{keys.map((key, index) => <span key={key + index}>{index > 0 && keys.length < 4 && <i>+</i>}<kbd>{key}</kbd></span>)}</dd>
                  </div>
                ))}
              </dl>
            </section>
          ))}
        </div>
        <footer className="shortcuts-footer">Shortcuts are paused while you're typing in a text field. Press <kbd>?</kbd> anytime to open this list.</footer>
      </section>
    </MotionModal>
  );
}
