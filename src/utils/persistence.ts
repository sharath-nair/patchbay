import type { Workflow, WorkflowEdge, WorkflowNode } from "@/types/workflow";
import { hydrateWorkflowFile, toWorkflowFile, type WorkflowFile } from "./exportImport";

const KEY = "patchbay:workflows:v1";
const CHANGED = "patchbay:workflows-changed";

interface StoredWorkflow {
  id: string;
  updatedAt: string;
  file: WorkflowFile;
}

/** Subscription handles for `useSyncExternalStore`. Snapshot is the raw string so it's referentially stable. */
export const workflowStorage = {
  subscribe(callback: () => void) {
    window.addEventListener("storage", callback); // other tabs
    window.addEventListener(CHANGED, callback); // this tab
    return () => {
      window.removeEventListener("storage", callback);
      window.removeEventListener(CHANGED, callback);
    };
  },
  getSnapshot(): string {
    try {
      return localStorage.getItem(KEY) ?? "";
    } catch {
      return "";
    }
  },
  /** `null` while server-rendering/hydrating, so callers can tell "not loaded yet" from "empty". */
  getServerSnapshot: (): string | null => null,
};

/** Tolerant parse: corrupt JSON or invalid entries are dropped instead of crashing the app. */
function parseStored(raw: string): Record<string, StoredWorkflow> {
  if (!raw) return {};
  try {
    const data = JSON.parse(raw);
    return data && typeof data === "object" && !Array.isArray(data) ? (data as Record<string, StoredWorkflow>) : {};
  } catch {
    return {};
  }
}

function hydrate(entry: StoredWorkflow): Workflow | null {
  if (!entry || typeof entry.id !== "string") return null;
  const result = hydrateWorkflowFile(entry.file);
  if (!result.ok) return null;
  return { id: entry.id, name: result.name, nodes: result.nodes, edges: result.edges, updatedAt: String(entry.updatedAt) };
}

/** All valid workflows, most recently updated first. */
export function listWorkflows(raw: string): Workflow[] {
  return Object.values(parseStored(raw))
    .map(hydrate)
    .filter((w): w is Workflow => w !== null)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function getWorkflow(raw: string, id: string): Workflow | undefined {
  const entry = parseStored(raw)[id];
  return entry ? (hydrate(entry) ?? undefined) : undefined;
}

function write(all: Record<string, StoredWorkflow>) {
  localStorage.setItem(KEY, JSON.stringify(all));
  window.dispatchEvent(new Event(CHANGED));
}

const read = () => parseStored(workflowStorage.getSnapshot());
const newId = () => crypto.randomUUID().slice(0, 8);

export function saveWorkflow(id: string, name: string, nodes: WorkflowNode[], edges: WorkflowEdge[]) {
  write({ ...read(), [id]: { id, updatedAt: new Date().toISOString(), file: toWorkflowFile(name, nodes, edges) } });
}

export function createWorkflow(name: string, nodes: WorkflowNode[] = [], edges: WorkflowEdge[] = []): string {
  const id = newId();
  saveWorkflow(id, name, nodes, edges);
  return id;
}

export function deleteWorkflow(id: string) {
  const all = read();
  delete all[id];
  write(all);
}

export function duplicateWorkflow(id: string): string | undefined {
  const source = getWorkflow(workflowStorage.getSnapshot(), id);
  if (!source) return undefined;
  return createWorkflow(`${source.name} (copy)`, source.nodes, source.edges);
}
