import { callGeminiText } from "./gemini";
import { PROMPT_B_SOLVE, PROMPT_C_VERIFY, PROMPT_D_CLASSIFY, PROMPT_D_CLASSIFY_BATCH } from "./prompts";
import {
  SolveOutputSchema,
  VerifyOutputSchema,
  ClassifyOutputSchema,
  BatchClassifyOutputSchema,
  FinalQuestionSchema,
  EXAMS,
  type ExtractedQuestion,
  type FinalQuestion,
  type ClassifyOutput,
} from "./schemas";
import { CONCEPT_TAXONOMY, conceptListForPrompt } from "./concept-taxonomy";
import { z } from "zod";

const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms));
const RATE_LIMIT_DELAY_MS = 4000; // free tier: 20 RPM — 4s between calls keeps us at ~15 RPM
const CLASSIFY_BATCH_SIZE = 5;

export interface RunOptions {
  exam?: string;
  year?: number;
  source?: string;
  chapterHint?: string;
}

export interface RunResult {
  results: FinalQuestion[];
  errors: Array<{ index: number; questionNumber: number; error: string }>;
}

interface SolvedQuestion {
  original: ExtractedQuestion;
  index: number;
  correctOption: string;
  explanation: string;
  confidence: "HIGH" | "MEDIUM" | "LOW";
  solveSkipped: boolean;
  answerVerified: boolean;
  answerOverridden: boolean;
}

export async function solveAndClassify(
  questions: ExtractedQuestion[],
  options: RunOptions
): Promise<RunResult> {
  const errors: RunResult["errors"] = [];
  const conceptList = conceptListForPrompt();

  // ── Phase 1: Solve each question individually ─────────────────────────────
  console.log(`\n  Phase 1/2  Solving ${questions.length} questions...`);
  const solved: SolvedQuestion[] = [];

  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    const preview = q.questionText.slice(0, 55).replace(/\s+/g, " ");

    try {
      let correctOption: string;
      let explanation: string;
      let confidence: "HIGH" | "MEDIUM" | "LOW";
      let solveSkipped = false;

      if (q.hasExplanation && q.existingExplanation && q.givenAnswer) {
        solveSkipped = true;
        confidence = "HIGH";
        explanation = q.existingExplanation;
        correctOption = q.givenAnswer;
      } else {
        const userPrompt = buildSolvePrompt(q);
        const solveData = await callAndParse(
          SolveOutputSchema,
          () => callGeminiText(PROMPT_B_SOLVE, userPrompt),
          (hint) => callGeminiText(PROMPT_B_SOLVE, userPrompt + hint)
        );
        correctOption = solveData.correctOption;
        explanation = solveData.explanation;
        confidence = solveData.confidence;
        await sleep(RATE_LIMIT_DELAY_MS);
      }

      let answerVerified = false;
      let answerOverridden = false;

      if (q.hasAnswer && q.givenAnswer && !solveSkipped) {
        try {
          const verifyData = await callAndParse(
            VerifyOutputSchema,
            () => callGeminiText(PROMPT_C_VERIFY, buildVerifyPrompt(q, correctOption, explanation)),
            (hint) => callGeminiText(PROMPT_C_VERIFY, buildVerifyPrompt(q, correctOption, explanation) + hint)
          );
          answerVerified = true;
          if (verifyData.overridden) {
            correctOption = verifyData.verifiedAnswer;
            answerOverridden = true;
            explanation += `\n\n[Answer key correction: ${verifyData.verificationNote}]`;
          }
        } catch {
          // Verification is best-effort
        }
        await sleep(RATE_LIMIT_DELAY_MS);
      }

      solved.push({ original: q, index: i, correctOption, explanation, confidence, solveSkipped, answerVerified, answerOverridden });
      const icon = confidence === "HIGH" ? "✓" : confidence === "MEDIUM" ? "~" : "!";
      console.log(`  [${i + 1}/${questions.length}] ${preview}... ${icon} (${confidence})`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push({ index: i, questionNumber: q.questionNumber, error: msg });
      console.error(`  [${i + 1}/${questions.length}] Solve error on Q${q.questionNumber}: ${msg}`);
    }
  }

  // ── Phase 2: Batch classify ───────────────────────────────────────────────
  const totalBatches = Math.ceil(solved.length / CLASSIFY_BATCH_SIZE);
  console.log(`\n  Phase 2/2  Classifying in ${totalBatches} batch(es) of up to ${CLASSIFY_BATCH_SIZE}...`);

  const classifyMap = new Map<number, ClassifyOutput>();

  for (let b = 0; b < solved.length; b += CLASSIFY_BATCH_SIZE) {
    const batch = solved.slice(b, b + CLASSIFY_BATCH_SIZE);
    const batchNum = Math.floor(b / CLASSIFY_BATCH_SIZE) + 1;

    const batchInput = batch.map((s) => ({
      questionNumber: s.original.questionNumber,
      questionText: s.original.questionText,
      options: s.original.options ?? [],
      correctOption: s.correctOption,
      explanation: s.explanation,
    }));

    let batchSucceeded = false;

    try {
      const batchData = await callAndParse(
        BatchClassifyOutputSchema,
        () => callGeminiText(PROMPT_D_CLASSIFY_BATCH(conceptList, options.chapterHint), JSON.stringify(batchInput, null, 2)),
        (hint) => callGeminiText(PROMPT_D_CLASSIFY_BATCH(conceptList, options.chapterHint), JSON.stringify(batchInput, null, 2) + hint)
      );
      for (const item of batchData) {
        classifyMap.set(item.questionNumber, item);
      }
      batchSucceeded = true;
      console.log(`  Batch ${batchNum}/${totalBatches} classified (${batch.length} questions)`);
      await sleep(RATE_LIMIT_DELAY_MS);
    } catch (batchErr) {
      console.error(`  Batch ${batchNum}/${totalBatches} failed — falling back to individual classify`);
    }

    if (!batchSucceeded) {
      // Fallback: classify each question in this batch individually
      for (const s of batch) {
        try {
          const classifyPrompt = buildClassifyPrompt(s.original, s.correctOption, s.explanation);
          const classifyData = await callAndParse(
            ClassifyOutputSchema,
            () => callGeminiText(PROMPT_D_CLASSIFY(conceptList, options.chapterHint), classifyPrompt),
            (hint) => callGeminiText(PROMPT_D_CLASSIFY(conceptList, options.chapterHint), classifyPrompt + hint)
          );
          classifyMap.set(s.original.questionNumber, classifyData);
          console.log(`  Q${s.original.questionNumber} classified (fallback)`);
          await sleep(RATE_LIMIT_DELAY_MS);
        } catch (fallbackErr) {
          const msg = fallbackErr instanceof Error ? fallbackErr.message : String(fallbackErr);
          errors.push({ index: s.index, questionNumber: s.original.questionNumber, error: `Classify failed: ${msg}` });
        }
      }
    }
  }

  // ── Phase 3: Merge ────────────────────────────────────────────────────────
  const results: FinalQuestion[] = [];
  const knownConceptIds = new Set<string>(CONCEPT_TAXONOMY.map((c) => c.conceptId));

  for (const s of solved) {
    const classifyData = classifyMap.get(s.original.questionNumber);
    if (!classifyData) {
      if (!errors.some((e) => e.questionNumber === s.original.questionNumber)) {
        errors.push({ index: s.index, questionNumber: s.original.questionNumber, error: "Not returned in classify batch" });
      }
      continue;
    }

    const conceptWarning = knownConceptIds.has(classifyData.conceptId)
      ? undefined
      : "conceptId not in taxonomy";

    const finalQuestion: FinalQuestion = {
      conceptId: classifyData.conceptId,
      skill: classifyData.skill,
      questionType: s.original.questionType,
      questionText: s.original.questionText,
      ...(s.original.options && s.original.options.length > 0 ? { options: s.original.options } : {}),
      correctOption: s.correctOption,
      explanation: s.explanation,
      difficultyAi: classifyData.difficultyAi,
      bloomsLevel: classifyData.bloomsLevel,
      expectedTimeSec: classifyData.expectedTimeSec,
      misconceptions: classifyData.misconceptions,
      knowledgeElements: classifyData.knowledgeElements,
      reasoningSteps: classifyData.reasoningSteps,
      ...(options.exam && isValidExam(options.exam) ? { exam: options.exam } : {}),
      ...(options.year ? { year: options.year } : {}),
      ...(options.source ? { source: options.source } : {}),
      _confidence: s.confidence,
      ...(conceptWarning ? { _warning: conceptWarning } : {}),
      _llm_metadata: {
        model: "gemini-2.5-flash",
        generated_at: new Date().toISOString(),
        pipeline_version: 2,
        confidence: s.confidence,
        solve_skipped: s.solveSkipped,
        answer_verified: s.answerVerified,
        answer_overridden: s.answerOverridden,
      },
    };

    const finalResult = FinalQuestionSchema.safeParse(finalQuestion);
    if (!finalResult.success) {
      errors.push({
        index: s.index,
        questionNumber: s.original.questionNumber,
        error: `Final validation failed: ${JSON.stringify(finalResult.error.issues.slice(0, 2))}`,
      });
      continue;
    }

    results.push(finalResult.data);
  }

  return { results, errors };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

async function callAndParse<T>(
  schema: z.ZodType<T>,
  firstCall: () => Promise<string>,
  retryCall: (hint: string) => Promise<string>
): Promise<T> {
  type Outcome = { data: T; issues: null } | { data: null; issues: string };

  async function tryOnce(callFn: () => Promise<string>): Promise<Outcome> {
    try {
      const raw = await callFn();
      const parsed = JSON.parse(raw);
      const result = schema.safeParse(parsed);
      if (result.success) return { data: result.data, issues: null };
      const issues = result.error.issues
        .slice(0, 3)
        .map((i) => `- ${i.path.join(".") || "(root)"}: ${i.message}`)
        .join("\n");
      return { data: null, issues };
    } catch (e) {
      return { data: null, issues: e instanceof Error ? e.message : "parse error" };
    }
  }

  const first = await tryOnce(firstCall);
  if (first.data !== null) return first.data;

  const hint = `\n\nFix these issues and return ONLY valid JSON:\n${first.issues}`;
  const second = await tryOnce(() => retryCall(hint));
  if (second.data !== null) return second.data;

  throw new Error(`Failed after retry. Last errors:\n${second.issues}`);
}

function optionLines(q: ExtractedQuestion): string {
  if (!q.options || q.options.length === 0) return "";
  return (
    "\n\nOptions:\n" +
    q.options.map((o, i) => `${String.fromCharCode(65 + i)}. ${o}`).join("\n")
  );
}

function buildSolvePrompt(q: ExtractedQuestion): string {
  return `Question:\n${q.questionText}${optionLines(q)}`;
}

function buildVerifyPrompt(q: ExtractedQuestion, solvedAnswer: string, explanation: string): string {
  return [
    `Question:\n${q.questionText}${optionLines(q)}`,
    `Official answer key says: ${q.givenAnswer}`,
    `My solved answer: ${solvedAnswer}`,
    `My explanation: ${explanation}`,
  ].join("\n\n");
}

function buildClassifyPrompt(q: ExtractedQuestion, correctOption: string, explanation: string): string {
  return [
    `Question:\n${q.questionText}${optionLines(q)}`,
    `Correct Answer: ${correctOption}`,
    `Explanation: ${explanation}`,
  ].join("\n\n");
}

type ValidExam = (typeof EXAMS)[number];

function isValidExam(exam: string): exam is ValidExam {
  return (EXAMS as readonly string[]).includes(exam);
}
