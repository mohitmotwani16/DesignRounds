import { useEffect, useState } from "react";
import { Check, RotateCcw } from "lucide-react";
import { getTrack, prompts } from "../data/prompts.js";
import { Link } from "../router.js";
import { roundPath } from "../seo.js";
import { topicMeta, topicPath } from "./catalog.js";
import { roadmapById, roadmapSlugs } from "./roadmaps.js";

// Which topics this reader has marked as read. Kept in the browser only: it's a personal
// convenience, so a private window or blocked storage simply starts empty.
const STORAGE_KEY = "designrounds:learn-read";

function readProgress() {
  try {
    const value = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "[]");
    return new Set(Array.isArray(value) ? value : []);
  } catch {
    return new Set();
  }
}

function writeProgress(set) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify([...set]));
  } catch {
    // Storage unavailable: progress lasts for this page view only.
  }
}

// "Design a URL shortener" → "URL shortener", for compact practice chips.
function shortRoundTitle(title) {
  const rest = title.replace(/^Design (a |an )?/i, "");
  return rest.charAt(0).toUpperCase() + rest.slice(1);
}

// A learning roadmap: numbered stages along a spine, each with its topics (links to the
// handbook) and the practice rounds that test them. Prerendered without progress, so
// the server and first client render match; saved progress appears after mount.
export function Roadmap({ id }) {
  const roadmap = roadmapById(id);
  const [read, setRead] = useState(() => new Set());
  useEffect(() => { setRead(readProgress()); }, []);
  if (!roadmap) return null;

  const all = roadmapSlugs(roadmap);
  const done = all.filter((slug) => read.has(slug)).length;
  const toggle = (slug) => setRead((previous) => {
    const next = new Set(previous);
    if (next.has(slug)) next.delete(slug); else next.add(slug);
    writeProgress(next);
    return next;
  });
  const reset = () => setRead((previous) => {
    const next = new Set([...previous].filter((slug) => !all.includes(slug)));
    writeProgress(next);
    return next;
  });

  return (
    <section className="rm" aria-label={`${roadmap.title} roadmap`}>
      <div className="rm-head">
        <div className="rm-progress">
          <span><strong>{done}</strong> of {all.length} topics read</span>
          <span className="rm-bar" aria-hidden="true"><span style={{ width: `${all.length ? (done / all.length) * 100 : 0}%` }} /></span>
        </div>
        <div className="rm-legend" aria-hidden="true">
          <span className="rm-key rm-key-core">Core</span>
          <span className="rm-key rm-key-optional">Good to know</span>
        </div>
        {done > 0 && <button type="button" className="rm-reset" onClick={reset}><RotateCcw size={13} /> Reset</button>}
      </div>
      <ol className="rm-stages">
        {roadmap.stages.map((entry, index) => (
          <li key={entry.title} className="rm-stage">
            <span className="rm-marker" aria-hidden="true">{index + 1}</span>
            <div className="rm-stage-body">
              <h3><span className="rm-step">Step {index + 1}</span>{entry.title}</h3>
              <p>{entry.blurb}</p>
              <ul className="rm-nodes">
                {entry.topics.map(({ slug, optional }) => {
                  const meta = topicMeta(slug);
                  if (!meta) return null;
                  const isRead = read.has(slug);
                  return (
                    <li key={slug} className={`rm-node${optional ? " rm-optional" : ""}${isRead ? " rm-read" : ""}`}>
                      <Link to={topicPath(slug)}>
                        <strong>{meta.short}</strong>
                        <span>{optional ? "Good to know" : meta.level}</span>
                      </Link>
                      <button type="button" className="rm-check" aria-pressed={isRead} aria-label={`Mark ${meta.short} as ${isRead ? "unread" : "read"}`} onClick={() => toggle(slug)}>
                        <Check size={13} />
                      </button>
                    </li>
                  );
                })}
              </ul>
              {entry.rounds.length > 0 && (
                <p className="rm-practice">
                  <span>Practice:</span>
                  {entry.rounds.map((roundId) => prompts.find((prompt) => prompt.id === roundId)).filter(Boolean).map((prompt) => (
                    <Link key={prompt.id} to={roundPath(prompt.id)}>{shortRoundTitle(prompt.title)}<small>{getTrack(prompt.track).shortLabel} · {prompt.difficulty}{prompt.access === "free" ? " · Free" : ""}</small></Link>
                  ))}
                </p>
              )}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
