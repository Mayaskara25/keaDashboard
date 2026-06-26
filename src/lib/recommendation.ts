import { prisma } from "@/lib/prisma";

export async function getResourcesForConcept(conceptId: string) {
  return prisma.resource.findMany({
    where: { conceptId },
    orderBy: { type: "asc" },
  });
}

export async function getRecommendedResources(studentId: string) {
  const weakTopics = await prisma.studentMastery.findMany({
    where: { studentId, masteryScore: { lt: 60 } },
    orderBy: { masteryScore: "asc" },
    take: 5,
    select: { conceptId: true },
  });

  if (weakTopics.length === 0) return [];

  return prisma.resource.findMany({
    where: { conceptId: { in: weakTopics.map((t) => t.conceptId) } },
    orderBy: { type: "asc" },
  });
}
