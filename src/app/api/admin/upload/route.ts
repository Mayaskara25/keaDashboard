import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { writeFile } from "fs/promises";
import path from "path";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role === "STUDENT") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const form = await req.formData();
  const title = form.get("title") as string;
  const type = form.get("type") as string;
  const conceptId = form.get("conceptId") as string;
  const file = form.get("file") as File | null;

  if (!title || !type || !conceptId) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const concept = await prisma.conceptTaxonomy.findUnique({
    where: { conceptId },
    select: { subject: true, chapter: true, topic: true },
  });
  if (!concept) return NextResponse.json({ error: "Concept not found" }, { status: 404 });

  let urlOrFile = "";
  if (file) {
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const filename = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const uploadPath = path.join(process.cwd(), "public", "uploads", filename);
    await writeFile(uploadPath, buffer);
    urlOrFile = `/uploads/${filename}`;
  }

  const resource = await prisma.resource.create({
    data: {
      instituteId: session.user.instituteId,
      conceptId,
      title,
      type: type as never,
      subject: concept.subject,
      chapter: concept.chapter,
      topic: concept.topic,
      urlOrFile,
    },
  });

  return NextResponse.json({ resource });
}
