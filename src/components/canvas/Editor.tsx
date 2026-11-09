"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Play, Redo2, RotateCcw, Square, Undo2 } from "lucide-react";
import { WorkflowCanvas } from "@/components/canvas/WorkflowCanvas";
import { useUndoRedoShortcuts } from "@/components/canvas/useUndoRedoShortcuts";
import { NodePalette } from "@/components/sidebar/NodePalette";
import { PropertyEditor } from "@/components/sidebar/PropertyEditor";
import { Button } from "@/components/ui/button";
import { selectCanRedo, selectCanUndo, useWorkflowStore } from "@/store/useWorkflowStore";
import { createSampleWorkflow } from "@/utils/sampleWorkflow";

export function Editor({ id }: { id: string }) {
  const setGraph = useWorkflowStore((s) => s.setGraph);
  const undo = useWorkflowStore((s) => s.undo);
  const redo = useWorkflowStore((s) => s.redo);
  const canUndo = useWorkflowStore(selectCanUndo);
  const canRedo = useWorkflowStore(selectCanRedo);
  const isRunning = useWorkflowStore((s) => s.isRunning);
  const runError = useWorkflowStore((s) => s.runError);
  const run = useWorkflowStore((s) => s.run);
  const stop = useWorkflowStore((s) => s.stop);
  const resetRun = useWorkflowStore((s) => s.resetRun);
  useUndoRedoShortcuts();

  // M6 will load the saved workflow by id; for now every editor starts from the sample graph.
  useEffect(() => {
    const { nodes, edges } = createSampleWorkflow();
    setGraph(nodes, edges);
  }, [id, setGraph]);

  return (
    <div className="flex h-screen flex-col">
      <header className="flex h-12 shrink-0 items-center gap-3 border-b px-4 text-sm">
        <Link href="/dashboard" className="text-muted-foreground hover:text-foreground">
          ← Dashboard
        </Link>
        <span className="font-medium">Patchbay</span>
        <span className="text-muted-foreground">/ {id}</span>
        {runError && (
          <span role="alert" className="ml-4 truncate text-xs text-red-500">
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
        </div>
      </header>
      <div className="flex min-h-0 flex-1">
        <NodePalette />
        <div className="min-w-0 flex-1">
          <WorkflowCanvas />
        </div>
        <PropertyEditor />
      </div>
    </div>
  );
}
