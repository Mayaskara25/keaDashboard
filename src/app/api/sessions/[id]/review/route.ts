import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const testSession = await prisma.testSession.findUnique({
    where: { id },
    include: {
      test: true,
      attempts: {
        include: {
          question: {
            select: {
              id: true,
              questionText: true,
              questionType: true,
              options: true,
              correctOption: true,
              explanation: true,
              misconceptions: true,
              conceptId: true,
              skill: true,
            },
          },
        },
        orderBy: { submittedAt: "asc" },
      },
    },
  });

  if (!testSession) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Students can only view their own sessions; teachers can view anyone's
  if (session.user.role === "STUDENT" && testSession.studentId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json({ session: testSession });
}
