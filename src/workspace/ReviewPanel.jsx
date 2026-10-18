import { useCallback, useEffect, useRef, useState } from "react";
import { AlertTriangle, Brain, ChevronDown, CircleCheck, Flag, HelpCircle, LoaderCircle, LockKeyhole, MessageSquareText, RefreshCw, Sparkles, Target } from "lucide-react";
import { api } from "../api.js";
import { useAuth } from "../auth.jsx";

const POLL_MS = 4000;
const POLL_LIMIT_MS = 6 * 60_000;

function plural(count, word) {
  return `${count} ${word}${count === 1 ? "" : "s"}`;
}

function allowanceText(allowance) {
  if (!allowance) return "";
  const plan = allowance.plan === "plus" ? "Plus" : "Free plan";
  const monthLeft = Math.max(0, allowance.month.limit - allowance.month.used);
  return `${plan}: ${allowance.round.used} of ${plural(allowance.round.limit, "review")} used for this round · ${monthLeft} left this month`;
}

// Final AI review of a finished round: request (with a visible credit cost), progress,
// and the result. What the server returns already reflects the learner's plan.
export function ReviewPanel({ sessionId, roundFinished, onFocusNode, labelFor }) {
  const [data, setData] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [requestError, setRequestError] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const pendingRequest = useRef(null);
  const plan = useAuth().user?.plan;

  const load = useCallback(async () => {
    try {
      const result = await api.listReviews(sessionId);
      setData(result);
      setLoadError(null);
      return result;
    } catch (error) {
      setLoadError(error);
      return null;
    }
  }, [sessionId]);

  // Reloads when the plan changes, since the server shapes reviews per plan.
  useEffect(() => { load(); }, [load, roundFinished, plan]);

  // A pending review (e.g. started before a refresh) is polled until it settles.
  const hasPending = data?.reviews.some((review) => review.status === "pending");
  useEffect(() => {
    if (!hasPending || busy) return undefined;
    const started = Date.now();
    const timer = window.setInterval(async () => {
      const result = await load();
      if (!result?.reviews.some((review) => review.status === "pending") || Date.now() - started > POLL_LIMIT_MS) window.clearInterval(timer);
    }, POLL_MS);
    return () => window.clearInterval(timer);
  }, [hasPending, busy, load]);

  async function requestReview() {
    setBusy(true);
    setRequestError(null);
    // The same id is reused if the request is retried, so it can never be charged twice.
    pendingRequest.current ??= crypto.randomUUID();
    try {
      const result = await api.requestReview(sessionId, pendingRequest.current);
      pendingRequest.current = null;
      setSelectedId(result.review.id);
      await load();
    } catch (error) {
      if (error.status === 0) {
        setRequestError({ message: "Connection lost while generating. We'll show the review here as soon as it's ready.", retry: true });
      } else {
        pendingRequest.current = null;
        setRequestError({ message: error.message, retry: error.status >= 500 });
      }
      await load();
    } finally {
      setBusy(false);
    }
  }

  if (loadError && !data) {
    return <div className="review-body"><div className="review-card review-error"><AlertTriangle size={16} /><p>{loadError.message}</p><button className="button button-outline button-small" onClick={load}>Try again</button></div></div>;
  }
  if (!data) return <div className="review-body review-loading"><LoaderCircle size={18} className="spin" /></div>;

  const succeeded = data.reviews.filter((review) => review.status === "succeeded");
  const current = succeeded.find((review) => review.id === selectedId) || succeeded[0];
  const generating = busy || hasPending;
  const { allowance } = data;
  const canRequest = roundFinished && data.aiAvailable && allowance.remaining > 0 && !generating;

  return (
    <div className="review-body">
      {!roundFinished && (
        <div className="review-card review-intro">
          <span className="review-kicker"><Target size={13} /> FINAL REVIEW</span>
          <h3>Finish the round to get your review.</h3>
          <p>You'll get a score across six rubric dimensions, with feedback tied to the components and notes in your design. Explain your choices in each component's “Why this choice?” note: reasoning counts.</p>
          <small>{allowanceText(allowance)}</small>
        </div>
      )}

      {roundFinished && !current && !generating && (
        <div className="review-card review-intro">
          <span className="review-kicker"><Sparkles size={13} /> READY FOR REVIEW</span>
          <h3>Get feedback on your design.</h3>
          <p>{allowance.plan === "plus"
            ? "Your review includes scores, evidence, and specific improvements for every dimension."
            : "Your free review includes your overall score, every dimension's score, and your top strength and risk. Plus adds detailed evidence, improvements, and follow-up questions."}</p>
          <ReviewButton canRequest={canRequest} onClick={requestReview} label="Get my review" allowance={allowance} aiAvailable={data.aiAvailable} />
        </div>
      )}

      {generating && (
        <div className="review-card review-progress" role="status">
          <LoaderCircle size={18} className="spin" />
          <div><strong>Reviewing your design…</strong><p>This usually takes 20–60 seconds. You can keep this tab open or come back later.</p></div>
        </div>
      )}

      {requestError && !generating && (
        <div className="review-card review-error" role="alert">
          <AlertTriangle size={16} />
          <p>{requestError.message}</p>
          {requestError.retry && <button className="button button-outline button-small" onClick={requestReview}><RefreshCw size={13} /> Try again</button>}
        </div>
      )}

      {current && (
        <>
          {succeeded.length > 1 && (
            <label className="review-history">
              <span>Review</span>
              <select value={current.id} onChange={(event) => setSelectedId(event.target.value)}>
                {succeeded.map((review, index) => (
                  <option key={review.id} value={review.id}>#{succeeded.length - index} · {new Date(review.completedAt).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</option>
                ))}
              </select>
            </label>
          )}
          <ReviewResult review={current} onFocusNode={onFocusNode} labelFor={labelFor} />
          {roundFinished && !generating && allowance.remaining > 0 && (
            <div className="review-again">
              <p>Changed your design since this review? Reopen the round, improve it, finish again, then ask for a new review.</p>
              <ReviewButton canRequest={canRequest} onClick={requestReview} label="Review my latest design" allowance={allowance} aiAvailable={data.aiAvailable} outline />
            </div>
          )}
        </>
      )}

      {roundFinished && data.interview && !data.interview.rated && <RealismRating sessionId={sessionId} onRated={load} />}

      {roundFinished && data.debrief && <Debrief debrief={data.debrief} />}

      {(roundFinished || succeeded.length > 0) && <p className="review-allowance">{allowanceText(allowance)}</p>}
    </div>
  );
}

// One question after the round, to know whether the interviewer felt real.
const REALISM = ["Not at all", "Slightly", "Somewhat", "Mostly", "Very"];

function RealismRating({ sessionId, onRated }) {
  const [realism, setRealism] = useState(0);
  const [comment, setComment] = useState("");
  const [state, setState] = useState("idle");
  async function submit() {
    setState("saving");
    try {
      await api.rateInterview(sessionId, { realism, ...(comment.trim() ? { comment: comment.trim() } : {}) });
      setState("done");
      onRated();
    } catch {
      setState("error");
    }
  }
  if (state === "done") return <div className="review-card realism-card"><p><CircleCheck size={14} /> Thanks, that helps us make the interviewer better.</p></div>;
  return (
    <div className="review-card realism-card">
      <span className="review-kicker"><MessageSquareText size={13} /> ONE QUESTION</span>
      <h3>How much did this feel like a real interview?</h3>
      <div className="realism-scale" role="radiogroup" aria-label="Realism">
        {REALISM.map((label, index) => (
          <button key={label} role="radio" aria-checked={realism === index + 1} className={realism === index + 1 ? "active" : ""} onClick={() => setRealism(index + 1)}>
            <strong>{index + 1}</strong><span>{label}</span>
          </button>
        ))}
      </div>
      {realism > 0 && (
        <>
          <textarea rows={2} maxLength={1000} placeholder="Anything that felt off, or great? (optional)" value={comment} onChange={(event) => setComment(event.target.value)} />
          <button className="button button-dark button-small" disabled={state === "saving"} onClick={submit}>{state === "saving" ? <LoaderCircle size={13} className="spin" /> : null} Send</button>
          {state === "error" && <p className="realism-error">Couldn't send that. Try again.</p>}
        </>
      )}
    </div>
  );
}

const DEBRIEF_STATUS = {
  answered: ["Covered", "good"],
  partial: ["Partly covered", "partial"],
  missed: ["Missed", "missed"],
  skipped: ["Skipped", "missed"],
  not_reached: ["Not reached in time", "unreached"],
  pending: ["Not covered", "unreached"],
  open: ["In progress at the end", "partial"],
};

// What each part of the interview got, after the round: quotes the interviewer noted,
// what a strong answer adds, and where to read up.
function Debrief({ debrief }) {
  const [open, setOpen] = useState(null);
  const areas = [...new Set(debrief.items.map((item) => item.area))];
  const covered = debrief.items.filter((item) => item.status === "answered").length;
  return (
    <section className="review-card debrief" aria-label="Interview debrief">
      <span className="review-kicker"><Brain size={13} /> INTERVIEW DEBRIEF</span>
      <h3>What the interviewer was looking for</h3>
      <p className="debrief-lede">You covered {covered} of {debrief.items.length} topics. Open a topic to see what you said and what a strong answer adds.</p>
      {areas.map((area) => (
        <div key={area} className="debrief-area">
          <h4>{area}</h4>
          <ul>
            {debrief.items.filter((item) => item.area === area).map((item) => {
              const [label, tone] = DEBRIEF_STATUS[item.status] ?? ["", ""];
              const expanded = open === item.id;
              return (
                <li key={item.id} className={`debrief-item ${tone}`}>
                  <button aria-expanded={expanded} onClick={() => setOpen(expanded ? null : item.id)}>
                    <span className="debrief-topic">{item.topic}</span>
                    <span className={`debrief-status ${tone}`}>{label}{item.band ? ` · ${item.band}` : ""}</span>
                    <ChevronDown size={14} className={expanded ? "open" : ""} />
                  </button>
                  {expanded && (
                    <div className="debrief-detail">
                      {item.quotes.length > 0 && (
                        <div><strong>You said</strong>{item.quotes.map((quote) => <blockquote key={quote}>“{quote}”</blockquote>)}</div>
                      )}
                      {item.strongAnswer && <div><strong>What a strong answer adds</strong><p>{item.strongAnswer}</p></div>}
                      {item.learn.length > 0 && (
                        <div className="debrief-learn"><strong>Read up</strong>{item.learn.map((topic) => <a key={topic.slug} href={`/learn/${topic.slug}`} target="_blank" rel="noopener">{topic.title}</a>)}</div>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </section>
  );
}

function ReviewButton({ canRequest, onClick, label, allowance, aiAvailable, outline = false }) {
  let note = `Uses 1 of your ${plural(allowance.round.limit, "review")} for this round. If generation fails, it's not counted.`;
  if (!aiAvailable) note = "AI reviews are unavailable right now.";
  else if (allowance.round.used >= allowance.round.limit) note = "You've used this round's reviews.";
  else if (allowance.month.used >= allowance.month.limit) note = `You've used this month's reviews. They reset on ${new Date(allowance.month.resetsAt).toLocaleDateString(undefined, { month: "long", day: "numeric" })}.`;
  return (
    <div className="review-request">
      <button className={`button ${outline ? "button-outline" : "button-dark"} button-small`} disabled={!canRequest} onClick={onClick}><Sparkles size={14} /> {label}</button>
      <small>{note}</small>
    </div>
  );
}

function NodeChips({ ids, onFocusNode, labelFor }) {
  if (!ids?.length) return null;
  return (
    <div className="review-node-chips">
      {ids.map((id) => <button key={id} onClick={() => onFocusNode(id)} title="Show on canvas">{labelFor(id)}</button>)}
    </div>
  );
}

function ReviewResult({ review, onFocusNode, labelFor }) {
  const full = review.access === "full";
  const [open, setOpen] = useState(null);
  const locked = review.locked;
  return (
    <article className="review-result" aria-label="Design review">
      {review.sample && <div className="review-sample">Sample review: no AI provider is configured on this server.</div>}

      <header className={`review-score rating-${review.overall.rating}`}>
        <div className="review-score-number"><strong>{review.overall.score}</strong><span>/100</span></div>
        <div>
          <span className="review-rating-pill">{review.overall.ratingLabel}</span>
          <p>{review.summary}</p>
        </div>
      </header>

      <section className="review-section">
        <h4>Rubric</h4>
        <ul className="review-dimensions">
          {review.dimensions.map((dimension) => {
            const expanded = open === dimension.id;
            return (
              <li key={dimension.id} className={`rating-${dimension.rating}`}>
                <button className="review-dimension-row" aria-expanded={full ? expanded : undefined} disabled={!full} onClick={() => setOpen(expanded ? null : dimension.id)}>
                  <span className="review-dimension-name">{dimension.name}</span>
                  <span className="review-dimension-score">{dimension.score}/10</span>
                  {full && <ChevronDown size={14} className={expanded ? "rotated" : ""} />}
                  <span className="review-bar"><span style={{ width: `${dimension.score * 10}%` }} /></span>
                </button>
                {full && expanded && (
                  <div className="review-dimension-detail">
                    <ul>{dimension.evidence.map((item) => <li key={item}>{item}</li>)}</ul>
                    <p><strong>Improve:</strong> {dimension.improvement}</p>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
        {!full && <p className="review-locked-line"><LockKeyhole size={12} /> Evidence and an improvement for each dimension are part of Plus.</p>}
      </section>

      {review.reasoning && <ReasoningSection reasoning={review.reasoning} full={full} lockedCount={locked?.decisions} onFocusNode={onFocusNode} labelFor={labelFor} />}

      {review.communication && <CommunicationSection communication={review.communication} />}

      <section className="review-section">
        <h4><CircleCheck size={14} /> {full ? "Strengths" : "Top strength"}</h4>
        {review.strengths.map((strength) => (
          <div key={strength.point} className="review-point">
            <strong>{strength.point}</strong>
            <p>{strength.detail}</p>
            <NodeChips ids={strength.nodeIds} onFocusNode={onFocusNode} labelFor={labelFor} />
          </div>
        ))}
      </section>

      {review.risks.length > 0 && (
        <section className="review-section">
          <h4><Flag size={14} /> {full ? "Risks and gaps" : "Top risk"}</h4>
          {review.risks.map((risk) => (
            <div key={risk.point} className="review-point">
              <span className={`review-severity severity-${risk.severity}`}>{risk.severity}</span>
              <strong>{risk.point}</strong>
              <p>{risk.whyItMatters}</p>
              <NodeChips ids={risk.nodeIds} onFocusNode={onFocusNode} labelFor={labelFor} />
            </div>
          ))}
        </section>
      )}

      {full && (
        <>
          <section className="review-section">
            <h4><Target size={14} /> Next steps</h4>
            <ol className="review-list">{review.nextSteps.map((step) => <li key={step}>{step}</li>)}</ol>
          </section>
          <section className="review-section">
            <h4><HelpCircle size={14} /> Questions to think about</h4>
            <ul className="review-list">{review.followUpQuestions.map((question) => <li key={question}>{question}</li>)}</ul>
          </section>
          {review.assumptions.length > 0 && (
            <section className="review-section review-assumptions">
              <h4>Assumptions the reviewer made</h4>
              <ul className="review-list">{review.assumptions.map((item) => <li key={item}>{item}</li>)}</ul>
            </section>
          )}
        </>
      )}

      {!full && locked && (
        <div className="review-card review-upsell">
          <span className="review-kicker"><LockKeyhole size={12} /> INCLUDED WITH PLUS</span>
          <ul>
            {locked.decisions > 0 && <li>Analysis of your {plural(locked.decisions, "key decision")}: justified, needed, right-sized</li>}
            {locked.risks > 0 && <li>{plural(locked.risks, "more risk")} with why each matters</li>}
            {locked.strengths > 0 && <li>{plural(locked.strengths, "more strength")}</li>}
            {locked.nextSteps > 0 && <li>{plural(locked.nextSteps, "prioritised next step")}</li>}
            {locked.followUpQuestions > 0 && <li>{plural(locked.followUpQuestions, "interviewer follow-up question")}</li>}
            <li>Evidence and an improvement for every dimension</li>
          </ul>
          <small>Your scores are the same on every plan. Plus adds the detailed coaching.</small>
        </div>
      )}

      <p className="review-disclaimer">AI-generated feedback. It can be wrong, so check important technical claims.</p>
    </article>
  );
}

const decisionLabels = {
  explanation: { "well-justified": "Well justified", "partly-justified": "Partly justified", unexplained: "Not explained", incorrect: "Reasoning incorrect" },
  necessity: { essential: "Essential", helpful: "Helpful", premature: "Premature", unnecessary: "Not needed" },
  sizing: { "right-sized": "Right-sized", "over-engineered": "Over-engineered", "under-engineered": "Under-engineered" },
};
const goodValues = new Set(["well-justified", "essential", "helpful", "right-sized"]);
const badValues = new Set(["unexplained", "incorrect", "unnecessary", "over-engineered", "under-engineered"]);
const tone = (value) => (goodValues.has(value) ? "good" : badValues.has(value) ? "bad" : "mixed");

function coverageText(coverage) {
  const parts = [`You explained ${coverage.explainedComponents} of ${plural(coverage.components, "component")}`];
  if (coverage.decisionNotes) parts.push(plural(coverage.decisionNotes, "decision note"));
  if (coverage.connections) parts.push(`${coverage.labelledConnections} of ${plural(coverage.connections, "connection")} labelled`);
  return parts.join(" · ");
}

// How well the learner explained and justified their choices. The coverage counts are
// shown on every plan; the decision-by-decision analysis is part of Plus.
function ReasoningSection({ reasoning, full, lockedCount, onFocusNode, labelFor }) {
  const [open, setOpen] = useState(null);
  return (
    <section className="review-section">
      <h4><Brain size={14} /> Your reasoning</h4>
      <p className="review-coverage">{coverageText(reasoning.coverage)}</p>
      {full ? (
        <>
          <p className="review-reasoning-summary">{reasoning.summary}</p>
          <ul className="review-decisions">
            {reasoning.decisions.map((decision, index) => {
              const expanded = open === index;
              return (
                <li key={decision.choice + index}>
                  <button className="review-decision-row" aria-expanded={expanded} onClick={() => setOpen(expanded ? null : index)}>
                    <strong>{decision.choice}</strong>
                    <ChevronDown size={14} className={expanded ? "rotated" : ""} />
                    <span className="review-decision-tags">
                      {["explanation", "necessity", "sizing"].map((key) => (
                        <span key={key} className={`review-tag tag-${tone(decision[key])}`}>{decisionLabels[key][decision[key]]}</span>
                      ))}
                    </span>
                  </button>
                  {expanded && (
                    <div className="review-decision-detail">
                      <p>{decision.assessment}</p>
                      <p><strong>Alternatives:</strong> {decision.alternatives}</p>
                      <p className="review-probe"><strong>An interviewer would ask:</strong> {decision.probe}</p>
                      <NodeChips ids={decision.nodeIds} onFocusNode={onFocusNode} labelFor={labelFor} />
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </>
      ) : (
        <p className="review-locked-line"><LockKeyhole size={12} /> Plus analyses {lockedCount ? `each of your ${plural(lockedCount, "key decision")}` : "your key decisions"}: whether it was justified, actually needed, and right-sized for the problem, with the questions an interviewer would ask.</p>
      )}
    </section>
  );
}

const COMMUNICATION_RATINGS = {
  strong: ["strong", "Strong communicator"],
  solid: ["solid", "Clear"],
  developing: ["developing", "Getting there"],
  needs_work: ["missing", "Needs work"],
};

const ISSUE_LABELS = {
  hedging: "Hedging",
  gave_up: "Giving up too early",
  over_explaining: "Over-explaining",
  under_explaining: "Under-explaining",
  unclear: "Unclear ideas",
  rambling: "Rambling",
  off_topic: "Off the question",
  filler_words: "Filler words",
  pace: "Pace",
  pauses: "Long pauses",
};

function paceLabel(wordsPerMinute) {
  if (!wordsPerMinute) return null;
  if (wordsPerMinute < 100) return `${wordsPerMinute} words/min (slow)`;
  if (wordsPerMinute > 180) return `${wordsPerMinute} words/min (fast)`;
  return `${wordsPerMinute} words/min`;
}

// How the learner explained themselves in the interview, judged separately from the
// design. Delivery numbers (pace, fillers, pauses) come from spoken answers only.
function CommunicationSection({ communication }) {
  const [ratingClass, ratingLabel] = COMMUNICATION_RATINGS[communication.rating] || COMMUNICATION_RATINGS.solid;
  const stats = communication.stats || {};
  const facts = [
    stats.spokenAnswers ? `${plural(stats.spokenAnswers, "spoken answer")}` : null,
    stats.typedAnswers ? `${plural(stats.typedAnswers, "typed answer")}` : null,
    stats.spokenAnswers ? paceLabel(stats.wordsPerMinute) : null,
    stats.spokenAnswers && stats.hesitationsPerMinute != null ? `${stats.hesitationsPerMinute} um/uh per min` : null,
    stats.spokenAnswers && stats.longPauses ? plural(stats.longPauses, "long pause") : null,
  ].filter(Boolean);
  return (
    <section className="review-section review-communication">
      <h4><MessageSquareText size={14} /> Communication</h4>
      <div className={`review-communication-head rating-${ratingClass}`}>
        <span className="review-rating-pill">{ratingLabel}</span>
        {facts.length > 0 && <span className="review-communication-facts">{facts.join(" · ")}</span>}
      </div>
      <p className="review-reasoning-summary">{communication.summary}</p>
      {communication.strengths.map((strength) => (
        <div key={strength.point} className="review-point">
          <strong><CircleCheck size={13} className="review-communication-icon good" /> {strength.point}</strong>
          {strength.example && <p className="review-quote">“{strength.example}”</p>}
        </div>
      ))}
      {communication.workOn.map((item) => (
        <div key={item.point} className="review-point">
          <span className="review-severity severity-medium">{ISSUE_LABELS[item.issue] || "Work on"}</span>
          <strong>{item.point}</strong>
          {item.example && <p className="review-quote">“{item.example}”</p>}
          <p><strong>Try:</strong> {item.tip}</p>
        </div>
      ))}
      {!stats.spokenAnswers && <p className="review-locked-line">Answer out loud with the mic next time to get feedback on pace, filler words and pauses too.</p>}
    </section>
  );
}
