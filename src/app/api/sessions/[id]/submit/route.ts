import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { recalculateStudentMastery } from "@/lib/recalculate";
import { Skill } from "@/generated/prisma/client";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const testSession = await prisma.testSession.findUnique({
    where: { id },
    include: { attempts: { include: { question: { select: { conceptId: true, skill: true } } } } },
  });

  if (!testSession) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (testSession.studentId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (testSession.status !== "IN_PROGRESS") {
    return NextResponse.json({ error: "Session already submitted" }, { status: 400 });
  }

  const totalScore = testSession.attempts.reduce((sum, a) => sum + a.marksAwarded, 0);

  await prisma.testSession.update({
    where: { id },
    data: { status: "COMPLETED", submittedAt: new Date(), totalScore },
  });

  // Recalculate mastery for each affected concept+skill pair
  const pairs = new Set(
    testSession.attempts.map((a) => `${a.question.conceptId}::${a.question.skill}`)
  );
  for (const pair of pairs) {
    const [conceptId, skill] = pair.split("::");
    await recalculateStudentMastery(session.user.id, conceptId, skill as Skill);
  }

  return NextResponse.json({ totalScore, status: "COMPLETED" });
}
