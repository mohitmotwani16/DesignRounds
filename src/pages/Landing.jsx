import { ArrowDown, ArrowRight, ArrowUpRight, Check, Database, Ellipsis, FileText, Globe2, Layers2, MessageSquare, MoreHorizontal, Network, Server, Sparkles, Zap } from "lucide-react";
import { prompts, tracks } from "../data/prompts.js";
import { Footer, PromptCard, trackIcon } from "../components/ui.jsx";
import { navigate } from "../router.js";

export default function LandingPage({ onStart }) {
  const freeCount = prompts.filter((prompt) => prompt.access === "free").length;
  return (
    <main>
      <section className="hero-section">
        <div className="hero-copy">
          <div className="eyebrow"><span className="eyebrow-line" /> SYSTEM DESIGN, BY DESIGN</div>
          <h1>Get better at system design <span>by doing it.</span></h1>
          <p className="hero-subtitle">
            Real interview prompts. A canvas to think things through.
            A better way to prepare for the conversations that matter.
          </p>
          <div className="hero-actions">
            <button className="button button-dark" onClick={() => navigate("/library")}>
              Explore practice rounds <ArrowRight size={16} />
            </button>
            <a href="#how-it-works" className="text-link" onClick={(event) => { event.preventDefault(); document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth" }); }}>See how it works <ArrowDown size={15} /></a>
          </div>
          <div className="hero-proof">
            <span><Check size={14} /> {freeCount} free rounds</span>
            <span className="proof-divider" />
            <span><Check size={14} /> Sign in with just your email</span>
          </div>
        </div>
        <ProductPreview />
        <div className="hero-footnote"><span>01 / A BETTER KIND OF PRACTICE</span><span>BUILT FOR THE WAY ENGINEERS THINK</span></div>
      </section>

      <section className="principle-band" id="how-it-works">
        <div className="section-kicker">A more useful way to prepare</div>
        <div className="principle-heading">
          <h2>Less memorizing.<br /><span>More thinking out loud.</span></h2>
          <p>Good system design is a conversation. Practice the decisions, the reasoning, and the trade-offs—not just the diagrams.</p>
        </div>
        <div className="steps-grid">
          <Step number="01" icon={<FileText size={18} />} title="Start with a real prompt" text="Pick a familiar engineering challenge, with requirements that leave room to think." />
          <Step number="02" icon={<Network size={18} />} title="Build your own design" text="Use a visual canvas to map components, connections, and the choices behind them." />
          <Step number="03" icon={<MessageSquare size={18} />} title="Explain your decisions" text="Work through the reasoning and trade-offs you'd be asked about in an interview." />
        </div>
      </section>

      <section className="category-section">
        <div className="category-section-heading">
          <div><div className="section-kicker">A LIBRARY FOR THE WORK YOU DO</div><h2>Practice by discipline.<br /><span>Go deep on the details.</span></h2></div>
          <p>From backend systems to data platforms, production ML, and client apps, every round sets a clear design brief and gives you room to explain your approach.</p>
        </div>
        <div className="track-grid">
          {tracks.map((track) => {
            const Icon = trackIcon(track.icon);
            const count = prompts.filter((prompt) => prompt.track === track.id).length;
            return (
              <button className="track-card" key={track.id} onClick={() => navigate(`/library?track=${encodeURIComponent(track.id)}`)}>
                <div className="track-card-top"><span className={`track-icon icon-${track.color}`}><Icon size={18} /></span><span>{String(count).padStart(2, "0")} ROUNDS</span></div>
                <h3>{track.label}</h3><p>{track.description}</p>
                <span className="track-card-link">Explore area <ArrowRight size={14} /></span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="topics-section" id="topics">
        <div className="topics-topline">
          <div><div className="section-kicker">THE PRACTICE LIBRARY</div><h2>Familiar problems.<br /><span>Interesting decisions.</span></h2></div>
          <button className="button button-outline" onClick={() => navigate("/library")}>Browse all {prompts.length} rounds <ArrowRight size={15} /></button>
        </div>
        <div className="featured-prompts">
          {prompts.slice(0, 3).map((prompt, index) => (
            <PromptCard key={prompt.id} prompt={prompt} onStart={onStart} index={index} compact />
          ))}
        </div>
      </section>
      <Footer />
    </main>
  );
}

function ProductPreview() {
  return (
    <div className="preview-scene" aria-label="Preview of a system design practice canvas">
      <div className="preview-browser">
        <div className="preview-chrome"><span /><span /><span /><div className="chrome-address">app.designrounds.com / practice</div><Ellipsis size={16} /></div>
        <div className="preview-app">
          <div className="preview-workspace">
            <div className="preview-toolbar"><span className="preview-toolbar-logo"><Layers2 size={15} /></span><span>Design a URL shortener</span><span className="preview-unsaved"><i /> All changes saved</span><button><MoreHorizontal size={17} /></button></div>
            <div className="preview-canvas">
              <div className="preview-canvas-grid" />
              <div className="preview-node preview-client"><Globe2 size={14} /><span>Client</span></div>
              <div className="preview-node preview-api"><Server size={14} /><span>API service</span></div>
              <div className="preview-node preview-cache"><Zap size={14} /><span>Cache</span></div>
              <div className="preview-node preview-db"><Database size={14} /><span>Database</span></div>
              <svg className="preview-connectors" viewBox="0 0 500 284" preserveAspectRatio="none" aria-hidden="true">
                <defs><marker id="arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 z" fill="#9ca8b9" /></marker></defs>
                <path d="M121 98 C150 98 155 98 182 98" stroke="#9ca8b9" strokeWidth="1.4" fill="none" markerEnd="url(#arrow)" />
                <path d="M279 98 C312 98 306 62 339 62" stroke="#9ca8b9" strokeWidth="1.4" fill="none" markerEnd="url(#arrow)" />
                <path d="M279 110 C312 110 306 150 339 150" stroke="#9ca8b9" strokeWidth="1.4" fill="none" markerEnd="url(#arrow)" />
              </svg>
              <span className="preview-edge-label edge-one">create</span><span className="preview-edge-label edge-two">read</span>
              <div className="preview-zoom"><span>−</span><span>100%</span><span>+</span></div>
            </div>
          </div>
          <aside className="preview-interviewer">
            <div className="preview-panel-title"><span className="panel-bubble"><MessageSquare size={13} /></span><span>INTERVIEWER</span><span className="preview-live-dot" /></div>
            <div className="preview-prompt-label">A QUESTION ABOUT YOUR DESIGN</div>
            <p className="preview-question">You’ve added a cache for redirects. What would you use as the cache key?</p>
            <div className="preview-answer">I’d use the short code as the key, since the redirect lookup starts with that.</div>
            <div className="preview-followup"><span className="tiny-spark"><Sparkles size={11} /></span>And how would you keep the cache consistent when a link expires?</div>
            <div className="preview-input">Your response <span><ArrowUpRight size={13} /></span></div>
          </aside>
        </div>
      </div>
      <div className="preview-caption"><span className="caption-dot" /> A workspace built around your thinking <span className="caption-right">CANVAS + CONVERSATION · PREVIEW</span></div>
    </div>
  );
}

function Step({ number, icon, title, text }) {
  return <article className="step-card"><div className="step-top"><span>{number}</span><i>{icon}</i></div><h3>{title}</h3><p>{text}</p></article>;
}
