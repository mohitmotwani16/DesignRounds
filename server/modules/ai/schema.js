import { z } from "zod";

// Builders for model-output schemas. Lengths and list sizes are trimmed rather than
// rejected, so a slightly verbose answer is kept instead of failing the whole call.
export const text = (max, description) => z.string().transform((value) => value.trim().slice(0, max)).describe(description);
export const list = (item, { min = 0, max }, description) => z.array(item).min(min).transform((items) => items.slice(0, max)).describe(description);
export const integer = (min, max, description) => z.number().int().min(min).max(max).describe(description);
export const oneOf = (values, description) => z.enum(values).describe(description);

// Converts the subset of zod used above into the JSON Schema sent as the model's
// response format. Every property is required and no extra keys are allowed,
// which keeps the schema within what structured-output providers accept.
// Reads zod 4's schema definitions (`_zod.def`) and their checks. The output is
// identical to what earlier versions sent to providers.
const checkOf = (def, name) => (def.checks ?? []).map((entry) => entry._zod.def).find((entry) => entry.check === name);

export function toJsonSchema(schema) {
  const { def } = schema._zod;
  const description = schema.description ? { description: schema.description } : {};
  switch (def.type) {
    case "pipe":
      // .transform(): the model writes the input side.
      return { ...toJsonSchema(def.in), ...description };
    case "object": {
      const properties = Object.fromEntries(Object.entries(def.shape).map(([key, value]) => [key, toJsonSchema(value)]));
      return { type: "object", ...description, properties, required: Object.keys(def.shape), additionalProperties: false };
    }
    case "array": {
      const min = checkOf(def, "min_length");
      return { type: "array", ...description, items: toJsonSchema(def.element), ...(min ? { minItems: min.minimum } : {}) };
    }
    case "string":
      return { type: "string", ...description };
    case "boolean":
      return { type: "boolean", ...description };
    case "number": {
      const min = checkOf(def, "greater_than");
      const max = checkOf(def, "less_than");
      return {
        type: checkOf(def, "number_format")?.format === "safeint" ? "integer" : "number",
        ...description,
        ...(min ? { minimum: min.value } : {}),
        ...(max ? { maximum: max.value } : {}),
      };
    }
    case "enum":
      return { type: "string", enum: Object.values(def.entries), ...description };
    default:
      throw new Error(`toJsonSchema: unsupported zod type ${def.type}`);
  }
}

// Claude's structured outputs reject numeric bounds and array sizes above one, so
// those move into the description, where the model still reads them. The zod schema
// keeps enforcing them when the reply is parsed.
export function toClaudeSchema(schema) {
  const { minimum, maximum, minItems, ...out } = schema;
  if (out.properties) out.properties = Object.fromEntries(Object.entries(out.properties).map(([key, value]) => [key, toClaudeSchema(value)]));
  if (out.items) out.items = toClaudeSchema(out.items);
  const notes = [];
  if (minimum !== undefined && maximum !== undefined) notes.push(`Between ${minimum} and ${maximum}.`);
  else if (minimum !== undefined) notes.push(`At least ${minimum}.`);
  else if (maximum !== undefined) notes.push(`At most ${maximum}.`);
  if (minItems > 1) notes.push(`At least ${minItems} items.`);
  else if (minItems !== undefined) out.minItems = minItems;
  if (notes.length) out.description = [out.description, ...notes].filter(Boolean).join(" ");
  return out;
}

// Short, model-readable description of why output failed validation.
export function describeIssues(error) {
  return error.issues.slice(0, 8).map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`).join("; ");
}
