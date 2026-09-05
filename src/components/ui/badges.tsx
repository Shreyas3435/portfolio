import { cn } from "@/lib/utils";
import type { ExperienceLevel, Project } from "@/data/types";

const statusLabel: Record<Project["status"], string> = {
  shipped: "Shipped",
  "in-progress": "In Progress",
  prototype: "Prototype",
  "learning-exercise": "Learning Exercise",
};

const statusStyle: Record<Project["status"], string> = {
  shipped: "border-emerald-400/30 text-emerald-300 bg-emerald-400/10",
  "in-progress": "border-amber-400/30 text-amber-300 bg-amber-400/10",
  prototype: "border-amber-400/30 text-amber-300 bg-amber-400/10",
  "learning-exercise": "border-border-strong text-muted bg-surface-2",
};

export function StatusBadge({ status, className }: { status: Project["status"]; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium",
        statusStyle[status],
        className,
      )}
    >
      {statusLabel[status]}
    </span>
  );
}

const levelLabel: Record<ExperienceLevel, string> = {
  core: "Core",
  strong: "Strong",
  working: "Working",
  exploring: "Exploring",
};

const levelWidth: Record<ExperienceLevel, string> = {
  core: "w-full",
  strong: "w-3/4",
  working: "w-1/2",
  exploring: "w-1/4",
};

export function LevelIndicator({ level }: { level: ExperienceLevel }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span className="h-1 w-14 overflow-hidden rounded-full bg-surface-2">
        <span className={cn("block h-full rounded-full bg-accent", levelWidth[level])} />
      </span>
      <span className="font-mono text-[11px] uppercase tracking-wide text-muted">{levelLabel[level]}</span>
    </span>
  );
}
