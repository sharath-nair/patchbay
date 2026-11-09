import type { RunStatus } from "@/types/workflow";

interface NodeOutputProps {
  status: RunStatus;
  output?: string;
  error?: string;
}

/** Run-time feedback inside a node: skeleton while waiting, streaming text, or the error. */
export function NodeOutput({ status, output, error }: NodeOutputProps) {
  if (status === "error" && error) {
    return <p className="mt-2 border-t pt-2 text-xs text-red-500">{error}</p>;
  }
  if (status === "running" && !output) {
    return (
      <div className="mt-2 space-y-1.5 border-t pt-2" role="status" aria-label="Running">
        <div className="bg-muted h-2 w-full animate-pulse rounded" />
        <div className="bg-muted h-2 w-4/5 animate-pulse rounded" />
        <div className="bg-muted h-2 w-3/5 animate-pulse rounded" />
      </div>
    );
  }
  if (!output) return null;
  return (
    <p className="text-foreground mt-2 line-clamp-5 whitespace-pre-wrap border-t pt-2 text-xs">
      {output}
      {status === "running" && <span className="ml-0.5 inline-block h-3 w-0.5 animate-pulse bg-current align-middle" />}
    </p>
  );
}
