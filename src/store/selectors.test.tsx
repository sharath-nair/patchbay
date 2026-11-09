import { Profiler } from "react";
import { act, render } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { createNode, selectNodeById, useWorkflowStore } from "./useWorkflowStore";

const commits: Record<string, number> = {};
const onRender = (id: string) => {
  commits[id] = (commits[id] ?? 0) + 1;
};

function Probe({ id }: { id: string }) {
  const node = useWorkflowStore(selectNodeById(id));
  return <span data-testid={id}>{String(node?.data.label)}</span>;
}

const Tracked = ({ id }: { id: string }) => (
  <Profiler id={id} onRender={onRender}>
    <Probe id={id} />
  </Profiler>
);

describe("selective subscriptions", () => {
  beforeEach(() => {
    for (const k of Object.keys(commits)) delete commits[k];
    useWorkflowStore
      .getState()
      .setGraph([createNode("prompt", { x: 0, y: 0 }, "a"), createNode("prompt", { x: 0, y: 100 }, "b")], []);
  });

  it("updateNodeData only changes the targeted node's identity", () => {
    const before = useWorkflowStore.getState().nodes;
    useWorkflowStore.getState().updateNodeData("a", { label: "Renamed" });
    const after = useWorkflowStore.getState().nodes;
    expect(after[0]).not.toBe(before[0]);
    expect(after[1]).toBe(before[1]);
    expect(after[0].data.label).toBe("Renamed");
  });

  it("does not re-render subscribers of other nodes while typing", () => {
    render(
      <>
        <Tracked id="a" />
        <Tracked id="b" />
      </>,
    );
    expect(commits).toEqual({ a: 1, b: 1 });

    for (const text of ["h", "he", "hel", "hell", "hello"]) {
      act(() => useWorkflowStore.getState().updateNodeData("a", { prompt: text }));
    }

    expect(commits.a).toBe(6); // initial + 5 keystrokes
    expect(commits.b).toBe(1); // never re-rendered
  });
});
