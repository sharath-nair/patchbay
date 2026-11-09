import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { RunStatus } from "@/types/workflow";

const statusRing: Record<RunStatus, string> = {
  idle: "border-border",
  running: "border-amber-400 shadow-[0_0_0_3px_rgba(251,191,36,0.25)]",
  success: "border-emerald-500",
  error: "border-red-500",
};

interface BaseNodeProps {
  icon: LucideIcon;
  kindLabel: string;
  accent: string;
  title: string;
  status: RunStatus;
  selected?: boolean;
  children?: ReactNode;
}

/** Shared chrome for every node: header, status ring, selection outline. */
export function BaseNode({ icon: Icon, kindLabel, accent, title, status, selected, children }: BaseNodeProps) {
  return (
    <div
      className={cn(
        "bg-card text-card-foreground w-56 rounded-lg border-2 text-sm shadow-sm transition-shadow",
        statusRing[status],
        selected && "ring-primary ring-2 ring-offset-1",
      )}
    >
      <div className="flex items-center gap-2 border-b px-3 py-2">
        <span className={cn("flex size-6 items-center justify-center rounded-md text-white", accent)}>
          <Icon className="size-3.5" />
        </span>
        <div className="min-w-0">
          <div className="text-muted-foreground text-[10px] font-medium uppercase tracking-wide">{kindLabel}</div>
          <div className="truncate font-medium leading-tight">{title}</div>
        </div>
      </div>
      {children && <div className="text-muted-foreground px-3 py-2 text-xs">{children}</div>}
    </div>
  );
}
