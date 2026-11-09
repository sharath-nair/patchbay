import { describe, expect, it } from "vitest";
import { createNode } from "@/store/useWorkflowStore";
import type { ExecEvent } from "@/types/execution";
import type { NodeKind, WorkflowEdge, WorkflowNode } from "@/types/workflow";
import { findCycle, runWorkflow } from "./executionEngine";

const node = (id: string, kind: NodeKind, data: Record<string, unknown> = {}): WorkflowNode => {
  const n = createNode(kind, { x: 0, y: 0 }, id);
  n.data = { ...n.data, ...data };
  return n;
};
const edge = (source: string, target: string, sourceHandle?: string): WorkflowEdge => ({
  id: `${source}->${target}${sourceHandle ? `:${sourceHandle}` : ""}`,
  source,
  target,
  sourceHandle,
  data: { status: "idle" },
});

async function run(nodes: WorkflowNode[], edges: WorkflowEdge[], extra: { signal?: AbortSignal; speed?: number } = {}) {
  const events: ExecEvent[] = [];
  const result = await runWorkflow({ nodes, edges, onEvent: (e) => events.push(e), speed: 0, ...extra });
  const statuses = (id: string) =>
    events.filter((e) => e.type === "node-status" && e.nodeId === id).map((e) => (e as { status: string }).status);
  const outputOf = (id: string) =>
    (events.findLast((e) => e.type === "node-status" && e.nodeId === id && e.status === "success") as { output?: string } | undefined)?.output;
  return { events, result, statuses, outputOf };
}

describe("runWorkflow", () => {
  it("runs a linear graph and passes output downstream", async () => {
    const nodes = [node("t", "trigger"), node("x", "transform", { template: "Result: {{input}}" }), node("o", "output")];
    const { result, statuses, outputOf, events } = await run(nodes, [edge("t", "x"), edge("x", "o")]);
    expect(result.status).toBe("success");
    expect(statuses("t")).toEqual(["running", "success"]);
    expect(statuses("o")).toEqual(["running", "success"]);
    expect(outputOf("o")).toBe("Result: Triggered (manual)");
    expect(events[0]).toEqual({ type: "run-start" });
    expect(events.at(-1)).toEqual({ type: "run-end", status: "success" });
  });

  it("marks edges running while data is in transit, then success", async () => {
    const { events } = await run([node("t", "trigger"), node("o", "output")], [edge("t", "o")]);
    const edgeEvents = events.filter((e) => e.type === "edge-status").map((e) => (e as { status: string }).status);
    expect(edgeEvents).toEqual(["running", "success"]);
  });

  it("streams prompt output progressively", async () => {
    const { events } = await run([node("t", "trigger"), node("p", "prompt", { prompt: "hi" })], [edge("t", "p")]);
    const chunks = events.filter((e) => e.type === "node-output").map((e) => (e as { output: string }).output);
    expect(chunks.length).toBeGreaterThan(5);
    expect(chunks[1].startsWith(chunks[0])).toBe(true);
    expect(chunks.at(-1)!.length).toBeGreaterThan(chunks[0].length);
  });

  it("follows only the taken condition branch and skips the other", async () => {
    const nodes = [node("t", "trigger"), node("c", "condition", { expression: "ok" }), node("yes", "output"), node("no", "output")];
    const edges = [edge("t", "c"), edge("c", "yes", "true"), edge("c", "no", "false")];
    const { result, statuses } = await run(nodes, edges);
    expect(result.status).toBe("success");
    expect(statuses("yes")).toEqual(["running", "success"]);
    expect(statuses("no")).toEqual([]); // never ran
  });

  it("routes to the false branch when the expression says so", async () => {
    const nodes = [node("t", "trigger"), node("c", "condition", { expression: "x == false" }), node("yes", "output"), node("no", "output")];
    const edges = [edge("t", "c"), edge("c", "yes", "true"), edge("c", "no", "false")];
    const { statuses } = await run(nodes, edges);
    expect(statuses("no")).toEqual(["running", "success"]);
    expect(statuses("yes")).toEqual([]);
  });

  it("skips everything downstream of a skipped branch", async () => {
    const nodes = [node("t", "trigger"), node("c", "condition"), node("a", "output"), node("b", "transform"), node("bo", "output")];
    const edges = [edge("t", "c"), edge("c", "a", "true"), edge("c", "b", "false"), edge("b", "bo")];
    const { statuses, result } = await run(nodes, edges);
    expect(result.status).toBe("success");
    expect(statuses("b")).toEqual([]);
    expect(statuses("bo")).toEqual([]);
  });

  it("runs parallel branches concurrently and waits for both before a join", async () => {
    const nodes = [node("t", "trigger"), node("a", "transform", { template: "A:{{input}}" }), node("b", "transform", { template: "B:{{input}}" }), node("j", "output")];
    const edges = [edge("t", "a"), edge("t", "b"), edge("a", "j"), edge("b", "j")];
    const { events, outputOf } = await run(nodes, edges);
    const order = events.filter((e) => e.type === "node-status").map((e) => `${(e as { nodeId: string }).nodeId}:${(e as { status: string }).status}`);
    expect(order.indexOf("a:running")).toBeLessThan(order.indexOf("a:success"));
    expect(order.indexOf("b:running")).toBeLessThan(order.indexOf("a:success")); // b started before a finished
    expect(order.indexOf("j:running")).toBeGreaterThan(order.indexOf("a:success"));
    expect(order.indexOf("j:running")).toBeGreaterThan(order.indexOf("b:success"));
    expect(outputOf("j")).toContain("A:");
    expect(outputOf("j")).toContain("B:");
  });

  it("stops on error, flags the failing node, and does not run downstream nodes", async () => {
    const nodes = [node("t", "trigger"), node("p", "prompt", { label: "Boom", prompt: "[fail]" }), node("o", "output")];
    const { result, statuses } = await run(nodes, [edge("t", "p"), edge("p", "o")]);
    expect(result.status).toBe("error");
    expect(result.error).toContain("Boom");
    expect(statuses("p")).toEqual(["running", "error"]);
    expect(statuses("o")).toEqual([]);
  });

  it("can be cancelled mid-run", async () => {
    const controller = new AbortController();
    const nodes = [node("t", "trigger"), node("p", "prompt", { prompt: "hi" }), node("o", "output")];
    const promise = run(nodes, [edge("t", "p"), edge("p", "o")], { signal: controller.signal, speed: 0.05 });
    setTimeout(() => controller.abort(), 30);
    const { result, statuses } = await promise;
    expect(result.status).toBe("cancelled");
    expect(statuses("o")).toEqual([]);
  });

  it("refuses to run a graph with no trigger", async () => {
    const { result, events } = await run([node("o", "output")], []);
    expect(result.status).toBe("error");
    expect(result.error).toMatch(/trigger/i);
    expect(events.some((e) => e.type === "node-status")).toBe(false);
  });

  it("refuses to run a graph with a cycle", async () => {
    const nodes = [node("t", "trigger"), node("a", "transform"), node("b", "transform")];
    const { result } = await run(nodes, [edge("t", "a"), edge("a", "b"), edge("b", "a")]);
    expect(result.status).toBe("error");
    expect(result.error).toMatch(/cycle/i);
  });

  it("ignores nodes that are not reachable from a trigger", async () => {
    const { statuses, result } = await run([node("t", "trigger"), node("orphan", "output")], []);
    expect(result.status).toBe("success");
    expect(statuses("orphan")).toEqual([]);
  });

  it("uses a custom executor, so new node kinds don't touch the engine", async () => {
    const events: ExecEvent[] = [];
    await runWorkflow({
      nodes: [node("t", "trigger"), node("o", "output")],
      edges: [edge("t", "o")],
      onEvent: (e) => events.push(e),
      speed: 0,
      getExecutor: (kind) => async () => ({ output: `custom:${kind}` }),
    });
    expect(events).toContainEqual({ type: "node-status", nodeId: "o", status: "success", output: "custom:output" });
  });
});

describe("findCycle", () => {
  it("returns nothing for a DAG and the cyclic nodes otherwise", () => {
    const n = [node("a", "trigger"), node("b", "transform"), node("c", "transform")];
    expect(findCycle(n, [edge("a", "b"), edge("b", "c")])).toEqual([]);
    expect(findCycle(n, [edge("a", "b"), edge("b", "c"), edge("c", "b")]).sort()).toEqual(["b", "c"]);
  });
});
