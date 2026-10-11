import { memo, useState } from "react";
import { ArrowRight, Check, Clock3, GraduationCap, Keyboard, Layers2, LockKeyhole, MessageSquare, Network, Send, Sparkles, X } from "lucide-react";
import { getTrack } from "../data/prompts.js";
import { shortcutGroups } from "./shortcuts.js";
import { useEscape } from "../components/ui.jsx";

export const InterviewerPanel = memo(function InterviewerPanel({ onClose, prompt, selectedName }) {
  return (
    <aside className="interviewer-panel">
      <div className="interviewer-header"><div className="interviewer-title-icon"><MessageSquare size={15} /></div><div className="interviewer-title-text"><strong>Interviewer</strong><span>YOUR DESIGN PARTNER</span></div><span className="coming-pill"><span /> COMING SOON</span><button className="panel-close" onClick={onClose} title="Hide interviewer" aria-label="Hide interviewer"><X size={17} /></button></div>
      <div className="interviewer-body">
        <div className="interviewer-intro"><div className="intro-symbol"><MessageSquare size={18} /></div><span className="conversation-label">THE CONVERSATION</span><h3>Think it through.<br />Out loud.</h3><p>Your interviewer will ask about your design choices and help you explore the trade-offs.</p></div>
        <div className="conversation-rule"><span>YOUR ROUND</span><span>{prompt.title}</span></div>
        <div className="conversation-placeholder">
          <div className="placeholder-avatar"><Sparkles size={15} /></div>
          <div className="placeholder-copy"><span>DESIGNROUNDS INTERVIEWER</span><p>“Why did you choose this approach? What alternatives did you consider?”</p><small>Questions will be grounded in the design you build.</small></div>
        </div>
        {selectedName && <div className="selected-context"><span className="selected-context-dot" /><span>Selected in your design</span><strong>{selectedName}</strong></div>}
        <div className="coming-card"><div className="coming-card-top"><Sparkles size={15} /><span>IN DEVELOPMENT</span></div><p>The interviewer is getting ready. For now, build your design and capture your reasoning in each component's “Why this choice?” note.</p></div>
      </div>
      <div className="interviewer-compose"><div className="compose-box"><textarea aria-label="Message to interviewer" placeholder="The conversation starts here…" disabled rows={2} /><div className="compose-bottom"><span>AI interviewer coming soon</span><button disabled aria-label="Send message"><Send size={15} /></button></div></div><div className="panel-privacy"><LockKeyhole size={11} /> Your design saves to your account; chat isn't active yet.</div></div>
    </aside>
  );
});

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
