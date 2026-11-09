import type { Executor } from "@/types/execution";

/**
 * Simulated executors. Nothing here calls a real model: the Prompt node streams a canned
 * response word by word so the UI has something realistic to animate.
 */

const CANNED =
  "Based on the input, here are the key points. First, the main idea is clear and well supported. Second, the supporting details reinforce it. Finally, the conclusion follows naturally from the evidence.".split(
    " ",
  );

const MODEL_DELAY_MS = { fast: 20, balanced: 40, smart: 70 } as const;

export const executeTrigger: Executor = async ({ config, sleep }) => {
  await sleep(200);
  return { output: `Triggered (${String(config.triggerType ?? "manual")})` };
};

export const executePrompt: Executor = async ({ config, sleep, emitOutput }) => {
  const prompt = String(config.prompt ?? "");
  if (prompt.includes("[fail]")) {
    await sleep(300);
    throw new Error("Model request failed (simulated via [fail] in prompt)");
  }
  const delay = MODEL_DELAY_MS[config.model as keyof typeof MODEL_DELAY_MS] ?? MODEL_DELAY_MS.balanced;
  await sleep(350); // time to first token
  let out = "";
  for (const word of CANNED) {
    out += (out ? " " : "") + word;
    emitOutput(out);
    await sleep(delay);
  }
  return { output: out };
};

export const executeCondition: Executor = async ({ config, input, sleep }) => {
  await sleep(250);
  // Simulation: no expression evaluation. Expressions mentioning false/fail/error route to "false".
  const falsy = /\b(false|fail|error)\b/i.test(String(config.expression ?? ""));
  return { output: input, branch: falsy ? "false" : "true" };
};

export const executeTransform: Executor = async ({ config, input, sleep }) => {
  await sleep(250);
  const template = String(config.template ?? "");
  return { output: template ? template.replaceAll("{{input}}", input) : input };
};

export const executeOutput: Executor = async ({ config, input, sleep }) => {
  await sleep(200);
  const format = String(config.format ?? "text");
  if (format === "json") return { output: JSON.stringify({ result: input }, null, 2) };
  if (format === "markdown") return { output: `> ${input.replaceAll("\n", "\n> ")}` };
  return { output: input };
};
