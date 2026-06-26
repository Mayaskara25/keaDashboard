import { clsx } from "clsx";
import { InputHTMLAttributes, forwardRef } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className, id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");
    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label
            htmlFor={inputId}
            className="text-[13px] font-medium text-[var(--text)]"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={clsx(
            "w-full px-3 py-2 text-[14px] rounded-[6px]",
            "bg-[var(--bg)] text-[var(--text)] placeholder:text-[var(--text-muted)]",
            "border border-[var(--border)]",
            "outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-0 focus:border-[var(--accent)]",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            error && "border-[var(--danger)]",
            className
          )}
          {...props}
        />
        {error && <p className="text-[12px] text-[var(--danger)]">{error}</p>}
      </div>
    );
  }
);
Input.displayName = "Input";
