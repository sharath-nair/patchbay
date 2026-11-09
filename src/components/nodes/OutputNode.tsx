import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Flag } from "lucide-react";
import type { WorkflowNode } from "@/types/workflow";
import { BaseNode } from "./BaseNode";
import { NodeOutput } from "./NodeOutput";

function OutputNodeImpl({ data, selected }: NodeProps<WorkflowNode>) {
  return (
    <>
      <Handle type="target" position={Position.Left} />
      <BaseNode icon={Flag} kindLabel="Output" accent="bg-rose-500" title={data.label} status={data.status} selected={selected}>
        Format: {String(data.format ?? "text")}
        <NodeOutput status={data.status} output={data.output} error={data.error} />
      </BaseNode>
    </>
  );
}

export const OutputNode = memo(OutputNodeImpl);
