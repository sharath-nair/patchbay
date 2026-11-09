import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { GitBranch } from "lucide-react";
import type { WorkflowNode } from "@/types/workflow";
import { BaseNode } from "./BaseNode";

function ConditionNodeImpl({ data, selected }: NodeProps<WorkflowNode>) {
  return (
    <>
      <Handle type="target" position={Position.Left} />
      <BaseNode icon={GitBranch} kindLabel="Condition" accent="bg-orange-500" title={data.label} status={data.status} selected={selected}>
        <code>{String(data.expression ?? "") || "No expression"}</code>
        <div className="mt-2 flex justify-between text-[10px] font-medium uppercase">
          <span className="text-emerald-600">true</span>
          <span className="text-red-500">false</span>
        </div>
      </BaseNode>
      <Handle id="true" type="source" position={Position.Right} style={{ top: "35%" }} />
      <Handle id="false" type="source" position={Position.Right} style={{ top: "75%" }} />
    </>
  );
}

export const ConditionNode = memo(ConditionNodeImpl);
