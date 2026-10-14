import { ArrowRight, BookOpenCheck, Check, ChevronRight, Clock3, Crown, Gauge, MessageSquareText, Network, TriangleAlert } from "lucide-react";
import excerpts from "virtual:guide-excerpts";
import { findPrompt, getTrack, prompts } from "../data/prompts.js";
import { LevelMeter, RoundCard, SiteFooter } from "../components/site.jsx";
import { promptIcon } from "../components/ui.jsx";
import { Link } from "../router.js";
import { roundPath, trackPath } from "../seo.js";

// Public page for one practice round (/system-design/<id>): the brief plus the
// public parts of its interviewer guide, so learners can prepare and search engines
// have something substantial to index. The round itself starts from here.
export default function RoundPage({ id, onStart }) {
  const prompt = findPrompt(id);
  const track = getTrack(prompt.track);
  const guide = excerpts[prompt.id] ?? { scale: "", mistakes: [], questions: [] };
  const Icon = promptIcon(prompt.icon);
  const free = prompt.access === "free";
  const related = prompts.filter((item) => item.track === prompt.track && item.id !== prompt.id);

  const start = (
    <button className="btn btn-primary btn-lg" onClick={() => onStart(prompt.id)}>
      {free ? "Start this round free" : <><Crown size={16} /> Plus round: preview</>} <ArrowRight size={16} className="nudge" />
    </button>
  );

  return (
    <main className={`round-page tone-${track.color}`}>
      <div className="wrap">
        <nav className="crumbs" aria-label="Breadcrumb">
          <Link to="/">Home</Link><ChevronRight size={13} />
          <Link to="/library">Library</Link><ChevronRight size={13} />
          <Link to={trackPath(track.id)}>{track.shortLabel}</Link><ChevronRight size={13} />
          <span aria-current="page">{prompt.title.replace(/^Design (a |an )?/i, "").replace(/^./, (char) => char.toUpperCase())}</span>
        </nav>

        <header className="rp-head">
          <span className="rp-icon"><Icon size={22} /></span>
          <span className="kicker">System design interview question · {track.shortLabel}</span>
          <h1>{prompt.title}</h1>
          <p className="rp-lede">{prompt.description}</p>
          <div className="rp-facts">
            <LevelMeter level={prompt.difficulty} />
            <span><Clock3 size={14} /> {prompt.minutes} minutes</span>
            <span>{prompt.category}</span>
            {free ? <span className="badge badge-free">Free</span> : <span className="badge badge-plus"><Crown size={12} /> Plus</span>}
          </div>
          <div className="rp-actions">
            {start}
            <Link className="btn btn-ghost btn-lg" to={trackPath(track.id)}>More {track.shortLabel} questions</Link>
          </div>
        </header>

        <div className="rp-body">
          <article className="rp-main">
            <section>
              <h2>The brief</h2>
              <p>{prompt.description} Your design should meet these requirements:</p>
              <ol className="rp-reqs">{prompt.requirements.map((requirement) => <li key={requirement}>{requirement}</li>)}</ol>
            </section>

            {guide.scale && (
              <section>
                <h2><Gauge size={20} /> Scale to design for</h2>
                <p>{guide.scale}</p>
                <p className="rp-note">State these assumptions out loud in the interview, then let them drive your choices: they decide what needs caching, sharding or asynchronous processing.</p>
              </section>
            )}

            {prompt.prerequisites?.length > 0 && (
              <section>
                <h2><BookOpenCheck size={20} /> Before you start</h2>
                <p>You'll get more out of this round if you're comfortable with:</p>
                <ul className="rp-chips">{prompt.prerequisites.map((item) => <li key={item}><Check size={14} />{item}</li>)}</ul>
              </section>
            )}

            {guide.questions.length > 0 && (
              <section>
                <h2><MessageSquareText size={20} /> Questions an interviewer may ask</h2>
                <p>Expect follow-ups like these once your high-level design is on the board. Have an answer, and a reason, for each:</p>
                <ul className="rp-list">{guide.questions.map((question) => <li key={question}>{question}</li>)}</ul>
              </section>
            )}

            {guide.mistakes.length > 0 && (
              <section>
                <h2><TriangleAlert size={20} /> Common mistakes to avoid</h2>
                <ul className="rp-list rp-mistakes">{guide.mistakes.map((mistake) => <li key={mistake}>{mistake}</li>)}</ul>
              </section>
            )}

            <section>
              <h2><Network size={20} /> Concepts this round covers</h2>
              <ul className="rp-chips">{prompt.considerations.map((item) => <li key={item}>{item}</li>)}<li>{prompt.category}</li></ul>
            </section>

            <section>
              <h2>What a complete answer covers</h2>
              <p>{prompt.expectedOutcome}</p>
              <p>There is no single correct design. A strong answer meets the requirements at the stated scale and explains the trade-offs behind each choice. New to the format? Read <Link to="/guide/system-design-interview">how to prepare for a system design interview</Link>.</p>
            </section>
          </article>

          <aside className="rp-aside">
            <div className="rp-card">
              <h2>Practice this round</h2>
              <ol>
                <li>Read the brief and clarify the requirements.</li>
                <li>Design it on an architecture canvas with {prompt.minutes} minutes as your target.</li>
                <li>Explain each choice, then get a rubric-based review of six dimensions.</li>
              </ol>
              {start}
              <p className="rp-card-note">{free ? "Free round · sign in with just your email." : "Plus rounds are coming soon. Try a free round in the meantime."}</p>
            </div>
          </aside>
        </div>

        {related.length > 0 && (
          <section className="rp-related">
            <div className="row-head">
              <h2>More {track.shortLabel} system design interview questions</h2>
              <Link className="btn btn-ghost" to={trackPath(track.id)}>See all <ArrowRight size={15} className="nudge" /></Link>
            </div>
            <div className="rounds">{related.slice(0, 6).map((item, index) => <RoundCard key={item.id} round={item} onStart={onStart} index={index} />)}</div>
          </section>
        )}
      </div>
      <SiteFooter />
    </main>
  );
}

export const roundExists = (id) => Boolean(findPrompt(id));
export { roundPath };
