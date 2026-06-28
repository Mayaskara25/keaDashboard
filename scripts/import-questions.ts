/**
 * Usage: npx tsx scripts/import-questions.ts ./questions.json
 *
 * JSON format (array of objects):
 * [
 *   {
 *     "conceptId": "CHEM_ORG_AKCA_004",   // must match ConceptTaxonomy.conceptId
 *     "skill": "MECHANISM_UNDERSTANDING",  // must match Skill enum
 *     "exam": "KCET",                      // optional
 *     "year": 2024,                        // optional
 *     "questionType": "MCQ",
 *     "questionText": "What is the major product...",
 *     "options": ["A", "B", "C", "D"],    // for MCQ
 *     "correctOption": "B",
 *     "explanation": "The aldol condensation...",
 *     "difficultyAi": 3,
 *     "bloomsLevel": "APPLY",
 *     "expectedTimeSec": 90,
 *     "misconceptions": ["Confuses addition with condensation"],
 *     "source": "KCET 2024"
 *   }
 * ]
 */

import { config } from "dotenv";
import { resolve } from "path";
// Next.js auto-loads .env.local; tsx does not — load manually
config({ path: resolve(process.cwd(), ".env.local") });
config({ path: resolve(process.cwd(), ".env") });

import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { readFileSync } from "fs";
import { z } from "zod";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const QuestionSchema = z.object({
  conceptId: z.string(),
  secondaryConceptIds: z.array(z.string()).optional().default([]),
  skill: z.enum([
    "CONCEPT_RECALL", "MECHANISM_UNDERSTANDING", "PRODUCT_PREDICTION",
    "FORMULA_APPLICATION", "NUMERICAL_SOLVING", "MULTI_STEP_REASONING",
    "GRAPH_INTERPRETATION", "ISOMER_CLASSIFICATION", "EXPERIMENTAL_ANALYSIS", "UNIT_CONVERSION"
  ]),
  subSkill: z.string().optional(),
  exam: z.enum(["KCET", "JEE_MAINS", "JEE_ADVANCED", "COMEDK", "GENERAL"]).optional().default("GENERAL"),
  year: z.number().optional(),
  questionType: z.enum(["MCQ", "NUMERICAL", "ASSERTION_REASON", "MATRIX_MATCH", "INTEGER_ANSWER"]),
  questionText: z.string().min(1),
  options: z.array(z.string()).optional(),
  correctOption: z.string(),
  explanation: z.string(),
  difficultyAi: z.number().min(1).max(5).default(3),
  bloomsLevel: z.enum(["REMEMBER", "UNDERSTAND", "APPLY", "ANALYZE", "EVALUATE"]).default("APPLY"),
  expectedTimeSec: z.number().default(90),
  knowledgeElements: z.number().default(1),
  conceptCount: z.number().default(1),
  reasoningSteps: z.number().default(1),
  isMultiConcept: z.boolean().default(false),
  misconceptions: z.array(z.string()).optional().default([]),
  easierQuestions: z.array(z.string()).optional().default([]),
  similarQuestions: z.array(z.string()).optional().default([]),
  harderQuestions: z.array(z.string()).optional().default([]),
  source: z.string().optional(),
});

async function main() {
  const file = process.argv[2];
  if (!file) {
    console.error("Usage: npx tsx scripts/import-questions.ts <path-to-questions.json>");
    process.exit(1);
  }

  const raw = JSON.parse(readFileSync(file, "utf-8")) as unknown[];
  if (!Array.isArray(raw)) {
    console.error("JSON must be an array of question objects.");
    process.exit(1);
  }

  const institute = await prisma.institute.findFirst();
  if (!institute) {
    console.error("No institute found. Run prisma db seed first.");
    process.exit(1);
  }

  const teacher = await prisma.user.findFirst({ where: { role: "TEACHER" } });
  if (!teacher) {
    console.error("No teacher found. Run prisma db seed first.");
    process.exit(1);
  }

  let inserted = 0;
  let skipped = 0;
  const errors: { index: number; error: string }[] = [];

  const BATCH_SIZE = 100;
  const batches = [];
  for (let i = 0; i < raw.length; i += BATCH_SIZE) {
    batches.push(raw.slice(i, i + BATCH_SIZE));
  }

  for (const batch of batches) {
    for (let i = 0; i < batch.length; i++) {
      const parsed = QuestionSchema.safeParse(batch[i]);
      if (!parsed.success) {
        errors.push({ index: inserted + skipped + i, error: parsed.error.message });
        skipped++;
        continue;
      }

      const q = parsed.data;

      // Check concept exists
      const concept = await prisma.conceptTaxonomy.findUnique({
        where: { conceptId: q.conceptId },
      });
      if (!concept) {
        errors.push({ index: inserted + skipped + i, error: `conceptId not found: ${q.conceptId}` });
        skipped++;
        continue;
      }

      // Duplicate check (simple hash on question text)
      const existing = await prisma.question.findFirst({
        where: { questionText: q.questionText, instituteId: institute.id },
      });
      if (existing) {
        skipped++;
        continue;
      }

      await prisma.question.create({
        data: {
          instituteId: institute.id,
          conceptId: q.conceptId,
          secondaryConceptIds: q.secondaryConceptIds,
          skill: q.skill,
          subSkill: q.subSkill,
          exam: q.exam,
          year: q.year,
          questionType: q.questionType,
          questionText: q.questionText,
          options: q.options ? JSON.parse(JSON.stringify(q.options)) : undefined,
          correctOption: q.correctOption,
          explanation: q.explanation,
          difficultyAi: q.difficultyAi,
          bloomsLevel: q.bloomsLevel,
          expectedTimeSec: q.expectedTimeSec,
          knowledgeElements: q.knowledgeElements,
          conceptCount: q.conceptCount,
          reasoningSteps: q.reasoningSteps,
          isMultiConcept: q.isMultiConcept,
          misconceptions: q.misconceptions,
          easierQuestions: q.easierQuestions,
          similarQuestions: q.similarQuestions,
          harderQuestions: q.harderQuestions,
          source: q.source,
          status: "PENDING",
          verifiedById: null,
        },
      });
      inserted++;
    }
  }

  console.log("\nImport complete.");
  console.log(`  Inserted: ${inserted}`);
  console.log(`  Skipped:  ${skipped}`);
  if (errors.length > 0) {
    console.log(`  Errors (${errors.length}):`);
    errors.forEach((e) => console.log(`    Row ${e.index}: ${e.error}`));
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
