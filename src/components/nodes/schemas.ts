import { z } from "zod";

/** User-editable config for each node kind. Runtime fields (status, output) live outside the schema. */
export const triggerSchema = z.object({
  label: z.string().min(1),
  triggerType: z.enum(["manual", "schedule", "webhook"]),
});

export const promptSchema = z.object({
  label: z.string().min(1),
  model: z.enum(["fast", "balanced", "smart"]),
  prompt: z.string(),
  temperature: z.number().min(0).max(1),
});

export const conditionSchema = z.object({
  label: z.string().min(1),
  expression: z.string(),
});

export const transformSchema = z.object({
  label: z.string().min(1),
  template: z.string(),
});

export const outputSchema = z.object({
  label: z.string().min(1),
  format: z.enum(["text", "json", "markdown"]),
});
