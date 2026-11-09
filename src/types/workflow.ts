import type { Edge, Node } from "@xyflow/react";

export type NodeKind = "trigger" | "prompt" | "condition" | "transform" | "output";

export type RunStatus = "idle" | "running" | "success" | "error";

/** Base payload shared by every node; each kind extends it via the registry. */
export interface BaseNodeData extends Record<string, unknown> {
  label: string;
  status: RunStatus;
  output?: string;
  error?: string;
}

export type WorkflowNode = Node<BaseNodeData, NodeKind>;

export interface WorkflowEdgeData extends Record<string, unknown> {
  status: RunStatus;
}

export type WorkflowEdge = Edge<WorkflowEdgeData>;

export interface Workflow {
  id: string;
  name: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  updatedAt: string;
}
