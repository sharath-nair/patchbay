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

/** Max undo steps kept; older entries are dropped so memory stays bounded. */
export const HISTORY_LIMIT = 20;

interface Snapshot {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
}

interface WorkflowState extends Snapshot {
  past: Snapshot[];
  future: Snapshot[];
  /** Bumped on undo/redo so forms bound to node data know to reset. */
  revision: number;
  setGraph: (nodes: WorkflowNode[], edges: WorkflowEdge[]) => void;
  onNodesChange: (changes: NodeChange<WorkflowNode>[]) => void;
  onEdgesChange: (changes: EdgeChange<WorkflowEdge>[]) => void;
  onConnect: (connection: Connection) => void;
  addNode: (kind: NodeKind, position: XYPosition) => WorkflowNode;
  /** Patch one node's data. Only that node's object identity changes, so only its subscribers re-render. */
  updateNodeData: (id: string, patch: Partial<WorkflowNode["data"]>) => void;
  /** Update node/edge run state without touching history (used by the execution engine). */
  patchRuntime: (nodeStatus?: Record<string, Partial<WorkflowNode["data"]>>, edgeStatus?: Record<string, WorkflowEdge["data"]>) => void;
  /** Explicitly snapshot the current graph as an undo step (e.g. at drag start). */
  commit: () => void;
  undo: () => void;
  redo: () => void;
}

/** Selector factory: subscribe to a single node by id. Re-renders only when that node's object changes. */
export const selectNodeById = (id: string) => (s: { nodes: WorkflowNode[] }) => s.nodes.find((n) => n.id === id);

/** Selector: the currently selected node (first one, if several are selected). */
export const selectSelectedNode = (s: { nodes: WorkflowNode[] }) => s.nodes.find((n) => n.selected);

export const selectCanUndo = (s: { past: Snapshot[] }) => s.past.length > 0;
export const selectCanRedo = (s: { future: Snapshot[] }) => s.future.length > 0;

export function createNode(kind: NodeKind, position: XYPosition, id?: string): WorkflowNode {
  return {
    id: id ?? `${kind}-${crypto.randomUUID().slice(0, 8)}`,
    type: kind,
    position,
    data: { ...nodeRegistry[kind].defaults, status: "idle" } as WorkflowNode["data"],
  };
}

export const useWorkflowStore = create<WorkflowState>((set, get) => {
  // Coalescing state lives outside React state: bursts of the same kind of change (typing in one
  // field, deleting a node plus its edges) collapse into a single undo step.
  let lastKey: string | null = null;
  let lastAt = 0;

  /** Push the current graph onto the undo stack unless this change coalesces with the previous one. */
  const record = (key?: string, windowMs = 0) => {
    const now = Date.now();
    const coalesce = key !== undefined && key === lastKey && now - lastAt < windowMs;
    lastKey = key ?? null;
    lastAt = now;
    if (coalesce) return;
    const { nodes, edges, past } = get();
    set({ past: [...past, { nodes, edges }].slice(-HISTORY_LIMIT), future: [] });
  };

  const jump = (from: "past" | "future") => {
    const state = get();
    const stack = state[from];
    if (stack.length === 0) return;
    const target = stack[stack.length - 1];
    const current: Snapshot = { nodes: state.nodes, edges: state.edges };
    lastKey = null;
    set({
      nodes: target.nodes,
      edges: target.edges,
      [from]: stack.slice(0, -1),
      [from === "past" ? "future" : "past"]: [...state[from === "past" ? "future" : "past"], current].slice(-HISTORY_LIMIT),
      revision: state.revision + 1,
    });
  };

  return {
    nodes: [],
    edges: [],
    past: [],
    future: [],
    revision: 0,
    setGraph: (nodes, edges) => {
      lastKey = null;
      set({ nodes, edges, past: [], future: [], revision: get().revision + 1 });
    },
    onNodesChange: (changes) => {
      if (changes.some((c) => c.type === "remove")) record("delete", 150);
      set({ nodes: applyNodeChanges(changes, get().nodes) });
    },
    onEdgesChange: (changes) => {
      if (changes.some((c) => c.type === "remove")) record("delete", 150);
      set({ edges: applyEdgeChanges(changes, get().edges) });
    },
    onConnect: (connection) => {
      record();
      set({ edges: addEdge({ ...connection, data: { status: "idle" } }, get().edges) as WorkflowEdge[] });
    },
    addNode: (kind, position) => {
      record();
      const node = createNode(kind, position);
      set({ nodes: [...get().nodes, node] });
      return node;
    },
    updateNodeData: (id, patch) => {
      record(`edit:${id}`, 800);
      set({ nodes: get().nodes.map((n) => (n.id === id ? { ...n, data: { ...n.data, ...patch } } : n)) });
    },
    patchRuntime: (nodeStatus = {}, edgeStatus = {}) =>
      set({
        nodes: get().nodes.map((n) => (nodeStatus[n.id] ? { ...n, data: { ...n.data, ...nodeStatus[n.id] } } : n)),
        edges: get().edges.map((e) => (edgeStatus[e.id] ? { ...e, data: { ...e.data, ...edgeStatus[e.id] } as WorkflowEdge["data"] } : e)),
      }),
    commit: () => record(),
    undo: () => jump("past"),
    redo: () => jump("future"),
  };
});
