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
export function toJsonSchema(schema) {
  const def = schema._def;
  const description = schema.description ? { description: schema.description } : {};
  switch (def.typeName) {
    case "ZodEffects":
      return { ...toJsonSchema(def.schema), ...description };
    case "ZodObject": {
      const shape = def.shape();
      const properties = Object.fromEntries(Object.entries(shape).map(([key, value]) => [key, toJsonSchema(value)]));
      return { type: "object", ...description, properties, required: Object.keys(shape), additionalProperties: false };
    }
    case "ZodArray":
      return { type: "array", ...description, items: toJsonSchema(def.type), ...(def.minLength ? { minItems: def.minLength.value } : {}) };
    case "ZodString":
      return { type: "string", ...description };
    case "ZodNumber": {
      const check = (kind) => def.checks.find((entry) => entry.kind === kind);
      return {
        type: check("int") ? "integer" : "number",
        ...description,
        ...(check("min") ? { minimum: check("min").value } : {}),
        ...(check("max") ? { maximum: check("max").value } : {}),
      };
    }
    case "ZodEnum":
      return { type: "string", enum: def.values, ...description };
    default:
      throw new Error(`toJsonSchema: unsupported zod type ${def.typeName}`);
  }
}

// Short, model-readable description of why output failed validation.
export function describeIssues(error) {
  return error.issues.slice(0, 8).map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`).join("; ");
}
