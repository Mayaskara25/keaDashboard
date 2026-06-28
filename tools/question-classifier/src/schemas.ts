import { z } from "zod";

export const SKILLS = [
  "CONCEPT_RECALL",
  "MECHANISM_UNDERSTANDING",
  "PRODUCT_PREDICTION",
  "FORMULA_APPLICATION",
  "NUMERICAL_SOLVING",
  "MULTI_STEP_REASONING",
  "GRAPH_INTERPRETATION",
  "ISOMER_CLASSIFICATION",
  "EXPERIMENTAL_ANALYSIS",
  "UNIT_CONVERSION",
] as const;

export const BLOOMS_LEVELS = ["REMEMBER", "UNDERSTAND", "APPLY", "ANALYZE", "EVALUATE"] as const;
export const QUESTION_TYPES = ["MCQ", "NUMERICAL", "ASSERTION_REASON", "MATRIX_MATCH", "INTEGER_ANSWER"] as const;
export const EXAMS = ["KCET", "JEE_MAINS", "JEE_ADVANCED", "COMEDK", "GENERAL"] as const;
export const CONFIDENCE_LEVELS = ["HIGH", "MEDIUM", "LOW"] as const;

// Prompt A output — one question extracted from the PDF
export const ExtractedQuestionSchema = z.object({
  questionNumber: z.number(),
  questionText: z.string().min(1),
  questionType: z.enum(QUESTION_TYPES),
  options: z.array(z.string()).optional(),
  hasAnswer: z.boolean(),
  givenAnswer: z.string().nullable(),
  hasExplanation: z.boolean(),
  existingExplanation: z.string().nullable(),
});

export type ExtractedQuestion = z.infer<typeof ExtractedQuestionSchema>;

// Prompt B output — solve the question
export const SolveOutputSchema = z.object({
  correctOption: z.string().min(1),
  explanation: z.string().min(10),
  confidence: z.enum(CONFIDENCE_LEVELS),
});

export type SolveOutput = z.infer<typeof SolveOutputSchema>;

// Prompt C output — verify against official answer key
export const VerifyOutputSchema = z.object({
  verifiedAnswer: z.string().min(1),
  verificationNote: z.string(),
  overridden: z.boolean(),
});

export type VerifyOutput = z.infer<typeof VerifyOutputSchema>;

// Prompt D output — classify the question
export const ClassifyOutputSchema = z.object({
  conceptId: z.string().startsWith("CHEM_"),
  skill: z.enum(SKILLS),
  difficultyAi: z.number().int().min(1).max(5),
  bloomsLevel: z.enum(BLOOMS_LEVELS),
  expectedTimeSec: z.number().int().min(15).max(600),
  misconceptions: z.array(z.string()),
  knowledgeElements: z.number().int().min(1).max(10),
  reasoningSteps: z.number().int().min(1).max(10),
});

export type ClassifyOutput = z.infer<typeof ClassifyOutputSchema>;

// Prompt D batch output — array of classified questions
export const BatchClassifyItemSchema = ClassifyOutputSchema.extend({
  questionNumber: z.number(),
});
export const BatchClassifyOutputSchema = z.array(BatchClassifyItemSchema);
export type BatchClassifyItem = z.infer<typeof BatchClassifyItemSchema>;

// Final merged output — matches import-questions.ts input format
// _prefixed fields are ignored by the importer (Zod strips unknown keys)
export const FinalQuestionSchema = z.object({
  conceptId: z.string(),
  skill: z.enum(SKILLS),
  questionType: z.enum(QUESTION_TYPES),
  questionText: z.string().min(1),
  options: z.array(z.string()).optional(),
  correctOption: z.string().min(1),
  explanation: z.string().min(1),
  difficultyAi: z.number().int().min(1).max(5),
  bloomsLevel: z.enum(BLOOMS_LEVELS),
  expectedTimeSec: z.number().int().min(15).max(600),
  misconceptions: z.array(z.string()),
  knowledgeElements: z.number().int().min(1).max(10),
  reasoningSteps: z.number().int().min(1).max(10),
  exam: z.enum(EXAMS).optional(),
  year: z.number().int().optional(),
  source: z.string().optional(),
  _confidence: z.enum(CONFIDENCE_LEVELS),
  _warning: z.string().optional(),
  _llm_metadata: z.object({
    model: z.string(),
    generated_at: z.string(),
    pipeline_version: z.number(),
    confidence: z.enum(CONFIDENCE_LEVELS),
    solve_skipped: z.boolean(),
    answer_verified: z.boolean(),
    answer_overridden: z.boolean(),
  }),
});

export type FinalQuestion = z.infer<typeof FinalQuestionSchema>;
