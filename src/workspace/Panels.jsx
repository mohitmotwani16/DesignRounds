import { memo, useState } from "react";
import { ArrowRight, Check, Clock3, Layers2, LockKeyhole, MessageSquare, Network, Send, Sparkles, X } from "lucide-react";
import { getTrack } from "../data/prompts.js";
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

export function PromptModal({ prompt, onClose }) {
  const [tab, setTab] = useState("brief");
  useEscape(onClose);
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="prompt-modal" role="dialog" aria-modal="true" aria-labelledby="prompt-modal-title">
        <div className="modal-header"><div><span className="modal-kicker">{getTrack(prompt.track).label.toUpperCase()} · {prompt.access === "free" ? "FREE ROUND" : "PLUS ROUND"}</span><h2 id="prompt-modal-title">{prompt.title}</h2></div><button className="icon-button" onClick={onClose} aria-label="Close prompt"><X size={19} /></button></div>
        <div className="modal-tabs"><button className={tab === "brief" ? "active" : ""} onClick={() => setTab("brief")}>The brief</button><button className={tab === "approach" ? "active" : ""} onClick={() => setTab("approach")}>A good place to start</button></div>
        {tab === "brief" ? <div className="modal-content"><p className="modal-description">{prompt.description}</p><div className="modal-meta"><span><Clock3 size={14} /> {prompt.minutes} minutes</span><span><Layers2 size={14} /> {prompt.difficulty}</span><span><Network size={14} /> {getTrack(prompt.track).label}</span></div><div className="brief-block"><h3>Requirements to consider</h3><ul>{prompt.requirements.map((requirement) => <li key={requirement}><span><Check size={12} /></span>{requirement}</li>)}</ul></div><div className="expected-outcome"><span>WHAT YOU'RE PRACTICING</span><p>{prompt.expectedOutcome}</p></div><div className="modal-nudge"><Sparkles size={15} /><span>Start by clarifying what matters most: who is using the system, and what does “working well” mean to them?</span></div></div> : <div className="modal-content approach-content"><p>There isn't one right answer. Use the canvas to explore the parts of the system that feel most important.</p><div className="consideration-list">{prompt.considerations.map((item, index) => <div key={item}><span>0{index + 1}</span>{item}</div>)}</div><p className="approach-footnote">These are just starting points—not a checklist. Follow the design where your reasoning takes you.</p></div>}
        <div className="modal-footer"><button className="button button-outline" onClick={onClose}>Back to canvas <ArrowRight size={15} /></button></div>
      </section>
    </div>
  );
}
