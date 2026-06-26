import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Table, Thead, Th, Tbody, Tr, Td } from "@/components/ui/table";
import { DifficultyBadge } from "@/components/ui/badge";
import { VerifyButtons } from "./verify-buttons";

export default async function QuestionsPage() {
  const session = await auth();
  if (!session || session.user.role === "STUDENT") redirect("/login");

  const questions = await prisma.question.findMany({
    where: {
      instituteId: session.user.instituteId,
      status: { in: ["PENDING", "UNDER_REVIEW"] },
    },
    include: { concept: { select: { topic: true, chapter: true } } },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-5">
        <h1 className="text-[20px] font-bold text-[var(--text)]">Review Questions</h1>
        <p className="text-[13px] text-[var(--text-muted)] mt-1">
          {questions.length} questions pending verification.
        </p>
      </div>

      {questions.length === 0 ? (
        <p className="text-[14px] text-[var(--text-muted)]">No questions pending review.</p>
      ) : (
        <div className="bg-[var(--bg)] border border-[var(--border)] rounded-[6px] shadow-[var(--shadow)]">
          <Table>
            <Thead>
              <tr>
                <Th>Question</Th>
                <Th>Topic</Th>
                <Th>Skill</Th>
                <Th>Difficulty</Th>
                <Th>Source</Th>
                <Th>Actions</Th>
              </tr>
            </Thead>
            <Tbody>
              {questions.map((q) => (
                <Tr key={q.id}>
                  <Td className="max-w-[240px]">
                    <p className="text-[13px] truncate" title={q.questionText}>
                      {q.questionText}
                    </p>
                  </Td>
                  <Td>
                    <div>
                      <p className="text-[13px] font-medium">{q.concept.topic}</p>
                      <p className="text-[11px] text-[var(--text-muted)]">{q.concept.chapter}</p>
                    </div>
                  </Td>
                  <Td className="text-[12px] text-[var(--text-muted)]">
                    {q.skill.replace(/_/g, " ")}
                  </Td>
                  <Td>
                    <DifficultyBadge level={q.difficultyAi} />
                  </Td>
                  <Td className="text-[12px] text-[var(--text-muted)]">
                    {q.source ?? "—"}
                  </Td>
                  <Td>
                    <VerifyButtons questionId={q.id} />
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </div>
      )}
    </div>
  );
}
