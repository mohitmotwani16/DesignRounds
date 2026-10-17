import { ArrowRight, ChevronRight } from "lucide-react";
import { tracks } from "../data/prompts.js";
import { aiLimits } from "../data/plans.js";
import { SiteFooter } from "../components/site.jsx";
import { Link } from "../router.js";
import { trackPath } from "../seo.js";

// Plain, factual description of the product: what it is, who it's for, how it works
// and what it costs. Written to be easy for people (and AI assistants) to quote.
export default function AboutPage() {
  return (
    <main className="guide-page">
      <div className="wrap guide-wrap">
        <nav className="crumbs" aria-label="Breadcrumb"><Link to="/">Home</Link><ChevronRight size={13} /><span aria-current="page">About</span></nav>
        <article className="prose">
          <header>
            <span className="kicker">About</span>
            <h1>About DesignRounds</h1>
          </header>
          <p><strong>DesignRounds is a system design interview practice platform.</strong> You pick a realistic design problem, build your architecture on a canvas, explain your decisions to an AI interviewer, and get a rubric-based review of your design. It runs in the browser at designrounds.in.</p>

          <h2>Who it's for</h2>
          <p>Software engineers preparing for system design interviews, from first system design rounds to senior and staff loops. Practice rounds cover every discipline: {tracks.map((track, index) => <span key={track.id}>{index ? (index === tracks.length - 1 ? " and " : ", ") : ""}<Link to={trackPath(track.id)}>{track.label}</Link></span>)}.</p>

          <h2>How it works</h2>
          <ol>
            <li><strong>Pick a design round.</strong> Each round has a brief, requirements, a difficulty level and a target time of 30 to 55 minutes.</li>
            <li><strong>Design on the canvas.</strong> A full library of components, labeled synchronous and asynchronous connections, zones, and a "why this choice?" note on every component. Work autosaves.</li>
            <li><strong>Defend your choices.</strong> On Plus, a live AI interviewer asks follow-up questions about significant decisions, like a real interviewer.</li>
            <li><strong>Get reviewed.</strong> An AI review scores six weighted dimensions: requirements and scope, high-level architecture, data model and storage, scale and performance, reliability and security, and trade-offs and reasoning. The overall score out of 100 is computed the same way on every plan.</li>
          </ol>

          <h2>Pricing</h2>
          <ul>
            <li><strong>Free:</strong> practice rounds in every discipline, the full canvas, and {aiLimits.free.reviewsPerRound} AI review per round (up to {aiLimits.free.reviewsPerMonth} a month) with scores on every dimension. No credit card.</li>
            <li><strong>Plus (coming soon):</strong> every round, the live AI interviewer, {aiLimits.plus.reviewsPerRound} reviews per round, and full coaching on each decision. Pricing will be announced at launch.</li>
          </ul>

          <h2>Your data</h2>
          <p>Designs are private to your account. To generate interviewer replies and reviews, your design and notes are sent to an AI provider. You can delete any round, or your whole account, at any time from your profile.</p>

          <aside className="guide-cta">
            <h2>Try a round</h2>
            <p>The URL shortener is a classic first system design question and takes about 35 minutes.</p>
            <div className="hero-ctas">
              <Link className="btn btn-primary btn-lg" to="/system-design/url-shortener">Start a free round <ArrowRight size={16} className="nudge" /></Link>
              <Link className="btn btn-ghost btn-lg" to="/learn/system-design-interview">Read the preparation guide</Link>
            </div>
          </aside>
        </article>
      </div>
      <SiteFooter />
    </main>
  );
}
