import { z } from "zod";

/**
 * User-editable config for each node kind. Runtime fields (status, output) live outside the schema.
 * `.meta()` carries UI hints (title, widget) that flow into the JSON Schema used by the property editor.
 */
const label = z.string().min(1, "Label is required").meta({ title: "Label" });

export const triggerSchema = z.object({
  label,
  triggerType: z.enum(["manual", "schedule", "webhook"]).meta({ title: "Trigger type" }),
});

export const promptSchema = z.object({
  label,
  model: z.enum(["fast", "balanced", "smart"]).meta({ title: "Model" }),
  prompt: z.string().meta({ title: "Prompt", widget: "textarea" }),
  temperature: z.number().min(0).max(1).meta({ title: "Temperature" }),
});

export const conditionSchema = z.object({
  label,
  expression: z.string().meta({ title: "Expression" }),
});

export const transformSchema = z.object({
  label,
  template: z.string().meta({ title: "Template", widget: "textarea" }),
});

export const outputSchema = z.object({
  label,
  format: z.enum(["text", "json", "markdown"]).meta({ title: "Format" }),
});
