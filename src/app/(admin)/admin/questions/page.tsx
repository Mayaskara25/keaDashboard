import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { QuestionReviewList } from "./question-review-list";

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
    <div className="max-w-4xl mx-auto">
      <div className="mb-5">
        <h1 className="text-[20px] font-bold text-[var(--text)]">Review Questions</h1>
        <p className="text-[13px] text-[var(--text-muted)] mt-1">
          {questions.length} questions pending verification. Click &quot;View full&quot; to see options, answer, and explanation before approving.
        </p>
      </div>
      <QuestionReviewList questions={questions} />
    </div>
  );
}
