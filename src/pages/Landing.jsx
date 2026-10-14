import { useEffect, useRef } from "react";
import {
  ArrowRight, ArrowUp, BookOpenCheck, Boxes, Check, Clock3, Database, GitBranch, History, Layers2, ListOrdered,
  MessageSquareText, MonitorSmartphone, MousePointer2, Network, Plus, Server, Shapes, Sparkles, StickyNote, Zap,
} from "lucide-react";
import { prompts, tracks } from "../data/prompts.js";
import { aiLimits } from "../data/plans.js";
import { RoundCard, SiteFooter, useReveal } from "../components/site.jsx";
import { trackIcon } from "../components/ui.jsx";
import { navigate } from "../router.js";

// "Design a URL shortener" -> "URL shortener"
const shortTitle = (title) => title.replace(/^Design (a |an )?/i, "").replace(/^./, (char) => char.toUpperCase());

const minutes = prompts.map((prompt) => prompt.minutes);
const ROUND_LENGTH = `${Math.min(...minutes)}–${Math.max(...minutes)}m`;

const freeRounds = prompts.filter((prompt) => prompt.access === "free");
const FIRST_ROUND = freeRounds.find((prompt) => prompt.id === "url-shortener") ?? freeRounds[0];

export default function LandingPage({ onStart, section }) {
  const ref = useRef(null);
  useReveal(ref);

  // "/?s=pricing" deep-links to a section; wait a tick so the page has laid out.
  useEffect(() => {
    if (!section) return undefined;
    // Arriving from a link jumps straight there; in-page clicks scroll smoothly (goToSection).
    const timer = window.setTimeout(() => document.getElementById(section)?.scrollIntoView({ block: "start" }), 60);
    return () => window.clearTimeout(timer);
  }, [section]);

  const popular = [...prompts.filter((prompt) => prompt.popular), ...prompts].filter((prompt, index, list) => list.indexOf(prompt) === index).slice(0, 3);

  return (
    <main ref={ref}>
      <Hero onStart={onStart} />

      <section className="wrap section-tight" aria-label="DesignRounds in numbers">
        <div className="stats reveal">
          <div className="stat"><strong>{ROUND_LENGTH}</strong><span>Timed like real interview rounds</span></div>
          <div className="stat"><strong>{tracks.length}</strong><span>Engineering disciplines</span></div>
          <div className="stat"><strong>240+</strong><span>Components, from Kafka to CDNs</span></div>
          <div className="stat"><strong>6</strong><span>Rubric dimensions, scored every time</span></div>
        </div>
      </section>

      <section className="wrap section-tight">
        <p className="statement reveal">
          Most prep teaches you to recite architectures. <span>Interviews reward people who can defend them: why this database, what breaks at 10× traffic, which trade-off you'd accept. DesignRounds is where you practice that part.</span>
        </p>
      </section>

      <section className="wrap section" id="how">
        <div className="section-head reveal">
          <span className="kicker">How it works</span>
          <h2>One round. Three moves. <span className="serif-accent">Real feedback.</span></h2>
          <p>Every round mirrors a real system design interview, without the scheduling, the nerves, or waiting a week for feedback.</p>
        </div>
        <div className="steps">
          <article className="step reveal" style={{ transitionDelay: "0ms" }}>
            <div className="step-art">
              <div className="mini-card">
                <h5>Design a URL shortener</h5>
                <p>Turn long links into short, shareable URLs.</p>
                <div className="mini-req">
                  <span><Check size={13} /> Redirects in under 50 ms</span>
                  <span><Check size={13} /> 100M new links a month</span>
                  <span><Check size={13} /> Links can expire</span>
                </div>
                <div className="mini-meta"><span><Clock3 size={11} /> 35 min</span><span>Beginner</span><span>Storage</span></div>
              </div>
            </div>
            <div className="step-copy">
              <span className="step-num">01</span>
              <h3>Pick a real brief</h3>
              <p>Clear requirements, realistic scale, and room to ask questions, just like the first five minutes of an interview.</p>
            </div>
          </article>
          <article className="step reveal" style={{ transitionDelay: "90ms" }}>
            <div className="step-art">
              <div className="mini-flow">
                <span className="mini-node tone-violet"><i><Network size={12} /></i>Gateway</span>
                <span className="mini-arrow" />
                <span className="mini-node tone-blue"><i><Server size={12} /></i>Service</span>
                <span className="mini-arrow" />
                <span className="mini-node tone-rose"><i><Zap size={12} /></i>Redis</span>
              </div>
            </div>
            <div className="step-copy">
              <span className="step-num">02</span>
              <h3>Design it on the canvas</h3>
              <p>Drag in real components, wire them up, label every connection, and pin a note on why each choice is there.</p>
            </div>
          </article>
          <article className="step reveal" style={{ transitionDelay: "180ms" }}>
            <div className="step-art">
              <div className="mini-score">
                <div className="ring" style={{ "--p": 82 }}><strong>82</strong></div>
                <div className="mini-bars">
                  <div>Architecture<b style={{ "--v": "86%" }} /></div>
                  <div>Trade-offs<b style={{ "--v": "78%" }} /></div>
                  <div>Scale<b style={{ "--v": "70%" }} /></div>
                </div>
              </div>
            </div>
            <div className="step-copy">
              <span className="step-num">03</span>
              <h3>Defend it, get scored</h3>
              <p>An AI interviewer probes your decisions, then a rubric-based review scores six dimensions and tells you exactly what to fix.</p>
            </div>
          </article>
        </div>
      </section>

      <section className="wrap section" id="features">
        <div className="section-head center reveal">
          <span className="kicker">What's inside</span>
          <h2>Everything a design round asks of you, <span className="serif-accent">in one place.</span></h2>
        </div>
        <div className="bento">
          <article className="tile wide reveal">
            <div className="tile-copy">
              <h3>A canvas built for architecture</h3>
              <p>240+ components across clients, compute, data, messaging, and observability, plus real technology marks. Zones, labels, sync and async connections, undo, autosave.</p>
            </div>
            <div className="tile-art">
              <div className="palette">
                {[["Load balancer", Network, "violet"], ["API gateway", Shapes, "violet"], ["Kafka", ListOrdered, "orange"], ["Redis", Zap, "rose"], ["PostgreSQL", Database, "teal"], ["Object storage", Boxes, "blue"], ["CDN", MonitorSmartphone, "green"], ["Worker pool", Server, "blue"], ["Search index", BookOpenCheck, "teal"]].map(([label, Icon, tone]) => (
                  <span key={label} className={`tone-${tone}`}><i><Icon size={12} /></i>{label}</span>
                ))}
                <span className="more"><Plus size={13} /> 230 more</span>
              </div>
            </div>
          </article>
          <article className="tile reveal">
            <div className="tile-copy">
              <h3>An interviewer that asks why</h3>
              <p>It watches the canvas and asks about significant choices, but never about ones you've already explained.</p>
            </div>
            <div className="tile-art">
              <div className="bubble-stack">
                <div className="msg ai"><span className="msg-who">Interviewer</span>You sharded by user ID. What happens to a celebrity's followers?</div>
                <div className="msg me"><span className="msg-who">You</span>Hot keys get fan-out on read instead…</div>
              </div>
            </div>
          </article>
          <article className="tile reveal">
            <div className="tile-copy">
              <h3>Scored on a real rubric</h3>
              <p>Requirements, architecture, data, scale, reliability, and trade-offs, weighted the way interviewers weigh them.</p>
            </div>
            <div className="tile-art">
              <div className="mini-score">
                <div className="ring" style={{ "--p": 74 }}><strong>74</strong></div>
                <div className="mini-bars">
                  <div>Requirements<b style={{ "--v": "80%" }} /></div>
                  <div>Data model<b style={{ "--v": "64%" }} /></div>
                  <div>Reliability<b style={{ "--v": "72%" }} /></div>
                </div>
              </div>
            </div>
          </article>
          <article className="tile reveal">
            <div className="tile-copy">
              <h3>Decisions, not just boxes</h3>
              <p>Pin a "why" to any component. Explained reasoning is what moves your score.</p>
            </div>
            <div className="tile-art">
              <div className="note-card"><b>Why Cassandra?</b>Write-heavy timeline inserts, partitioned by user. We accept eventual consistency for likes.</div>
            </div>
          </article>
          <article className="tile reveal">
            <div className="tile-copy">
              <h3>Never lose a design</h3>
              <p>Autosave with versioned checkpoints. Stale tabs can't overwrite newer work.</p>
            </div>
            <div className="tile-art">
              <div className="versions">
                <div><i /> Added read replicas <span>now</span></div>
                <div><i /> Cache-aside for redirects <span>4 min</span></div>
                <div><i /> First draft <span>12 min</span></div>
              </div>
            </div>
          </article>
        </div>
      </section>

      <section className="wrap section" id="disciplines">
        <div className="row-head reveal">
          <div className="section-head">
            <span className="kicker">Six disciplines</span>
            <h2>Practice for the role <span className="serif-accent">you actually want.</span></h2>
          </div>
          <button className="btn btn-ghost" onClick={() => navigate("/library")}>Browse all designs <ArrowRight size={15} className="nudge" /></button>
        </div>
        <div className="tracks">
          {tracks.map((track) => {
            const Icon = trackIcon(track.icon);
            const list = prompts.filter((prompt) => prompt.track === track.id);
            return (
              <button key={track.id} className={`track tone-${track.color} reveal`} onClick={() => navigate(`/library?track=${track.id}`)}>
                <div className="track-top"><span className="track-ico"><Icon size={19} /></span></div>
                <h3>{track.label}</h3>
                <p>{track.description}</p>
                <ul>{list.slice(0, 3).map((prompt) => <li key={prompt.id}>{shortTitle(prompt.title)}</li>)}</ul>
                <span className="track-go">Explore {track.shortLabel} <ArrowRight size={14} /></span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="wrap section-tight">
        <div className="row-head reveal" style={{ marginBottom: 28 }}>
          <div className="section-head">
            <span className="kicker">Start here</span>
            <h2>Popular rounds</h2>
          </div>
        </div>
        <div className="rounds">
          {popular.map((prompt, index) => <RoundCard key={prompt.id} round={prompt} onStart={onStart} index={index} />)}
        </div>
      </section>

      <Pricing onStart={onStart} />
      <Faq />

      <section className="cta-band reveal">
        <h2>Your next interview is a design review. <em>Rehearse it.</em></h2>
        <p>Pick a design, sketch your architecture, and find out where it bends before an interviewer does.</p>
        <div className="hero-ctas">
          <button className="btn btn-primary btn-lg" onClick={() => onStart(FIRST_ROUND.id)}>Start a free round <ArrowRight size={17} className="nudge" /></button>
          <button className="btn btn-ghost btn-lg" onClick={() => navigate("/library")}>Explore the library</button>
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}

function Hero({ onStart }) {
  return (
    <section className="hero wrap">
      <button className="pill rise" style={{ "--d": 0 }} onClick={() => navigate("/library")}>
        <span className="pill-tag">New</span> A live AI interviewer that asks <em style={{ fontFamily: "var(--font-serif)", fontSize: 15 }}>why</em> <ArrowRight size={13} />
      </button>
      <h1 className="rise" style={{ "--d": 1 }}>Practice system design the way it's <em>actually</em> tested.</h1>
      <p className="hero-sub rise" style={{ "--d": 2 }}>
        Real interview design problems, a canvas built for architecture, and an AI interviewer that pushes back. Then a rubric-based review tells you exactly what to fix.
      </p>
      <div className="hero-ctas rise" style={{ "--d": 3 }}>
        <button className="btn btn-primary btn-lg" onClick={() => onStart(FIRST_ROUND.id)}>Start a free round <ArrowRight size={17} className="nudge" /></button>
        <button className="btn btn-ghost btn-lg" onClick={() => navigate("/library")}>Browse all designs</button>
      </div>
      <div className="hero-checks rise" style={{ "--d": 4 }}>
        <span><Check size={15} /> Free to start</span>
        <span><Check size={15} /> No credit card</span>
        <span><Check size={15} /> Sign in with just your email</span>
      </div>
      <div className="rise" style={{ "--d": 5 }}><Demo /></div>
    </section>
  );
}

// Coordinates are in a 960×600 stage; HTML elements are placed by percentage so they
// line up with the SVG wires at any width.
const at = (x, y) => ({ left: `${(x / 960) * 100}%`, top: `${(y / 600) * 100}%` });
const NODES = [
  { id: "clients", x: 95, y: 300, label: "Clients", sub: "web · mobile", Icon: MonitorSmartphone, tone: "slate", d: 500 },
  { id: "gateway", x: 300, y: 300, label: "API gateway", sub: "rate limits", Icon: Network, tone: "violet", d: 750 },
  { id: "service", x: 520, y: 300, label: "Link service", sub: "stateless ×6", Icon: Server, tone: "blue", d: 1000, focus: true },
  { id: "cache", x: 765, y: 165, label: "Redis", sub: "cache-aside", Icon: Zap, tone: "rose", d: 1300 },
  { id: "db", x: 765, y: 435, label: "PostgreSQL", sub: "replicated", Icon: Database, tone: "teal", d: 1500 },
  { id: "queue", x: 520, y: 505, label: "Kafka", sub: "click events", Icon: ListOrdered, tone: "orange", d: 1700 },
];
// Nodes are 158 units wide and ~52 tall, so edges sit at x ± 79 and y ± 26.
const WIRES = [
  { d: "M 175 300 L 219 300", label: "HTTPS", lx: 197, ly: 286, delay: 900 },
  { d: "M 380 300 L 439 300", label: "/:code", lx: 410, ly: 286, delay: 1150 },
  { d: "M 600 290 C 648 290 640 165 684 165", label: "GET", lx: 622, ly: 214, delay: 1500 },
  { d: "M 600 312 C 648 312 640 435 684 435", label: "on miss", lx: 600, ly: 400, delay: 1700 },
  { d: "M 520 327 L 520 475", label: "async", lx: 492, ly: 406, delay: 1900, async: true },
];

function Demo() {
  return (
    <div className="demo" aria-label="Preview of a DesignRounds practice round: a URL shortener design with an AI interviewer and a review score" role="img">
      <div className="demo-bar">
        <span className="demo-dots"><i /><i /><i /></span>
        <span className="demo-title">Design a URL shortener <span className="chip">Free</span></span>
        <span className="demo-meta"><span className="timer">23:41</span><span className="saved">Saved</span></span>
      </div>
      <div className="demo-body">
        <div className="demo-rail" aria-hidden="true">
          <span className="on"><MousePointer2 size={15} /></span><span><Layers2 size={15} /></span><span><StickyNote size={15} /></span><span><GitBranch size={15} /></span><span><History size={15} /></span>
        </div>
        <div className="stage" aria-hidden="true">
          <div className="zone" style={{ ...at(430, 92), width: `${(440 / 960) * 100}%`, height: `${(470 / 600) * 100}%`, "--d": 300 }}><span>ap-south-1 · VPC</span></div>
          <svg className="wires" viewBox="0 0 960 600" preserveAspectRatio="none">
            <defs>
              <marker id="demo-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 1 L9 5 L0 9 z" fill="currentColor" style={{ color: "var(--ink-4)" }} /></marker>
            </defs>
            {WIRES.map((wire) => (
              <g key={wire.d}>
                <path className={`wire ${wire.async ? "async" : ""}`} d={wire.d} markerEnd="url(#demo-arrow)" style={{ "--d": wire.delay }} />
                <text className="wire-label" x={wire.lx} y={wire.ly} textAnchor="middle" style={{ "--d": wire.delay + 250 }}>{wire.label}</text>
              </g>
            ))}
            {WIRES.slice(0, 4).map((wire, index) => (
              <circle key={`p-${wire.d}`} r="3.5" className="packet" style={{ "--d": 2300 + index * 250 }}>
                <animateMotion dur={`${1.6 + index * 0.25}s`} repeatCount="indefinite" begin={`${2.3 + index * 0.25}s`} path={wire.d} />
              </circle>
            ))}
          </svg>
          {NODES.map((node) => (
            <div key={node.id} className={`node tone-${node.tone} ${node.focus ? "focus" : ""}`} style={{ ...at(node.x, node.y), "--d": node.d }}>
              <i><node.Icon /></i>
              <span>{node.label}<small>{node.sub}</small></span>
            </div>
          ))}
          <div className="note" style={{ ...at(52, 60), "--d": 2500 }}><b>Why Redis?</b>~100:1 reads to writes. Cache-aside with a 24-hour TTL keeps p99 redirects under 20 ms.</div>
          <div className="score" style={{ "--d": 7000 }}>
            <div className="score-top"><span>Review · v3</span><strong>82<small>/100</small></strong></div>
            <span className="score-band">Strong</span>
            <div className="score-bars">
              {[["Architecture", "88%"], ["Trade-offs", "80%"], ["Scale & performance", "74%"]].map(([label, value], index) => (
                <div key={label}>{label}<b style={{ "--v": value, "--d": 7000 + index * 120 }} /></div>
              ))}
            </div>
          </div>
        </div>
        <aside className="demo-chat" aria-hidden="true">
          <div className="chat-head"><Sparkles size={15} style={{ color: "var(--accent-text)" }} /> Interviewer <span className="live">live</span></div>
          <div className="chat-log">
            <div className="msg ai" style={{ "--d": 2000 }}><span className="msg-who">Interviewer</span>Walk me through a redirect. Where does the lookup go first?</div>
            <div className="msg me" style={{ "--d": 3400 }}><span className="msg-who">You</span>Redis first, cache-aside. On a miss, read the replica and backfill with a 24-hour TTL.</div>
            <div className="demo-typing" style={{ "--d": 4300 }}><i /><i /><i /></div>
            <div className="msg ai" style={{ "--d": 5700 }}><span className="msg-who">Interviewer</span>Good. A link goes viral and its key expires. What happens to your database?</div>
          </div>
          <div className="chat-input">Explain your thinking… <span><ArrowUp size={14} /></span></div>
        </aside>
      </div>
    </div>
  );
}

function Pricing({ onStart }) {
  const free = aiLimits.free;
  const plus = aiLimits.plus;
  return (
    <section className="wrap section" id="pricing">
      <div className="section-head center reveal">
        <span className="kicker">Pricing</span>
        <h2>Start free. <span className="serif-accent">Go deeper</span> when you're ready.</h2>
        <p>Your score is computed the same way on every plan. Plus adds more rounds, the live interviewer, and the full coaching behind each score.</p>
      </div>
      <div className="plans">
        <article className="plan reveal">
          <h3>Free</h3>
          <div className="plan-price">₹0 <small>forever</small></div>
          <p className="plan-note">Everything you need to practice and see where you stand.</p>
          <ul>
            <li><Check size={16} /> Free design rounds in every discipline</li>
            <li><Check size={16} /> The full canvas, autosave, and version history</li>
            <li><Check size={16} /> {free.reviewsPerRound} AI review per round, up to {free.reviewsPerMonth} a month</li>
            <li><Check size={16} /> Scores on all six rubric dimensions, plus your top strength and biggest risk</li>
          </ul>
          <button className="btn btn-ink btn-lg" onClick={() => onStart(FIRST_ROUND.id)}>Start a free round <ArrowRight size={16} className="nudge" /></button>
        </article>
        <article className="plan featured reveal">
          <span className="plan-flag">Coming soon</span>
          <h3>Plus</h3>
          <div className="plan-price">Soon <small>pricing at launch</small></div>
          <p className="plan-note">For the final weeks before your interviews.</p>
          <ul>
            <li><Check size={16} /> Every design round, including Plus-only ones</li>
            <li><Check size={16} /> Live AI interviewer: up to {plus.interviewTurnsPerRound} replies and {plus.hintsPerRound} hints per round</li>
            <li><Check size={16} /> {plus.reviewsPerRound} reviews per round, up to {plus.reviewsPerMonth} a month</li>
            <li><Check size={16} /> Full coaching: every decision analyzed, every risk, next steps, and follow-up questions</li>
          </ul>
          <button className="btn btn-primary btn-lg" onClick={() => navigate("/library")}>Explore the library <ArrowRight size={16} className="nudge" /></button>
        </article>
      </div>
    </section>
  );
}

const FAQS = [
  ["Is DesignRounds really free?", `Yes. A broad set of design rounds, the full canvas, and an AI review for every round are free, with no credit card. Plus, coming soon, adds more rounds, the live interviewer, and deeper coaching.`],
  ["How is this different from watching system design videos?", "Videos show you someone else's design. Here you make every decision yourself, explain it, and get challenged on it. That's the skill an interview actually tests, and it only improves with practice."],
  ["How does the AI review score my design?", "Against a fixed rubric of six weighted dimensions: requirements, architecture, data, scale, reliability, and trade-offs. It reads your components, connections, labels, and the reasoning you wrote down. Explained choices count. Unexplained ones earn little, even when they're right."],
  ["Do I need to know a specific cloud provider?", "No. You can design with generic building blocks (load balancers, queues, caches, databases) or with specific technologies like Kafka, Redis, or PostgreSQL. The review cares about why, not which logo."],
  ["Which roles is this for?", "Backend and full-stack engineers, data engineers, ML engineers, platform and infrastructure engineers, and frontend and mobile engineers. Each discipline has its own set of design rounds."],
  ["Is my work private?", "Your designs are private to your account. To generate feedback, your design and its notes are sent to our AI provider. You can delete any round, or your whole account, at any time."],
];

function Faq() {
  return (
    <section className="wrap section" id="faq">
      <div className="section-head center reveal">
        <span className="kicker">FAQ</span>
        <h2>Questions, <span className="serif-accent">answered.</span></h2>
      </div>
      <div className="faq reveal">
        {FAQS.map(([question, answer], index) => (
          <details key={question} open={index === 0}>
            <summary>{question}<Plus size={18} /></summary>
            <p>{answer}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

