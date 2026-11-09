import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Sparkles } from "lucide-react";
import type { WorkflowNode } from "@/types/workflow";
import { BaseNode } from "./BaseNode";
import { NodeOutput } from "./NodeOutput";

function PromptNodeImpl({ data, selected }: NodeProps<WorkflowNode>) {
  const prompt = String(data.prompt ?? "");
  return (
    <>
      <Handle type="target" position={Position.Left} />
      <BaseNode icon={Sparkles} kindLabel="AI Prompt" accent="bg-blue-500" title={data.label} status={data.status} selected={selected}>
        <p className="line-clamp-3">{prompt || "No prompt set"}</p>
        <NodeOutput status={data.status} output={data.output} error={data.error} />
      </BaseNode>
      <Handle type="source" position={Position.Right} />
    </>
  );
}

export const PromptNode = memo(PromptNodeImpl);
