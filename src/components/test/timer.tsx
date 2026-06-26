"use client";

import { useEffect, useState } from "react";
import { Clock } from "lucide-react";

interface TimerProps {
  durationMinutes: number;
  onExpire?: () => void;
}

export function Timer({ durationMinutes, onExpire }: TimerProps) {
  const [remaining, setRemaining] = useState(durationMinutes * 60);

  useEffect(() => {
    const interval = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          onExpire?.();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [durationMinutes, onExpire]);

  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;
  const isLow = remaining < 300;

  return (
    <div
      className="flex items-center gap-1.5 text-[13px] font-mono font-medium"
      style={{ color: isLow ? "var(--danger)" : "var(--text-muted)" }}
    >
      <Clock size={13} />
      <span>
        {String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}
      </span>
    </div>
  );
}
