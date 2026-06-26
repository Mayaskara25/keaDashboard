import { prisma } from "@/lib/prisma";

const WEAK_THRESHOLD = 60;

export async function detectWeakTopics(studentId: string): Promise<string[]> {
  const mastery = await prisma.studentMastery.findMany({
    where: { studentId, masteryScore: { lt: WEAK_THRESHOLD } },
    orderBy: { masteryScore: "asc" },
  });
  return mastery.map((m) => m.conceptId);
}

export async function checkPrerequisites(
  conceptIds: string[],
  studentMastery: Map<string, number>
): Promise<string[]> {
  if (conceptIds.length === 0) return [];

  const concepts = await prisma.conceptTaxonomy.findMany({
    where: { conceptId: { in: conceptIds } },
    select: { conceptId: true, prerequisites: true },
  });

  const prereqsToTarget = new Set<string>();
  const visited = new Set<string>(conceptIds);

  for (const concept of concepts) {
    for (const prereqId of concept.prerequisites) {
      if (visited.has(prereqId)) continue;
      visited.add(prereqId);
      const prereqMastery = studentMastery.get(prereqId) ?? 0;
      if (prereqMastery < WEAK_THRESHOLD) {
        prereqsToTarget.add(prereqId);
      }
    }
  }

  // Return prerequisite concept IDs first (they should be targeted before the main weak topics)
  return [...prereqsToTarget, ...conceptIds.filter((id) => !prereqsToTarget.has(id))];
}
