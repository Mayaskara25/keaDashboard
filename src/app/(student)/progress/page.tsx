import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { ProgressCharts } from "./charts";

export default async function ProgressPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const [mastery, sessions] = await Promise.all([
    prisma.studentMastery.findMany({
      where: { studentId: session.user.id },
      include: { concept: { select: { chapter: true, topic: true } } },
    }),
    prisma.testSession.findMany({
      where: { studentId: session.user.id, status: "COMPLETED" },
      orderBy: { submittedAt: "asc" },
      select: { id: true, totalScore: true, maxScore: true, submittedAt: true, test: { select: { title: true } } },
      take: 30,
    }),
  ]);

  // Group mastery by chapter
  const byChapter: Record<string, { topic: string; score: number; skill: string }[]> = {};
  for (const m of mastery) {
    const chapter = m.concept.chapter;
    byChapter[chapter] = byChapter[chapter] ?? [];
    byChapter[chapter].push({ topic: m.concept.topic, score: Math.round(m.masteryScore), skill: m.skill });
  }

  const timelineData = sessions
    .filter((s) => s.submittedAt && s.maxScore > 0)
    .map((s) => ({
      date: s.submittedAt!.toLocaleDateString(),
      accuracy: Math.round(((s.totalScore ?? 0) / s.maxScore) * 100),
      title: s.test.title,
    }));

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-5">
        <h1 className="text-[20px] font-bold text-[var(--text)]">Progress</h1>
        <p className="text-[13px] text-[var(--text-muted)] mt-1">
          Mastery heatmap and accuracy over time.
        </p>
      </div>

      <ProgressCharts byChapter={byChapter} timelineData={timelineData} />
    </div>
  );
}
