import { beforeEach, describe, expect, it } from "vitest";
import { createSampleWorkflow } from "./sampleWorkflow";
import { createWorkflow, deleteWorkflow, duplicateWorkflow, getWorkflow, listWorkflows, saveWorkflow, workflowStorage } from "./persistence";

const raw = () => workflowStorage.getSnapshot();

describe("workflow persistence", () => {
  beforeEach(() => localStorage.clear());

  it("starts empty", () => {
    expect(listWorkflows(raw())).toEqual([]);
  });

  it("creates, reads, updates and deletes a workflow", () => {
    const { nodes, edges } = createSampleWorkflow();
    const id = createWorkflow("First", nodes, edges);
    expect(getWorkflow(raw(), id)?.nodes).toHaveLength(5);

    saveWorkflow(id, "Renamed", nodes.slice(0, 2), []);
    const updated = getWorkflow(raw(), id)!;
    expect(updated.name).toBe("Renamed");
    expect(updated.nodes).toHaveLength(2);

    deleteWorkflow(id);
    expect(getWorkflow(raw(), id)).toBeUndefined();
  });

  it("lists most recently updated first", async () => {
    const a = createWorkflow("A");
    await new Promise((r) => setTimeout(r, 5));
    createWorkflow("B");
    await new Promise((r) => setTimeout(r, 5));
    saveWorkflow(a, "A", [], []);
    expect(listWorkflows(raw()).map((w) => w.name)).toEqual(["A", "B"]);
  });

  it("duplicates with a new id and a (copy) suffix", () => {
    const { nodes, edges } = createSampleWorkflow();
    const id = createWorkflow("Orig", nodes, edges);
    const copy = duplicateWorkflow(id)!;
    expect(copy).not.toBe(id);
    expect(getWorkflow(raw(), copy)?.name).toBe("Orig (copy)");
    expect(listWorkflows(raw())).toHaveLength(2);
    expect(duplicateWorkflow("missing")).toBeUndefined();
  });

  it("survives corrupt storage and drops invalid entries", () => {
    localStorage.setItem("patchbay:workflows:v1", "{not json");
    expect(listWorkflows(raw())).toEqual([]);

    const good = createWorkflow("Good");
    localStorage.setItem(
      "patchbay:workflows:v1",
      JSON.stringify({
        ...JSON.parse(raw() || "{}"),
        bad: { id: "bad", updatedAt: "2026-01-01", file: { version: 1, name: "Bad", nodes: [{ id: "x", type: "nope" }], edges: [] } },
      }),
    );
    expect(listWorkflows(raw()).map((w) => w.id)).toEqual([good]);
  });

  it("notifies subscribers on change", () => {
    let calls = 0;
    const unsubscribe = workflowStorage.subscribe(() => calls++);
    createWorkflow("x");
    unsubscribe();
    createWorkflow("y");
    expect(calls).toBe(1);
  });
});
