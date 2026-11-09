import { createNode } from "@/store/useWorkflowStore";
import type { WorkflowEdge, WorkflowNode } from "@/types/workflow";

/** A small starter graph so the canvas isn't empty on first load. */
export function createSampleWorkflow(): { nodes: WorkflowNode[]; edges: WorkflowEdge[] } {
  const trigger = createNode("trigger", { x: 0, y: 120 }, "trigger-1");
  const prompt = createNode("prompt", { x: 300, y: 100 }, "prompt-1");
  prompt.data = { ...prompt.data, label: "Summarize article", prompt: "Summarize the following article in three bullet points." };
  const condition = createNode("condition", { x: 620, y: 100 }, "condition-1");
  condition.data = { ...condition.data, expression: "summary.length > 0" };
  const ok = createNode("output", { x: 940, y: 20 }, "output-ok");
  ok.data = { ...ok.data, label: "Publish summary" };
  const fail = createNode("output", { x: 940, y: 220 }, "output-fail");
  fail.data = { ...fail.data, label: "Log failure" };

  const edge = (id: string, source: string, target: string, sourceHandle?: string): WorkflowEdge => ({
    id,
    source,
    target,
    sourceHandle,
    data: { status: "idle" },
  });

  return {
    nodes: [trigger, prompt, condition, ok, fail],
    edges: [
      edge("e1", "trigger-1", "prompt-1"),
      edge("e2", "prompt-1", "condition-1"),
      edge("e3", "condition-1", "output-ok", "true"),
      edge("e4", "condition-1", "output-fail", "false"),
    ],
  };
}
