import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const schema = z.object({
  title: z.string().optional(),
  conceptIds: z.array(z.string()).min(1),
  skills: z.array(z.string()).optional(),
  difficultyMin: z.number().min(1).max(5).optional(),
  difficultyMax: z.number().min(1).max(5).optional(),
  count: z.number().min(1).max(60).default(20),
  exam: z.string().optional(),
  year: z.number().optional(),
  type: z.enum(["CUSTOM", "PYQ"]).default("CUSTOM"),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { title, conceptIds, skills, difficultyMin = 1, difficultyMax = 5, count, type } = parsed.data;

  const questions = await prisma.question.findMany({
    where: {
      instituteId: session.user.instituteId,
      status: "VERIFIED",
      conceptId: { in: conceptIds },
      ...(skills && skills.length > 0 ? { skill: { in: skills as never[] } } : {}),
      difficultyAi: { gte: difficultyMin, lte: difficultyMax },
    },
    take: count,
    select: { id: true },
    orderBy: [{ difficultyAi: "asc" }],
  });

  if (questions.length === 0) {
    return NextResponse.json({ error: "No questions found matching the filters" }, { status: 404 });
  }

  const test = await prisma.test.create({
    data: {
      instituteId: session.user.instituteId,
      teacherId: session.user.id,
      title: title ?? `Custom Test · ${new Date().toLocaleDateString()}`,
      type: type as "CUSTOM" | "PYQ",
      subject: "Chemistry",
      chapters: [],
      durationMinutes: Math.ceil(questions.length * 2),
      totalMarks: questions.length * 4,
      questionIds: questions.map((q) => q.id),
      markingScheme: { MCQ: { correct: 4, wrong: -1, skipped: 0 } },
    },
  });

  return NextResponse.json({ testId: test.id });
}
