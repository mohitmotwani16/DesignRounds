import { useEffect, useRef, useState } from "react";
import { ArrowRight, ArrowUp, BookOpen, Database, Layers2, ListOrdered, MessageCircle, MonitorSmartphone, Network, Server, Sparkles, Workflow, Zap } from "lucide-react";
import { prompts, tracks } from "../data/prompts.js";
import { RUBRIC, aiLimits } from "../data/plans.js";
import { FAQS } from "../data/faqs.js";
import { SiteFooter, useReveal } from "../components/site.jsx";
import { StartRoundButton } from "../components/StartRound.jsx";
import { Link, useRoute } from "../router.js";
import { LEARN_PATH, topicPath } from "../learn/catalog.js";
import { roundPath, trackPath } from "../seo.js";

// The page's one motif is the round's clock: every DesignRounds round is timed, so a
// circle (the dial) times the demo, rounds every button and marks every question.

const shortTitle = (title) => title.replace(/^Design (a |an )?/i, "").replace(/^./, (char) => char.toUpperCase());

export default function LandingPage({ onStart }) {
  const ref = useRef(null);
  useReveal(ref);

  // "/#pricing" links to a section: a fresh page load jumps there, an in-page click
  // scrolls smoothly. Waits a tick so the page has laid out.
  const { hash } = useRoute();
  const firstScroll = useRef(true);
  useEffect(() => {
    const section = hash;
    if (!section) return undefined;
    const behavior = firstScroll.current ? "auto" : "smooth";
    firstScroll.current = false;
    const timer = window.setTimeout(() => document.getElementById(section)?.scrollIntoView({ behavior, block: "start" }), 60);
    return () => window.clearTimeout(timer);
  }, [hash]);

  return (
    <main className="landing lp dot-ground" ref={ref}>
      <Hero onStart={onStart} />
      <RoundStages />
      <RoleRounds />
      <Rubric />
      <Pricing onStart={onStart} />
      <Faq />
      <Close onStart={onStart} />
      <SiteFooter />
    </main>
  );
}

// ------------------------------------------------------------------ hero

function Hero({ onStart }) {
  return (
    <section className="lp-hero" aria-labelledby="lp-title">
      <div className="lp-hero-copy wrap">
        <h1 id="lp-title" className="rise" style={{ "--d": 0 }}>Mock system design interviews with AI</h1>
        <div className="lp-hero-text">
          <p className="lp-hero-sub rise" style={{ "--d": 1 }}>Design real interview questions on a canvas while an AI interviewer asks why. Every round ends with a scored review that shows exactly what to fix.</p>
          <div className="lp-hero-actions rise" style={{ "--d": 2 }}>
            <StartRoundButton onStart={onStart} className="btn lp-btn" />
            <Link className="lp-text-link" to="/library">Browse the questions</Link>
          </div>
          <p className="lp-hero-facts rise" style={{ "--d": 3 }}>Free to start. No card. Sign in with your email.</p>
        </div>
        <QuestionStack />
      </div>
      <div className="wrap lp-demo-wrap rise" style={{ "--d": 4 }}>
        <Demo />
      </div>
    </section>
  );
}

// The problem the page solves, in its own words: an open question, a scale to meet and
// the follow-up that comes once you've answered. Every card is rendered in the same
// grid cell, so the stack is always as tall as its tallest card and never jumps; the
// current card settles in while the previous one lifts away. Hovering or focusing the
// stack holds the current card, and the dots pick any of them. Readers who ask for less
// motion get the first card, still.
const QUESTIONS = [
  { id: "chat-system", ask: "Design a chat app", needs: ["Billions of users", "Messages in order", "Works offline"], then: "A user is offline for a week. How do their messages arrive, and in what order?" },
  { id: "url-shortener", ask: "Design a URL shortener", needs: ["100M new links a day", "Redirects in 50 ms"], then: "One link goes viral and its cache key expires. What happens to your database?" },
  { id: "ride-hailing", ask: "Design a ride-hailing service", needs: ["Driver locations every 4 s", "A match in seconds"], then: "How do you find the nearest drivers without scanning all of them?" },
  { id: "ticket-booking", ask: "Design a ticketing platform", needs: ["A million fans at 10 am", "No seat sold twice"], then: "Two fans tap the same seat in the same millisecond. Who gets it?" },
  { id: "video-streaming", ask: "Design video streaming", needs: ["A global audience", "Quality that adapts"], then: "A new episode drops at 9 pm everywhere. Where does all that traffic land?" },
  { id: "rate-limiter", ask: "Design an API rate limiter", needs: ["Per user and per key", "Shared by every server"], then: "Two servers see the same user at once. How do they agree on the count?" },
];
const DEAL_MS = 5500;

function QuestionStack() {
  const [index, setIndex] = useState(0);
  const [previous, setPrevious] = useState(null);
  const [held, setHeld] = useState(false);
  const [still, setStill] = useState(false);
  const show = (next) => {
    if (next === index) return;
    setPrevious(index);
    setIndex(next);
  };
  useEffect(() => { setStill(Boolean(window.matchMedia?.("(prefers-reduced-motion: reduce)").matches)); }, []);
  useEffect(() => {
    if (held || still) return undefined;
    const timer = window.setTimeout(() => show((index + 1) % QUESTIONS.length), DEAL_MS);
    return () => window.clearTimeout(timer);
  }, [index, held, still]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="lp-qstack rise" style={{ "--d": 2 }} onMouseEnter={() => setHeld(true)} onMouseLeave={() => setHeld(false)} onFocus={() => setHeld(true)} onBlur={() => setHeld(false)}>
      <span className="lp-qstack-back lp-qstack-back-2" aria-hidden="true" />
      <span className="lp-qstack-back lp-qstack-back-1" aria-hidden="true" />
      <div className="lp-qdeck">
        {QUESTIONS.map((question, position) => {
          const active = position === index;
          const state = active ? "is-active" : position === previous ? "is-leaving" : "";
          return (
            <article key={question.id} className={`lp-qcard-front ${state}`} aria-hidden={!active} aria-label={active ? "An example system design interview question" : undefined}>
              <p className="lp-qf-ask"><span className="lp-qf-live" aria-hidden="true" />{question.ask}</p>
              <ul className="lp-qf-needs">
                {question.needs.map((need, order) => <li key={need} style={{ "--k": order }}>{need}</li>)}
              </ul>
              <div className="lp-qf-then">
                <span className="lp-qf-typing" aria-hidden="true"><i /><i /><i /></span>
                <p><b>Then</b>{question.then}</p>
              </div>
              <Link className="lp-qf-go" to={roundPath(question.id)} tabIndex={active ? undefined : -1}>Practise this question <ArrowRight size={15} /></Link>
            </article>
          );
        })}
      </div>
      <div className="lp-qstack-dots" role="group" aria-label="Example questions">
        {QUESTIONS.map((item, position) => (
          <button key={item.id} type="button" aria-label={item.ask} aria-pressed={position === index} onClick={() => show(position)} />
        ))}
      </div>
    </div>
  );
}

// The round clock: counts down from part-way through a 45-minute round and starts
// again. It holds still for readers who ask for less motion.
const ROUND_SECONDS = 45 * 60;
const START_LEFT = 23 * 60 + 41;

function useRoundClock() {
  const [left, setLeft] = useState(START_LEFT);
  useEffect(() => {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return undefined;
    const timer = window.setInterval(() => setLeft((value) => (value > 0 ? value - 1 : START_LEFT)), 1000);
    return () => window.clearInterval(timer);
  }, []);
  return { text: `${String(Math.floor(left / 60)).padStart(2, "0")}:${String(left % 60).padStart(2, "0")}`, used: 1 - left / ROUND_SECONDS };
}

// A URL shortener as a learner would draw it. Requests flow left to right as packets
// on the wires. Positions are in a 960×560 stage; the HTML nodes are placed by
// percentage, so they stay on the SVG wires at any width.
const at = (x, y) => ({ left: `${(x / 960) * 100}%`, top: `${(y / 560) * 100}%` });
const NODES = [
  { id: "users", x: 95, y: 280, label: "Users", sub: "web and mobile", Icon: MonitorSmartphone, tone: "slate" },
  { id: "gateway", x: 300, y: 280, label: "API gateway", sub: "rate limits", Icon: Network, tone: "violet" },
  { id: "service", x: 515, y: 280, label: "Link service", sub: "stateless", Icon: Server, tone: "blue", focus: true },
  { id: "cache", x: 790, y: 110, label: "Redis", sub: "cache-aside", Icon: Zap, tone: "rose" },
  { id: "db", x: 790, y: 280, label: "PostgreSQL", sub: "replicated", Icon: Database, tone: "teal" },
  { id: "queue", x: 515, y: 455, label: "Kafka", sub: "click events", Icon: ListOrdered, tone: "orange" },
  { id: "analytics", x: 790, y: 455, label: "Analytics", sub: "stream jobs", Icon: Workflow, tone: "green" },
];
// Nodes are about 170 units wide, so wires start and end 85 units from a node's centre.
const WIRES = [
  { d: "M 180 280 L 215 280", label: "HTTPS", lx: 197, ly: 258 },
  { d: "M 385 280 L 430 280", label: "/:code", lx: 407, ly: 258 },
  { d: "M 600 266 C 650 266 650 110 705 110", label: "GET", lx: 640, ly: 172 },
  { d: "M 600 280 L 705 280", label: "on miss", lx: 652, ly: 302 },
  { d: "M 515 306 L 515 428", label: "async", lx: 548, ly: 372, async: true },
  { d: "M 600 455 L 705 455", label: "stream", lx: 652, ly: 435 },
];

function Demo() {
  const clock = useRoundClock();
  const R = 15;
  const C = 2 * Math.PI * R;
  return (
    <div className="lp-demo" data-ui role="img" aria-label="A DesignRounds practice round: an AI interviewer asks about a URL shortener design drawn on the canvas, with requests flowing between components">
      <div className="lp-demo-bar" aria-hidden="true">
        <svg className="lp-dial" viewBox="0 0 36 36" width="30" height="30">
          <circle cx="18" cy="18" r={R} className="lp-dial-track" />
          <circle cx="18" cy="18" r={R} className="lp-dial-used" strokeDasharray={`${C * clock.used} ${C}`} transform="rotate(-90 18 18)" />
        </svg>
        <strong>Design a URL shortener</strong>
        <span className="lp-demo-time">{clock.text} left · deep dive</span>
        <span className="lp-demo-saved">Saved</span>
      </div>
      <div className="lp-demo-body" aria-hidden="true">
        <aside className="lp-demo-chat">
          <p className="lp-demo-chat-head"><Sparkles size={15} /> Interviewer <span>live</span></p>
          <div className="lp-demo-log">
            <div className="lp-msg lp-msg-ai" style={{ "--m": 0 }}><b>Interviewer</b>Walk me through a redirect. Where does the lookup go first?</div>
            <div className="lp-msg lp-msg-me" style={{ "--m": 1 }}><b>You</b>Redis first, cache-aside. On a miss I read a replica and backfill with a 24-hour TTL.</div>
            <div className="lp-typing" style={{ "--m": 2 }}><i /><i /><i /></div>
            <div className="lp-msg lp-msg-ai" style={{ "--m": 3 }}><b>Interviewer</b>A link goes viral and its key expires. What happens to your database?</div>
          </div>
          <div className="lp-demo-input">Explain your thinking… <span><ArrowUp size={14} /></span></div>
        </aside>
        <div className="lp-demo-canvas">
          <div className="lp-demo-stage">
            <svg className="lp-wires" viewBox="0 0 960 560">
              <defs>
                <marker id="lp-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 1 L9 5 L0 9 z" className="lp-arrow" /></marker>
              </defs>
              {WIRES.map((wire, index) => (
                <g key={wire.d}>
                  <path className={wire.async ? "lp-wire lp-wire-async" : "lp-wire"} d={wire.d} markerEnd="url(#lp-arrow)" style={{ "--w": index }} />
                  <text className="lp-wire-label" x={wire.lx} y={wire.ly} textAnchor="middle" style={{ "--w": index }}>{wire.label}</text>
                </g>
              ))}
              {WIRES.map((wire, index) => (
                <circle key={`packet-${wire.d}`} r="5" className="lp-packet">
                  <animateMotion dur={`${1.3 + (index % 3) * 0.3}s`} repeatCount="indefinite" begin={`${1.6 + index * 0.3}s`} path={wire.d} />
                </circle>
              ))}
            </svg>
            {NODES.map((node, index) => (
              <div key={node.id} className={`lp-node tone-${node.tone} ${node.focus ? "lp-node-focus" : ""}`} style={{ ...at(node.x, node.y), "--n": index }}>
                <i><node.Icon size={17} /></i>
                <span>{node.label}<small>{node.sub}</small></span>
              </div>
            ))}
            <div className="lp-note" style={at(250, 95)}><b>Why Redis?</b>Reads outnumber writes by about 100 to 1, so cache-aside keeps redirects fast.</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ how a round runs

// The interviewer's real stages, sized by how a 45-minute round is paced. When the bar
// comes into view a playhead runs through it, filling each stage in its share of time.
const STAGES = [
  { minutes: 7, label: "7 minutes", title: "Requirements", clause: "Pin down the users, the scale and what’s out of scope, asking as you would in the room.", tone: "teal" },
  { minutes: 13, label: "13 minutes", title: "High-level design", clause: "Sketch the design with real components and label every connection.", tone: "blue" },
  { minutes: 18, label: "18 minutes", title: "Deep dive", clause: "The interviewer asks why, and what breaks at ten times the traffic.", tone: "accent" },
  { minutes: 7, label: "7 minutes", title: "Wrap-up", clause: "Name the risks you’d fix with more time.", tone: "orange" },
  { minutes: 1, label: "After", title: "Review", clause: "A review scores your design on the rubric and says what to fix.", tone: "ink" },
];
const TOTAL_MINUTES = STAGES.reduce((total, stage) => total + stage.minutes, 0);

function RoundStages() {
  let elapsed = 0;
  return (
    <section className="lp-section wrap" id="how" aria-labelledby="lp-how-title">
      <h2 id="lp-how-title" className="lp-h2 reveal">One round, 45&nbsp;minutes</h2>
      <ol className="lp-bar reveal">
        {STAGES.map((stage) => {
          const start = elapsed / TOTAL_MINUTES;
          elapsed += stage.minutes;
          return (
            <li key={stage.title} className={`lp-seg lp-seg-${stage.tone}`} style={{ "--grow": stage.minutes, "--start": start, "--share": stage.minutes / TOTAL_MINUTES }}>
              <div className="lp-seg-fill">
                <span className="lp-seg-time">{stage.label}</span>
                <strong>{stage.title}</strong>
              </div>
              <p>{stage.clause}</p>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

// ------------------------------------------------------------------ rounds by role

const SHOWN = 8;

function RoleRounds() {
  const [active, setActive] = useState(tracks[0].id);
  const tabsRef = useRef(null);
  const onKeyDown = (event) => {
    const index = tracks.findIndex((track) => track.id === active);
    const keys = { ArrowRight: index + 1, ArrowLeft: index - 1, Home: 0, End: tracks.length - 1 };
    if (!(event.key in keys)) return;
    event.preventDefault();
    const next = tracks[(keys[event.key] + tracks.length) % tracks.length];
    setActive(next.id);
    tabsRef.current?.querySelector(`[data-track="${next.id}"]`)?.focus();
  };

  return (
    <section className="lp-section lp-roles wrap" id="questions" aria-labelledby="lp-roles-title">
      <h2 id="lp-roles-title" className="lp-h2 reveal">System design questions for your role</h2>
      <div className="lp-tabs reveal" role="tablist" aria-label="Disciplines" ref={tabsRef} onKeyDown={onKeyDown}>
        {tracks.map((track) => (
          <button
            key={track.id}
            type="button"
            role="tab"
            id={`lp-tab-${track.id}`}
            data-track={track.id}
            aria-selected={active === track.id}
            aria-controls={`lp-panel-${track.id}`}
            tabIndex={active === track.id ? 0 : -1}
            onClick={() => setActive(track.id)}
          >
            {track.shortLabel}
          </button>
        ))}
      </div>
      {tracks.map((track) => {
        const list = prompts.filter((prompt) => prompt.track === track.id);
        return (
          <div key={track.id} className="lp-panel" role="tabpanel" id={`lp-panel-${track.id}`} aria-labelledby={`lp-tab-${track.id}`} hidden={active !== track.id}>
            <p className="lp-panel-lede">{track.description}</p>
            <ul className="lp-qcards">
              {list.slice(0, SHOWN).map((prompt, index) => (
                <li key={prompt.id} className="lp-qcard" style={{ "--q": index }}>
                  <p className="lp-qcard-tags"><span className={prompt.access === "free" ? "lp-tag lp-tag-free" : "lp-tag"}>{prompt.access === "free" ? "Free" : "Plus"}</span><span>{prompt.difficulty}</span><span>{prompt.minutes} min</span></p>
                  <h3><Link to={roundPath(prompt.id)}>{shortTitle(prompt.title)}</Link></h3>
                  <p className="lp-qcard-desc">{prompt.description}</p>
                  <span className="lp-qcard-go" aria-hidden="true"><ArrowRight size={16} /></span>
                </li>
              ))}
            </ul>
            <Link className="lp-text-link" to={trackPath(track.id)}>See all {track.shortLabel} rounds <ArrowRight size={15} /></Link>
          </div>
        );
      })}
    </section>
  );
}

// ------------------------------------------------------------------ what interviewers grade

function Rubric() {
  return (
    <section className="lp-section lp-rubric wrap" id="rubric" aria-labelledby="lp-rubric-title">
      <div className="lp-rubric-head reveal">
        <h2 id="lp-rubric-title" className="lp-h2">What interviewers grade</h2>
        <p className="lp-lead">Every review scores the dimensions a system design interviewer listens for. Each one links to the guide in the free handbook that helps most.</p>
        <p className="lp-rubric-links">
          <Link className="lp-text-link" to={LEARN_PATH}><BookOpen size={16} /> Open the handbook</Link>
        </p>
      </div>
      <ol className="lp-rubric-list">
        {RUBRIC.map((dimension, index) => (
          <li key={dimension.id} className="reveal" style={{ transitionDelay: `${index * 60}ms` }}>
            <span className="lp-rubric-dot" aria-hidden="true" />
            <div>
              <h3>{dimension.name}</h3>
              <p>{dimension.text}</p>
            </div>
            <Link className="lp-rubric-guide" to={topicPath(dimension.guide)}>{dimension.guideTitle} <ArrowRight size={14} /></Link>
          </li>
        ))}
        <li className="lp-rubric-plus reveal">
          <span className="lp-rubric-dot" aria-hidden="true"><MessageCircle size={14} /></span>
          <div>
            <h3>Communication <span className="lp-tag">Plus</span></h3>
            <p>How clearly, concisely and confidently you explain and defend the design to the interviewer.</p>
          </div>
          <Link className="lp-rubric-guide" to="/plus">See Plus <ArrowRight size={14} /></Link>
        </li>
      </ol>
    </section>
  );
}

// ------------------------------------------------------------------ pricing

function Pricing({ onStart }) {
  const free = aiLimits.free;
  return (
    <section className="lp-pricing" id="pricing" aria-labelledby="lp-pricing-title">
      <h2 id="lp-pricing-title" className="sr-only">Pricing</h2>
      <article className="lp-plan lp-plan-free reveal">
        <h3>Free</h3>
        <p className="lp-plan-for">For practising and seeing where you stand.</p>
        <p className="lp-plan-body">Free rounds in every discipline, the full canvas with autosave and version history, and an AI review of each round, up to {free.reviewsPerMonth} a month, scored on every rubric dimension.</p>
        <div className="lp-plan-foot">
          <p className="lp-price">₹0<small>forever</small></p>
          <StartRoundButton onStart={onStart} className="btn lp-btn lp-btn-on-accent" />
        </div>
      </article>
      <article className="lp-plan lp-plan-plus reveal" style={{ transitionDelay: "80ms" }}>
        <h3>Plus</h3>
        <p className="lp-plan-for">For the last weeks before your interviews.</p>
        <p className="lp-plan-body">Every round, a live AI interviewer you can talk your design through with, feedback on how you communicate, hints, more reviews per round and coaching on every decision.</p>
        <div className="lp-plan-foot">
          <p className="lp-price">Plus<small>launching soon</small></p>
          <Link className="btn lp-btn" to="/plus">Get Plus <ArrowRight size={17} className="nudge" /></Link>
        </div>
      </article>
    </section>
  );
}

// ------------------------------------------------------------------ FAQ

function Faq() {
  return (
    <section className="lp-section lp-faq wrap" id="faq" aria-labelledby="lp-faq-title">
      <h2 id="lp-faq-title" className="lp-h2 reveal">Common questions</h2>
      <div className="lp-cards">
        {FAQS.map(({ topic, question, answer }, index) => (
          <details key={question} name="lp-faq" className="lp-card reveal" open={index === 0} style={{ "--i": index % 4 }}>
            <summary><span className="lp-card-tab">{topic}</span><span className="lp-card-q">{question}</span></summary>
            <p>{answer}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

// ------------------------------------------------------------------ close

function Close({ onStart }) {
  return (
    <section className="lp-close" aria-labelledby="lp-close-title">
      <div className="lp-close-mark" aria-hidden="true"><Layers2 strokeWidth={1.6} /></div>
      <div className="lp-close-copy">
        <h2 id="lp-close-title">Rehearse the round</h2>
        <p>Your next interview is a design review. Find out where your design bends before an interviewer does.</p>
        <StartRoundButton onStart={onStart} className="btn lp-btn lp-btn-on-accent" />
      </div>
    </section>
  );
}
