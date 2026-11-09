import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { createNode, useWorkflowStore } from "@/store/useWorkflowStore";
import { PropertyEditor } from "./PropertyEditor";

describe("PropertyEditor", () => {
  beforeEach(() => {
    const node = { ...createNode("prompt", { x: 0, y: 0 }, "p1"), selected: true };
    useWorkflowStore.getState().setGraph([node], []);
  });

  it("shows a hint when nothing is selected", () => {
    act(() => useWorkflowStore.getState().setGraph([createNode("prompt", { x: 0, y: 0 }, "p1")], []));
    render(<PropertyEditor />);
    expect(screen.getByText(/select a node/i)).toBeTruthy();
  });

  it("writes edits to the selected node in the store", async () => {
    render(<PropertyEditor />);
    const label = screen.getByLabelText("Label");
    await act(async () => {
      fireEvent.change(label, { target: { value: "My prompt" } });
    });
    expect(useWorkflowStore.getState().nodes[0].data.label).toBe("My prompt");
  });

  it("does not write invalid values (empty label)", async () => {
    render(<PropertyEditor />);
    await act(async () => {
      fireEvent.change(screen.getByLabelText("Label"), { target: { value: "" } });
    });
    expect(useWorkflowStore.getState().nodes[0].data.label).toBe("AI Prompt");
  });

  it("selecting a node never changes its data", () => {
    const before = useWorkflowStore.getState().nodes[0];
    render(<PropertyEditor />);
    expect(useWorkflowStore.getState().nodes[0]).toBe(before);
    expect((screen.getByLabelText("Temperature") as HTMLInputElement).value).toBe("0.7");
  });
});
