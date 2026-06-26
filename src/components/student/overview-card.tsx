interface OverviewCardProps {
  label: string;
  value: string | number;
  sub?: string;
}

export function OverviewCard({ label, value, sub }: OverviewCardProps) {
  return (
    <div className="bg-[var(--bg)] border border-[var(--border)] rounded-[6px] p-4 shadow-[var(--shadow)]">
      <p className="text-[12px] text-[var(--text-muted)] uppercase tracking-wide font-medium">
        {label}
      </p>
      <p className="text-[26px] font-bold text-[var(--text)] mt-1">{value}</p>
      {sub && <p className="text-[12px] text-[var(--text-muted)] mt-0.5">{sub}</p>}
    </div>
  );
}
