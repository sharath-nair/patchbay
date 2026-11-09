import { z } from "zod";

export type FieldSpec =
  | { name: string; title: string; kind: "text" | "textarea" }
  | { name: string; title: string; kind: "select"; options: string[] }
  | { name: string; title: string; kind: "number"; min?: number; max?: number }
  | { name: string; title: string; kind: "range"; min: number; max: number };

interface JsonSchemaProp {
  type?: string;
  enum?: string[];
  minimum?: number;
  maximum?: number;
  title?: string;
  widget?: string;
}

/** Derive a form description from a node's Zod schema via its JSON Schema representation. */
export function fieldsFromSchema(schema: z.ZodType): FieldSpec[] {
  const json = z.toJSONSchema(schema) as { properties?: Record<string, JsonSchemaProp> };
  return Object.entries(json.properties ?? {}).map(([name, prop]): FieldSpec => {
    const title = prop.title ?? name;
    if (prop.enum) return { name, title, kind: "select", options: prop.enum };
    if (prop.type === "number" || prop.type === "integer") {
      if (prop.minimum !== undefined && prop.maximum !== undefined) {
        return { name, title, kind: "range", min: prop.minimum, max: prop.maximum };
      }
      return { name, title, kind: "number", min: prop.minimum, max: prop.maximum };
    }
    return { name, title, kind: prop.widget === "textarea" ? "textarea" : "text" };
  });
}
