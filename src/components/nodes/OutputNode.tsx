import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Flag } from "lucide-react";
import type { WorkflowNode } from "@/types/workflow";
import { BaseNode } from "./BaseNode";

function OutputNodeImpl({ data, selected }: NodeProps<WorkflowNode>) {
  return (
    <>
      <Handle type="target" position={Position.Left} />
      <BaseNode icon={Flag} kindLabel="Output" accent="bg-rose-500" title={data.label} status={data.status} selected={selected}>
        Format: {String(data.format ?? "text")}
        {data.output && <p className="text-foreground mt-1 line-clamp-3">{data.output}</p>}
      </BaseNode>
    </>
  );
}

export const OutputNode = memo(OutputNodeImpl);
