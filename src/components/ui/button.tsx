"use client";

import { clsx } from "clsx";
import { ButtonHTMLAttributes, forwardRef } from "react";

type Variant = "primary" | "secondary" | "ghost" | "destructive";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", size = "md", loading, className, children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={clsx(
          "inline-flex items-center justify-center gap-2 font-medium rounded-[6px] transition-colors cursor-pointer select-none",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          // sizes
          size === "sm" && "px-3 py-1.5 text-[13px]",
          size === "md" && "px-4 py-2 text-[14px]",
          size === "lg" && "px-5 py-2.5 text-[15px]",
          // variants
          variant === "primary" &&
            "bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)]",
          variant === "secondary" &&
            "bg-[var(--bg)] text-[var(--text)] border border-[var(--border)] hover:bg-[var(--bg-subtle)]",
          variant === "ghost" &&
            "bg-transparent text-[var(--text-muted)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text)]",
          variant === "destructive" &&
            "bg-[var(--danger-bg)] text-[var(--danger)] border border-[var(--border)] hover:bg-red-100",
          className
        )}
        {...props}
      >
        {loading ? (
          <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
        ) : null}
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";
