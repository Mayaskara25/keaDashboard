import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { FileText } from "lucide-react";

export default async function PYQPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const tests = await prisma.test.findMany({
    where: { instituteId: session.user.instituteId, type: "PYQ" },
    orderBy: [{ exam: "asc" }, { year: "desc" }],
    select: { id: true, title: true, exam: true, year: true, paper: true, totalMarks: true, durationMinutes: true, questionIds: true },
  });

  const grouped: Record<string, typeof tests> = {};
  for (const t of tests) {
    const key = t.exam ?? "General";
    grouped[key] = grouped[key] ?? [];
    grouped[key].push(t);
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-[20px] font-bold text-[var(--text)]">Previous Year Papers</h1>
        <p className="text-[13px] text-[var(--text-muted)] mt-1">
          Attempt full-length papers from past exams.
        </p>
      </div>

      {Object.keys(grouped).length === 0 ? (
        <p className="text-[14px] text-[var(--text-muted)]">No PYQ papers available yet.</p>
      ) : (
        Object.entries(grouped).map(([exam, papers]) => (
          <div key={exam} className="mb-8">
            <h2 className="text-[14px] font-semibold text-[var(--text)] mb-3">{exam.replace("_", " ")}</h2>
            <div className="grid grid-cols-3 gap-4">
              {papers.map((paper) => (
                <PYQCard key={paper.id} paper={paper} />
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

function PYQCard({ paper }: { paper: { id: string; title: string; exam: string | null; year: number | null; paper: string | null; totalMarks: number; durationMinutes: number; questionIds: string[] } }) {
  return (
    <Link href={`/test/${paper.id}/attempt?mode=pyq`}>
      <div className="bg-[var(--bg)] border border-[var(--border)] rounded-[6px] p-4 hover:border-[var(--accent)] transition-colors cursor-pointer shadow-[var(--shadow)]">
        <div className="flex items-start justify-between mb-3">
          <FileText size={18} className="text-[var(--accent)]" />
          {paper.year && (
            <Badge variant="muted">{paper.year}</Badge>
          )}
        </div>
        <p className="text-[14px] font-semibold text-[var(--text)]">{paper.title}</p>
        {paper.paper && (
          <p className="text-[12px] text-[var(--text-muted)] mt-0.5">{paper.paper}</p>
        )}
        <div className="flex items-center gap-3 mt-3 text-[12px] text-[var(--text-muted)]">
          <span>{paper.questionIds.length} questions</span>
          <span>·</span>
          <span>{paper.durationMinutes} min</span>
          <span>·</span>
          <span>{paper.totalMarks} marks</span>
        </div>
      </div>
    </Link>
  );
}
