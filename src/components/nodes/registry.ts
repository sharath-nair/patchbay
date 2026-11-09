import type { ComponentType } from "react";
import type { NodeProps, NodeTypes } from "@xyflow/react";
import type { z } from "zod";
import type { Executor } from "@/types/execution";
import type { NodeKind, WorkflowNode } from "@/types/workflow";
import { ConditionNode } from "./ConditionNode";
import { OutputNode } from "./OutputNode";
import { PromptNode } from "./PromptNode";
import { TransformNode } from "./TransformNode";
import { TriggerNode } from "./TriggerNode";
import { executeCondition, executeOutput, executePrompt, executeTransform, executeTrigger } from "./executors";
import { conditionSchema, outputSchema, promptSchema, transformSchema, triggerSchema } from "./schemas";

export interface NodeDefinition {
  kind: NodeKind;
  label: string;
  description: string;
  /** Zod schema for the user-editable config; drives the property editor (M3). */
  schema: z.ZodType<Record<string, unknown>>;
  /** Default config for a freshly created node. Must satisfy `schema`. */
  defaults: Record<string, unknown>;
  component: ComponentType<NodeProps<WorkflowNode>>;
  /** Simulated behaviour when the workflow runs. The engine only ever calls this. */
  execute: Executor;
}

/**
 * Node registry: adding a node type means defining its schema + component and
 * registering it here. The canvas, palette and (later) the execution engine
 * all read from this table.
 */
export const nodeRegistry: Record<NodeKind, NodeDefinition> = {
  trigger: {
    kind: "trigger",
    label: "Trigger",
    description: "Starts the workflow",
    schema: triggerSchema,
    defaults: { label: "Trigger", triggerType: "manual" },
    component: TriggerNode,
    execute: executeTrigger,
  },
  prompt: {
    kind: "prompt",
    label: "AI Prompt",
    description: "Runs a prompt through a model",
    schema: promptSchema,
    defaults: { label: "AI Prompt", model: "balanced", prompt: "", temperature: 0.7 },
    component: PromptNode,
    execute: executePrompt,
  },
  condition: {
    kind: "condition",
    label: "Condition",
    description: "Routes to true or false",
    schema: conditionSchema,
    defaults: { label: "Condition", expression: "" },
    component: ConditionNode,
    execute: executeCondition,
  },
  transform: {
    kind: "transform",
    label: "Transform",
    description: "Reshapes data with a template",
    schema: transformSchema,
    defaults: { label: "Transform", template: "" },
    component: TransformNode,
    execute: executeTransform,
  },
  output: {
    kind: "output",
    label: "Output",
    description: "Collects the final result",
    schema: outputSchema,
    defaults: { label: "Output", format: "text" },
    component: OutputNode,
    execute: executeOutput,
  },
};

export const nodeKinds = Object.keys(nodeRegistry) as NodeKind[];

/** Stable module-level object (React Flow requires nodeTypes not to change identity between renders). */
export const nodeTypes = Object.fromEntries(
  nodeKinds.map((kind) => [kind, nodeRegistry[kind].component]),
) as unknown as NodeTypes;
