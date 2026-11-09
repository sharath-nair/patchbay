import type { RunStatus } from "./workflow";

/** What the engine hands a node's executor. */
export interface ExecutionContext {
  nodeId: string;
  /** The node's user-editable config (its `data`). */
  config: Record<string, unknown>;
  /** Outputs of all delivered incoming edges, joined with newlines. */
  input: string;
  /** Abortable, speed-scaled delay. Rejects with an AbortError when the run is cancelled. */
  sleep: (ms: number) => Promise<void>;
  /** Stream partial output to the UI while the node is still running. */
  emitOutput: (partial: string) => void;
}

export interface ExecutionResult {
  output: string;
  /** Set by routing nodes (Condition): only edges whose sourceHandle matches are followed. */
  branch?: string;
}

export type Executor = (ctx: ExecutionContext) => Promise<ExecutionResult>;

export type ExecEvent =
  | { type: "run-start" }
  | { type: "node-status"; nodeId: string; status: RunStatus; output?: string; error?: string }
  | { type: "node-output"; nodeId: string; output: string }
  | { type: "edge-status"; edgeId: string; status: RunStatus }
  | { type: "run-end"; status: "success" | "error" | "cancelled"; error?: string };
