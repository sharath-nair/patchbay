"use client";

import { useMemo, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Copy, Download, FileUp, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createNode } from "@/store/useWorkflowStore";
import { downloadText, fileNameFor, parseWorkflow, serializeWorkflow } from "@/utils/exportImport";
import { createWorkflow, deleteWorkflow, duplicateWorkflow, listWorkflows, workflowStorage } from "@/utils/persistence";
import { createSampleWorkflow } from "@/utils/sampleWorkflow";

function formatDate(iso: string) {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

export function Dashboard() {
  const router = useRouter();
  const raw = useSyncExternalStore(workflowStorage.subscribe, workflowStorage.getSnapshot, workflowStorage.getServerSnapshot);
  const workflows = useMemo(() => (raw === null ? [] : listWorkflows(raw)), [raw]);
  const [importError, setImportError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const open = (id: string) => router.push(`/editor/${id}`);

  const createBlank = () => open(createWorkflow("Untitled workflow", [createNode("trigger", { x: 0, y: 0 })], []));
  const createExample = () => {
    const { nodes, edges } = createSampleWorkflow();
    open(createWorkflow("Summarize & route", nodes, edges));
  };

  const onImport = async (file: File | undefined) => {
    if (!file) return;
    const result = parseWorkflow(await file.text());
    if (!result.ok) {
      setImportError(result.error);
      return;
    }
    setImportError(null);
    open(createWorkflow(result.name, result.nodes, result.edges));
  };

  return (
    <main className="mx-auto max-w-5xl p-8">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="mr-auto text-2xl font-semibold">Workflows</h1>
        <input
          ref={fileInput}
          type="file"
          accept=".json,application/json"
          className="hidden"
          aria-label="Import workflow file"
          onChange={(e) => {
            void onImport(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
        <Button variant="outline" onClick={() => fileInput.current?.click()}>
          <FileUp className="size-4" /> Import
        </Button>
        <Button onClick={createBlank}>
          <Plus className="size-4" /> New workflow
        </Button>
      </div>

      {importError && (
        <p role="alert" className="mt-4 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
          {importError}
        </p>
      )}

      {raw === null ? (
        <p className="text-muted-foreground mt-8 text-sm">Loading…</p>
      ) : workflows.length === 0 ? (
        <div className="mt-8 rounded-lg border border-dashed p-10 text-center">
          <p className="font-medium">No workflows yet</p>
          <p className="text-muted-foreground mt-1 text-sm">Start from scratch, or open a ready-made example to see it run.</p>
          <div className="mt-4 flex justify-center gap-2">
            <Button onClick={createExample}>Create example</Button>
            <Button variant="outline" onClick={createBlank}>
              Blank workflow
            </Button>
          </div>
        </div>
      ) : (
        <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {workflows.map((w) => (
            <li key={w.id} className="bg-card flex flex-col rounded-lg border p-4">
              <Link href={`/editor/${w.id}`} className="font-medium underline-offset-4 hover:underline">
                {w.name}
              </Link>
              <p className="text-muted-foreground mt-1 text-xs">
                {w.nodes.length} nodes · {w.edges.length} connections
              </p>
              <p className="text-muted-foreground text-xs">Updated {formatDate(w.updatedAt)}</p>
              <div className="mt-3 flex gap-1">
                <Button variant="ghost" size="icon" aria-label={`Duplicate ${w.name}`} title="Duplicate" onClick={() => duplicateWorkflow(w.id)}>
                  <Copy className="size-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Export ${w.name}`}
                  title="Export JSON"
                  onClick={() => downloadText(fileNameFor(w.name), serializeWorkflow(w.name, w.nodes, w.edges))}
                >
                  <Download className="size-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Delete ${w.name}`}
                  title="Delete"
                  onClick={() => window.confirm(`Delete "${w.name}"? This can't be undone.`) && deleteWorkflow(w.id)}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
