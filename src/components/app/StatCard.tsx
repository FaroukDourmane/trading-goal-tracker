import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export function StatCard({
  label, value, sub, tone = "default", icon,
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  tone?: "default" | "success" | "danger" | "warning" | "info";
  icon?: ReactNode;
}) {
  const toneCls = {
    default: "text-foreground",
    success: "text-[color:var(--color-success)]",
    danger: "text-[color:var(--color-destructive)]",
    warning: "text-[color:var(--color-warning)]",
    info: "text-[color:var(--color-info)]",
  }[tone];
  return (
    <div className="glass rounded-xl p-4 md:p-5 flex flex-col gap-1 min-w-0">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs uppercase tracking-wider text-muted-foreground">{label}</span>
        {icon && <span className="text-muted-foreground">{icon}</span>}
      </div>
      <div className={cn("text-2xl md:text-3xl font-semibold tabular-nums truncate", toneCls)}>
        {value}
      </div>
      {sub && <div className="text-xs text-muted-foreground">{sub}</div>}
    </div>
  );
}
