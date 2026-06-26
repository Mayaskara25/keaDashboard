import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const studentId = searchParams.get("studentId") ?? session.user.id;

  // Teachers can view any student; students can only view themselves
  if (session.user.role === "STUDENT" && studentId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [mastery, attempts] = await Promise.all([
    prisma.studentMastery.findMany({ where: { studentId } }),
    prisma.attempt.aggregate({
      where: { studentId },
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
      ? Math.round(
          mastery.reduce(
            (s, m) => s + (m.questionsCorrect / Math.max(m.questionsAttempted, 1)) * 100,
            0
          ) / mastery.length
        )
      : 0;

  const weakTopics = mastery
    .filter((m) => m.masteryScore < 60)
    .sort((a, b) => a.masteryScore - b.masteryScore)
    .slice(0, 10);

  return NextResponse.json({
    overallMastery,
    overallAccuracy,
    totalSolved: attempts._count.id ?? 0,
    avgTimeSec: Math.round(attempts._avg.timeTakenSec ?? 0),
    weakTopics,
  });
}
