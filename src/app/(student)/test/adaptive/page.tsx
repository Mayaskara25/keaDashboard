import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { generateAdaptiveQuestions } from "@/lib/adaptive";

export default async function AdaptiveTestPage() {
  const session = await auth();
  if (!session || session.user.role !== "STUDENT") redirect("/login");

  const questions = await generateAdaptiveQuestions(session.user.id, session.user.instituteId, 20);

  if (questions.length === 0) {
    return (
      <div className="max-w-xl mx-auto text-center py-16">
        <p className="text-[14px] text-[var(--text-muted)]">
          No questions available yet. Take a custom test first to build your profile.
        </p>
      </div>
    );
  }

  const test = await prisma.test.create({
    data: {
      instituteId: session.user.instituteId,
      teacherId: session.user.id,
      title: `Adaptive Test · ${new Date().toLocaleDateString()}`,
      type: "ADAPTIVE",
      subject: "Chemistry",
      chapters: [],
      durationMinutes: questions.length * 2,
      totalMarks: questions.length * 4,
      questionIds: questions.map((q) => (q as { id: string }).id),
      markingScheme: { MCQ: { correct: 4, wrong: -1, skipped: 0 } },
    },
  });

  const testSession = await prisma.testSession.create({
    data: {
      studentId: session.user.id,
      testId: test.id,
      maxScore: test.totalMarks,
      status: "IN_PROGRESS",
    },
  });

  redirect(`/test/${testSession.id}/attempt`);
}
