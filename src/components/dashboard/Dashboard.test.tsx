import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createWorkflow, listWorkflows, workflowStorage } from "@/utils/persistence";
import { createSampleWorkflow } from "@/utils/sampleWorkflow";
import { Dashboard } from "./Dashboard";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

describe("Dashboard", () => {
  beforeEach(() => {
    localStorage.clear();
    push.mockClear();
  });

  it("shows an empty state and can create the example workflow", () => {
    render(<Dashboard />);
    expect(screen.getByText("No workflows yet")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Create example" }));
    const [saved] = listWorkflows(workflowStorage.getSnapshot());
    expect(saved.nodes).toHaveLength(5);
    expect(push).toHaveBeenCalledWith(`/editor/${saved.id}`);
  });

  it("lists saved workflows and updates live when one is duplicated or deleted", () => {
    const { nodes, edges } = createSampleWorkflow();
    createWorkflow("Alpha", nodes, edges);
    render(<Dashboard />);
    expect(screen.getByText("Alpha")).toBeTruthy();
    expect(screen.getByText(/5 nodes · 4 connections/)).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Duplicate Alpha" }));
    expect(screen.getByText("Alpha (copy)")).toBeTruthy();

    vi.spyOn(window, "confirm").mockReturnValue(true);
    act(() => fireEvent.click(screen.getByRole("button", { name: "Delete Alpha (copy)" })));
    expect(screen.queryByText("Alpha (copy)")).toBeNull();
    expect(screen.getByText("Alpha")).toBeTruthy();
  });

  it("does not delete when the confirmation is declined", () => {
    createWorkflow("Keep me");
    render(<Dashboard />);
    vi.spyOn(window, "confirm").mockReturnValue(false);
    fireEvent.click(screen.getByRole("button", { name: "Delete Keep me" }));
    expect(screen.getByText("Keep me")).toBeTruthy();
  });

  it("rejects an invalid import with a readable error and creates nothing", async () => {
    render(<Dashboard />);
    const input = screen.getByLabelText("Import workflow file");
    const file = new File(["{not json"], "bad.json", { type: "application/json" });
    await act(async () => {
      fireEvent.change(input, { target: { files: [file] } });
    });
    expect((await screen.findByRole("alert")).textContent).toContain("isn't valid JSON");
    expect(listWorkflows(workflowStorage.getSnapshot())).toHaveLength(0);
    expect(push).not.toHaveBeenCalled();
  });
});
