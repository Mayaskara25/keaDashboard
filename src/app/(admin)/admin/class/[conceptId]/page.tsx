import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { Table, Thead, Th, Tbody, Tr, Td } from "@/components/ui/table";
import { MasteryBadge } from "@/components/ui/badge";
import { ChevronLeft, ExternalLink } from "lucide-react";

export default async function TopicDrilldownPage({
  params,
  searchParams,
}: {
  params: Promise<{ conceptId: string }>;
  searchParams: Promise<{ batchId?: string }>;
}) {
  const session = await auth();
  if (!session || session.user.role === "STUDENT") redirect("/login");

  const { conceptId } = await params;
  const { batchId } = await searchParams;

  const concept = await prisma.conceptTaxonomy.findUnique({
    where: { conceptId },
    select: { conceptId: true, topic: true, chapter: true },
  });
  if (!concept) notFound();

  const masteryRows = await prisma.studentMastery.findMany({
    where: {
      conceptId,
      ...(batchId ? { student: { batchId } } : {}),
    },
    include: {
      student: { select: { id: true, name: true } },
    },
    orderBy: { masteryScore: "asc" },
  });

  // Skill breakdown
  const skillGroups: Record<string, number[]> = {};
  for (const row of masteryRows) {
    skillGroups[row.skill] = skillGroups[row.skill] ?? [];
    skillGroups[row.skill].push(row.masteryScore);
  }
  const skillAvgs = Object.entries(skillGroups).map(([skill, scores]) => ({
    skill,
    avg: Math.round(scores.reduce((s, n) => s + n, 0) / scores.length),
  }));

  const classAvg = masteryRows.length > 0
    ? Math.round(masteryRows.reduce((s, m) => s + m.masteryScore, 0) / masteryRows.length)
    : 0;

  // Unique students (a student may appear multiple times for different skills)
  const studentMap = new Map<string, { id: string; name: string; scores: number[]; attempts: number }>();
  for (const row of masteryRows) {
    const existing = studentMap.get(row.studentId) ?? { id: row.student.id, name: row.student.name, scores: [], attempts: 0 };
    existing.scores.push(row.masteryScore);
    existing.attempts += row.questionsAttempted;
    studentMap.set(row.studentId, existing);
  }
  const students = [...studentMap.values()].map((s) => ({
    ...s,
    avgMastery: Math.round(s.scores.reduce((a, b) => a + b, 0) / s.scores.length),
  })).sort((a, b) => a.avgMastery - b.avgMastery);

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-5">
        <Link
          href={`/admin/class${batchId ? `?batchId=${batchId}` : ""}`}
          className="flex items-center gap-1 text-[13px] text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
        >
          <ChevronLeft size={14} /> Class Analytics
        </Link>
      </div>

      {/* Header */}
      <div className="bg-[var(--bg)] border border-[var(--border)] rounded-[6px] p-5 mb-5 shadow-[var(--shadow)]">
        <h1 className="text-[18px] font-bold text-[var(--text)]">{concept.topic}</h1>
        <p className="text-[13px] text-[var(--text-muted)]">{concept.chapter}</p>
        <div className="flex items-center gap-4 mt-3">
          <div>
            <p className="text-[11px] text-[var(--text-muted)] uppercase tracking-wide">Class Avg</p>
            <MasteryBadge score={classAvg} />
          </div>
          <div>
            <p className="text-[11px] text-[var(--text-muted)] uppercase tracking-wide">Students</p>
            <p className="text-[14px] font-semibold text-[var(--text)]">{students.length}</p>
          </div>
        </div>
      </div>

      {/* Skill breakdown */}
      {skillAvgs.length > 0 && (
        <div className="bg-[var(--bg)] border border-[var(--border)] rounded-[6px] p-5 mb-5 shadow-[var(--shadow)]">
          <h2 className="text-[13px] font-semibold text-[var(--text)] mb-3">Skill Breakdown</h2>
          <div className="flex flex-wrap gap-4">
            {skillAvgs.map(({ skill, avg }) => (
              <div key={skill}>
                <p className="text-[11px] text-[var(--text-muted)]">{skill.replace(/_/g, " ")}</p>
                <MasteryBadge score={avg} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Student table */}
      <div className="bg-[var(--bg)] border border-[var(--border)] rounded-[6px] shadow-[var(--shadow)]">
        <Table>
          <Thead>
            <tr>
              <Th>Student</Th>
              <Th>Mastery</Th>
              <Th>Attempts</Th>
              <Th></Th>
            </tr>
          </Thead>
          <Tbody>
            {students.map((student) => (
              <Tr key={student.id}>
                <Td className="font-medium">{student.name}</Td>
                <Td>
                  <MasteryBadge score={student.avgMastery} />
                </Td>
                <Td className="text-[var(--text-muted)]">{student.attempts}</Td>
                <Td>
                  <Link
                    href={`/student/${student.id}/dashboard`}
                    className="flex items-center gap-1 text-[12px] text-[var(--accent)] hover:underline"
                  >
                    View <ExternalLink size={11} />
                  </Link>
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </div>
    </div>
  );
}
