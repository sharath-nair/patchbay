import { create } from "zustand";
import {
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  type Connection,
  type EdgeChange,
  type NodeChange,
  type XYPosition,
} from "@xyflow/react";
import { nodeRegistry } from "@/components/nodes/registry";
import type { NodeKind, WorkflowEdge, WorkflowNode } from "@/types/workflow";

interface WorkflowState {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  setGraph: (nodes: WorkflowNode[], edges: WorkflowEdge[]) => void;
  onNodesChange: (changes: NodeChange<WorkflowNode>[]) => void;
  onEdgesChange: (changes: EdgeChange<WorkflowEdge>[]) => void;
  onConnect: (connection: Connection) => void;
  addNode: (kind: NodeKind, position: XYPosition) => WorkflowNode;
  /** Patch one node's data. Only that node's object identity changes, so only its subscribers re-render. */
  updateNodeData: (id: string, patch: Partial<WorkflowNode["data"]>) => void;
}

/** Selector factory: subscribe to a single node by id. Re-renders only when that node's object changes. */
export const selectNodeById = (id: string) => (s: { nodes: WorkflowNode[] }) => s.nodes.find((n) => n.id === id);

/** Selector: the currently selected node (first one, if several are selected). */
export const selectSelectedNode = (s: { nodes: WorkflowNode[] }) => s.nodes.find((n) => n.selected);

export function createNode(kind: NodeKind, position: XYPosition, id?: string): WorkflowNode {
  return {
    id: id ?? `${kind}-${crypto.randomUUID().slice(0, 8)}`,
    type: kind,
    position,
    data: { ...nodeRegistry[kind].defaults, status: "idle" } as WorkflowNode["data"],
  };
}

export const useWorkflowStore = create<WorkflowState>((set, get) => ({
  nodes: [],
  edges: [],
  setGraph: (nodes, edges) => set({ nodes, edges }),
  onNodesChange: (changes) => set({ nodes: applyNodeChanges(changes, get().nodes) }),
  onEdgesChange: (changes) => set({ edges: applyEdgeChanges(changes, get().edges) }),
  onConnect: (connection) =>
    set({ edges: addEdge({ ...connection, data: { status: "idle" } }, get().edges) as WorkflowEdge[] }),
  addNode: (kind, position) => {
    const node = createNode(kind, position);
    set({ nodes: [...get().nodes, node] });
    return node;
  },
  updateNodeData: (id, patch) =>
    set({
      nodes: get().nodes.map((n) => (n.id === id ? { ...n, data: { ...n.data, ...patch } } : n)),
    }),
}));
