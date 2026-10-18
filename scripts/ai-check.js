// Verifies the AI provider configuration with one tiny structured-output call per
// configured model. For an OpenAI-compatible key it also lists the models it can use.
//   npm run ai:check
import "../server/env.js";
import { aiConfig, describeAi } from "../server/modules/ai/config.js";
import { complete } from "../server/modules/ai/providers.js";

const checkSchema = {
  name: "check",
  schema: { type: "object", properties: { ok: { type: "boolean" }, n: { type: "integer" } }, required: ["ok", "n"], additionalProperties: false },
};

async function tryModel(model) {
  const started = Date.now();
  try {
    const result = await complete({
      model,
      messages: [{ role: "user", content: "Reply with ok=true and the number 7." }],
      jsonSchema: checkSchema,
      effort: "low",
      maxTokens: 2000,
      timeoutMs: 60_000,
    });
    console.log(`  ${model}: ${result.text.trim()}  (${Date.now() - started} ms, in=${result.inputTokens} out=${result.outputTokens})`);
    return true;
  } catch (error) {
    console.error(`  ${model}: FAILED ${error.code || error.name}: ${error.message}`);
    if (error.detail) console.error(`    ${JSON.stringify(error.detail)}`);
    return false;
  }
}

console.log(`Provider: ${describeAi()}`);

if (aiConfig.provider === "anthropic-vertex" || aiConfig.provider === "gemini-vertex") {
  const { vertexCredentials } = await import("../server/modules/ai/gcp-auth.js");
  console.log(`Vertex project=${aiConfig.vertex.projectId} region=${aiConfig.vertex.region} credentials=${vertexCredentials().label}\n`);
  const results = [];
  for (const model of new Set([aiConfig.models.chat, aiConfig.models.review])) results.push(await tryModel(model));
  if (results.includes(false)) {
    console.error("\nA 404 usually means the model ID is wrong, or the model is not enabled for this project or offered in this region.");
    console.error("A 403 means the Vertex AI API is not enabled, or the credentials lack the Vertex AI User role (roles/aiplatform.user).");
    process.exit(1);
  }
  console.log("\nVertex AI is working.");
  process.exit(0);
}

if (aiConfig.provider !== "openai-compat") {
  console.log("No real provider configured. Set VERTEX_PROJECT_ID or AI_API_KEY in .env (see .env.example).");
  process.exit(0);
}

console.log(`Endpoint: ${aiConfig.baseUrl}`);
const response = await fetch(`${aiConfig.baseUrl}/models`, { headers: { Authorization: `Bearer ${aiConfig.apiKey}` } });
if (!response.ok) {
  console.error(`Listing models failed: ${response.status} ${(await response.text()).slice(0, 300)}`);
  process.exit(1);
}
const ids = ((await response.json()).data || []).map((model) => model.id.replace(/^models\//, ""));
const chatModels = ids.filter((id) => /gemini|llama|gpt|qwen|mistral|claude/i.test(id) && !/embed|image|tts|veo|imagen|audio/i.test(id));
console.log(`\nChat models available to this key (${chatModels.length}):\n  ${chatModels.join("\n  ")}`);
if (!ids.includes(aiConfig.models.chat)) {
  console.error(`\nAI_MODEL "${aiConfig.models.chat}" is not in that list. Set AI_MODEL in .env to one of the models above.`);
  process.exit(1);
}

console.log("\nTest call:");
if (!(await tryModel(aiConfig.models.chat))) process.exit(1);
console.log("AI provider is working.");
