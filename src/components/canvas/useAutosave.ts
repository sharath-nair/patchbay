import { useEffect, useRef, useState } from "react";
import { useWorkflowStore } from "@/store/useWorkflowStore";
import { serializeWorkflow } from "@/utils/exportImport";
import { saveWorkflow } from "@/utils/persistence";

const DEBOUNCE_MS = 500;

export type SaveState = "saved" | "saving";

/**
 * Persist the open workflow shortly after it changes. Compares the serialized, run-state-free form
 * to the last save, so loading, selecting, and run animation never trigger a write.
 */
export function useAutosave(id: string, enabled: boolean) {
  const [state, setState] = useState<SaveState>("saved");
  const lastSaved = useRef<string | null>(null);

  useEffect(() => {
    if (!enabled) return;
    const snapshot = () => {
      const { name, nodes, edges } = useWorkflowStore.getState();
      return serializeWorkflow(name, nodes, edges);
    };
    lastSaved.current = snapshot();

    let timer: ReturnType<typeof setTimeout> | undefined;
    const flush = () => {
      timer = undefined;
      const { name, nodes, edges } = useWorkflowStore.getState();
      const json = serializeWorkflow(name, nodes, edges);
      if (json !== lastSaved.current) {
        saveWorkflow(id, name, nodes, edges);
        lastSaved.current = json;
      }
      setState("saved");
    };

    const unsubscribe = useWorkflowStore.subscribe((s, prev) => {
      if (s.isRunning || (s.nodes === prev.nodes && s.edges === prev.edges && s.name === prev.name)) return;
      if (snapshot() === lastSaved.current) return;
      setState("saving");
      clearTimeout(timer);
      timer = setTimeout(flush, DEBOUNCE_MS);
    });

    // Don't lose the last edit if the tab closes or the editor unmounts mid-debounce.
    const onHide = () => timer && flush();
    window.addEventListener("pagehide", onHide);
    return () => {
      unsubscribe();
      window.removeEventListener("pagehide", onHide);
      if (timer) flush();
    };
  }, [id, enabled]);

  return state;
}
