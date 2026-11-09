import { describe, expect, it } from "vitest";
import { nodeKinds, nodeRegistry, nodeTypes } from "./registry";

describe("node registry", () => {
  it("registers a definition for every node kind", () => {
    expect(nodeKinds.sort()).toEqual(["condition", "output", "prompt", "transform", "trigger"]);
    for (const kind of nodeKinds) expect(nodeRegistry[kind].kind).toBe(kind);
  });

  it("has defaults that satisfy each schema", () => {
    for (const kind of nodeKinds) {
      const { schema, defaults } = nodeRegistry[kind];
      expect(schema.safeParse(defaults).success, `defaults for ${kind}`).toBe(true);
    }
  });

  it("exposes a component for every kind via nodeTypes", () => {
    for (const kind of nodeKinds) expect(nodeTypes[kind]).toBeDefined();
  });
});
