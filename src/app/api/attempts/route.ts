import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const schema = z.object({
  testSessionId: z.string(),
  questionId: z.string(),
  selectedOption: z.string().nullable(),
  timeTakenSec: z.number().min(0),
  skipped: z.boolean().default(false),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid" }, { status: 400 });

  const { testSessionId, questionId, selectedOption, timeTakenSec, skipped } = parsed.data;

  const [testSession, question] = await Promise.all([
    prisma.testSession.findUnique({ where: { id: testSessionId }, include: { test: true } }),
    prisma.question.findUnique({ where: { id: questionId } }),
  ]);

  if (!testSession || testSession.studentId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!question) return NextResponse.json({ error: "Question not found" }, { status: 404 });

  const isCorrect = !skipped && selectedOption === question.correctOption;

  const markingScheme = testSession.test.markingScheme as Record<
    string,
    { correct: number; wrong: number; skipped: number }
  >;
  const scheme = markingScheme[question.questionType] ?? { correct: 4, wrong: -1, skipped: 0 };
  const marksAwarded = skipped ? scheme.skipped : isCorrect ? scheme.correct : scheme.wrong;

  // Upsert: one attempt per question per session
  const existing = await prisma.attempt.findFirst({
    where: { questionId, testSessionId },
  });

  if (existing) {
    await prisma.attempt.update({
      where: { id: existing.id },
      data: { selectedOption: selectedOption ?? undefined, isCorrect, marksAwarded, timeTakenSec, skipped },
    });
  } else {
    await prisma.attempt.create({
      data: {
        instituteId: session.user.instituteId,
        studentId: session.user.id,
        questionId,
        testSessionId,
        selectedOption: selectedOption ?? undefined,
        isCorrect,
        marksAwarded,
        timeTakenSec,
        skipped,
      },
    });
  }

  return NextResponse.json({ isCorrect, marksAwarded });
}
