import { describe, expect, it } from "vitest";
import { nodeKinds, nodeRegistry } from "@/components/nodes/registry";
import { fieldsFromSchema } from "./schemaFields";

describe("fieldsFromSchema", () => {
  it("maps the prompt schema to the right controls", () => {
    const fields = fieldsFromSchema(nodeRegistry.prompt.schema);
    expect(fields).toEqual([
      { name: "label", title: "Label", kind: "text" },
      { name: "model", title: "Model", kind: "select", options: ["fast", "balanced", "smart"] },
      { name: "prompt", title: "Prompt", kind: "textarea" },
      { name: "temperature", title: "Temperature", kind: "range", min: 0, max: 1 },
    ]);
  });

  it("produces a field for every default config key on every node kind", () => {
    for (const kind of nodeKinds) {
      const names = fieldsFromSchema(nodeRegistry[kind].schema).map((f) => f.name).sort();
      expect(names, kind).toEqual(Object.keys(nodeRegistry[kind].defaults).sort());
    }
  });
});
