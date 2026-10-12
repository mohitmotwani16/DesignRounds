import { useState } from "react";
import { ArrowRight, Check, ClipboardCheck, Clock3, GraduationCap, Keyboard, Layers2, LockKeyhole, MessageSquare, Network, Sparkles, X } from "lucide-react";
import { getTrack } from "../data/prompts.js";
import { shortcutGroups } from "./shortcuts.js";
import { useEscape } from "../components/ui.jsx";
import { InterviewerPanel } from "./InterviewerPanel.jsx";
import { ReviewPanel } from "./ReviewPanel.jsx";

// Right-hand panel: the interviewer conversation and the round's final review.
export function SidePanel({ tab, onTab, onClose, interview, unread, selected, onClearSelected, sessionId, roundFinished, onFocusNode, labelFor }) {
  const tabs = [["interviewer", "Interviewer", MessageSquare], ["review", "Review", ClipboardCheck]];
  return (
    <aside className={`interviewer-panel ${tab === "review" ? "panel-wide" : ""}`}>
      <div className="interviewer-header side-panel-header">
        <div className="side-panel-tabs" role="tablist" aria-label="Side panel">
          {tabs.map(([id, label, Icon]) => (
            <button key={id} role="tab" aria-selected={tab === id} className={tab === id ? "active" : ""} onClick={() => onTab(id)}>
              <Icon size={14} /> {label}
              {id === "interviewer" && unread > 0 && tab !== "interviewer" && <span className="tab-badge" aria-label={`${unread} new`}>{unread}</span>}
            </button>
          ))}
        </div>
        <button className="panel-close" onClick={onClose} title="Hide panel (I)" aria-label="Hide panel"><X size={17} /></button>
      </div>
      {tab === "review"
        ? <ReviewPanel sessionId={sessionId} roundFinished={roundFinished} onFocusNode={onFocusNode} labelFor={labelFor} />
        : <InterviewerPanel interview={interview} roundFinished={roundFinished} selected={selected} onClearSelected={onClearSelected} onFocusNode={onFocusNode} labelFor={labelFor} onShowReview={() => onTab("review")} />}
    </aside>
  );
}

export function PromptModal({ prompt, onClose, fresh = false }) {
  const [tab, setTab] = useState("brief");
  useEscape(onClose);
  const track = getTrack(prompt.track);
  const free = prompt.access === "free";
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
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
          <button className="icon-button modal-close" onClick={onClose} aria-label="Close brief"><X size={20} /></button>
        </header>

        <div className="modal-tabs" role="tablist">
          <button role="tab" aria-selected={tab === "brief"} className={tab === "brief" ? "active" : ""} onClick={() => setTab("brief")}>The brief</button>
          <button role="tab" aria-selected={tab === "approach"} className={tab === "approach" ? "active" : ""} onClick={() => setTab("approach")}>A good place to start</button>
        </div>

        {tab === "brief" ? (
          <div className="modal-content">
            {prompt.prerequisites.length > 0 && (
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
              {prompt.requirements.map((requirement, index) => <li key={requirement}><span>{index + 1}</span>{requirement}</li>)}
            </ol>
            <div className="expected-outcome">
              <span>What you're practicing</span>
              <p>{prompt.expectedOutcome}</p>
            </div>
            <div className="modal-nudge"><Sparkles size={18} /><p><strong>Tip:</strong> start by clarifying what matters most. Who uses the system, and what does “working well” mean to them?</p></div>
          </div>
        ) : (
          <div className="modal-content approach-content">
            <p className="approach-intro">There isn't one right answer. These areas usually shape a strong design for this prompt:</p>
            <div className="consideration-list">
              {prompt.considerations.map((item, index) => <div key={item}><span>{String(index + 1).padStart(2, "0")}</span>{item}</div>)}
            </div>
            <p className="approach-footnote">Starting points, not a checklist. Follow the design where your reasoning takes you.</p>
          </div>
        )}

        <footer className="modal-footer">
          <span>You can reopen this anytime from <strong>Brief</strong>.</span>
          <button className="button button-dark" onClick={onClose}>{fresh ? "Start designing" : "Back to canvas"} <ArrowRight size={16} /></button>
        </footer>
      </section>
    </div>
  );
}

export function ShortcutsDialog({ onClose }) {
  useEscape(onClose);
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="shortcuts-dialog" role="dialog" aria-modal="true" aria-labelledby="shortcuts-title">
        <header className="shortcuts-header">
          <span className="shortcuts-icon"><Keyboard size={18} /></span>
          <h2 id="shortcuts-title">Keyboard shortcuts</h2>
          <button className="icon-button" onClick={onClose} aria-label="Close shortcuts"><X size={19} /></button>
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
    </div>
  );
}
