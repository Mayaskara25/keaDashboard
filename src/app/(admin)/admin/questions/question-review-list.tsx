"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronUp, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DifficultyBadge } from "@/components/ui/badge";
import { LatexText } from "@/components/ui/latex";

type Question = {
  id: string;
  questionText: string;
  questionType: string;
  options: unknown; // Prisma stores Json — always string[] or null at runtime
  correctOption: string | null;
  explanation: string | null;
  skill: string;
  difficultyAi: number;
  bloomsLevel: string;
  source: string | null;
  exam: string | null;
  year: number | null;
  concept: { topic: string; chapter: string };
};

function QuestionCard({ q }: { q: Question }) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState<"approve" | "reject" | null>(null);

  async function update(action: "approve" | "reject") {
    setLoading(action);
    await fetch(`/api/admin/questions/${q.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    setLoading(null);
    router.refresh();
  }

  const opts = Array.isArray(q.options) ? (q.options as string[]) : null;
  const correctIndex = q.correctOption
    ? q.correctOption.charCodeAt(0) - 65
    : -1;

  return (
    <div className="border border-[var(--border)] rounded-[6px] bg-[var(--bg)] overflow-hidden">
      {/* Header row */}
      <div className="flex items-start gap-4 px-4 py-3">
        <div className="flex-1 min-w-0">
          <p className="text-[13px] text-[var(--text)] leading-relaxed line-clamp-2">
            <LatexText text={q.questionText} />
          </p>
          <div className="flex items-center gap-3 mt-1.5 flex-wrap">
            <span className="text-[11px] font-medium text-[var(--text-muted)]">
              {q.concept.chapter} · {q.concept.topic}
            </span>
            <span className="text-[11px] text-[var(--text-muted)]">
              {q.skill.replace(/_/g, " ")}
            </span>
            <DifficultyBadge level={q.difficultyAi} />
            {q.source && (
              <span className="text-[11px] text-[var(--text-muted)]">{q.source}</span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setExpanded((v) => !v)}
            className="flex items-center gap-1 text-[12px] text-[var(--text-muted)] hover:text-[var(--text)] px-2 py-1 rounded-[4px] hover:bg-[var(--bg-subtle)] transition-colors"
          >
            {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            {expanded ? "Collapse" : "View full"}
          </button>
          <Button
            size="sm"
            variant="secondary"
            loading={loading === "approve"}
            onClick={() => update("approve")}
            className="text-[var(--success)] border-[var(--success)] hover:bg-[var(--success-bg)]"
          >
            <Check size={13} /> Approve
          </Button>
          <Button
            size="sm"
            variant="destructive"
            loading={loading === "reject"}
            onClick={() => update("reject")}
          >
            <X size={13} /> Reject
          </Button>
        </div>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div className="border-t border-[var(--border)] px-4 py-4 bg-[var(--bg-subtle)] space-y-4">
          {/* Full question */}
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)] mb-1">
              Question
            </p>
            <p className="text-[14px] leading-relaxed text-[var(--text)] whitespace-pre-wrap">
              <LatexText text={q.questionText} />
            </p>
          </div>

          {/* Options */}
          {opts && opts.length > 0 && (
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)] mb-2">
                Options
              </p>
              <div className="flex flex-col gap-1.5">
                {opts.map((opt, i) => {
                  const letter = String.fromCharCode(65 + i);
                  const isCorrect = i === correctIndex;
                  return (
                    <div
                      key={letter}
                      className={`flex items-start gap-2 px-3 py-2 rounded-[5px] text-[13px] ${
                        isCorrect
                          ? "bg-[var(--success-bg)] text-[var(--success)] font-medium"
                          : "bg-[var(--bg)] text-[var(--text)] border border-[var(--border)]"
                      }`}
                    >
                      <span className="font-semibold w-4 shrink-0">{letter}.</span>
                      <LatexText text={opt} />
                      {isCorrect && (
                        <span className="ml-auto text-[11px] font-semibold">✓ Correct</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Non-MCQ correct answer */}
          {(!opts || opts.length === 0) && q.correctOption && (
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)] mb-1">
                Answer
              </p>
              <p className="text-[13px] text-[var(--text)]">
                <LatexText text={q.correctOption} />
              </p>
            </div>
          )}

          {/* Explanation */}
          {q.explanation && (
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)] mb-1">
                Explanation
              </p>
              <p className="text-[13px] leading-relaxed text-[var(--text)] whitespace-pre-wrap">
                <LatexText text={q.explanation} />
              </p>
            </div>
          )}

          {/* Classification metadata */}
          <div className="grid grid-cols-2 gap-x-8 gap-y-1 pt-2 border-t border-[var(--border)]">
            {[
              ["Type", q.questionType],
              ["Blooms", q.bloomsLevel],
              ["Exam", q.exam ?? "—"],
              ["Year", q.year?.toString() ?? "—"],
            ].map(([label, value]) => (
              <div key={label} className="flex gap-2 text-[12px]">
                <span className="text-[var(--text-muted)] w-16">{label}</span>
                <span className="text-[var(--text)]">{value}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function QuestionReviewList({ questions }: { questions: Question[] }) {
  if (questions.length === 0) {
    return (
      <p className="text-[14px] text-[var(--text-muted)]">No questions pending review.</p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {questions.map((q) => (
        <QuestionCard key={q.id} q={q} />
      ))}
    </div>
  );
}
