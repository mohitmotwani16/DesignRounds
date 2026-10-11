import { useEffect, useRef, useState } from "react";
import {
  ArrowRight, ArrowUpRight, Bell, Check, CircleUser, Clock3, Crown, Database, Fingerprint, Flag, FileText, Globe2,
  HardDrive, Hash, Image, Layers2, Link2, ListOrdered, LockKeyhole, LogOut, Menu, MessageSquare, MonitorSmartphone,
  Network, RefreshCcw, Search, Server, Settings2, ShieldCheck, Sparkles, SquarePen, Waypoints, Zap, KeyRound, Lock,
} from "lucide-react";
import { getTrack } from "../data/prompts.js";
import { initials, useAuth } from "../auth.jsx";
import { navigate } from "../router.js";

export function Brand({ onClick, className = "" }) {
  return (
    <button className={`brand-lockup ${className}`} onClick={onClick} aria-label="DesignRounds home">
      <span className="brand-mark"><Layers2 size={18} strokeWidth={2.3} /></span>
      <span className="brand-name">design<span>rounds</span></span>
    </button>
  );
}

export function useEscape(onEscape) {
  useEffect(() => {
    const onKeyDown = (event) => { if (event.key === "Escape") onEscape(); };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onEscape]);
}

export function UserMenu({ compact = false }) {
  const { user, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (event) => { if (!ref.current?.contains(event.target)) setOpen(false); };
    const onKey = (event) => { if (event.key === "Escape") setOpen(false); };
    window.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => { window.removeEventListener("mousedown", onDown); window.removeEventListener("keydown", onKey); };
  }, [open]);
  if (!user) return null;
  return (
    <div className="user-menu" ref={ref}>
      <button className={`avatar-button ${compact ? "" : "avatar-large"}`} onClick={() => setOpen((value) => !value)} aria-haspopup="menu" aria-expanded={open} aria-label="Account menu">
        {initials(user)}
      </button>
      {open && (
        <div className="user-menu-popover" role="menu">
          <div className="user-menu-identity"><strong>{user.displayName || "Your account"}</strong><span>{user.email}</span></div>
          <button role="menuitem" onClick={() => { setOpen(false); navigate("/profile"); }}><CircleUser size={15} /> Profile & history</button>
          <button role="menuitem" onClick={() => { setOpen(false); navigate("/library"); }}><Layers2 size={15} /> Practice library</button>
          <button role="menuitem" onClick={async () => { setOpen(false); await signOut(); navigate("/"); }}><LogOut size={15} /> Sign out</button>
        </div>
      )}
    </div>
  );
}

export function SiteHeader() {
  const { status } = useAuth();
  return (
    <header className="site-header">
      <Brand onClick={() => navigate("/")} />
      <nav className="main-nav" aria-label="Main navigation">
        <button className="nav-link" onClick={() => navigate("/library")}>Practice</button>
        <a className="nav-link" href="#how-it-works" onClick={(event) => { event.preventDefault(); goToSection("how-it-works"); }}>How it works</a>
        <a className="nav-link" href="#topics" onClick={(event) => { event.preventDefault(); goToSection("topics"); }}>Topics</a>
      </nav>
      <div className="header-actions">
        {status === "signed-in" ? (
          <>
            <button className="button button-dark button-small" onClick={() => navigate("/library")}>Practice <ArrowRight size={15} /></button>
            <UserMenu />
          </>
        ) : status === "signed-out" ? (
          <>
            <button className="nav-link" onClick={() => navigate("/signin")}>Sign in</button>
            <button className="button button-dark button-small" onClick={() => navigate("/signin")}>Start practicing <ArrowRight size={15} /></button>
          </>
        ) : null}
      </div>
      <button className="mobile-menu" onClick={() => navigate(status === "signed-in" ? "/profile" : "/signin")} aria-label="Account"><Menu size={21} /></button>
    </header>
  );
}

function goToSection(id) {
  const scroll = () => document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  if (window.location.hash.startsWith("#/") && window.location.hash !== "#/") {
    navigate("/");
    window.setTimeout(scroll, 60);
  } else {
    scroll();
  }
}

export function Footer() {
  return (
    <footer className="site-footer">
      <Brand className="footer-brand" onClick={() => { navigate("/"); window.scrollTo({ top: 0, behavior: "smooth" }); }} />
      <span>Thoughtful practice for systems that matter.</span>
      <span>© 2026 DesignRounds</span>
    </footer>
  );
}

export function PromptCard({ prompt, onStart, index = 0, compact = false, status }) {
  const Icon = promptIcon(prompt.icon);
  const track = getTrack(prompt.track);
  const free = prompt.access === "free";
  return (
    <article className={`prompt-card ${compact ? "prompt-compact" : ""}`} style={{ "--card-order": Math.min(index, 12) }}>
      <div className="prompt-card-top">
        <div className={`prompt-icon icon-${prompt.color}`}><Icon size={19} strokeWidth={1.8} /></div>
        <div className="prompt-card-badges">
          {status && <span className={`status-tag status-${status}`}>{status === "in_progress" ? "In progress" : "Completed"}</span>}
          <span className={`access-tag ${free ? "access-free" : "access-plus"}`}>{free ? <Check size={10} /> : <LockKeyhole size={10} />}{free ? "FREE" : "PLUS"}</span>
        </div>
      </div>
      <div className="prompt-meta"><span>{track.shortLabel}</span><span className="meta-separator">·</span><span>{prompt.difficulty}</span><span className="meta-time"><Clock3 size={13} /> {prompt.minutes} min</span></div>
      <h3>{prompt.title}</h3>
      <p className="prompt-description">{prompt.description}</p>
      <div className="prompt-card-bottom">
        <div className="topic-tags"><span>{prompt.category}</span>{prompt.considerations.slice(0, 1).map((tag) => <span key={tag}>{tag}</span>)}</div>
        <button className="card-arrow" onClick={() => onStart(prompt.id)} aria-label={free ? `Start ${prompt.title}` : `View Plus details for ${prompt.title}`}><ArrowUpRight size={17} /></button>
      </div>
    </article>
  );
}

export function promptIcon(icon) {
  const icons = {
    link: Link2, message: MessageSquare, feed: Layers2, storage: HardDrive, shield: ShieldCheck, video: Globe2,
    booking: Clock3, notification: Bell, crawler: Globe2, autocomplete: Search, editor: SquarePen, paste: FileText,
    payment: ShieldCheck, scheduler: Server, cache: Database, gateway: Network,
    warehouse: Database, analytics: Layers2, pipeline: Network, events: Zap, alert: Bell, fraud: ShieldCheck,
    quality: Check, model: Sparkles, features: Database, training: Server, serve: Zap, search: Search, monitor: Layers2,
    platform: Layers2, regions: Globe2, discovery: Network, security: LockKeyhole, deploy: ArrowUpRight, config: Settings2,
    service: Server, kv: KeyRound, id: Hash, queue: ListOrdered, lock: Lock, crown: Crown, sync: RefreshCcw, image: Image,
    flag: Flag, identity: Fingerprint,
  };
  return icons[icon] || Network;
}

export function trackIcon(icon) {
  const icons = { service: Server, database: Database, model: Sparkles, platform: Layers2, distributed: Waypoints, frontend: MonitorSmartphone };
  return icons[icon] || Network;
}

export function LockedPromptDialog({ prompt, onClose }) {
  const track = getTrack(prompt.track);
  useEscape(onClose);
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="locked-dialog" role="dialog" aria-modal="true" aria-labelledby="locked-dialog-title">
        <div className="locked-dialog-icon"><LockKeyhole size={20} /></div>
        <span className="modal-kicker">PLUS PRACTICE ROUND · {track.shortLabel.toUpperCase()}</span>
        <h2 id="locked-dialog-title">{prompt.title}</h2>
        <p>{prompt.description}</p>
        <div className="locked-dialog-requirements"><h3>Requirements to consider</h3><ul>{prompt.requirements.map((requirement) => <li key={requirement}><Check size={12} />{requirement}</li>)}</ul></div>
        <p className="locked-dialog-outcome"><strong>What you would practice:</strong> {prompt.expectedOutcome}</p>
        <div className="locked-dialog-note"><Sparkles size={15} /><span>Plus rounds and conversational AI coaching are planned. Checkout isn't available yet, so this round can't be started.</span></div>
        <button className="button button-dark locked-dialog-close" onClick={onClose}>Back to practice library <ArrowRight size={14} /></button>
      </section>
    </div>
  );
}

export function FullPageMessage({ title, children, action }) {
  return (
    <main className="full-page-message">
      <div className="full-page-card">
        <span className="brand-mark"><Layers2 size={18} /></span>
        <h1>{title}</h1>
        {children && <p>{children}</p>}
        {action}
      </div>
    </main>
  );
}
