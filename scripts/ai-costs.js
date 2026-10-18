// What AI costs per round, from ai_usage (each call is priced when recorded; see
// server/modules/ai/pricing.js). Read-only, so it is safe against production:
//   npm run ai:costs                       rounds of the last 30 days
//   npm run ai:costs -- --days 7
//   npm run ai:costs -- <session id>       every call of one round
// Point DATABASE_URL at the database to report on.
import "../server/env.js";
import { close, connect, transaction } from "../server/db.js";
import { PRICE_VERSION } from "../server/modules/ai/pricing.js";

const args = process.argv.slice(2);
const days = Number(args[args.indexOf("--days") + 1]) || 30;
const sessionId = args.find((arg) => /^[0-9a-f-]{36}$/i.test(arg));

const usd = (value) => (value == null ? "unpriced" : `$${Number(value).toFixed(4)}`);
const pct = (values, p) => values.length ? values[Math.min(values.length - 1, Math.floor(p * values.length))] : 0;

await connect({ migrate: false });
try {
  await transaction(async (db) => {
    await db.query("set transaction read only");
    if (sessionId) {
      const calls = await db.query(
        `select created_at, task, model, outcome, input_tokens, cached_input_tokens, output_tokens, reasoning_tokens, audio_ms, cost_usd, cost_estimated
           from ai_usage where session_id = $1 order by created_at`, [sessionId]);
      for (const call of calls) {
        const tokens = call.audio_ms != null ? `audio ${Math.round(call.audio_ms / 1000)}s` : `in ${call.input_tokens ?? "?"}${call.cached_input_tokens ? ` (cached ${call.cached_input_tokens})` : ""} out ${call.output_tokens ?? "?"} thinking ${call.reasoning_tokens ?? "?"}`;
        console.log(`${call.created_at.toISOString().slice(11, 19)}  ${call.task.padEnd(18)} ${call.outcome.padEnd(22)} ${call.model.padEnd(24)} ${tokens.padEnd(48)} ${usd(call.cost_usd)}${call.cost_estimated ? " (estimated)" : ""}`);
      }
      const total = calls.reduce((sum, call) => sum + Number(call.cost_usd ?? 0), 0);
      const unpriced = calls.filter((call) => call.cost_usd == null).length;
      console.log(`\n${calls.length} calls, ${usd(total)}${unpriced ? ` plus ${unpriced} unpriced call(s), so this is a lower bound` : ""}`);
      return;
    }

    const rounds = await db.query(
      `select * from analytics_round_cost where first_call_at > now() - make_interval(days => $1) order by cost_usd`, [days]);
    const complete = rounds.filter((round) => Number(round.unpriced_calls) === 0);
    const costs = complete.map((round) => Number(round.cost_usd)).sort((a, b) => a - b);
    const sum = (list, key) => list.reduce((total, round) => total + Number(round[key]), 0);
    console.log(`AI cost per round, last ${days} days (price table ${PRICE_VERSION})\n`);
    console.log(`rounds with AI calls  ${rounds.length}   fully priced ${complete.length}   total ${usd(sum(rounds, "cost_usd"))}`);
    if (complete.length) {
      console.log(`per round             avg ${usd(sum(complete, "cost_usd") / complete.length)}   p50 ${usd(pct(costs, 0.5))}   p90 ${usd(pct(costs, 0.9))}   max ${usd(costs.at(-1))}`);
      const parts = ["interview_cost_usd", "review_cost_usd", "transcription_cost_usd"].map((key) => `${key.replace("_cost_usd", "")} ${usd(sum(complete, key) / complete.length)}`);
      console.log(`avg per round by part ${parts.join("   ")}`);
      const completed = complete.filter((round) => round.status === "completed");
      if (completed.length) console.log(`completed rounds      avg ${usd(sum(completed, "cost_usd") / completed.length)} over ${completed.length}`);
      const byPrompt = new Map();
      for (const round of complete) byPrompt.set(round.prompt_id, [...(byPrompt.get(round.prompt_id) ?? []), Number(round.cost_usd)]);
      console.log("\nby question (most played first)");
      for (const [prompt, list] of [...byPrompt].sort((a, b) => b[1].length - a[1].length).slice(0, 15)) {
        console.log(`  ${prompt.padEnd(30)} ${String(list.length).padStart(4)} rounds   avg ${usd(list.reduce((a, b) => a + b, 0) / list.length)}`);
      }
    }
    const unpriced = rounds.length - complete.length;
    const estimated = rounds.filter((round) => Number(round.estimated_calls) > 0).length;
    if (unpriced) console.log(`\n${unpriced} round(s) have unpriced calls (recorded before cost tracking, or a model missing from server/content/pricing.json) and are left out of the averages.`);
    if (estimated) console.log(`${estimated} round(s) include aborted calls whose tokens were estimated from their length.`);
    const other = await db.queryOne(
      `select coalesce(sum(cost_usd), 0) as cost, count(*) as calls from ai_usage where session_id is null and created_at > now() - make_interval(days => $1)`, [days]);
    if (Number(other.calls)) console.log(`Outside rounds (pack builds, checks): ${other.calls} calls, ${usd(other.cost)}.`);
  });
} finally {
  await close();
}
