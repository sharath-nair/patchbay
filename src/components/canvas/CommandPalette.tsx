"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { nodeKinds, nodeRegistry } from "@/components/nodes/registry";
import { selectCanRedo, selectCanUndo, useWorkflowStore } from "@/store/useWorkflowStore";
import { downloadText, fileNameFor, serializeWorkflow } from "@/utils/exportImport";

interface Command {
  id: string;
  label: string;
  run: () => void;
}

/** Cmd/Ctrl+K palette: type to filter, arrows to move, Enter to run, Esc to close. */
export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [index, setIndex] = useState(0);

  const isRunning = useWorkflowStore((s) => s.isRunning);
  const canUndo = useWorkflowStore(selectCanUndo);
  const canRedo = useWorkflowStore(selectCanRedo);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
        setQuery("");
        setIndex(0);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const commands = useMemo<Command[]>(() => {
    const store = () => useWorkflowStore.getState();
    const list: Command[] = [
      isRunning
        ? { id: "stop", label: "Stop run", run: () => store().stop() }
        : { id: "run", label: "Run workflow", run: () => void store().run() },
    ];
    if (!isRunning) list.push({ id: "reset", label: "Reset run", run: () => store().resetRun() });
    if (canUndo) list.push({ id: "undo", label: "Undo", run: () => store().undo() });
    if (canRedo) list.push({ id: "redo", label: "Redo", run: () => store().redo() });
    for (const kind of nodeKinds) {
      list.push({
        id: `add-${kind}`,
        label: `Add ${nodeRegistry[kind].label} node`,
        run: () => {
          // Append below the existing graph so new nodes never land on top of old ones.
          const { nodes, addNode } = store();
          const x = nodes.length ? Math.min(...nodes.map((n) => n.position.x)) : 0;
          const y = nodes.length ? Math.max(...nodes.map((n) => n.position.y)) + 140 : 0;
          addNode(kind, { x, y });
        },
      });
    }
    list.push(
      {
        id: "export",
        label: "Export workflow as JSON",
        run: () => {
          const { name, nodes, edges } = store();
          downloadText(fileNameFor(name), serializeWorkflow(name, nodes, edges));
        },
      },
      { id: "dashboard", label: "Go to dashboard", run: () => router.push("/dashboard") },
    );
    return list;
  }, [isRunning, canUndo, canRedo, router]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? commands.filter((c) => c.label.toLowerCase().includes(q)) : commands;
  }, [commands, query]);

  const active = Math.min(index, Math.max(filtered.length - 1, 0));

  const choose = (command: Command | undefined) => {
    if (!command) return;
    setOpen(false);
    command.run();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/30 pt-[15vh]" onMouseDown={() => setOpen(false)}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        className="bg-popover text-popover-foreground w-full max-w-md overflow-hidden rounded-lg border shadow-lg"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <input
          autoFocus
          role="combobox"
          aria-expanded="true"
          aria-controls="palette-list"
          aria-activedescendant={filtered[active] ? `palette-${filtered[active].id}` : undefined}
          placeholder="Type a command…"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIndex(0);
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setIndex(Math.min(active + 1, filtered.length - 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setIndex(Math.max(active - 1, 0));
            } else if (e.key === "Enter") {
              e.preventDefault();
              choose(filtered[active]);
            } else if (e.key === "Escape") {
              e.preventDefault();
              setOpen(false);
            }
          }}
          className="w-full border-b bg-transparent px-4 py-3 text-sm outline-none"
        />
        <ul id="palette-list" role="listbox" className="max-h-72 overflow-y-auto p-1">
          {filtered.length === 0 && <li className="text-muted-foreground px-3 py-2 text-sm">No matching commands</li>}
          {filtered.map((c, i) => (
            <li
              key={c.id}
              id={`palette-${c.id}`}
              role="option"
              aria-selected={i === active}
              onMouseEnter={() => setIndex(i)}
              onClick={() => choose(c)}
              className={`cursor-pointer rounded-md px-3 py-2 text-sm ${i === active ? "bg-accent text-accent-foreground" : ""}`}
            >
              {c.label}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
