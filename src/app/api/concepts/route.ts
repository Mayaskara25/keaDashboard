import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const chapter = searchParams.get("chapter");
  const groupBy = searchParams.get("groupBy");

  if (groupBy === "chapter") {
    const chapters = await prisma.conceptTaxonomy.findMany({
      distinct: ["chapter"],
      select: { chapter: true },
      where: { subject: "Chemistry" },
      orderBy: { chapter: "asc" },
    });
    return NextResponse.json({
      chapters: chapters.map((c) => ({ value: c.chapter, label: c.chapter })),
    });
  }

  if (chapter) {
    const concepts = await prisma.conceptTaxonomy.findMany({
      where: { chapter, subject: "Chemistry" },
      select: { conceptId: true, topic: true, subtopic: true },
      orderBy: { topic: "asc" },
    });
    return NextResponse.json({ concepts });
  }

  const all = await prisma.conceptTaxonomy.findMany({
    where: { subject: "Chemistry" },
    select: { conceptId: true, topic: true, chapter: true },
    orderBy: [{ chapter: "asc" }, { topic: "asc" }],
  });
  return NextResponse.json({ concepts: all });
}
