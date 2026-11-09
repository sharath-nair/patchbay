import { describe, expect, it } from "vitest";
import type { Workflow } from "./workflow";

describe("workflow types", () => {
  it("accepts an empty workflow", () => {
    const w: Workflow = { id: "a", name: "Empty", nodes: [], edges: [], updatedAt: new Date().toISOString() };
    expect(w.nodes).toHaveLength(0);
  });
});
