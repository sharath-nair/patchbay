"use client";

import { nodeKinds, nodeRegistry } from "@/components/nodes/registry";
import type { NodeKind } from "@/types/workflow";

export const DRAG_MIME = "application/patchbay-node";

export function NodePalette() {
  const onDragStart = (event: React.DragEvent, kind: NodeKind) => {
    event.dataTransfer.setData(DRAG_MIME, kind);
    event.dataTransfer.effectAllowed = "move";
  };

  return (
    <aside className="bg-background flex w-60 shrink-0 flex-col gap-2 border-r p-3">
      <h2 className="text-muted-foreground px-1 text-xs font-semibold uppercase tracking-wide">Nodes</h2>
      {nodeKinds.map((kind) => {
        const def = nodeRegistry[kind];
        return (
          <div
            key={kind}
            draggable
            onDragStart={(e) => onDragStart(e, kind)}
            className="bg-card hover:border-primary cursor-grab rounded-md border px-3 py-2 text-sm active:cursor-grabbing"
          >
            <div className="font-medium">{def.label}</div>
            <div className="text-muted-foreground text-xs">{def.description}</div>
          </div>
        );
      })}
      <p className="text-muted-foreground mt-2 px-1 text-xs">Drag a node onto the canvas.</p>
    </aside>
  );
}
