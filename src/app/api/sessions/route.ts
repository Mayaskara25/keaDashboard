import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const schema = z.object({
  testId: z.string(),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid" }, { status: 400 });

  const test = await prisma.test.findUnique({ where: { id: parsed.data.testId } });
  if (!test) return NextResponse.json({ error: "Test not found" }, { status: 404 });

  const testSession = await prisma.testSession.create({
    data: {
      studentId: session.user.id,
      testId: test.id,
      maxScore: test.totalMarks,
      status: "IN_PROGRESS",
    },
  });

  return NextResponse.json({ sessionId: testSession.id });
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const studentId = searchParams.get("studentId") ?? session.user.id;
  const limit = parseInt(searchParams.get("limit") ?? "10");

  if (session.user.role === "STUDENT" && studentId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const sessions = await prisma.testSession.findMany({
    where: { studentId, status: "COMPLETED" },
    orderBy: { submittedAt: "desc" },
    take: limit,
    include: { test: { select: { title: true, type: true } } },
  });

  return NextResponse.json({ sessions });
}
