import { useEffect, useRef, useState } from "react";
import { ArrowRight, Check, Clock3, Crown, Layers2, LockKeyhole, LogOut, Menu, X } from "lucide-react";
import { getTrack, tracks } from "../data/prompts.js";
import { CATEGORIES, LEARN_PATH, topicPath } from "../learn/catalog.js";
import { useAuth } from "../auth.jsx";
import { Link, navigate, useRoute } from "../router.js";
import { roundPath, trackPath } from "../seo.js";
import { ThemePicker, UserMenu, promptIcon } from "./ui.jsx";

// Landing-page sections linked from the header and footer, as /#<id> anchors.
export const SECTIONS = [
  { id: "how", label: "How it works" },
  { id: "pricing", label: "Pricing" },
  { id: "faq", label: "FAQ" },
];

export function Logo() {
  return (
    <Link className="logo" to="/" aria-label="DesignRounds home">
      <span className="logo-mark"><Layers2 strokeWidth={2.4} /></span>
      <span>design<b>rounds</b></span>
    </Link>
  );
}

export function SiteNav() {
  const { status, user, signOut } = useAuth();
  const { path } = useRoute();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const sheetRef = useRef(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  useEffect(() => { setOpen(false); }, [path]);
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event) => { if (event.key === "Escape") setOpen(false); };
    const onDown = (event) => { if (!sheetRef.current?.contains(event.target)) setOpen(false); };
    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onDown);
    return () => { window.removeEventListener("keydown", onKey); window.removeEventListener("mousedown", onDown); };
  }, [open]);

  const signedIn = status === "signed-in";
  const close = () => setOpen(false);
  const current = (match) => (match ? "page" : undefined);
  const links = (
    <>
      <Link className="nav-link-btn" to="/library" onClick={close} aria-current={current(path.startsWith("/library") || path.startsWith("/system-design/"))}>Library</Link>
      <Link className="nav-link-btn" to={LEARN_PATH} onClick={close} aria-current={current(path === LEARN_PATH || path.startsWith(`${LEARN_PATH}/`))}>Learn</Link>
      {signedIn && <Link className="nav-link-btn" to="/profile" onClick={close} aria-current={current(path === "/profile")}>My rounds</Link>}
      {SECTIONS.map((item) => <Link key={item.id} className="nav-link-btn" to={`/#${item.id}`} onClick={close}>{item.label}</Link>)}
    </>
  );

  return (
    <header className={`nav ${scrolled || open ? "scrolled" : ""}`}>
      <div className="wrap nav-inner" ref={sheetRef}>
        <Logo />
        <nav className="nav-links" aria-label="Main">{links}</nav>
        <div className="nav-actions">
          {signedIn && <UserMenu />}
          {status === "signed-out" && (
            <>
              <Link className="btn btn-quiet btn-sm" to="/signin">Sign in</Link>
              <Link className="btn btn-primary btn-sm" to="/library">Start practicing <ArrowRight size={15} className="nudge" /></Link>
            </>
          )}
        </div>
        <button className="nav-burger" onClick={() => setOpen((value) => !value)} aria-expanded={open} aria-label={open ? "Close menu" : "Open menu"}>
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
        <div className={`nav-sheet ${open ? "open" : ""}`}>
          <nav aria-label="Mobile">{links}</nav>
          <div className="nav-sheet-actions">
            {signedIn ? (
              <>
                <span className="nav-sheet-identity">{user.email}</span>
                <button className="btn btn-ghost" onClick={async () => { close(); await signOut(); navigate("/"); }}><LogOut size={15} /> Sign out</button>
              </>
            ) : (
              <>
                <Link className="btn btn-primary" to="/library" onClick={close}>Start practicing <ArrowRight size={15} /></Link>
                <Link className="btn btn-ghost" to="/signin" onClick={close}>Sign in</Link>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="foot">
      <div className="wrap">
        <div className="foot-grid">
          <div className="foot-brand">
            <Logo />
            <p>System design interview practice the way interviews actually go: design it, explain it, defend it.</p>
          </div>
          <div>
            <h2>Product</h2>
            <ul>
              <li><Link to="/library">Practice library</Link></li>
              {SECTIONS.map((item) => <li key={item.id}><Link to={`/#${item.id}`}>{item.label}</Link></li>)}
              <li><Link to="/about">About</Link></li>
              <li><Link to="/privacy">Privacy</Link></li>
              <li><Link to="/terms">Terms</Link></li>
            </ul>
          </div>
          <div>
            <h2>Disciplines</h2>
            <ul>
              {tracks.map((track) => <li key={track.id}><Link to={trackPath(track.id)}>{track.shortLabel}</Link></li>)}
            </ul>
          </div>
          <div>
            <h2>Learn</h2>
            <ul>
              <li><Link to={LEARN_PATH}>System design handbook</Link></li>
              {CATEGORIES.find((category) => category.id === "roadmaps").topics.map((topic) => <li key={topic.slug}><Link to={topicPath(topic.slug)}>{topic.short}</Link></li>)}
              <li><Link to={topicPath("system-design-interview")}>Interview preparation</Link></li>
              <li><Link to="/signin">Sign in</Link></li>
            </ul>
          </div>
        </div>
        <div className="foot-bottom">
          <span>© {new Date().getFullYear()} DesignRounds. Made for engineers who like to think out loud.</span>
          <ThemePicker compact />
        </div>
      </div>
    </footer>
  );
}

const LEVEL = { Beginner: 1, Intermediate: 2, Advanced: 3 };

export function LevelMeter({ level }) {
  return <span className="level" data-level={LEVEL[level] || 1}><i aria-hidden="true"><b /><b /><b /></i>{level}</span>;
}

// A practice round in the catalog. The title links to the round's page (and the
// link covers the card); the chip starts the round directly.
export function RoundCard({ round, onStart, status, index = 0 }) {
  const Icon = promptIcon(round.icon);
  const track = getTrack(round.track);
  const free = round.access === "free";
  return (
    <article className={`round tone-${track.color}`} style={{ "--i": index % 12 }}>
      <div className="round-top">
        <span className="round-icon"><Icon size={19} strokeWidth={1.9} /></span>
        <span className="round-badges">
          {status === "in_progress" && <span className="badge badge-progress">In progress</span>}
          {status === "completed" && <span className="badge badge-done"><Check size={12} /> Done</span>}
          {free ? <span className="badge badge-free">Free</span> : <span className="badge badge-plus"><Crown size={12} /> Plus</span>}
        </span>
      </div>
      <div className="round-track"><b>{track.shortLabel}</b><span>·</span><span>{round.category}</span></div>
      <h3><Link to={roundPath(round.id)}>{round.title}</Link></h3>
      <p>{round.description}</p>
      <div className="round-foot">
        <span className="round-facts">
          <LevelMeter level={round.difficulty} />
          <span><Clock3 size={13} /> {round.minutes} min</span>
        </span>
        <button className={`round-go ${free ? "" : "locked"}`} onClick={() => onStart(round.id)} aria-label={`${free ? (status === "in_progress" ? "Resume" : "Start") : "Plus round"}: ${round.title}`}>
          {free ? (status === "in_progress" ? "Resume" : "Start") : <><LockKeyhole size={12} /> Plus</>}
          {free && <ArrowRight size={13} className="nudge" />}
        </button>
      </div>
    </article>
  );
}

export function RoundCardSkeleton() {
  return (
    <div className="round skeleton" aria-hidden="true">
      <div className="round-top"><span className="sk" style={{ width: 38, height: 38, borderRadius: 10 }} /><span className="sk" style={{ width: 52, height: 22, borderRadius: 99 }} /></div>
      <span className="sk" style={{ width: "40%", height: 12, marginTop: 18 }} />
      <span className="sk" style={{ width: "80%", height: 18, marginTop: 10 }} />
      <span className="sk" style={{ width: "95%", height: 12, marginTop: 12 }} />
      <span className="sk" style={{ width: "70%", height: 12, marginTop: 8 }} />
      <div className="round-foot"><span className="sk" style={{ width: 120, height: 12 }} /><span className="sk" style={{ width: 64, height: 28, borderRadius: 8 }} /></div>
    </div>
  );
}

// Adds .in to every .reveal element under `ref` as it scrolls into view.
export function useReveal(ref) {
  useEffect(() => {
    const root = ref.current;
    if (!root) return undefined;
    const items = root.querySelectorAll(".reveal");
    if (!("IntersectionObserver" in window)) { items.forEach((item) => item.classList.add("in")); return undefined; }
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) { entry.target.classList.add("in"); observer.unobserve(entry.target); }
      }
    }, { rootMargin: "0px 0px -10% 0px", threshold: 0.08 });
    items.forEach((item) => observer.observe(item));
    return () => observer.disconnect();
  }, [ref]);
}
