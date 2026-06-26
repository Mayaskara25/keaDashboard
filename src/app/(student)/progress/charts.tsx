"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface HeatmapEntry {
  topic: string;
  score: number;
  skill: string;
}

interface ProgressChartsProps {
  byChapter: Record<string, HeatmapEntry[]>;
  timelineData: { date: string; accuracy: number; title: string }[];
}

function masteryColor(score: number) {
  if (score < 40) return "var(--danger)";
  if (score < 65) return "var(--warning)";
  return "var(--success)";
}

export function ProgressCharts({ byChapter, timelineData }: ProgressChartsProps) {
  return (
    <div className="flex flex-col gap-6">
      {/* Mastery heatmap */}
      <div className="bg-[var(--bg)] border border-[var(--border)] rounded-[6px] shadow-[var(--shadow)]">
        <div className="px-5 py-3 border-b border-[var(--border)]">
          <h2 className="text-[14px] font-semibold text-[var(--text)]">Mastery Heatmap</h2>
        </div>
        <div className="p-5 space-y-5">
          {Object.entries(byChapter).map(([chapter, entries]) => (
            <div key={chapter}>
              <p className="text-[12px] font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-2">
                {chapter}
              </p>
              <div className="flex flex-wrap gap-2">
                {entries.map((e, i) => (
                  <div
                    key={i}
                    title={`${e.topic} · ${e.skill.replace(/_/g, " ")} · ${e.score}%`}
                    className="flex flex-col items-center justify-center w-16 h-14 rounded-[4px] text-center cursor-default select-none text-white text-[11px] font-medium"
                    style={{ backgroundColor: masteryColor(e.score) }}
                  >
                    <span className="text-[14px] font-bold">{e.score}%</span>
                    <span className="opacity-80 leading-tight px-1 truncate w-full text-center">
                      {e.topic.slice(0, 8)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
          {Object.keys(byChapter).length === 0 && (
            <p className="text-[13px] text-[var(--text-muted)]">
              No mastery data yet. Attempt tests to populate this chart.
            </p>
          )}
        </div>

        {/* Legend */}
        <div className="px-5 pb-4 flex items-center gap-4 text-[12px] text-[var(--text-muted)]">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-[2px] bg-[var(--danger)] inline-block" /> Below 40%
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-[2px] bg-[var(--warning)] inline-block" /> 40–65%
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-[2px] bg-[var(--success)] inline-block" /> Above 65%
          </span>
        </div>
      </div>

      {/* Accuracy timeline */}
      <div className="bg-[var(--bg)] border border-[var(--border)] rounded-[6px] shadow-[var(--shadow)]">
        <div className="px-5 py-3 border-b border-[var(--border)]">
          <h2 className="text-[14px] font-semibold text-[var(--text)]">Accuracy Over Time</h2>
        </div>
        <div className="p-5">
          {timelineData.length === 0 ? (
            <p className="text-[13px] text-[var(--text-muted)]">No test data yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={timelineData} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--border)"
                  vertical={false}
                />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11, fill: "var(--text-muted)" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  domain={[0, 100]}
                  tick={{ fontSize: 11, fill: "var(--text-muted)" }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `${v}%`}
                />
                <Tooltip
                  contentStyle={{
                    background: "var(--bg)",
                    border: "1px solid var(--border)",
                    borderRadius: 6,
                    fontSize: 12,
                    color: "var(--text)",
                  }}
                  formatter={(v) => [`${v}%`, "Accuracy"]}
                  labelFormatter={(label, payload) =>
                    payload?.[0]?.payload?.title ?? label
                  }
                />
                <Line
                  type="monotone"
                  dataKey="accuracy"
                  stroke="var(--accent)"
                  strokeWidth={2}
                  dot={{ r: 3, fill: "var(--accent)" }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}
