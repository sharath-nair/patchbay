import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useWorkflowStore } from "@/store/useWorkflowStore";
import { useUndoRedoShortcuts } from "./useUndoRedoShortcuts";

function Harness() {
  useUndoRedoShortcuts();
  return <input aria-label="field" />;
}

describe("undo/redo shortcuts", () => {
  it("undoes with Cmd+Z and redoes with Cmd+Shift+Z outside text fields", () => {
    vi.useFakeTimers();
    useWorkflowStore.getState().setGraph([], []);
    render(<Harness />);
    act(() => void useWorkflowStore.getState().addNode("trigger", { x: 0, y: 0 }));
    expect(useWorkflowStore.getState().nodes).toHaveLength(1);

    fireEvent.keyDown(document.body, { key: "z", metaKey: true });
    expect(useWorkflowStore.getState().nodes).toHaveLength(0);

    fireEvent.keyDown(document.body, { key: "z", metaKey: true, shiftKey: true });
    expect(useWorkflowStore.getState().nodes).toHaveLength(1);
    vi.useRealTimers();
  });

  it("leaves Cmd+Z alone while typing in an input", () => {
    useWorkflowStore.getState().setGraph([], []);
    render(<Harness />);
    act(() => void useWorkflowStore.getState().addNode("trigger", { x: 0, y: 0 }));
    fireEvent.keyDown(screen.getByLabelText("field"), { key: "z", metaKey: true });
    expect(useWorkflowStore.getState().nodes).toHaveLength(1);
  });
});
