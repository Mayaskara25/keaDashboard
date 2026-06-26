import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Table, Thead, Th, Tbody, Tr, Td } from "@/components/ui/table";
import { XCircle } from "lucide-react";

export default async function MistakesPage({
  searchParams,
}: {
  searchParams: Promise<{ chapter?: string; skill?: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  const { chapter, skill } = await searchParams;

  const attempts = await prisma.attempt.findMany({
    where: {
      studentId: session.user.id,
      isCorrect: false,
      skipped: false,
      question: {
        ...(chapter ? { concept: { chapter } } : {}),
        ...(skill ? { skill: skill as never } : {}),
      },
    },
    include: {
      question: {
        select: {
          questionText: true,
          correctOption: true,
          explanation: true,
          misconceptions: true,
          skill: true,
          concept: { select: { topic: true, chapter: true } },
        },
      },
    },
    orderBy: { submittedAt: "desc" },
    take: 100,
  });

  const chapters = await prisma.conceptTaxonomy.findMany({
    distinct: ["chapter"],
    select: { chapter: true },
    where: { subject: "Chemistry" },
    orderBy: { chapter: "asc" },
  });

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-5">
        <h1 className="text-[20px] font-bold text-[var(--text)]">Mistakes</h1>
        <p className="text-[13px] text-[var(--text-muted)] mt-1">
          {attempts.length} incorrect answers
        </p>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-5">
        <form className="flex gap-3">
          <select
            name="chapter"
            defaultValue={chapter ?? ""}
            className="px-3 py-1.5 text-[13px] border border-[var(--border)] rounded-[6px] bg-[var(--bg)] text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
          >
            <option value="">All chapters</option>
            {chapters.map((c) => (
              <option key={c.chapter} value={c.chapter}>
                {c.chapter}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="px-3 py-1.5 text-[13px] bg-[var(--accent)] text-white rounded-[6px]"
          >
            Filter
          </button>
          {(chapter || skill) && (
            <a
              href="/mistakes"
              className="px-3 py-1.5 text-[13px] text-[var(--text-muted)] hover:text-[var(--text)] border border-[var(--border)] rounded-[6px]"
            >
              Clear
            </a>
          )}
        </form>
      </div>

      {attempts.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-[14px] text-[var(--text-muted)]">No mistakes found.</p>
        </div>
      ) : (
        <div className="bg-[var(--bg)] border border-[var(--border)] rounded-[6px] shadow-[var(--shadow)]">
          <Table>
            <Thead>
              <tr>
                <Th>Topic</Th>
                <Th>Skill</Th>
                <Th>Question</Th>
                <Th>Date</Th>
              </tr>
            </Thead>
            <Tbody>
              {attempts.map((attempt) => (
                <details key={attempt.id} className="contents">
                  <summary
                    className="contents"
                    style={{ display: "contents" }}
                  >
                    <Tr className="cursor-pointer">
                      <Td>
                        <div>
                          <p className="text-[13px] font-medium">{attempt.question.concept?.topic}</p>
                          <p className="text-[11px] text-[var(--text-muted)]">{attempt.question.concept?.chapter}</p>
                        </div>
                      </Td>
                      <Td>
                        <Badge variant="muted">
                          {attempt.question.skill.replace(/_/g, " ")}
                        </Badge>
                      </Td>
                      <Td className="max-w-[320px]">
                        <p className="text-[13px] truncate">{attempt.question.questionText}</p>
                      </Td>
                      <Td className="text-[12px] text-[var(--text-muted)]">
                        {attempt.submittedAt.toLocaleDateString()}
                      </Td>
                    </Tr>
                  </summary>
                </details>
              ))}
            </Tbody>
          </Table>
        </div>
      )}
    </div>
  );
}
