import { useEffect, useRef, useState } from "react";
import { ArrowRight, Check, Clock3, Crown, Layers2, LockKeyhole, LogOut, Menu, X } from "lucide-react";
import { getTrack, tracks } from "../data/prompts.js";
import { useAuth } from "../auth.jsx";
import { navigate, useRoute } from "../router.js";
import { ThemePicker, UserMenu, promptIcon } from "./ui.jsx";

// Landing-page sections reachable from the header. With hash routing, a section link
// is the route "/?s=<id>"; the landing page scrolls to it.
export const SECTIONS = [
  { id: "how", label: "How it works" },
  { id: "pricing", label: "Pricing" },
  { id: "faq", label: "FAQ" },
];

export function goToSection(id) {
  const element = document.getElementById(id);
  if (element && window.location.hash.replace(/^#/, "").split("?")[0] === "/") {
    element.scrollIntoView({ behavior: "smooth", block: "start" });
    window.history.replaceState(null, "", `#/?s=${id}`);
  } else {
    navigate(`/?s=${id}`);
  }
}

export function Logo({ onClick }) {
  return (
    <button className="logo" onClick={onClick} aria-label="DesignRounds home">
      <span className="logo-mark"><Layers2 strokeWidth={2.4} /></span>
      <span>design<b>rounds</b></span>
    </button>
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
  const go = (to) => { setOpen(false); navigate(to); };
  const section = (id) => { setOpen(false); goToSection(id); };
  const links = (
    <>
      <button className="nav-link-btn" aria-current={path === "/library" ? "page" : undefined} onClick={() => go("/library")}>Library</button>
      {signedIn && <button className="nav-link-btn" aria-current={path === "/profile" ? "page" : undefined} onClick={() => go("/profile")}>My rounds</button>}
      {SECTIONS.map((item) => <button key={item.id} className="nav-link-btn" onClick={() => section(item.id)}>{item.label}</button>)}
    </>
  );

  return (
    <header className={`nav ${scrolled || open ? "scrolled" : ""}`}>
      <div className="wrap nav-inner" ref={sheetRef}>
        <Logo onClick={() => go("/")} />
        <nav className="nav-links" aria-label="Main">{links}</nav>
        <div className="nav-actions">
          {signedIn && <UserMenu />}
          {status === "signed-out" && (
            <>
              <button className="btn btn-quiet btn-sm" onClick={() => go("/signin")}>Sign in</button>
              <button className="btn btn-primary btn-sm" onClick={() => go("/library")}>Start practicing <ArrowRight size={15} className="nudge" /></button>
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
                <button className="btn btn-ghost" onClick={async () => { setOpen(false); await signOut(); navigate("/"); }}><LogOut size={15} /> Sign out</button>
              </>
            ) : (
              <>
                <button className="btn btn-primary" onClick={() => go("/library")}>Start practicing <ArrowRight size={15} /></button>
                <button className="btn btn-ghost" onClick={() => go("/signin")}>Sign in</button>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

export function SiteFooter() {
  const top = () => { navigate("/"); window.scrollTo({ top: 0, behavior: "smooth" }); };
  return (
    <footer className="foot">
      <div className="wrap">
        <div className="foot-grid">
          <div className="foot-brand">
            <Logo onClick={top} />
            <p>Practice system design the way interviews actually go: design it, explain it, defend it.</p>
          </div>
          <div>
            <h4>Product</h4>
            <ul>
              <li><button onClick={() => navigate("/library")}>Practice library</button></li>
              {SECTIONS.map((item) => <li key={item.id}><button onClick={() => goToSection(item.id)}>{item.label}</button></li>)}
            </ul>
          </div>
          <div>
            <h4>Disciplines</h4>
            <ul>
              {tracks.slice(0, 6).map((track) => <li key={track.id}><button onClick={() => navigate(`/library?track=${track.id}`)}>{track.shortLabel}</button></li>)}
            </ul>
          </div>
          <div>
            <h4>Account</h4>
            <ul>
              <li><button onClick={() => navigate("/signin")}>Sign in</button></li>
              <li><button onClick={() => navigate("/profile")}>My rounds</button></li>
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

// A practice round in the catalog. The whole card is clickable through its title
// button (one tab stop, a real accessible name); the trailing chip is decorative.
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
      <h3><button onClick={() => onStart(round.id)}>{round.title}</button></h3>
      <p>{round.description}</p>
      <div className="round-foot">
        <span className="round-facts">
          <LevelMeter level={round.difficulty} />
          <span><Clock3 size={13} /> {round.minutes} min</span>
        </span>
        <span className={`round-go ${free ? "" : "locked"}`} aria-hidden="true">
          {free ? (status === "in_progress" ? "Resume" : "Start") : <><LockKeyhole size={12} /> Plus</>}
          {free && <ArrowRight size={13} className="nudge" />}
        </span>
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
