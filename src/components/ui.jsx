import { useEffect, useRef, useState } from "react";
import {
  ArrowRight, ArrowUpRight, Bell, Check, CircleUser, Clock3, Crown, Database, Fingerprint, Flag, FileText, FlaskConical, Globe2,
  HardDrive, Hash, Image, Layers2, Link2, ListOrdered, LockKeyhole, LogOut, Menu, MessageSquare, MonitorSmartphone,
  Network, RefreshCcw, Search, Server, Settings2, ShieldCheck, Sparkles, SquarePen, Waypoints, Zap, KeyRound, Lock,
  ChevronDown, UserRound, X,
} from "lucide-react";
import { getTrack } from "../data/prompts.js";
import { api } from "../api.js";
import { useAuth } from "../auth.jsx";
import { THEMES, setTheme, useTheme } from "../theme.js";
import { navigate, useRoute } from "../router.js";

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

function useDismiss(open, setOpen, ref) {
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (event) => { if (!ref.current?.contains(event.target)) setOpen(false); };
    const onKey = (event) => { if (event.key === "Escape") setOpen(false); };
    window.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => { window.removeEventListener("mousedown", onDown); window.removeEventListener("keydown", onKey); };
  }, [open, setOpen, ref]);
}

const firstName = (user) => (user.displayName || user.email.split("@")[0]).split(" ")[0];

export function UserMenu({ compact = false }) {
  const { user, signOut, setUser } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useDismiss(open, setOpen, ref);
  if (!user) return null;
  return (
    <div className="user-menu" ref={ref}>
      <button className={`account-button ${open ? "open" : ""}`} onClick={() => setOpen((value) => !value)} aria-haspopup="menu" aria-expanded={open} aria-label="Account menu">
        <UserRound size={16} />
        {!compact && <span className="account-name">{firstName(user)}</span>}
        <ChevronDown size={14} className="account-chevron" />
      </button>
      {open && (
        <div className="user-menu-popover" role="menu">
          <div className="user-menu-identity"><strong>{user.displayName || "Your account"}</strong><span>{user.email}</span></div>
          <button role="menuitem" onClick={() => { setOpen(false); navigate("/profile"); }}><CircleUser size={15} /> Profile & practice history</button>
          <button role="menuitem" onClick={() => { setOpen(false); navigate("/learn/write"); }}><SquarePen size={15} /> My articles</button>
          {user.isAdmin && <button role="menuitem" onClick={() => { setOpen(false); navigate("/admin"); }}><ShieldCheck size={15} /> Admin</button>}
          {user.devTools && (
            <button role="menuitem" className="dev-menu-item" onClick={async () => {
              setOpen(false);
              try { setUser((await api.devSetPlan(user.plan === "plus" ? "free" : "plus")).user); } catch (error) { window.alert(error.message); }
            }}><FlaskConical size={15} /> Dev: switch to {user.plan === "plus" ? "Free" : "Plus"} <span className="dev-plan-pill">{user.plan}</span></button>
          )}
          <ThemePicker />
          <button role="menuitem" onClick={async () => { setOpen(false); await signOut(); navigate("/"); }}><LogOut size={15} /> Sign out</button>
        </div>
      )}
    </div>
  );
}

// Theme choice, shown in the account menu and the footer.
export function ThemePicker({ compact = false }) {
  const { choice } = useTheme();
  return (
    <div className={`theme-picker ${compact ? "compact" : ""}`} role="radiogroup" aria-label="Colour theme">
      {!compact && <span>Theme</span>}
      <div>
        {THEMES.map(([id, label]) => (
          <button key={id} type="button" role="radio" aria-checked={choice === id} className={choice === id ? "active" : ""} onClick={() => setTheme(id)}>{label}</button>
        ))}
      </div>
    </div>
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

// Shown when a Plus round is opened without Plus. Never a dead end: it offers a free
// round from the same discipline.
export function LockedPromptDialog({ prompt, alternative, onClose, onStart }) {
  const track = getTrack(prompt.track);
  useEscape(onClose);
  return (
    <div className="lock-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className={`lock-modal tone-${track.color}`} role="dialog" aria-modal="true" aria-labelledby="locked-dialog-title">
        <button className="lock-close" onClick={onClose} aria-label="Close"><X size={18} /></button>
        <span className="lock-badge"><Crown size={13} /> Plus round · {track.shortLabel}</span>
        <h2 id="locked-dialog-title">{prompt.title}</h2>
        <p className="lock-lede">{prompt.description}</p>
        <h3>Concepts this round covers</h3>
        <ul>{[...prompt.considerations, prompt.category].map((item) => <li key={item}><Check size={15} />{item}</li>)}</ul>
        <div className="lock-note"><Sparkles size={16} /><span>The brief, scale and interviewer notes for this round are for Plus members. Plus is coming soon, with every round, the live AI interviewer, and full coaching.</span></div>
        <div className="lock-actions">
          {alternative && <button className="btn btn-primary btn-lg" onClick={() => { onClose(); onStart(alternative.id); }}>Try “{alternative.title.replace(/^Design (a |an )?/i, "")}” free <ArrowRight size={16} /></button>}
          <button className="btn btn-ghost btn-lg" onClick={onClose}>Back to the library</button>
        </div>
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
