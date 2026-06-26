import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { Badge, MasteryBadge } from "@/components/ui/badge";
import { ChevronLeft, CheckCircle2, XCircle } from "lucide-react";

export default async function ReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session) redirect("/login");

  const testSession = await prisma.testSession.findUnique({
    where: { id },
    include: {
      test: { select: { title: true, totalMarks: true } },
      attempts: {
        include: {
          question: {
            select: {
              questionText: true,
              questionType: true,
              options: true,
              correctOption: true,
              explanation: true,
              misconceptions: true,
              skill: true,
            },
          },
        },
        orderBy: { submittedAt: "asc" },
      },
    },
  });

  if (!testSession) notFound();
  if (session.user.role === "STUDENT" && testSession.studentId !== session.user.id) {
    redirect("/dashboard");
  }

  const correct = testSession.attempts.filter((a) => a.isCorrect).length;
  const accuracy = Math.round((correct / testSession.attempts.length) * 100);

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-5 flex items-center gap-3">
        <Link
          href="/dashboard"
          className="flex items-center gap-1 text-[13px] text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
        >
          <ChevronLeft size={14} /> Back
        </Link>
      </div>

      {/* Score summary */}
      <div className="bg-[var(--bg)] border border-[var(--border)] rounded-[6px] p-5 mb-5 shadow-[var(--shadow)]">
        <h1 className="text-[16px] font-bold text-[var(--text)] mb-3">{testSession.test.title}</h1>
        <div className="flex items-center gap-6 flex-wrap">
          <div>
            <p className="text-[11px] text-[var(--text-muted)] uppercase tracking-wide">Score</p>
            <p className="text-[22px] font-bold text-[var(--text)]">
              {Math.round(testSession.totalScore ?? 0)}/{testSession.maxScore}
            </p>
          </div>
          <div>
            <p className="text-[11px] text-[var(--text-muted)] uppercase tracking-wide">Accuracy</p>
            <MasteryBadge score={accuracy} />
          </div>
          <div>
            <p className="text-[11px] text-[var(--text-muted)] uppercase tracking-wide">Correct</p>
            <p className="text-[14px] font-semibold text-[var(--text)]">
              {correct} / {testSession.attempts.length}
            </p>
          </div>
          <div>
            <p className="text-[11px] text-[var(--text-muted)] uppercase tracking-wide">Time</p>
            <p className="text-[14px] font-semibold text-[var(--text)]">
              {Math.round(testSession.attempts.reduce((s, a) => s + a.timeTakenSec, 0) / 60)} min
            </p>
          </div>
        </div>
      </div>

      {/* Per-question review */}
      <div className="flex flex-col gap-3">
        {testSession.attempts.map((attempt, i) => (
          <details
            key={attempt.id}
            className="bg-[var(--bg)] border border-[var(--border)] rounded-[6px] shadow-[var(--shadow)] group"
          >
            <summary className="flex items-center gap-3 px-4 py-3 cursor-pointer list-none select-none hover:bg-[var(--bg-subtle)] rounded-[6px]">
              {attempt.isCorrect ? (
                <CheckCircle2 size={15} className="text-[var(--success)] shrink-0" />
              ) : (
                <XCircle size={15} className="text-[var(--danger)] shrink-0" />
              )}
              <span className="text-[13px] text-[var(--text-muted)] w-6 shrink-0">Q{i + 1}</span>
              <span className="text-[13px] text-[var(--text)] flex-1 line-clamp-1">
                {attempt.question.questionText}
              </span>
              <Badge variant="muted" className="shrink-0">
                {attempt.question.skill.replace(/_/g, " ")}
              </Badge>
              <span className="text-[12px] text-[var(--text-muted)] shrink-0">
                {attempt.timeTakenSec}s
              </span>
            </summary>

            <div className="px-4 pb-4 border-t border-[var(--border)] pt-3 space-y-3">
              <p className="text-[14px] text-[var(--text)] leading-relaxed">
                {attempt.question.questionText}
              </p>

              {attempt.question.options && (
                <div className="flex flex-col gap-1.5">
                  {(attempt.question.options as string[]).map((opt, j) => {
                    const key = String.fromCharCode(65 + j);
                    const isCorrect = key === attempt.question.correctOption;
                    const isSelected = key === attempt.selectedOption;
                    return (
                      <div
                        key={key}
                        className={`flex items-start gap-2 px-3 py-2 rounded-[4px] text-[13px] border ${
                          isCorrect
                            ? "border-[var(--success)] bg-[var(--success-bg)] text-[var(--success)]"
                            : isSelected && !isCorrect
                            ? "border-[var(--danger)] bg-[var(--danger-bg)] text-[var(--danger)]"
                            : "border-[var(--border)] text-[var(--text-muted)]"
                        }`}
                      >
                        <span className="font-semibold w-4 shrink-0">{key}.</span>
                        <span>{opt}</span>
                      </div>
                    );
                  })}
                </div>
              )}

              {attempt.question.explanation && (
                <div className="bg-[var(--bg-subtle)] rounded-[4px] p-3">
                  <p className="text-[12px] font-semibold text-[var(--text-muted)] mb-1">Explanation</p>
                  <p className="text-[13px] text-[var(--text)]">{attempt.question.explanation}</p>
                </div>
              )}

              {attempt.question.misconceptions.length > 0 && !attempt.isCorrect && (
                <div>
                  <p className="text-[12px] font-semibold text-[var(--warning)] mb-1">Common mistakes</p>
                  <ul className="list-disc list-inside space-y-0.5">
                    {attempt.question.misconceptions.map((m, k) => (
                      <li key={k} className="text-[12px] text-[var(--text-muted)]">{m}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </details>
        ))}
      </div>
    </div>
  );
}
