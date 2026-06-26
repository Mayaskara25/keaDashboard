import { clsx } from "clsx";
import { HTMLAttributes } from "react";

type BadgeVariant = "default" | "success" | "warning" | "danger" | "accent" | "muted";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

export function Badge({ variant = "default", className, children, ...props }: BadgeProps) {
  return (
    <span
      className={clsx(
        "inline-flex items-center px-2 py-0.5 rounded text-[12px] font-medium",
        variant === "default" &&
          "bg-[var(--bg-subtle)] text-[var(--text-muted)] border border-[var(--border)]",
        variant === "success" && "bg-[var(--success-bg)] text-[var(--success)]",
        variant === "warning" && "bg-[var(--warning-bg)] text-[var(--warning)]",
        variant === "danger" && "bg-[var(--danger-bg)] text-[var(--danger)]",
        variant === "accent" && "bg-[var(--accent)] text-white",
        variant === "muted" && "bg-[var(--bg-subtle)] text-[var(--text-muted)]",
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}

export function DifficultyBadge({ level }: { level: number }) {
  const variant =
    level <= 2 ? "success" : level === 3 ? "warning" : "danger";
  const label = level <= 2 ? "Easy" : level === 3 ? "Medium" : "Hard";
  return <Badge variant={variant}>{label}</Badge>;
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, BadgeVariant> = {
    VERIFIED: "success",
    PENDING: "warning",
    UNDER_REVIEW: "warning",
    ARCHIVED: "muted",
  };
  return <Badge variant={map[status] ?? "default"}>{status.replace("_", " ")}</Badge>;
}

export function MasteryBadge({ score }: { score: number }) {
  const variant = score < 40 ? "danger" : score < 65 ? "warning" : "success";
  return <Badge variant={variant}>{score}%</Badge>;
}
