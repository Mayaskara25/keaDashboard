import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { OverviewCard } from "@/components/student/overview-card";
import { MasteryBar } from "@/components/student/mastery-bar";
import { Button } from "@/components/ui/button";
import { Zap, FlaskConical, FileText, Clock } from "lucide-react";

interface DashboardPageProps {
  studentId?: string;
  readOnly?: boolean;
}

export default async function DashboardPage({ studentId, readOnly = false }: DashboardPageProps) {
  const session = await auth();
  if (!session) redirect("/login");

  const id = studentId ?? session.user.id;

  const [mastery, sessions, attempts] = await Promise.all([
    prisma.studentMastery.findMany({ where: { studentId: id } }),
    prisma.testSession.findMany({
      where: { studentId: id, status: "COMPLETED" },
      orderBy: { submittedAt: "desc" },
      take: 5,
      include: { test: { select: { title: true, type: true } } },
    }),
    prisma.attempt.aggregate({
      where: { studentId: id },
      _count: { id: true },
      _avg: { timeTakenSec: true },
    }),
  ]);

  const overallMastery =
    mastery.length > 0
      ? Math.round(mastery.reduce((s, m) => s + m.masteryScore, 0) / mastery.length)
      : 0;

  const overallAccuracy =
    mastery.length > 0
      ? Math.round(mastery.reduce((s, m) => s + (m.questionsCorrect / Math.max(m.questionsAttempted, 1)) * 100, 0) / mastery.length)
      : 0;

  const weakTopics = mastery
    .filter((m) => m.masteryScore < 60)
    .sort((a, b) => a.masteryScore - b.masteryScore)
    .slice(0, 8);

  // Get concept info for weak topics
  const conceptIds = weakTopics.map((w) => w.conceptId);
  const concepts = await prisma.conceptTaxonomy.findMany({
    where: { conceptId: { in: conceptIds } },
    select: { conceptId: true, topic: true, chapter: true },
  });
  const conceptMap = new Map(concepts.map((c) => [c.conceptId, c]));

  return (
    <div className="max-w-5xl mx-auto flex flex-col gap-6">
      {/* Overview row */}
      <div className="grid grid-cols-4 gap-4">
        <OverviewCard label="Overall Mastery" value={`${overallMastery}%`} />
        <OverviewCard label="Accuracy" value={`${overallAccuracy}%`} />
        <OverviewCard
          label="Questions Solved"
          value={attempts._count.id ?? 0}
        />
        <OverviewCard
          label="Avg Time"
          value={`${Math.round(attempts._avg.timeTakenSec ?? 0)}s`}
          sub="per question"
        />
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Weak topics */}
        <div className="col-span-2 bg-[var(--bg)] border border-[var(--border)] rounded-[6px] shadow-[var(--shadow)]">
          <div className="px-5 py-3 border-b border-[var(--border)]">
            <h2 className="text-[14px] font-semibold text-[var(--text)]">Weak Topics</h2>
            <p className="text-[12px] text-[var(--text-muted)]">Mastery below 60%</p>
          </div>
          <div className="p-5 flex flex-col gap-4">
            {weakTopics.length === 0 ? (
              <p className="text-[13px] text-[var(--text-muted)]">No weak topics — great work!</p>
            ) : (
              weakTopics.map((w) => {
                const concept = conceptMap.get(w.conceptId);
                return (
                  <div key={`${w.conceptId}-${w.skill}`} className="flex flex-col gap-1">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-[13px] font-medium text-[var(--text)]">
                          {concept?.topic ?? w.conceptId}
                        </span>
                        <span className="text-[12px] text-[var(--text-muted)] ml-2">
                          · {w.skill.replace(/_/g, " ")}
                        </span>
                      </div>
                      <span className="text-[11px] text-[var(--text-muted)]">
                        {concept?.chapter}
                      </span>
                    </div>
                    <MasteryBar score={Math.round(w.masteryScore)} />
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-4">
          {/* Quick actions */}
          {!readOnly && (
            <div className="bg-[var(--bg)] border border-[var(--border)] rounded-[6px] shadow-[var(--shadow)] p-4 flex flex-col gap-2">
              <h2 className="text-[13px] font-semibold text-[var(--text)] mb-1">Quick Actions</h2>
              <Link href="/test/adaptive">
                <Button variant="primary" size="sm" className="w-full justify-start gap-2">
                  <Zap size={14} /> Start Adaptive Test
                </Button>
              </Link>
              <Link href="/test/custom">
                <Button variant="secondary" size="sm" className="w-full justify-start gap-2">
                  <FlaskConical size={14} /> Custom Test
                </Button>
              </Link>
              <Link href="/test/pyq">
                <Button variant="secondary" size="sm" className="w-full justify-start gap-2">
                  <FileText size={14} /> PYQ Papers
                </Button>
              </Link>
            </div>
          )}

          {/* Recent activity */}
          <div className="bg-[var(--bg)] border border-[var(--border)] rounded-[6px] shadow-[var(--shadow)]">
            <div className="px-4 py-3 border-b border-[var(--border)]">
              <h2 className="text-[13px] font-semibold text-[var(--text)]">Recent Activity</h2>
            </div>
            <div className="divide-y divide-[var(--border)]">
              {sessions.length === 0 ? (
                <p className="text-[13px] text-[var(--text-muted)] p-4">No tests attempted yet.</p>
              ) : (
                sessions.map((s) => (
                  <div key={s.id} className="px-4 py-3 flex items-center justify-between">
                    <div>
                      <p className="text-[13px] font-medium text-[var(--text)] truncate max-w-[140px]">
                        {s.test.title}
                      </p>
                      <p className="text-[11px] text-[var(--text-muted)]">
                        {s.submittedAt?.toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 text-[12px] text-[var(--text-muted)]">
                      <Clock size={12} />
                      <span>
                        {s.totalScore !== null ? `${Math.round(s.totalScore ?? 0)}/${s.maxScore}` : "—"}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
