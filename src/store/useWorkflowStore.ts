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
import type { ExecEvent } from "@/types/execution";
import type { NodeKind, RunStatus, WorkflowEdge, WorkflowNode } from "@/types/workflow";
import { runWorkflow } from "@/utils/executionEngine";

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
  isRunning: boolean;
  /** Human-readable result of the last run (error message, or null). */
  runError: string | null;
  setGraph: (nodes: WorkflowNode[], edges: WorkflowEdge[]) => void;
  onNodesChange: (changes: NodeChange<WorkflowNode>[]) => void;
  onEdgesChange: (changes: EdgeChange<WorkflowEdge>[]) => void;
  onConnect: (connection: Connection) => void;
  addNode: (kind: NodeKind, position: XYPosition) => WorkflowNode;
  /** Patch one node's data. Only that node's object identity changes, so only its subscribers re-render. */
  updateNodeData: (id: string, patch: Partial<WorkflowNode["data"]>) => void;
  /** Update node/edge run state without touching history (used by the execution engine). */
  patchRuntime: (nodeStatus?: Record<string, Partial<WorkflowNode["data"]>>, edgeStatus?: Record<string, RunStatus>) => void;
  /** Simulate running the workflow, animating node and edge state as it goes. */
  run: (options?: { speed?: number }) => Promise<void>;
  stop: () => void;
  /** Clear all run state (statuses, outputs, edge animation) without touching history. */
  resetRun: () => void;
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

const EDGE_CLASS: Record<RunStatus, string | undefined> = {
  idle: undefined,
  running: "edge-running",
  success: "edge-success",
  error: "edge-error",
};

let abortController: AbortController | null = null;

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
    isRunning: false,
    runError: null,
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
        edges: get().edges.map((e) =>
          edgeStatus[e.id]
            ? { ...e, className: EDGE_CLASS[edgeStatus[e.id]], data: { ...e.data, status: edgeStatus[e.id] } }
            : e,
        ),
      }),
    resetRun: () =>
      set({
        runError: null,
        nodes: get().nodes.map((n) => (n.data.status === "idle" && n.data.output === undefined && n.data.error === undefined ? n : { ...n, data: { ...n.data, status: "idle", output: undefined, error: undefined } })),
        edges: get().edges.map((e) => (e.data?.status === "idle" && !e.className ? e : { ...e, className: undefined, data: { ...e.data, status: "idle" } })),
      }),
    run: async (options) => {
      if (get().isRunning) return;
      get().resetRun();
      abortController = new AbortController();
      set({ isRunning: true });
      const apply = (event: ExecEvent) => {
        const { patchRuntime } = get();
        switch (event.type) {
          case "node-status":
            patchRuntime({
              [event.nodeId]: {
                status: event.status,
                ...(event.output !== undefined && { output: event.output }),
                ...(event.error !== undefined && { error: event.error }),
              },
            });
            break;
          case "node-output":
            patchRuntime({ [event.nodeId]: { output: event.output } });
            break;
          case "edge-status":
            patchRuntime({}, { [event.edgeId]: event.status });
            break;
          case "run-end":
            set({ runError: event.status === "error" ? (event.error ?? "Run failed") : null });
            break;
        }
      };
      try {
        const { status } = await runWorkflow({ nodes: get().nodes, edges: get().edges, onEvent: apply, signal: abortController.signal, speed: options?.speed });
        // A cancelled run can leave edges mid-animation; settle everything back to idle.
        if (status === "cancelled") get().resetRun();
      } finally {
        abortController = null;
        set({ isRunning: false });
      }
    },
    stop: () => abortController?.abort(),
    commit: () => record(),
    undo: () => jump("past"),
    redo: () => jump("future"),
  };
});
