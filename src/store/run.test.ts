import { beforeEach, describe, expect, it } from "vitest";
import { createSampleWorkflow } from "@/utils/sampleWorkflow";
import { useWorkflowStore } from "./useWorkflowStore";

const s = () => useWorkflowStore.getState();
const node = (id: string) => s().nodes.find((n) => n.id === id)!;

describe("running a workflow from the store", () => {
  beforeEach(() => {
    const { nodes, edges } = createSampleWorkflow();
    s().setGraph(nodes, edges);
  });

  it("marks nodes and edges as they complete and leaves history untouched", async () => {
    const pastBefore = s().past.length;
    await s().run({ speed: 0 });

    expect(s().isRunning).toBe(false);
    expect(s().runError).toBeNull();
    for (const id of ["trigger-1", "prompt-1", "condition-1", "output-ok"]) expect(node(id).data.status).toBe("success");
    expect(node("output-fail").data.status).toBe("idle"); // not-taken branch
    expect(node("prompt-1").data.output).toContain("key points");
    expect(s().edges.find((e) => e.id === "e1")?.className).toBe("edge-success");
    expect(s().edges.find((e) => e.id === "e4")?.className).toBeUndefined();
    expect(s().past).toHaveLength(pastBefore);
  });

  it("resetRun clears statuses, outputs and edge animation", async () => {
    await s().run({ speed: 0 });
    s().resetRun();
    expect(s().nodes.every((n) => n.data.status === "idle" && n.data.output === undefined)).toBe(true);
    expect(s().edges.every((e) => !e.className)).toBe(true);
  });

  it("surfaces an error and flags the failing node", async () => {
    s().updateNodeData("prompt-1", { prompt: "[fail]" });
    await s().run({ speed: 0 });
    expect(s().runError).toContain("Summarize article");
    expect(node("prompt-1").data.status).toBe("error");
    expect(node("output-ok").data.status).toBe("idle");
  });

  it("stop cancels the run and settles everything back to idle", async () => {
    const running = s().run({ speed: 0.05 });
    expect(s().isRunning).toBe(true);
    setTimeout(() => s().stop(), 30);
    await running;
    expect(s().isRunning).toBe(false);
    expect(s().nodes.every((n) => n.data.status === "idle")).toBe(true);
    expect(s().edges.every((e) => !e.className)).toBe(true);
  });

  it("ignores a second run() while one is in flight", async () => {
    const first = s().run({ speed: 0.05 });
    await s().run({ speed: 0 }); // returns immediately
    expect(s().isRunning).toBe(true);
    s().stop();
    await first;
  });
});
