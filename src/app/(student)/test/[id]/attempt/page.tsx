"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { clsx } from "clsx";
import { Timer } from "@/components/test/timer";
import { Button } from "@/components/ui/button";
import { LatexText } from "@/components/ui/latex";
import { Flag, ChevronLeft, ChevronRight } from "lucide-react";

type Question = {
  id: string;
  questionText: string;
  questionType: string;
  options: string[] | null;
  conceptId: string;
  skill: string;
};

type SessionData = {
  test: {
    id: string;
    title: string;
    durationMinutes: number;
    questionIds: string[];
    markingScheme: Record<string, { correct: number; wrong: number; skipped: number }>;
  };
  id: string;
};

export default function AttemptPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [sessionData, setSessionData] = useState<SessionData | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string | null>>({});
  const [flagged, setFlagged] = useState<Set<string>>(new Set());
  const [startTimes, setStartTimes] = useState<Record<string, number>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch(`/api/sessions/${id}/data`)
      .then((r) => r.json())
      .then(async (data) => {
        setSessionData(data.session);
        const qRes = await fetch(
          `/api/questions?ids=${data.session.test.questionIds.join(",")}`
        );
        const qData = await qRes.json();
        setQuestions(qData.questions ?? []);
        const now = Date.now();
        setStartTimes(
          Object.fromEntries((qData.questions ?? []).map((q: Question) => [q.id, now]))
        );
      });
  }, [id]);

  const currentQ = questions[current];

  function selectOption(option: string) {
    setAnswers((prev) => ({ ...prev, [currentQ.id]: option }));
  }

  function toggleFlag() {
    setFlagged((prev) => {
      const next = new Set(prev);
      if (next.has(currentQ.id)) next.delete(currentQ.id); else next.add(currentQ.id);
      return next;
    });
  }

  const submitTest = useCallback(async () => {
    if (submitting) return;
    setSubmitting(true);

    // Submit all unanswered as skipped
    const toSubmit = questions.map((q) => ({
      questionId: q.id,
      testSessionId: id,
      selectedOption: answers[q.id] ?? null,
      timeTakenSec: Math.round((Date.now() - (startTimes[q.id] ?? Date.now())) / 1000),
      skipped: !answers[q.id],
    }));

    await Promise.all(
      toSubmit.map((attempt) =>
        fetch("/api/attempts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(attempt),
        })
      )
    );

    await fetch(`/api/sessions/${id}/submit`, { method: "PATCH" });
    router.push(`/test/${id}/review`);
  }, [submitting, questions, answers, id, startTimes, router]);

  if (!sessionData || questions.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-[var(--text-muted)] text-[14px]">Loading test...</p>
      </div>
    );
  }

  return (
    <div className="flex h-full overflow-hidden bg-[var(--bg-subtle)]">
      {/* Question list sidebar */}
      <div className="w-48 shrink-0 border-r border-[var(--border)] bg-[var(--bg)] flex flex-col">
        <div className="px-3 py-3 border-b border-[var(--border)]">
          <p className="text-[12px] font-semibold text-[var(--text-muted)] uppercase tracking-wide">
            Questions
          </p>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          <div className="grid grid-cols-4 gap-1">
            {questions.map((q, i) => (
              <button
                key={q.id}
                onClick={() => setCurrent(i)}
                className={clsx(
                  "w-8 h-8 text-[12px] font-medium rounded-[4px] transition-colors",
                  i === current && "bg-[var(--accent)] text-white",
                  i !== current && answers[q.id] && "bg-[var(--success-bg)] text-[var(--success)] border border-[var(--border)]",
                  i !== current && !answers[q.id] && "bg-[var(--bg-subtle)] text-[var(--text-muted)] border border-[var(--border)]",
                  flagged.has(q.id) && i !== current && "border-[var(--warning)] text-[var(--warning)]"
                )}
              >
                {i + 1}
              </button>
            ))}
          </div>
        </div>
        <div className="p-3 border-t border-[var(--border)]">
          <Button
            variant="destructive"
            size="sm"
            className="w-full"
            onClick={submitTest}
            loading={submitting}
          >
            Submit
          </Button>
        </div>
      </div>

      {/* Main area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <div className="flex items-center justify-between px-5 py-2.5 border-b border-[var(--border)] bg-[var(--bg)]">
          <span className="text-[13px] font-medium text-[var(--text)]">
            Q{current + 1} / {questions.length}
          </span>
          <Timer durationMinutes={sessionData.test.durationMinutes} onExpire={submitTest} />
          <button
            onClick={toggleFlag}
            className={clsx(
              "flex items-center gap-1.5 text-[13px] px-2 py-1 rounded-[4px] transition-colors",
              flagged.has(currentQ?.id)
                ? "text-[var(--warning)] bg-[var(--warning-bg)]"
                : "text-[var(--text-muted)] hover:bg-[var(--bg-subtle)]"
            )}
          >
            <Flag size={13} />
            {flagged.has(currentQ?.id) ? "Flagged" : "Flag"}
          </button>
        </div>

        {/* Question */}
        <div className="flex-1 overflow-y-auto p-6">
          {currentQ && (
            <div className="max-w-2xl">
              <p className="text-[15px] leading-relaxed text-[var(--text)] mb-6 whitespace-pre-wrap">
                <LatexText text={currentQ.questionText} />
              </p>

              {currentQ.options && (
                <div className="flex flex-col gap-2">
                  {(currentQ.options as string[]).map((opt, i) => {
                    const key = String.fromCharCode(65 + i); // A, B, C, D
                    const selected = answers[currentQ.id] === key;
                    return (
                      <button
                        key={key}
                        onClick={() => selectOption(key)}
                        className={clsx(
                          "flex items-start gap-3 px-4 py-3 rounded-[6px] text-[14px] text-left border transition-colors",
                          selected
                            ? "border-[var(--accent)] bg-[#e8f4fd] text-[var(--accent)]"
                            : "border-[var(--border)] bg-[var(--bg)] text-[var(--text)] hover:bg-[var(--bg-subtle)]"
                        )}
                      >
                        <span className="font-semibold w-5 shrink-0">{key}.</span>
                        <LatexText text={opt} />
                      </button>
                    );
                  })}
                </div>
              )}

              {currentQ.questionType === "NUMERICAL" && (
                <input
                  type="number"
                  placeholder="Enter numerical answer"
                  value={answers[currentQ.id] ?? ""}
                  onChange={(e) => setAnswers((prev) => ({ ...prev, [currentQ.id]: e.target.value }))}
                  className="mt-4 px-3 py-2 w-48 border border-[var(--border)] rounded-[6px] text-[14px] bg-[var(--bg)] text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                />
              )}
            </div>
          )}
        </div>

        {/* Bottom nav */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-[var(--border)] bg-[var(--bg)]">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setCurrent((p) => Math.max(0, p - 1))}
            disabled={current === 0}
          >
            <ChevronLeft size={14} /> Previous
          </Button>
          {current < questions.length - 1 ? (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setCurrent((p) => p + 1)}
            >
              Next <ChevronRight size={14} />
            </Button>
          ) : (
            <Button variant="primary" size="sm" onClick={submitTest} loading={submitting}>
              Submit Test
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
