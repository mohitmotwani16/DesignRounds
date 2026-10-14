import { ArrowRight, ChevronRight, Clock3 } from "lucide-react";
import { getTrack, prompts, tracks } from "../data/prompts.js";
import { GUIDES } from "../content/guides.js";
import { Rich } from "../components/rich.jsx";
import { LevelMeter, SiteFooter } from "../components/site.jsx";
import { Link } from "../router.js";
import { roundPath, trackPath, TRACK_SEO } from "../seo.js";

const LEVEL_ORDER = ["Beginner", "Intermediate", "Advanced"];
const formatDate = (iso) => new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

export default function GuidePage({ guide }) {
  const others = GUIDES.filter((item) => item.slug !== guide.slug);
  return (
    <main className="guide-page">
      <div className="wrap guide-wrap">
        <nav className="crumbs" aria-label="Breadcrumb">
          <Link to="/">Home</Link><ChevronRight size={13} />
          <Link to="/guide/system-design-interview">Guides</Link><ChevronRight size={13} />
          <span aria-current="page">{guide.short}</span>
        </nav>
        <article className="prose">
          <header>
            <span className="kicker">Guide</span>
            <h1>{guide.title}</h1>
            <p className="guide-meta"><Clock3 size={14} /> {guide.readingMinutes} min read · Updated <time dateTime={guide.updated}>{formatDate(guide.updated)}</time> · By the DesignRounds team</p>
          </header>
          {guide.blocks.map((block, index) => <Block key={index} block={block} />)}
          {guide.generated === "questions" && <QuestionsByTrack />}
          <aside className="guide-cta">
            <h2>Practice instead of just reading</h2>
            <p>Design a real system on an architecture canvas, defend your choices to an AI interviewer, and get a rubric-based review. Free to start.</p>
            <div className="hero-ctas">
              <Link className="btn btn-primary btn-lg" to="/system-design/url-shortener">Start a free round <ArrowRight size={16} className="nudge" /></Link>
              <Link className="btn btn-ghost btn-lg" to="/library">Browse all designs</Link>
            </div>
          </aside>
        </article>
        <nav className="guide-more" aria-label="More guides">
          <h2>More guides</h2>
          <ul>{others.map((item) => <li key={item.slug}><Link to={item.path}>{item.title}</Link><p>{item.description}</p></li>)}</ul>
        </nav>
      </div>
      <SiteFooter />
    </main>
  );
}

function Block({ block }) {
  switch (block.type) {
    case "h2": return <h2>{block.text}</h2>;
    case "h3": return <h3>{block.text}</h3>;
    case "p": return <p><Rich text={block.text} /></p>;
    case "ul": return <ul>{block.items.map((item) => <li key={item}><Rich text={item} /></li>)}</ul>;
    case "ol": return <ol>{block.items.map((item) => <li key={item}><Rich text={item} /></li>)}</ol>;
    case "callout": return <p className="callout"><Rich text={block.text} /></p>;
    case "table": return (
      <div className="table-wrap">
        <table>
          <thead><tr>{block.head.map((cell) => <th key={cell} scope="col">{cell}</th>)}</tr></thead>
          <tbody>{block.rows.map((row) => <tr key={row[0]}>{row.map((cell, index) => <td key={index}><Rich text={cell} /></td>)}</tr>)}</tbody>
        </table>
      </div>
    );
    case "rounds": return (
      <ul className="round-links">
        {block.ids.map((id) => prompts.find((prompt) => prompt.id === id)).filter(Boolean).map((prompt) => (
          <li key={prompt.id}><Link to={roundPath(prompt.id)}>{prompt.title}</Link><span>{getTrack(prompt.track).shortLabel} · {prompt.difficulty} · {prompt.minutes} min</span></li>
        ))}
      </ul>
    );
    default: return null;
  }
}

// The interview-questions guide: every round, grouped by discipline, then level.
function QuestionsByTrack() {
  return tracks.map((track) => {
    const rounds = prompts.filter((prompt) => prompt.track === track.id)
      .sort((a, b) => LEVEL_ORDER.indexOf(a.difficulty) - LEVEL_ORDER.indexOf(b.difficulty));
    return (
      <section key={track.id}>
        <h2>{TRACK_SEO[track.id].h1}</h2>
        <p>{TRACK_SEO[track.id].intro[0]} <Link to={trackPath(track.id)}>Practice all {track.shortLabel} rounds</Link>.</p>
        <ol className="question-list">
          {rounds.map((prompt) => (
            <li key={prompt.id}>
              <h3><Link to={roundPath(prompt.id)}>{prompt.title}</Link></h3>
              <p>{prompt.description} <strong>Tests:</strong> {prompt.considerations.join(", ").toLowerCase()}.</p>
              <span className="question-facts"><LevelMeter level={prompt.difficulty} /> <span><Clock3 size={13} /> {prompt.minutes} min</span>{prompt.access === "free" ? <span className="badge badge-free">Free</span> : <span className="badge badge-plus">Plus</span>}</span>
            </li>
          ))}
        </ol>
      </section>
    );
  });
}
