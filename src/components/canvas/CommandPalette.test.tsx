import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createNode, useWorkflowStore } from "@/store/useWorkflowStore";
import { CommandPalette } from "./CommandPalette";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

const openPalette = () => fireEvent.keyDown(window, { key: "k", ctrlKey: true });

describe("CommandPalette", () => {
  beforeEach(() => {
    push.mockClear();
    useWorkflowStore.getState().setGraph([createNode("trigger", { x: 0, y: 0 }, "t")], []);
  });

  it("opens with Ctrl+K and closes with Escape", () => {
    render(<CommandPalette />);
    expect(screen.queryByRole("dialog")).toBeNull();
    openPalette();
    expect(screen.getByRole("dialog")).toBeTruthy();
    fireEvent.keyDown(screen.getByRole("combobox"), { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("filters commands and runs the highlighted one on Enter", () => {
    render(<CommandPalette />);
    openPalette();
    const input = screen.getByRole("combobox");
    fireEvent.change(input, { target: { value: "add output" } });
    expect(screen.getAllByRole("option")).toHaveLength(1);
    fireEvent.keyDown(input, { key: "Enter" });
    const { nodes } = useWorkflowStore.getState();
    expect(nodes).toHaveLength(2);
    expect(nodes[1].type).toBe("output");
    expect(nodes[1].position.y).toBeGreaterThan(nodes[0].position.y); // appended below, not on top
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("moves selection with arrow keys", () => {
    render(<CommandPalette />);
    openPalette();
    const input = screen.getByRole("combobox");
    expect(screen.getAllByRole("option")[0].getAttribute("aria-selected")).toBe("true");
    fireEvent.keyDown(input, { key: "ArrowDown" });
    expect(screen.getAllByRole("option")[1].getAttribute("aria-selected")).toBe("true");
    fireEvent.keyDown(input, { key: "ArrowUp" });
    expect(screen.getAllByRole("option")[0].getAttribute("aria-selected")).toBe("true");
  });

  it("only offers Undo/Redo when available, and shows an empty state", () => {
    render(<CommandPalette />);
    openPalette();
    const input = screen.getByRole("combobox");
    fireEvent.change(input, { target: { value: "undo" } });
    expect(screen.queryAllByRole("option")).toHaveLength(0);
    expect(screen.getByText("No matching commands")).toBeTruthy();

    act(() => void useWorkflowStore.getState().addNode("output", { x: 0, y: 200 }));
    fireEvent.change(input, { target: { value: "undo" } });
    expect(screen.getAllByRole("option")).toHaveLength(1);
  });

  it("navigates to the dashboard", () => {
    render(<CommandPalette />);
    openPalette();
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "dashboard" } });
    fireEvent.keyDown(screen.getByRole("combobox"), { key: "Enter" });
    expect(push).toHaveBeenCalledWith("/dashboard");
  });
});
