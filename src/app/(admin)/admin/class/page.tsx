import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Table, Thead, Th, Tbody, Tr, Td } from "@/components/ui/table";
import { MasteryBadge } from "@/components/ui/badge";
import { ChevronRight } from "lucide-react";

export default async function ClassAnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ batchId?: string }>;
}) {
  const session = await auth();
  if (!session || session.user.role === "STUDENT") redirect("/login");

  const { batchId } = await searchParams;

  const batches = await prisma.batch.findMany({
    where: { instituteId: session.user.instituteId },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  const activeBatchId = batchId ?? batches[0]?.id;

  const masteryData = activeBatchId
    ? await prisma.studentMastery.groupBy({
        by: ["conceptId"],
        where: {
          student: { batchId: activeBatchId },
        },
        _avg: { masteryScore: true },
        _count: { studentId: true },
        orderBy: { _avg: { masteryScore: "asc" } },
      })
    : [];

  const conceptIds = masteryData.map((m) => m.conceptId);
  const concepts = await prisma.conceptTaxonomy.findMany({
    where: { conceptId: { in: conceptIds } },
    select: { conceptId: true, topic: true, chapter: true },
  });
  const conceptMap = new Map(concepts.map((c) => [c.conceptId, c]));

  // Group by chapter
  const grouped: Record<string, typeof masteryData> = {};
  for (const m of masteryData) {
    const chapter = conceptMap.get(m.conceptId)?.chapter ?? "Other";
    grouped[chapter] = grouped[chapter] ?? [];
    grouped[chapter].push(m);
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-[20px] font-bold text-[var(--text)]">Class Analytics</h1>
          <p className="text-[13px] text-[var(--text-muted)] mt-1">
            Topic-level performance across the batch.
          </p>
        </div>

        {batches.length > 1 && (
          <form>
            <select
              name="batchId"
              defaultValue={activeBatchId}
              onChange={(e) => (window.location.href = `?batchId=${e.target.value}`)}
              className="px-3 py-2 text-[13px] border border-[var(--border)] rounded-[6px] bg-[var(--bg)] text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
            >
              {batches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </form>
        )}
      </div>

      {masteryData.length === 0 ? (
        <p className="text-[14px] text-[var(--text-muted)]">
          No student data yet for this batch.
        </p>
      ) : (
        <div className="flex flex-col gap-6">
          {Object.entries(grouped).map(([chapter, rows]) => (
            <div key={chapter}>
              <h2 className="text-[13px] font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-2">
                {chapter}
              </h2>
              <div className="bg-[var(--bg)] border border-[var(--border)] rounded-[6px] shadow-[var(--shadow)]">
                <Table>
                  <Thead>
                    <tr>
                      <Th>Topic</Th>
                      <Th>Class Avg</Th>
                      <Th>Students</Th>
                      <Th></Th>
                    </tr>
                  </Thead>
                  <Tbody>
                    {rows.map((row) => {
                      const concept = conceptMap.get(row.conceptId);
                      const avg = Math.round(row._avg.masteryScore ?? 0);
                      return (
                        <Tr key={row.conceptId}>
                          <Td className="font-medium">{concept?.topic ?? row.conceptId}</Td>
                          <Td>
                            <MasteryBadge score={avg} />
                          </Td>
                          <Td className="text-[var(--text-muted)]">
                            {row._count.studentId}
                          </Td>
                          <Td>
                            <Link
                              href={`/admin/class/${row.conceptId}${activeBatchId ? `?batchId=${activeBatchId}` : ""}`}
                              className="flex items-center gap-1 text-[12px] text-[var(--accent)] hover:underline"
                            >
                              Drill down <ChevronRight size={12} />
                            </Link>
                          </Td>
                        </Tr>
                      );
                    })}
                  </Tbody>
                </Table>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
