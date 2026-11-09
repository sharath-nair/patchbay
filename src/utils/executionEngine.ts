import { nodeRegistry } from "@/components/nodes/registry";
import type { ExecEvent, Executor } from "@/types/execution";
import type { WorkflowEdge, WorkflowNode } from "@/types/workflow";

export interface RunOptions {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  onEvent: (event: ExecEvent) => void;
  signal?: AbortSignal;
  /** Multiplier for all simulated delays. 1 = normal, 0 = as fast as possible (tests). */
  speed?: number;
  /** Override how a node kind executes (defaults to the node registry). */
  getExecutor?: (kind: string) => Executor | undefined;
}

export interface RunResult {
  status: "success" | "error" | "cancelled";
  error?: string;
}

/** Time an edge shows "data in transit" before the target node can start. */
const EDGE_TRAVEL_MS = 400;

type EdgeState = "pending" | "delivered" | "skipped";

/** Returns the ids of nodes on a cycle, or an empty array if the graph is acyclic (Kahn's algorithm). */
export function findCycle(nodes: WorkflowNode[], edges: WorkflowEdge[]): string[] {
  const indegree = new Map(nodes.map((n) => [n.id, 0]));
  for (const e of edges) if (indegree.has(e.target) && indegree.has(e.source)) indegree.set(e.target, indegree.get(e.target)! + 1);
  const queue = [...indegree].filter(([, d]) => d === 0).map(([id]) => id);
  let seen = 0;
  while (queue.length) {
    const id = queue.pop()!;
    seen++;
    for (const e of edges) {
      if (e.source !== id || !indegree.has(e.target)) continue;
      const d = indegree.get(e.target)! - 1;
      indegree.set(e.target, d);
      if (d === 0) queue.push(e.target);
    }
  }
  return seen === nodes.length ? [] : [...indegree].filter(([, d]) => d > 0).map(([id]) => id);
}

const isAbort = (err: unknown) => err instanceof DOMException && err.name === "AbortError";

/**
 * Simulate running the graph. Starts at Trigger nodes, runs independent branches in parallel,
 * waits for all live inputs before running a join, and follows only the taken branch of
 * routing nodes (anything downstream of a skipped branch is skipped too).
 */
export async function runWorkflow(options: RunOptions): Promise<RunResult> {
  const { nodes, edges, onEvent, signal, speed = 1 } = options;
  const getExecutor = options.getExecutor ?? ((kind: string) => nodeRegistry[kind as keyof typeof nodeRegistry]?.execute);
  const emit = onEvent;

  const finish = (result: RunResult): RunResult => {
    emit({ type: "run-end", ...result });
    return result;
  };

  emit({ type: "run-start" });

  const triggers = nodes.filter((n) => n.type === "trigger");
  if (triggers.length === 0) return finish({ status: "error", error: "Add a Trigger node to start the workflow." });
  if (findCycle(nodes, edges).length > 0) return finish({ status: "error", error: "The workflow contains a cycle." });

  // Only nodes reachable from a trigger take part; the rest are ignored.
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const reachable = new Set<string>(triggers.map((t) => t.id));
  for (const frontier = [...reachable]; frontier.length; ) {
    const id = frontier.pop()!;
    for (const e of edges) {
      if (e.source === id && byId.has(e.target) && !reachable.has(e.target)) {
        reachable.add(e.target);
        frontier.push(e.target);
      }
    }
  }
  const liveEdges = edges.filter((e) => reachable.has(e.source) && reachable.has(e.target));
  const incoming = (id: string) => liveEdges.filter((e) => e.target === id);
  const outgoing = (id: string) => liveEdges.filter((e) => e.source === id);

  const edgeState = new Map<string, EdgeState>(liveEdges.map((e) => [e.id, "pending"]));
  const outputs = new Map<string, string>();
  const started = new Set<string>();
  const tasks: Promise<void>[] = [];
  let halted: RunResult | null = null;

  const sleep = (ms: number) =>
    new Promise<void>((resolve, reject) => {
      if (signal?.aborted) return reject(new DOMException("Aborted", "AbortError"));
      const timer = setTimeout(() => {
        signal?.removeEventListener("abort", onAbort);
        resolve();
      }, ms * speed);
      const onAbort = () => {
        clearTimeout(timer);
        reject(new DOMException("Aborted", "AbortError"));
      };
      signal?.addEventListener("abort", onAbort, { once: true });
    });

  const isReady = (id: string) => incoming(id).every((e) => edgeState.get(e.id) !== "pending");

  const tryStart = (id: string) => {
    if (started.has(id) || halted || signal?.aborted || !isReady(id)) return;
    started.add(id);
    tasks.push(runNode(id));
  };

  const skipOutgoing = (id: string) => {
    for (const e of outgoing(id)) {
      edgeState.set(e.id, "skipped");
      tryStart(e.target);
    }
  };

  async function runNode(id: string): Promise<void> {
    const node = byId.get(id)!;
    const delivered = incoming(id).filter((e) => edgeState.get(e.id) === "delivered");
    const isRoot = incoming(id).length === 0;

    // Every path into this node was skipped, so skip it and everything that depends only on it.
    if (!isRoot && delivered.length === 0) return skipOutgoing(id);

    const execute = getExecutor(String(node.type));
    emit({ type: "node-status", nodeId: id, status: "running" });
    try {
      if (!execute) throw new Error(`No executor registered for node kind "${node.type}"`);
      const result = await execute({
        nodeId: id,
        config: node.data,
        input: delivered.map((e) => outputs.get(e.source) ?? "").join("\n"),
        sleep,
        emitOutput: (partial) => emit({ type: "node-output", nodeId: id, output: partial }),
      });
      outputs.set(id, result.output);
      emit({ type: "node-status", nodeId: id, status: "success", output: result.output });

      await Promise.all(
        outgoing(id).map(async (e) => {
          const taken = result.branch === undefined || e.sourceHandle === result.branch;
          if (taken) {
            emit({ type: "edge-status", edgeId: e.id, status: "running" });
            await sleep(EDGE_TRAVEL_MS);
            emit({ type: "edge-status", edgeId: e.id, status: "success" });
            edgeState.set(e.id, "delivered");
          } else {
            edgeState.set(e.id, "skipped");
          }
          tryStart(e.target);
        }),
      );
    } catch (err) {
      if (isAbort(err) || signal?.aborted) {
        emit({ type: "node-status", nodeId: id, status: "idle" });
        return;
      }
      const message = err instanceof Error ? err.message : String(err);
      halted ??= { status: "error", error: `${String(node.data.label ?? id)}: ${message}` };
      emit({ type: "node-status", nodeId: id, status: "error", error: message });
    }
  }

  for (const t of triggers) tryStart(t.id);
  // Tasks are appended as the graph unfolds, so keep draining until none are left.
  for (let i = 0; i < tasks.length; i++) await tasks[i];

  if (signal?.aborted) return finish({ status: "cancelled" });
  return finish(halted ?? { status: "success" });
}
