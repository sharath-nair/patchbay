import { beforeEach, describe, expect, it } from "vitest";
import { useWorkflowStore } from "./useWorkflowStore";

describe("useWorkflowStore", () => {
  beforeEach(() => useWorkflowStore.getState().setGraph([], []));

  it("adds a node with registry defaults and idle status", () => {
    const node = useWorkflowStore.getState().addNode("prompt", { x: 10, y: 20 });
    const { nodes } = useWorkflowStore.getState();
    expect(nodes).toHaveLength(1);
    expect(node.type).toBe("prompt");
    expect(node.position).toEqual({ x: 10, y: 20 });
    expect(node.data.status).toBe("idle");
    expect(node.data.model).toBe("balanced");
  });

  it("connects two nodes", () => {
    const { addNode, onConnect } = useWorkflowStore.getState();
    const a = addNode("trigger", { x: 0, y: 0 });
    const b = addNode("output", { x: 200, y: 0 });
    onConnect({ source: a.id, target: b.id, sourceHandle: null, targetHandle: null });
    const { edges } = useWorkflowStore.getState();
    expect(edges).toHaveLength(1);
    expect(edges[0]).toMatchObject({ source: a.id, target: b.id });
  });
});
