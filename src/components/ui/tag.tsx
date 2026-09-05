import { cn } from "@/lib/utils";

export function Tag({ children, className }: { children: string; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border border-border bg-surface px-2.5 py-1 font-mono text-[11px] text-muted-2",
        className,
      )}
    >
      {children}
    </span>
  );
}
