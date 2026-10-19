import { useEffect, useRef, useState } from "react";
import { ArrowRight, Check, LoaderCircle, MessageCircle, Minus } from "lucide-react";
import { api } from "../api.js";
import { COMMUNICATION, PLUS_FEATURES, RUBRIC, aiLimits } from "../data/plans.js";
import { SiteFooter, useReveal } from "../components/site.jsx";
import { useAuth } from "../auth.jsx";
import { Link } from "../router.js";
import { topicPath } from "../learn/catalog.js";
import { TurnstileWidget } from "../components/Turnstile.jsx";

const free = aiLimits.free;
const plus = aiLimits.plus;

// Free against Plus, row by row. true and false render as a mark; text is shown as is.
const COMPARE = [
  ["Free rounds in every discipline", true, true],
  ["Every round in the library, every level", false, true],
  ["Architecture canvas with autosave and version history", true, true],
  ["AI review scored on the full rubric", true, true],
  ["Reviews", `${free.reviewsPerRound} per round, up to ${free.reviewsPerMonth} a month`, `${plus.reviewsPerRound} per round, up to ${plus.reviewsPerMonth} a month`],
  ["Review detail", "Scores, top strength and top risk", "Coaching on every decision"],
  ["Live AI interviewer, by voice or text", false, true],
  ["Feedback on how you communicate", false, true],
  ["Hints when you're stuck", false, true],
  ["System design handbook and roadmaps", true, true],
];

// Plus can't be bought in the app yet, so the purchase step is the early-access list.
// A signed-in learner joins with their account email in one click; a visitor enters an
// email and passes the human check.
function useWaitlist(user) {
  const [joined, setJoined] = useState(false);
  const [joinedEmail, setJoinedEmail] = useState("");
  const signedIn = Boolean(user);

  useEffect(() => {
    setJoined(false);
    setJoinedEmail("");
    if (!signedIn || user.plan === "plus") return undefined;
    let cancelled = false;
    api.plusWaitlistStatus()
      .then(({ joined: listed }) => { if (!cancelled && listed) { setJoined(true); setJoinedEmail(user.email); } })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [signedIn, user?.email, user?.plan]);

  return { joined, joinedEmail, markJoined: (email) => { setJoined(true); setJoinedEmail(email); } };
}

function EarlyAccessForm({ user, waitlist }) {
  const { turnstileSiteKey } = useAuth();
  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const [resetKey, setResetKey] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const needsHumanCheck = !user && Boolean(turnstileSiteKey);

  if (waitlist.joined) {
    return (
      <p className="plus-status plus-joined" role="status">
        <Check size={18} /> You're on the list. We'll email {waitlist.joinedEmail || "you"} the day Plus opens.
      </p>
    );
  }

  async function join(event) {
    event.preventDefault();
    if (busy || (needsHumanCheck && !token)) return;
    setBusy(true);
    setError("");
    try {
      const address = user ? user.email : email.trim().toLowerCase();
      await api.joinPlusWaitlist(user ? {} : { email: address, ...(token ? { turnstileToken: token } : {}) });
      waitlist.markJoined(address);
    } catch (joinError) {
      setError(joinError.message);
      if (needsHumanCheck) {
        setToken("");
        setResetKey((value) => value + 1);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="plus-waitlist" onSubmit={join}>
      {!user && (
        <div className="plus-waitlist-field">
          <label className="sr-only" htmlFor="plus-waitlist-email">Email address</label>
          <input id="plus-waitlist-email" type="email" required maxLength={254} autoComplete="email" placeholder="you@example.com" value={email} onChange={(event) => setEmail(event.target.value)} />
        </div>
      )}
      {needsHumanCheck && <TurnstileWidget siteKey={turnstileSiteKey} resetKey={resetKey} action="plus-waitlist" onToken={setToken} />}
      <div className="plus-actions">
        <button className="btn lp-btn" disabled={busy || (needsHumanCheck && !token)}>
          {busy ? <LoaderCircle size={17} className="spin" /> : null} Request early access {busy ? null : <ArrowRight size={17} />}
        </button>
        <Link className="lp-text-link" to="/library">Practise free rounds first</Link>
      </div>
      {user && <small className="plus-waitlist-note">We'll use your account email, {user.email}.</small>}
      {error && <p className="plus-waitlist-error" role="alert">{error}</p>}
    </form>
  );
}

// The closing call to action scrolls back to the form at the top instead of showing a
// second form (and a second human check) on the same page.
function focusEarlyAccess(event) {
  const target = document.getElementById("early-access");
  if (!target) return;
  event.preventDefault();
  target.scrollIntoView({ behavior: "smooth", block: "center" });
  const field = target.querySelector("input, button");
  field?.focus({ preventScroll: true });
}

export default function PlusPage() {
  const ref = useRef(null);
  useReveal(ref);
  const { user } = useAuth();
  const onPlus = user?.plan === "plus";
  const waitlist = useWaitlist(user);

  return (
    <main className="lp plus-page dot-ground" ref={ref}>
      <section className="plus-hero wrap" aria-labelledby="plus-title">
        <nav className="crumbs" aria-label="Breadcrumb"><Link to="/">Home</Link> / <Link to="/#pricing">Pricing</Link> / <span aria-current="page">Plus</span></nav>
        <h1 id="plus-title" className="rise" style={{ "--d": 0 }}>DesignRounds Plus</h1>
        <p className="plus-sub rise" style={{ "--d": 1 }}>For the last weeks before your interviews: every round, a live AI interviewer to talk your design through with, and feedback on both the design and the way you explain it.</p>
        <div id="early-access" className="plus-buy rise" style={{ "--d": 2 }}>
          {onPlus ? (
            <p className="plus-status"><Check size={18} /> You're on Plus. Every round and the live interviewer are unlocked.</p>
          ) : (
            <>
              <p className="plus-price">Launching soon<small>Request early access and we'll email you the day Plus opens.</small></p>
              <EarlyAccessForm user={user} waitlist={waitlist} />
            </>
          )}
        </div>
      </section>

      <section className="lp-section wrap" aria-labelledby="plus-included-title">
        <h2 id="plus-included-title" className="lp-h2 reveal">What's included</h2>
        <ul className="plus-features">
          {PLUS_FEATURES.map((feature, index) => (
            <li key={feature.title} className="reveal" style={{ transitionDelay: `${index * 60}ms` }}>
              <span className="plus-check" aria-hidden="true"><Check size={16} /></span>
              <h3>{feature.title}</h3>
              <p>{feature.text}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="lp-section plus-grades wrap" aria-labelledby="plus-grades-title">
        <div className="plus-grades-head reveal">
          <h2 id="plus-grades-title" className="lp-h2">Feedback on what interviewers grade</h2>
          <p className="lp-lead">Every review scores your design on a weighted rubric. With Plus, the interviewer also judges how you explain it, answer by answer.</p>
        </div>
        <div className="plus-rubrics">
          <div className="plus-rubric reveal">
            <h3>Your design</h3>
            <ul>
              {RUBRIC.map((dimension) => (
                <li key={dimension.id}>
                  <strong>{dimension.name}</strong>
                  <span>{dimension.text} <Link to={topicPath(dimension.guide)}>Guide: {dimension.guideTitle}</Link></span>
                </li>
              ))}
            </ul>
          </div>
          <div className="plus-rubric plus-rubric-talk reveal">
            <h3><MessageCircle size={20} aria-hidden="true" /> How you communicate</h3>
            <ul>
              {COMMUNICATION.map((signal) => (
                <li key={signal.name}><strong>{signal.name}</strong><span>{signal.text}</span></li>
              ))}
            </ul>
            <p className="plus-rubric-note">The interviewer notes these on every answer, typed or spoken, and the final review sums them up with what to practise next.</p>
          </div>
        </div>
      </section>

      <section className="lp-section wrap" aria-labelledby="plus-compare-title">
        <h2 id="plus-compare-title" className="lp-h2 reveal">Free and Plus, side by side</h2>
        <div className="table-wrap plus-compare reveal">
          <table>
            <thead><tr><th scope="col">Feature</th><th scope="col">Free</th><th scope="col">Plus</th></tr></thead>
            <tbody>
              {COMPARE.map(([feature, inFree, inPlus]) => (
                <tr key={feature}>
                  <th scope="row">{feature}</th>
                  {[inFree, inPlus].map((value, index) => (
                    <td key={index}>{value === true ? <Check size={18} aria-label="Included" /> : value === false ? <Minus size={18} aria-label="Not included" /> : value}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {!onPlus && (
        <section className="lp-close" aria-labelledby="plus-close-title">
          <div className="lp-close-copy">
            <h2 id="plus-close-title">Be first in when Plus opens</h2>
            <p>Until then, every free feature stays free: start a round now and the review will show you where you stand.</p>
            {waitlist.joined
              ? <p className="plus-status"><Check size={18} /> You're on the early-access list.</p>
              : <a className="btn lp-btn lp-btn-on-accent" href="#early-access" onClick={focusEarlyAccess}>Request early access <ArrowRight size={17} /></a>}
          </div>
        </section>
      )}
      <SiteFooter />
    </main>
  );
}
