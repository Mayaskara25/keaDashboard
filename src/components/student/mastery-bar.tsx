interface MasteryBarProps {
  score: number;
  showLabel?: boolean;
}

export function MasteryBar({ score, showLabel = true }: MasteryBarProps) {
  const color =
    score < 40
      ? "var(--danger)"
      : score < 65
      ? "var(--warning)"
      : "var(--success)";

  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-1.5 bg-[var(--border)] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${score}%`, backgroundColor: color }}
        />
      </div>
      {showLabel && (
        <span className="text-[13px] font-medium w-10 text-right" style={{ color }}>
          {score}%
        </span>
      )}
    </div>
  );
}
