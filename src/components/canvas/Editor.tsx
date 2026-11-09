"use client";

import { useEffect } from "react";
import Link from "next/link";
import { WorkflowCanvas } from "@/components/canvas/WorkflowCanvas";
import { NodePalette } from "@/components/sidebar/NodePalette";
import { useWorkflowStore } from "@/store/useWorkflowStore";
import { createSampleWorkflow } from "@/utils/sampleWorkflow";

export function Editor({ id }: { id: string }) {
  const setGraph = useWorkflowStore((s) => s.setGraph);

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
      </header>
      <div className="flex min-h-0 flex-1">
        <NodePalette />
        <div className="min-w-0 flex-1">
          <WorkflowCanvas />
        </div>
      </div>
    </div>
  );
}
