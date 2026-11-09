import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Shuffle } from "lucide-react";
import type { WorkflowNode } from "@/types/workflow";
import { BaseNode } from "./BaseNode";

function TransformNodeImpl({ data, selected }: NodeProps<WorkflowNode>) {
  return (
    <>
      <Handle type="target" position={Position.Left} />
      <BaseNode icon={Shuffle} kindLabel="Transform" accent="bg-teal-500" title={data.label} status={data.status} selected={selected}>
        <code className="line-clamp-2">{String(data.template ?? "") || "No template"}</code>
      </BaseNode>
      <Handle type="source" position={Position.Right} />
    </>
  );
}

export const TransformNode = memo(TransformNodeImpl);
