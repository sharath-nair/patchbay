import { z } from "zod";
import { nodeKinds, nodeRegistry } from "@/components/nodes/registry";
import type { NodeKind, WorkflowEdge, WorkflowNode } from "@/types/workflow";

/** Current on-disk format. Bump when the shape changes and add a migration in `parseWorkflow`. */
export const FILE_VERSION = 1;

const nodeSchema = z.object({
  id: z.string().min(1),
  type: z.enum(nodeKinds as [NodeKind, ...NodeKind[]]),
  position: z.object({ x: z.number(), y: z.number() }),
  data: z.record(z.string(), z.unknown()),
});

const edgeSchema = z.object({
  id: z.string().min(1),
  source: z.string().min(1),
  target: z.string().min(1),
  sourceHandle: z.string().nullish(),
  targetHandle: z.string().nullish(),
});

export const workflowFileSchema = z.object({
  version: z.literal(FILE_VERSION),
  name: z.string().trim().min(1).max(100),
  nodes: z.array(nodeSchema),
  edges: z.array(edgeSchema),
});

export type WorkflowFile = z.infer<typeof workflowFileSchema>;

export type ParseResult =
  | { ok: true; name: string; nodes: WorkflowNode[]; edges: WorkflowEdge[] }
  | { ok: false; error: string };

/** Build the on-disk object. Run state (status, output, error, edge animation) is never persisted. */
export function toWorkflowFile(name: string, nodes: WorkflowNode[], edges: WorkflowEdge[]): WorkflowFile {
  return {
    version: FILE_VERSION,
    name,
    nodes: nodes.map((n) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { status, output, error, ...config } = n.data;
      return { id: n.id, type: n.type as NodeKind, position: { x: n.position.x, y: n.position.y }, data: config };
    }),
    edges: edges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      sourceHandle: e.sourceHandle ?? null,
      targetHandle: e.targetHandle ?? null,
    })),
  };
}

export function serializeWorkflow(name: string, nodes: WorkflowNode[], edges: WorkflowEdge[]): string {
  return JSON.stringify(toWorkflowFile(name, nodes, edges), null, 2);
}

const fail = (error: string): ParseResult => ({ ok: false, error });

/** Validate a file object (shape, unique ids, edge references, per-node config) and hydrate it into graph state. */
export function hydrateWorkflowFile(input: unknown): ParseResult {
  const parsed = workflowFileSchema.safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const where = issue.path.length ? ` (at ${issue.path.join(".")})` : "";
    return fail(`Not a valid Patchbay workflow: ${issue.message}${where}`);
  }
  const { name, nodes: rawNodes, edges: rawEdges } = parsed.data;

  const ids = new Set<string>();
  const nodes: WorkflowNode[] = [];
  for (const n of rawNodes) {
    if (ids.has(n.id)) return fail(`Duplicate node id "${n.id}".`);
    ids.add(n.id);
    const config = nodeRegistry[n.type].schema.safeParse(n.data);
    if (!config.success) {
      const issue = config.error.issues[0];
      return fail(`Node "${n.id}" (${n.type}) has invalid settings: ${issue.path.join(".") || "data"} ${issue.message}`);
    }
    nodes.push({
      id: n.id,
      type: n.type,
      position: n.position,
      data: { ...config.data, status: "idle" } as WorkflowNode["data"],
    });
  }

  const edgeIds = new Set<string>();
  const edges: WorkflowEdge[] = [];
  for (const e of rawEdges) {
    if (edgeIds.has(e.id)) return fail(`Duplicate edge id "${e.id}".`);
    edgeIds.add(e.id);
    if (!ids.has(e.source) || !ids.has(e.target)) return fail(`Edge "${e.id}" connects a node that doesn't exist.`);
    edges.push({
      id: e.id,
      source: e.source,
      target: e.target,
      sourceHandle: e.sourceHandle ?? undefined,
      targetHandle: e.targetHandle ?? undefined,
      data: { status: "idle" },
    });
  }

  return { ok: true, name, nodes, edges };
}

/** Parse the text of an exported workflow file. Never throws. */
export function parseWorkflow(text: string): ParseResult {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return fail("That file isn't valid JSON.");
  }
  return hydrateWorkflowFile(json);
}

/** Trigger a browser download of `text` as `filename`. */
export function downloadText(filename: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: "application/json" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export const fileNameFor = (name: string) => `${name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "workflow"}.patchbay.json`;
