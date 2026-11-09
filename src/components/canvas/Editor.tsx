"use client";

import { useEffect, useMemo, useRef, useSyncExternalStore } from "react";
import Link from "next/link";
import { Download, FileUp, Play, Redo2, RotateCcw, Square, Undo2 } from "lucide-react";
import { WorkflowCanvas } from "@/components/canvas/WorkflowCanvas";
import { useAutosave } from "@/components/canvas/useAutosave";
import { useUndoRedoShortcuts } from "@/components/canvas/useUndoRedoShortcuts";
import { NodePalette } from "@/components/sidebar/NodePalette";
import { PropertyEditor } from "@/components/sidebar/PropertyEditor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { selectCanRedo, selectCanUndo, useWorkflowStore } from "@/store/useWorkflowStore";
import { downloadText, fileNameFor, parseWorkflow, serializeWorkflow } from "@/utils/exportImport";
import { getWorkflow, workflowStorage } from "@/utils/persistence";

export function Editor({ id }: { id: string }) {
  const raw = useSyncExternalStore(workflowStorage.subscribe, workflowStorage.getSnapshot, workflowStorage.getServerSnapshot);
  const stored = useMemo(() => (raw === null ? null : (getWorkflow(raw, id) ?? false)), [raw, id]);
  const hasStored = !!stored;

  const name = useWorkflowStore((s) => s.name);
  const setName = useWorkflowStore((s) => s.setName);
  const loadWorkflow = useWorkflowStore((s) => s.loadWorkflow);
  const replaceGraph = useWorkflowStore((s) => s.replaceGraph);
  const undo = useWorkflowStore((s) => s.undo);
  const redo = useWorkflowStore((s) => s.redo);
  const canUndo = useWorkflowStore(selectCanUndo);
  const canRedo = useWorkflowStore(selectCanRedo);
  const isRunning = useWorkflowStore((s) => s.isRunning);
  const runError = useWorkflowStore((s) => s.runError);
  const run = useWorkflowStore((s) => s.run);
  const stop = useWorkflowStore((s) => s.stop);
  const resetRun = useWorkflowStore((s) => s.resetRun);
  const importError = useRef<HTMLParagraphElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  useUndoRedoShortcuts();

  // Load the saved workflow into the store once per id (autosave writes must not reload it).
  const ready = useWorkflowStore((s) => s.workflowId === id);
  useEffect(() => {
    if (stored && !ready) loadWorkflow(id, stored.name, stored.nodes, stored.edges);
  }, [stored, ready, id, loadWorkflow]);

  const saveState = useAutosave(id, hasStored && ready);

  const onImport = async (file: File | undefined) => {
    if (!file) return;
    const result = parseWorkflow(await file.text());
    if (importError.current) importError.current.textContent = result.ok ? "" : result.error;
    if (result.ok) replaceGraph(result.nodes, result.edges);
  };

  if (raw === null) return <p className="text-muted-foreground p-8 text-sm">Loading…</p>;
  if (stored === false || (!stored && !hasStored)) {
    return (
      <main className="mx-auto max-w-md p-8">
        <h1 className="text-xl font-semibold">Workflow not found</h1>
        <p className="text-muted-foreground mt-2 text-sm">It may have been deleted, or it was saved in a different browser.</p>
        <Link href="/dashboard" className="mt-4 inline-block underline underline-offset-4">
          Back to dashboard
        </Link>
      </main>
    );
  }

  return (
    <div className="flex h-screen flex-col">
      <header className="flex h-12 shrink-0 items-center gap-3 border-b px-4 text-sm">
        <Link href="/dashboard" className="text-muted-foreground hover:text-foreground">
          ← Dashboard
        </Link>
        <Input
          aria-label="Workflow name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={() => !name.trim() && setName("Untitled workflow")}
          className="h-8 w-56 border-transparent bg-transparent font-medium shadow-none hover:border-input focus-visible:border-input"
        />
        <span className="text-muted-foreground text-xs" aria-live="polite">
          {saveState === "saving" ? "Saving…" : "Saved"}
        </span>
        <p ref={importError} role="alert" className="truncate text-xs text-red-500" />
        {runError && (
          <span role="alert" className="truncate text-xs text-red-500">
            {runError}
          </span>
        )}
        <div className="ml-auto flex items-center gap-1">
          {isRunning ? (
            <Button size="sm" variant="destructive" onClick={stop}>
              <Square className="size-3.5" /> Stop
            </Button>
          ) : (
            <Button size="sm" onClick={() => void run()}>
              <Play className="size-3.5" /> Run
            </Button>
          )}
          <Button variant="ghost" size="icon" onClick={resetRun} disabled={isRunning} aria-label="Reset run" title="Reset run">
            <RotateCcw className="size-4" />
          </Button>
          <span className="bg-border mx-1 h-5 w-px" />
          <Button variant="ghost" size="icon" onClick={undo} disabled={!canUndo} aria-label="Undo" title="Undo (⌘Z)">
            <Undo2 className="size-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={redo} disabled={!canRedo} aria-label="Redo" title="Redo (⇧⌘Z)">
            <Redo2 className="size-4" />
          </Button>
          <span className="bg-border mx-1 h-5 w-px" />
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
          <Button variant="ghost" size="icon" aria-label="Import" title="Import JSON (replaces the canvas; undoable)" onClick={() => fileInput.current?.click()}>
            <FileUp className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Export"
            title="Export JSON"
            onClick={() => {
              const { name, nodes, edges } = useWorkflowStore.getState();
              downloadText(fileNameFor(name), serializeWorkflow(name, nodes, edges));
            }}
          >
            <Download className="size-4" />
          </Button>
        </div>
      </header>
      <div className="flex min-h-0 flex-1">
        <NodePalette />
        <div className="min-w-0 flex-1">{ready ? <WorkflowCanvas /> : null}</div>
        <PropertyEditor />
      </div>
    </div>
  );
}
