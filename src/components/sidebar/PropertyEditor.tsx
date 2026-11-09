"use client";

import { useEffect } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { nodeRegistry } from "@/components/nodes/registry";
import { selectSelectedNode, useWorkflowStore } from "@/store/useWorkflowStore";
import type { WorkflowNode } from "@/types/workflow";
import { fieldsFromSchema } from "./schemaFields";

const controlClass =
  "border-input bg-background focus-visible:ring-ring w-full rounded-md border px-3 py-2 text-sm outline-none focus-visible:ring-2";

function NodeForm({ node }: { node: WorkflowNode }) {
  const def = nodeRegistry[node.type!];
  const fields = fieldsFromSchema(def.schema);
  const updateNodeData = useWorkflowStore((s) => s.updateNodeData);

  const defaultValues = Object.fromEntries(fields.map((f) => [f.name, node.data[f.name]]));
  const form = useForm<Record<string, unknown>>({
    resolver: zodResolver(def.schema as never),
    defaultValues,
    mode: "onChange",
  });
  const { register, control, formState, setValue } = form;
  const values = useWatch({ control });

  // Push valid edits straight into the store; invalid values stay local until fixed.
  // Skips no-op writes (e.g. on first render) so selecting a node never mutates it.
  useEffect(() => {
    const parsed = def.schema.safeParse(values);
    if (!parsed.success) return;
    const current = useWorkflowStore.getState().nodes.find((n) => n.id === node.id);
    if (!current || Object.entries(parsed.data).every(([k, v]) => current.data[k] === v)) return;
    updateNodeData(node.id, parsed.data);
  }, [values, def.schema, node.id, updateNodeData]);

  return (
    <form className="flex flex-col gap-4" onSubmit={(e) => e.preventDefault()}>
      {fields.map((field) => {
        const id = `field-${node.id}-${field.name}`;
        const error = formState.errors[field.name]?.message as string | undefined;
        return (
          <div key={field.name} className="flex flex-col gap-1.5">
            <Label htmlFor={id}>{field.title}</Label>
            {field.kind === "text" && <Input id={id} {...register(field.name)} />}
            {field.kind === "textarea" && <textarea id={id} rows={4} className={controlClass} {...register(field.name)} />}
            {field.kind === "select" && (
              <select id={id} className={controlClass} {...register(field.name)}>
                {field.options.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            )}
            {field.kind === "number" && (
              <Input id={id} type="number" min={field.min} max={field.max} {...register(field.name, { valueAsNumber: true })} />
            )}
            {field.kind === "range" && (
              <div className="flex items-center gap-3">
                <input
                  id={id}
                  type="range"
                  min={field.min}
                  max={field.max}
                  step={0.05}
                  className="flex-1"
                  value={Number(values[field.name] ?? field.min)}
                  onChange={(e) => setValue(field.name, Number(e.target.value), { shouldValidate: true })}
                />
                <span className="text-muted-foreground w-10 text-right text-xs tabular-nums">
                  {Number(values[field.name] ?? 0).toFixed(2)}
                </span>
              </div>
            )}
            {error && <p className="text-xs text-red-500">{error}</p>}
          </div>
        );
      })}
    </form>
  );
}

export function PropertyEditor() {
  const node = useWorkflowStore(selectSelectedNode);
  const revision = useWorkflowStore((s) => s.revision);

  return (
    <aside className="bg-background w-72 shrink-0 overflow-y-auto border-l p-4" aria-label="Properties">
      <h2 className="text-muted-foreground mb-3 text-xs font-semibold uppercase tracking-wide">Properties</h2>
      {node?.type ? (
        <>
          <p className="mb-4 text-sm font-medium">{nodeRegistry[node.type].label}</p>
          {/* key remounts the form when the selection changes or after undo/redo, so defaults reset */}
          <NodeForm key={`${node.id}:${revision}`} node={node} />
        </>
      ) : (
        <p className="text-muted-foreground text-sm">Select a node to edit its settings.</p>
      )}
    </aside>
  );
}
