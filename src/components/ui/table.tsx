import { clsx } from "clsx";
import { HTMLAttributes, TdHTMLAttributes, ThHTMLAttributes } from "react";

export function Table({ className, children, ...props }: HTMLAttributes<HTMLTableElement>) {
  return (
    <div className="w-full overflow-x-auto">
      <table
        className={clsx("w-full border-collapse text-[14px]", className)}
        {...props}
      >
        {children}
      </table>
    </div>
  );
}

export function Thead({ className, children, ...props }: HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <thead className={clsx("bg-[var(--bg-subtle)]", className)} {...props}>
      {children}
    </thead>
  );
}

export function Th({ className, children, ...props }: ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={clsx(
        "px-4 py-2.5 text-left text-[12px] font-semibold uppercase tracking-wide text-[var(--text-muted)]",
        "border-b border-[var(--border)]",
        className
      )}
      {...props}
    >
      {children}
    </th>
  );
}

export function Tbody({ className, children, ...props }: HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <tbody className={clsx("divide-y divide-[var(--border)]", className)} {...props}>
      {children}
    </tbody>
  );
}

export function Tr({ className, children, ...props }: HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr
      className={clsx("hover:bg-[var(--bg-subtle)] transition-colors", className)}
      {...props}
    >
      {children}
    </tr>
  );
}

export function Td({ className, children, ...props }: TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td
      className={clsx("px-4 py-3 text-[var(--text)] align-middle", className)}
      {...props}
    >
      {children}
    </td>
  );
}
