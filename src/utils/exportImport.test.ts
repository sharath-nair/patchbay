import { describe, expect, it } from "vitest";
import { createSampleWorkflow } from "./sampleWorkflow";
import { fileNameFor, parseWorkflow, serializeWorkflow, toWorkflowFile } from "./exportImport";

const sample = () => createSampleWorkflow();

describe("export / import", () => {
  it("round-trips a workflow", () => {
    const { nodes, edges } = sample();
    const result = parseWorkflow(serializeWorkflow("My flow", nodes, edges));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.name).toBe("My flow");
    expect(result.nodes.map((n) => n.id)).toEqual(nodes.map((n) => n.id));
    expect(result.edges.map((e) => [e.source, e.target, e.sourceHandle])).toEqual(edges.map((e) => [e.source, e.target, e.sourceHandle]));
    expect(result.nodes[1].data.prompt).toBe(nodes[1].data.prompt);
  });

  it("never persists run state", () => {
    const { nodes, edges } = sample();
    nodes[1].data = { ...nodes[1].data, status: "success", output: "secret output", error: "x" };
    edges[0] = { ...edges[0], className: "edge-success", data: { status: "success" } };
    const text = serializeWorkflow("Run state", nodes, edges);
    expect(text).not.toContain("secret output");
    expect(text).not.toContain("edge-success");
    const file = toWorkflowFile("Run state", nodes, edges);
    expect(file.nodes[1].data).not.toHaveProperty("status");
    const back = parseWorkflow(text);
    expect(back.ok && back.nodes[1].data.status).toBe("idle");
  });

  it("rejects malformed JSON", () => {
    const r = parseWorkflow("{nope");
    expect(r).toEqual({ ok: false, error: "That file isn't valid JSON." });
  });

  it("rejects files with the wrong shape or version", () => {
    expect(parseWorkflow("[]").ok).toBe(false);
    expect(parseWorkflow(JSON.stringify({ version: 2, name: "x", nodes: [], edges: [] })).ok).toBe(false);
  });

  it("rejects unknown node types", () => {
    const text = JSON.stringify({ version: 1, name: "x", nodes: [{ id: "a", type: "rocket", position: { x: 0, y: 0 }, data: {} }], edges: [] });
    expect(parseWorkflow(text).ok).toBe(false);
  });

  it("rejects node settings that fail the node's own schema", () => {
    const { nodes, edges } = sample();
    const file = toWorkflowFile("x", nodes, edges);
    file.nodes[1].data = { ...file.nodes[1].data, model: "enormous" };
    const r = parseWorkflow(JSON.stringify(file));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain("prompt-1");
  });

  it("rejects edges to missing nodes and duplicate ids", () => {
    const { nodes, edges } = sample();
    const dangling = toWorkflowFile("x", nodes, [...edges, { ...edges[0], id: "bad", target: "ghost" }]);
    const r1 = parseWorkflow(JSON.stringify(dangling));
    expect(r1.ok).toBe(false);
    if (!r1.ok) expect(r1.error).toContain("doesn't exist");

    const dup = toWorkflowFile("x", [...nodes, nodes[0]], edges);
    const r2 = parseWorkflow(JSON.stringify(dup));
    expect(r2.ok).toBe(false);
    if (!r2.ok) expect(r2.error).toContain("Duplicate node id");
  });

  it("builds a safe download file name", () => {
    expect(fileNameFor("My Flow: v2!")).toBe("my-flow-v2.patchbay.json");
    expect(fileNameFor("???")).toBe("workflow.patchbay.json");
  });
});
