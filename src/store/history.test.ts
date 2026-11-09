import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { HISTORY_LIMIT, useWorkflowStore } from "./useWorkflowStore";

const s = () => useWorkflowStore.getState();

describe("undo/redo history", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    s().setGraph([], []);
  });
  afterEach(() => vi.useRealTimers());

  it("undoes and redoes adding a node", () => {
    s().addNode("trigger", { x: 0, y: 0 });
    expect(s().nodes).toHaveLength(1);
    s().undo();
    expect(s().nodes).toHaveLength(0);
    s().redo();
    expect(s().nodes).toHaveLength(1);
  });

  it("clears the redo stack when a new change is made after undo", () => {
    s().addNode("trigger", { x: 0, y: 0 });
    s().undo();
    expect(s().future).toHaveLength(1);
    s().addNode("output", { x: 0, y: 0 });
    expect(s().future).toHaveLength(0);
  });

  it("undoes and redoes connections", () => {
    const a = s().addNode("trigger", { x: 0, y: 0 });
    const b = s().addNode("output", { x: 100, y: 0 });
    s().onConnect({ source: a.id, target: b.id, sourceHandle: null, targetHandle: null });
    expect(s().edges).toHaveLength(1);
    s().undo();
    expect(s().edges).toHaveLength(0);
    expect(s().nodes).toHaveLength(2);
    s().redo();
    expect(s().edges).toHaveLength(1);
  });

  it("collapses a burst of edits to one node into a single undo step", () => {
    const n = s().addNode("prompt", { x: 0, y: 0 });
    for (const t of ["h", "he", "hel", "hell", "hello"]) {
      s().updateNodeData(n.id, { prompt: t });
      vi.advanceTimersByTime(50);
    }
    expect(s().nodes[0].data.prompt).toBe("hello");
    s().undo();
    expect(s().nodes[0].data.prompt).toBe(""); // back to before the burst, node still exists
    expect(s().nodes).toHaveLength(1);
  });

  it("starts a new undo step after a pause in typing", () => {
    const n = s().addNode("prompt", { x: 0, y: 0 });
    s().updateNodeData(n.id, { prompt: "a" });
    vi.advanceTimersByTime(2000);
    s().updateNodeData(n.id, { prompt: "ab" });
    s().undo();
    expect(s().nodes[0].data.prompt).toBe("a");
  });

  it("treats deleting a node and its edges as one step", () => {
    const a = s().addNode("trigger", { x: 0, y: 0 });
    const b = s().addNode("output", { x: 100, y: 0 });
    s().onConnect({ source: a.id, target: b.id, sourceHandle: null, targetHandle: null });
    vi.advanceTimersByTime(1000);
    const edgeId = s().edges[0].id;
    // React Flow emits node removal, then the connected edge removal, back to back.
    s().onNodesChange([{ type: "remove", id: b.id }]);
    s().onEdgesChange([{ type: "remove", id: edgeId }]);
    expect(s().nodes).toHaveLength(1);
    expect(s().edges).toHaveLength(0);
    s().undo();
    expect(s().nodes).toHaveLength(2);
    expect(s().edges).toHaveLength(1);
  });

  it("caps history at the limit", () => {
    for (let i = 0; i < HISTORY_LIMIT + 10; i++) s().addNode("trigger", { x: i, y: 0 });
    expect(s().past).toHaveLength(HISTORY_LIMIT);
  });

  it("does not record runtime status patches", () => {
    const n = s().addNode("prompt", { x: 0, y: 0 });
    const pastLen = s().past.length;
    s().patchRuntime({ [n.id]: { status: "running" } });
    expect(s().nodes[0].data.status).toBe("running");
    expect(s().past).toHaveLength(pastLen);
  });

  it("is a no-op when there is nothing to undo or redo", () => {
    s().undo();
    s().redo();
    expect(s().nodes).toHaveLength(0);
  });
});
