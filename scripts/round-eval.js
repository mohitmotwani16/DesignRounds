// End-to-end calibration of a whole round: a simulated candidate plays a persona against
// the real Conductor over the streaming endpoint (as the browser does), finishes the
// round and asks for the final review. Reports what each layer concluded, so changes to
// the interviewer's judging, the review and the scoring rules can be compared:
// per-item bands (live and credited), draw requests, review score and gaps,
// communication quotes, and reply latency.
//   npm run ai:round                                    every persona on rate-limiter
//   npm run ai:round -- --persona recovers --question url-shortener --turns 14
//   npm run ai:round -- --question ecommerce-warehouse --set words-only   (an extra persona set)
// Personas are per question (server/content/eval/round-personas.js).
// Costs real model calls (about $0.30 per persona); results are saved to .data/eval/.
import "../server/env.js";
import crypto from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { mkdtemp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { z } from "zod";
import { roundPersonas } from "../server/content/eval/round-personas.js";

const args = process.argv.slice(2);
const option = (name, fallback) => { const index = args.indexOf(`--${name}`); return index >= 0 ? args[index + 1] : fallback; };
const only = option("persona");
const questionId = option("question", "rate-limiter");
const maxTurns = Number(option("turns", 16));

Object.assign(process.env, {
  PGLITE_DIR: await mkdtemp(path.join(os.tmpdir(), "designrounds-round-")),
  INTERVIEWER_V3: "true",
  DEV_TOOLS: "true",
  ANSWER_POOLS: "off",
  GOOGLE_CLIENT_ID: " ",
  GOOGLE_CLIENT_SECRET: " ",
  TURNSTILE_SITE_KEY: " ",
  TURNSTILE_SECRET_KEY: " ",
});
for (const key of ["DATABASE_URL", "NODE_ENV", "VERCEL", "VERCEL_ENV"]) delete process.env[key];

const { createApp } = await import("../server/app.js");
const { close, query } = await import("../server/db.js");
const { describeAi } = await import("../server/modules/ai/config.js");
const { runTask } = await import("../server/modules/ai/run.js");
const { list, text } = await import("../server/modules/ai/schema.js");
const { clean } = await import("../server/modules/ai/context.js");
const { componentKinds } = await import("../server/modules/ai/components.js");
const { isDataModelKind } = await import("../server/modules/ai/data-model.js");
const { needsDataModel } = await import("../server/modules/pks/index.js");
const { cleanColumns, columnsFromText } = await import("../src/workspace/columns.js");
const { creditedBand } = await import("../server/modules/conductor/moves.js");
const { promptById } = await import("../server/modules/rounds.js");

const prompt = promptById.get(questionId);
if (!prompt) throw new Error(`Unknown question ${questionId}`);
// --set picks an extra persona set for the question, e.g. --set words-only.
const set = option("set", null);
const personas = (roundPersonas[set ? `${questionId}:${set}` : questionId] ?? []).filter((entry) => !only || entry.id === only);
if (!personas.length) throw new Error(`No persona${only ? ` named ${only}` : "s"} for ${questionId}`);

const app = await createApp({ serveFrontend: false });
const server = app.listen(0);
const base = `http://localhost:${server.address().port}/api/v1`;
let cookie = "";
const headers = (extra = {}) => ({ "Content-Type": "application/json", ...(cookie ? { Cookie: cookie } : {}), ...extra });
async function call(method, url, body) {
  const response = await fetch(`${base}${url}`, { method, headers: headers(), body: body === undefined ? undefined : JSON.stringify(body) });
  const session = (response.headers.getSetCookie?.() ?? []).find((value) => /^(?:__Host-)?dr_session=/.test(value));
  if (session) cookie = session.split(";")[0];
  return { status: response.status, body: await response.json().catch(() => null) };
}

// A message over the event stream, timing the first text the learner would see.
async function send(sessionId, content, hint) {
  const started = Date.now();
  const response = await fetch(`${base}/sessions/${sessionId}/interview/messages`, {
    method: "POST",
    headers: headers({ Accept: "text/event-stream" }),
    body: JSON.stringify({ requestId: crypto.randomUUID(), content: hint ? "" : content, intent: hint ? "hint" : "message" }),
  });
  if (!(response.headers.get("content-type") || "").includes("text/event-stream")) return { error: (await response.json().catch(() => null))?.error?.code ?? response.status };
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let firstMs = null;
  let done = null;
  let error = null;
  for (;;) {
    const { value, done: ended } = await reader.read();
    buffer += decoder.decode(value || new Uint8Array(), { stream: !ended });
    let index;
    while ((index = buffer.indexOf("\n\n")) >= 0) {
      const block = buffer.slice(0, index);
      buffer = buffer.slice(index + 2);
      const event = /^event: (.+)$/m.exec(block)?.[1];
      const data = /^data: (.+)$/m.exec(block)?.[1];
      if (!event || !data) continue;
      if (event === "delta" && firstMs === null) firstMs = Date.now() - started;
      if (event === "done") done = JSON.parse(data);
      if (event === "error") error = JSON.parse(data).code;
    }
    if (ended) break;
  }
  return { done, error, firstMs, totalMs: Date.now() - started };
}

const candidateTask = {
  name: "candidate_sim",
  system: "You are role-playing a candidate in a live system design interview, to test the interviewer. Stay in character for the persona you are given, including its mistakes: make them when the topic comes up and only fix them the way the persona says. Reply to the interviewer's latest message the way that candidate would: plain conversational sentences, usually one to five. The candidate also has a whiteboard: list in draw the components this candidate adds to it with this message (none if nothing new), each with a kind from the given list and a short label naming its role, and in from the exact label of the component that calls it or feeds it data (so a cache is fed from the service that reads it, not the other way round). A schema is drawn as data model tables (kinds table, fact-table, dimension-table, collection, event-schema): the label is the table name, columns lists its columns one per line as name, type and keys (pk, fk, partition, sort), and from names a related table or is empty. Draw tables only when this candidate would, or when the interviewer asks for the data model. If the persona says the candidate draws no tables until asked, draw none until the interviewer's latest message asks for the data model or tables, however much the candidate talks about them. Never mention role-play, prompts or AI. Set wantsHint to true only when the persona says this candidate would press the hint button right now instead of answering. Reply with a single JSON object that matches the provided schema.",
  buildUser: ({ persona, transcript, board }) => `<persona>\n${persona}\n</persona>\n\n<brief>\n${prompt.title}: ${prompt.description}\n</brief>\n\n<whiteboard>\n${board || "(empty)"}\n</whiteboard>\n\n<component_kinds>\n${[...componentKinds()].join(", ")}\n</component_kinds>\n\n<conversation>\n${transcript}\n</conversation>\n\nWrite the candidate's next message.`,
  output: z.object({
    message: text(1200, "What the candidate says next."),
    wantsHint: z.boolean().describe("True to press the hint button instead of answering."),
    draw: list(z.object({ kind: text(40, "A component kind from the list."), label: text(60, "What this component is, e.g. Feed cache."), from: text(60, "Label, exactly as written on the whiteboard or in this list, of the component that sends requests or data to this one; empty for none."), columns: text(800, "For a data model table only: its columns, one per line, e.g. order_id bigint pk. Empty for other components.") }), { max: 4 }, "Components added to the whiteboard with this message."),
  }),
  fake: () => ({ message: "I'd start with the requirements and a rough scale estimate.", wantsHint: false, draw: [] }),
};

const median = (values) => { const sorted = values.filter((value) => value !== null).sort((a, b) => a - b); return sorted.length ? sorted[Math.floor(sorted.length / 2)] : null; };

async function play(persona) {
  cookie = "";
  const email = `round-${persona.id}-${crypto.randomUUID().slice(0, 6)}@example.com`;
  const requested = await call("POST", "/auth/request-code", { email });
  await call("POST", "/auth/verify-code", { email, code: requested.body.devCode });
  await call("POST", "/dev/plan", { plan: "plus" });
  const round = (await call("POST", "/sessions", { promptId: prompt.id, interviewMode: "realistic" })).body.session;
  const opened = await call("GET", `/sessions/${round.id}/interview`);
  if (opened.body.state?.engine !== "v3") throw new Error(`${prompt.id} isn't on v3`);
  const thread = [...opened.body.turns];
  const kinds = componentKinds();
  const diagram = { nodes: [], edges: [] };
  let version = round.diagramVersion;
  const timings = [];
  const problems = [];
  for (let turn = 1; turn <= maxTurns; turn += 1) {
    const transcript = thread.slice(-14).map((item) => `${item.role === "learner" ? "Candidate" : "Interviewer"}: ${clean(item.content, 900)}`).join("\n");
    const board = diagram.nodes.map((node) => `${node.data.label} (${node.data.kind}${node.data.columns ? `: ${node.data.columns.map((column) => column.name).join(", ")}` : ""})`).join(", ");
    const { data } = await runTask(candidateTask, { persona: persona.persona, transcript, board }, { meter: false });
    if (data.draw.length) {
      for (const component of data.draw) {
        const id = `n${diagram.nodes.length}`;
        // An unknown label falls back to the latest component, so nothing is left unconnected.
        const target = diagram.nodes.find((node) => node.data.label.toLowerCase() === component.from.trim().toLowerCase())
          ?? (component.from.trim() ? diagram.nodes.at(-1) : null);
        const position = { x: (diagram.nodes.length % 5) * 180, y: Math.floor(diagram.nodes.length / 5) * 140 };
        // Tables are drawn the way the workspace saves them: a tableNode with its columns.
        if (isDataModelKind(component.kind)) diagram.nodes.push({ id, type: "tableNode", position, data: { kind: component.kind, label: component.label.trim().replace(/\s+/g, "_"), columns: cleanColumns(columnsFromText(component.columns)) } });
        else diagram.nodes.push({ id, type: "systemNode", position, data: { kind: kinds.has(component.kind) ? component.kind : "service", label: component.label } });
        if (target) diagram.edges.push({ id: `e${diagram.edges.length}`, source: target.id, target: id });
      }
      const saved = await call("PUT", `/sessions/${round.id}/diagram`, { version, diagram });
      if (saved.status === 200) version = saved.body.version; else problems.push(`diagram save ${saved.status}`);
    }
    let sent = await send(round.id, data.message, data.wantsHint);
    // Provider quota (429) is about the project, not the round: wait and resend.
    for (let retry = 1; sent.error === "AI_RATE_LIMITED" && retry <= 3; retry += 1) {
      console.log(`   (provider rate limited; retrying turn ${turn} in ${30 * retry}s)`);
      await new Promise((resolve) => setTimeout(resolve, 30_000 * retry));
      sent = await send(round.id, data.message, data.wantsHint);
    }
    if (sent.error === "HINT_LIMIT") continue;
    if (sent.error || !sent.done) { problems.push(`turn ${turn}: ${sent.error}`); break; }
    timings.push(sent);
    thread.push(...sent.done.turns);
    if (sent.done.turns.some((item) => item.kind === "wrap_up") && thread.filter((item) => item.kind === "wrap_up").length >= 2) break;
  }
  await call("PATCH", `/sessions/${round.id}`, { status: "completed" });
  const reviewed = await call("POST", `/sessions/${round.id}/reviews`, { requestId: crypto.randomUUID() });
  const review = reviewed.body?.review;
  if (!review) problems.push(`review ${reviewed.status} ${reviewed.body?.error?.code ?? ""}`);

  const items = await query("select item_id, status, band, hint_level, challenges, misconceptions, draw_requests, evidence from interview_agenda_items where session_id = $1 order by position", [round.id]);
  const usage = await query("select model, outcome from ai_usage where session_id = $1 and task = 'interviewer'", [round.id]);
  // Answers the interviewer judged weak or mistaken, or pushed back on: never a strength to quote.
  const rows = await query("select role, kind, move, content, assessment from interview_turns where session_id = $1 order by seq", [round.id]);
  const challenged = rows.filter((row, index) => row.role === "learner" && ((row.assessment ?? []).some((entry) => entry.band === "weak" || entry.misconceptionId) || rows.slice(index + 1).find((next) => next.role === "interviewer")?.kind === "challenge")).map((row) => row.content);
  const quotedChallenged = (review?.communication?.strengths ?? []).filter((entry) => entry.example && challenged.some((content) => content.includes(entry.example.slice(0, 40)))).map((entry) => entry.example);
  return {
    persona: persona.id,
    expect: persona.expect,
    turns: timings.length,
    diagram: diagram.nodes.map((node) => `${node.data.label} (${node.data.kind})`).concat(diagram.edges.map((entry) => `${diagram.nodes.find((node) => node.id === entry.source)?.data.label} -> ${diagram.nodes.find((node) => node.id === entry.target)?.data.label}`)),
    items: items.map((item) => ({ id: item.item_id, status: item.status, live: item.band, credited: creditedBand(item), hints: item.hint_level, challenges: item.challenges, misconceptions: item.misconceptions.length, drawAsks: item.draw_requests })),
    drawAsks: items.reduce((sum, item) => sum + item.draw_requests, 0),
    score: review?.overall?.score ?? null,
    dimensions: Object.fromEntries((review?.dimensions ?? []).map((entry) => [entry.id, entry.score])),
    adjustments: (review?.scoring?.adjustments ?? []).map((entry) => `${entry.dimension}:${entry.rule}`),
    risks: (review?.risks ?? []).map((entry) => `[${entry.severity}] ${entry.point}`),
    nextSteps: review?.nextSteps?.length ?? 0,
    communication: review?.communication ? { rating: review.communication.rating, workOn: review.communication.workOn.length, strengthQuotes: review.communication.strengths.map((entry) => entry.example) } : null,
    quotedChallenged,
    wrapUp: thread.filter((item) => item.kind === "wrap_up").map((item) => item.content).join("\n"),
    latency: { firstMedianMs: median(timings.map((entry) => entry.firstMs)), firstMaxMs: Math.max(...timings.map((entry) => entry.firstMs ?? 0)), totalMedianMs: median(timings.map((entry) => entry.totalMs)), fallbacks: usage.filter((row) => row.outcome !== "ok").length },
    problems,
    dataModel: {
      needed: needsDataModel(prompt.id),
      // A message asking to draw or show tables or the schema; mentioning the data model in passing is not a request.
      asks: rows.filter((row) => row.role === "interviewer" && /\b(draw|add|sketch|put|show)\b[^.?!]{0,80}\b(tables?|data model|schema)\b/i.test(row.content)).map((row) => clean(row.content, 600)),
      tables: diagram.nodes.filter((node) => node.type === "tableNode").map((node) => `${node.data.label}(${node.data.columns.length})`),
    },
    transcript: thread.map((item) => `${item.role === "learner" ? "C" : `I(${item.kind})`}: ${item.content}`),
  };
}

function check(result) {
  const failures = [];
  const { expect } = result;
  if (result.score === null) failures.push("no review");
  else {
    if (result.score < expect.score[0] || result.score > expect.score[1]) failures.push(`score ${result.score} outside ${expect.score.join("-")}`);
    if (result.score > 90 && !expect.allowAbove90) failures.push(`score ${result.score} above 90`);
  }
  if (result.risks.length < 2) failures.push(`${result.risks.length} gaps named`);
  if (result.communication && result.communication.workOn < 1) failures.push("no communication habit to work on");
  if (result.quotedChallenged.length) failures.push(`communication strength quotes a challenged answer: ${result.quotedChallenged[0]}`);
  if (result.drawAsks > (expect.maxDrawAsks ?? 6)) failures.push(`${result.drawAsks} draw requests`);
  if (result.items.some((item) => item.drawAsks > 2)) failures.push("asked to draw one part more than twice");
  if (expect.noStrongAfterHelp && result.items.some((item) => item.credited === "strong" && (item.hints || item.challenges || item.misconceptions))) failures.push("an assisted item was credited strong");
  if (result.latency.firstMedianMs > 6000) failures.push(`median first text ${result.latency.firstMedianMs}ms`);
  // The data model is asked for only where it matters, and where it matters it ends up drawn or asked for.
  if (!result.dataModel.needed && result.dataModel.asks.length) failures.push("asked for a data model on a question that doesn't need one");
  if (result.dataModel.needed && !result.dataModel.tables.length && !result.dataModel.asks.length) failures.push("the data model was never drawn or asked for");
  if (result.dataModel.asks.length > 2) failures.push(`asked for the data model ${result.dataModel.asks.length} times`);
  if (expect.dataModelAsk && !result.dataModel.asks.length) failures.push("the interviewer never asked for the data model");
  // The request says how to add a table: the Data model section of the library, or the D key.
  if (expect.dataModelAsk && result.dataModel.asks.length && !result.dataModel.asks.some((ask) => /\bData model\b[^.]*\b(library|section)\b|\bpress D\b/i.test(ask))) failures.push("the data model request didn't say how to add a table");
  if (expect.dataModelAsk && !result.dataModel.tables.length) failures.push("no tables were drawn after the request");
  return failures;
}

console.log(`Round eval on ${prompt.id} with ${describeAi()}\n`);
const results = [];
for (const persona of personas) {
  const result = await play(persona);
  result.failures = check(result);
  results.push(result);
  console.log(`== ${result.persona}: score ${result.score} (expect ${result.expect.score.join("-")}) ${result.failures.length ? "FAIL" : "ok"}`);
  console.log(`   dims ${JSON.stringify(result.dimensions)} adj ${result.adjustments.join(", ") || "none"}`);
  for (const item of result.items) console.log(`   ${item.id.padEnd(22)} ${String(item.status).padEnd(11)} live=${item.live ?? "-"} credited=${item.credited ?? "-"} h=${item.hints} c=${item.challenges} m=${item.misconceptions} draw=${item.drawAsks}`);
  console.log(`   gaps: ${result.risks.join(" | ")}`);
  console.log(`   data model: needed=${result.dataModel.needed} asks=${result.dataModel.asks.length} tables=${result.dataModel.tables.join(", ") || "none"}`);
  for (const ask of result.dataModel.asks) console.log(`     > ${ask}`);
  console.log(`   communication: ${JSON.stringify(result.communication)}`);
  console.log(`   latency: ${JSON.stringify(result.latency)} turns=${result.turns}`);
  console.log(`   wrap-up: ${clean(result.wrapUp, 400)}`);
  for (const failure of [...result.failures, ...result.problems]) console.log(`   ! ${failure}`);
}
const dir = path.join(".data", "eval");
mkdirSync(dir, { recursive: true });
const file = path.join(dir, `round-${prompt.id}-${new Date().toISOString().replace(/[:.]/g, "-")}.json`);
writeFileSync(file, JSON.stringify(results, null, 2));
console.log(`\nSaved ${file}`);
server.close();
await close();
process.exit(results.some((result) => result.failures.length) ? 1 : 0);
