// Verifies the AI provider configuration: lists the models your key can use and
// makes one tiny structured-output call with the configured model.
//   npm run ai:check
import "../server/env.js";
import { aiConfig, describeAi } from "../server/modules/ai/config.js";
import { complete } from "../server/modules/ai/providers.js";

console.log(`Provider: ${describeAi()}  (${aiConfig.baseUrl})`);
if (aiConfig.provider !== "openai-compat") {
  console.log("No real provider configured. Set AI_API_KEY in .env (see .env.example).");
  process.exit(0);
}

const response = await fetch(`${aiConfig.baseUrl}/models`, { headers: { Authorization: `Bearer ${aiConfig.apiKey}` } });
if (!response.ok) {
  console.error(`Listing models failed: ${response.status} ${(await response.text()).slice(0, 300)}`);
  process.exit(1);
}
const ids = ((await response.json()).data || []).map((model) => model.id.replace(/^models\//, ""));
const chatModels = ids.filter((id) => /gemini|llama|gpt|qwen|mistral|claude/i.test(id) && !/embed|image|tts|veo|imagen|audio/i.test(id));
console.log(`\nChat models available to this key (${chatModels.length}):\n  ${chatModels.join("\n  ")}`);
if (!ids.includes(aiConfig.model)) {
  console.error(`\nAI_MODEL "${aiConfig.model}" is not in that list. Set AI_MODEL in .env to one of the models above.`);
  process.exit(1);
}

const started = Date.now();
const result = await complete({
  messages: [{ role: "user", content: "Reply with ok=true and the number 7." }],
  jsonSchema: { name: "check", schema: { type: "object", properties: { ok: { type: "boolean" }, n: { type: "integer" } }, required: ["ok", "n"], additionalProperties: false } },
  effort: "low",
  maxTokens: 2000,
  timeoutMs: 60_000,
});
console.log(`\nTest call to ${result.model}: ${result.text.trim()}  (${Date.now() - started} ms, in=${result.inputTokens} out=${result.outputTokens})`);
console.log("AI provider is working.");
