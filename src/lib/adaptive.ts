import { prisma } from "@/lib/prisma";
import { detectWeakTopics, checkPrerequisites } from "@/lib/weakness";
import { Skill } from "@/generated/prisma/client";

export async function generateAdaptiveQuestions(
  studentId: string,
  instituteId: string,
  count: number = 20
) {
  const weakConceptIds = await detectWeakTopics(studentId);

  if (weakConceptIds.length === 0) {
    // No weak topics — return random verified questions
    return prisma.question.findMany({
      where: { instituteId, status: "VERIFIED" },
      take: count,
      orderBy: { difficultyAi: "asc" },
    });
  }

  // Build mastery map for prerequisite check
  const masteryRecords = await prisma.studentMastery.findMany({
    where: { studentId },
    select: { conceptId: true, masteryScore: true },
  });
  const masteryMap = new Map(masteryRecords.map((m) => [m.conceptId, m.masteryScore]));

  const targetConceptIds = await checkPrerequisites(weakConceptIds, masteryMap);

  const questions = await prisma.question.findMany({
    where: {
      instituteId,
      status: "VERIFIED",
      conceptId: { in: targetConceptIds.slice(0, 5) }, // cap to avoid too wide a net
    },
    orderBy: { difficultyAi: "asc" },
    take: count * 2, // over-fetch, then diversify
  });

  // Diversify: aim for ~2 concept recall, 3 mechanism, 2 numerical, rest mixed
  return diversify(questions, count);
}

function diversify(questions: { skill: Skill; [key: string]: unknown }[], count: number) {
  const buckets: Record<string, typeof questions> = {};
  for (const q of questions) {
    buckets[q.skill] = buckets[q.skill] ?? [];
    buckets[q.skill].push(q);
  }

  const result: typeof questions = [];
  const skills = Object.keys(buckets);
  let i = 0;
  while (result.length < count && result.length < questions.length) {
    const skill = skills[i % skills.length];
    const bucket = buckets[skill];
    if (bucket && bucket.length > 0) result.push(bucket.shift()!);
    i++;
  }
  return result;
}
