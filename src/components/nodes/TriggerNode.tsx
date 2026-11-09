import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Zap } from "lucide-react";
import type { WorkflowNode } from "@/types/workflow";
import { BaseNode } from "./BaseNode";

function TriggerNodeImpl({ data, selected }: NodeProps<WorkflowNode>) {
  return (
    <>
      <BaseNode icon={Zap} kindLabel="Trigger" accent="bg-violet-500" title={data.label} status={data.status} selected={selected}>
        Starts on: {String(data.triggerType ?? "manual")}
      </BaseNode>
      <Handle type="source" position={Position.Right} />
    </>
  );
}

export const TriggerNode = memo(TriggerNodeImpl);
