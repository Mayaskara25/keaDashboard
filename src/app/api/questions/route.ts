import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const idsParam = searchParams.get("ids");

  if (idsParam) {
    const ids = idsParam.split(",").filter(Boolean);
    const questions = await prisma.question.findMany({
      where: { id: { in: ids }, instituteId: session.user.instituteId },
      select: {
        id: true,
        questionText: true,
        questionType: true,
        options: true,
        conceptId: true,
        skill: true,
      },
    });
    // Return in same order as requested IDs
    const map = new Map(questions.map((q) => [q.id, q]));
    return NextResponse.json({ questions: ids.map((id) => map.get(id)).filter(Boolean) });
  }

  // General query with filters
  const chapter = searchParams.get("chapter");
  const skill = searchParams.get("skill");
  const status = searchParams.get("status") ?? "VERIFIED";
  const take = parseInt(searchParams.get("take") ?? "50");

  const questions = await prisma.question.findMany({
    where: {
      instituteId: session.user.instituteId,
      status: status as "PENDING" | "UNDER_REVIEW" | "VERIFIED" | "ARCHIVED",
      ...(chapter ? { concept: { chapter } } : {}),
      ...(skill ? { skill: skill as never } : {}),
    },
    take,
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ questions });
}
