import { useRef } from "react";
import { ArrowRight, Check, MessageCircle, Minus } from "lucide-react";
import { COMMUNICATION, PLUS_FEATURES, RUBRIC, aiLimits } from "../data/plans.js";
import { SiteFooter, useReveal } from "../components/site.jsx";
import { useAuth } from "../auth.jsx";
import { Link } from "../router.js";
import { topicPath } from "../learn/catalog.js";
import { CONTACT_EMAIL } from "./Privacy.jsx";

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

// Plus can't be bought in the app yet, so the purchase step is a request for early
// access by email, with the signed-in address filled in.
function earlyAccessHref(email) {
  const subject = "DesignRounds Plus early access";
  const body = `Hi, I'd like early access to DesignRounds Plus.${email ? `\n\nMy account: ${email}` : ""}`;
  return `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export default function PlusPage() {
  const ref = useRef(null);
  useReveal(ref);
  const { user } = useAuth();
  const onPlus = user?.plan === "plus";
  const href = earlyAccessHref(user?.email);

  return (
    <main className="lp plus-page dot-ground" ref={ref}>
      <section className="plus-hero wrap" aria-labelledby="plus-title">
        <nav className="crumbs" aria-label="Breadcrumb"><Link to="/">Home</Link> / <Link to="/#pricing">Pricing</Link> / <span aria-current="page">Plus</span></nav>
        <h1 id="plus-title" className="rise" style={{ "--d": 0 }}>DesignRounds Plus</h1>
        <p className="plus-sub rise" style={{ "--d": 1 }}>For the last weeks before your interviews: every round, a live AI interviewer to talk your design through with, and feedback on both the design and the way you explain it.</p>
        <div className="plus-buy rise" style={{ "--d": 2 }}>
          {onPlus ? (
            <p className="plus-status"><Check size={18} /> You're on Plus. Every round and the live interviewer are unlocked.</p>
          ) : (
            <>
              <p className="plus-price">Launching soon<small>Request early access and we'll email you the day Plus opens.</small></p>
              <div className="plus-actions">
                <a className="btn lp-btn" href={href}>Request early access <ArrowRight size={17} /></a>
                <Link className="lp-text-link" to="/library">Practise free rounds first</Link>
              </div>
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
            <a className="btn lp-btn lp-btn-on-accent" href={href}>Request early access <ArrowRight size={17} /></a>
          </div>
        </section>
      )}
      <SiteFooter />
    </main>
  );
}
