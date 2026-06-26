import { prisma } from "@/lib/prisma";
import { calculateMastery, calculateConfidence } from "@/lib/mastery";
import { Skill } from "@/generated/prisma/client";

export async function recalculateStudentMastery(
  studentId: string,
  conceptId: string,
  skill: Skill
) {
  const attempts = await prisma.attempt.findMany({
    where: {
      studentId,
      question: { conceptId, skill },
    },
    select: { isCorrect: true, timeTakenSec: true, submittedAt: true },
    orderBy: { submittedAt: "asc" },
  });

  if (attempts.length === 0) return;

  const masteryScore = calculateMastery(attempts);
  const confidence = calculateConfidence(attempts.length, attempts[attempts.length - 1].submittedAt);
  const questionsCorrect = attempts.filter((a) => a.isCorrect).length;
  const avgTimeSec =
    attempts.reduce((sum, a) => sum + a.timeTakenSec, 0) / attempts.length;

  await prisma.studentMastery.upsert({
    where: { studentId_conceptId_skill: { studentId, conceptId, skill } },
    update: {
      masteryScore,
      confidence,
      questionsAttempted: attempts.length,
      questionsCorrect,
      avgTimeSec,
      lastUpdated: new Date(),
    },
    create: {
      studentId,
      conceptId,
      skill,
      masteryScore,
      confidence,
      questionsAttempted: attempts.length,
      questionsCorrect,
      avgTimeSec,
    },
  });

  // Update difficulty_actual on questions with enough real data
  await updateQuestionDifficulty(conceptId, skill);
}

async function updateQuestionDifficulty(conceptId: string, skill: Skill) {
  const questions = await prisma.question.findMany({
    where: { conceptId, skill },
    select: { id: true },
  });

  for (const question of questions) {
    const allAttempts = await prisma.attempt.findMany({
      where: { questionId: question.id },
      select: { isCorrect: true },
    });

    if (allAttempts.length >= 20) {
      const correctCount = allAttempts.filter((a) => a.isCorrect).length;
      const accuracy = correctCount / allAttempts.length;
      const difficultyActual = Math.round((1 - accuracy) * 5 * 10) / 10;
      await prisma.question.update({
        where: { id: question.id },
        data: { difficultyActual },
      });
    }
  }
}
