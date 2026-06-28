# Question Classifier Tool — Build Plan

Standalone CLI tool for maintainers. Ingests PDFs of chemistry questions, uses Gemini Flash to solve + classify them, outputs import-ready JSON for `npm run import -- ./questions.json`.

---

## Location

`tools/question-classifier/` — separate from the main Next.js app. Own `package.json`, own dependencies.

---

## Dependencies

```json
{
  "dependencies": {
    "@google/generative-ai": "latest",
    "pdf-parse": "^1.1.1",
    "pdf2pic": "^3.1.1",
    "sharp": "^0.33.0",
    "inquirer": "^9.0.0"
  },
  "devDependencies": {
    "tsx": "^4.0.0",
    "typescript": "^5.0.0"
  }
}
```

---

## User Flow

```
$ cd tools/question-classifier
$ npx tsx classify.ts ../path/to/paper.pdf

? Is this a text PDF or a scanned copy? (use arrow keys)
  > Text PDF (typed/digital)
    Scanned copy (image-based)

? Exam source? (optional, press enter to skip)
  > KCET 2023

? Chapter filter? (helps LLM pick correct conceptIds)
  > Aldehydes, Ketones and Carboxylic Acids

Processing page 1/12...
Processing page 2/12...
...
Extracted 30 questions.

Pass 2: Solving + classifying...
  [1/30] Aldol condensation of acetaldehyde... ✓
  [2/30] Lucas test for alcohols... ✓
  ...

Output written to: output/paper_2025-06-28_30q.json

Review the JSON, then import:
  npm run import -- ./output/paper_2025-06-28_30q.json
```

---

## Architecture

### File Structure

```
tools/question-classifier/
├── package.json
├── tsconfig.json
├── classify.ts              # entry point — CLI interaction
├── src/
│   ├── extract-text.ts      # pdf-parse text extraction
│   ├── extract-image.ts     # pdf2pic → page images
│   ├── split-questions.ts   # LLM call to split raw text/images into individual questions
│   ├── solve-classify.ts    # LLM call to solve + generate metadata per question
│   ├── gemini.ts            # Gemini API client wrapper
│   ├── prompts.ts           # all LLM prompt templates
│   ├── schemas.ts           # Zod schemas for validating LLM output
│   └── concept-taxonomy.ts  # hardcoded concept list (copied from seed)
├── output/                  # generated JSON files go here
└── .env                     # GEMINI_API_KEY=...
```

### Processing Pipeline

```
┌─────────────┐
│  User runs   │
│  classify.ts │
└──────┬──────┘
       │
       ▼
┌──────────────────────────────────────────┐
│  Step 1: User selects PDF type           │
│  - "Text PDF" → extract-text.ts          │
│  - "Scanned copy" → extract-image.ts     │
└──────┬───────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────┐
│  Step 2: Split into individual questions │
│  LLM prompt: "Here is raw content from  │
│  a chemistry exam paper. Extract each    │
│  question separately. Return JSON array  │
│  of {questionNumber, questionText,       │
│  options[], hasAnswer, givenAnswer}"     │
│                                          │
│  For text: send extracted text           │
│  For scanned: send page images           │
│  Process page-by-page to stay within     │
│  context limits                          │
└──────┬───────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────┐
│  Step 3: Solve + Classify each question  │
│  LLM prompt per question (see below)     │
│  - Solve the question                    │
│  - Pick correctOption                    │
│  - Write explanation                     │
│  - Assign all metadata fields            │
│  Validate output against Zod schema      │
│  Retry once on validation failure        │
└──────┬───────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────┐
│  Step 4: Write output JSON               │
│  Format matches import-questions.ts      │
│  Save to output/ directory               │
└──────────────────────────────────────────┘
```

---

## Step-by-Step Build Instructions

### Step 1: Project setup

Create `tools/question-classifier/` with `package.json`, `tsconfig.json`. Install dependencies. Create `.env` with `GEMINI_API_KEY` placeholder. Add `tools/question-classifier/.env` to the root `.gitignore`.

### Step 2: Gemini API client (`src/gemini.ts`)

- Use `@google/generative-ai` SDK
- Initialize with `GEMINI_API_KEY` from `.env`
- Model: `gemini-2.5-flash`
- Two functions:
  - `callGeminiText(systemPrompt, userPrompt) → string` — for text PDFs
  - `callGeminiVision(systemPrompt, images: Buffer[]) → string` — for scanned PDFs (sends images inline)
- Add retry logic: retry up to 2 times on 429/500 errors with 3s backoff
- Set `responseMimeType: "application/json"` for structured output

### Step 3: Concept taxonomy reference (`src/concept-taxonomy.ts`)

Hardcode the full concept list (47 concepts). This gets injected into prompts so the LLM picks valid conceptIds.

```typescript
export const CONCEPT_TAXONOMY = [
  { conceptId: "CHEM_ORG_GOC_001", chapter: "General Organic Chemistry", topic: "Hybridisation" },
  { conceptId: "CHEM_ORG_GOC_002", chapter: "General Organic Chemistry", topic: "Inductive Effect" },
  { conceptId: "CHEM_ORG_GOC_003", chapter: "General Organic Chemistry", topic: "Resonance" },
  { conceptId: "CHEM_ORG_GOC_004", chapter: "General Organic Chemistry", topic: "Hyperconjugation" },
  { conceptId: "CHEM_ORG_GOC_005", chapter: "General Organic Chemistry", topic: "Isomerism" },
  { conceptId: "CHEM_ORG_GOC_006", chapter: "General Organic Chemistry", topic: "IUPAC Nomenclature" },
  { conceptId: "CHEM_ORG_HC_001", chapter: "Hydrocarbons", topic: "Alkanes" },
  { conceptId: "CHEM_ORG_HC_002", chapter: "Hydrocarbons", topic: "Alkenes" },
  { conceptId: "CHEM_ORG_HC_003", chapter: "Hydrocarbons", topic: "Alkynes" },
  { conceptId: "CHEM_ORG_HC_004", chapter: "Hydrocarbons", topic: "Arenes and Aromaticity" },
  { conceptId: "CHEM_ORG_HC_005", chapter: "Hydrocarbons", topic: "Markovnikov Rule" },
  { conceptId: "CHEM_ORG_HALO_001", chapter: "Haloalkanes and Haloarenes", topic: "Classification of Haloalkanes" },
  { conceptId: "CHEM_ORG_HALO_002", chapter: "Haloalkanes and Haloarenes", topic: "SN1 Reaction" },
  { conceptId: "CHEM_ORG_HALO_003", chapter: "Haloalkanes and Haloarenes", topic: "SN2 Reaction" },
  { conceptId: "CHEM_ORG_HALO_004", chapter: "Haloalkanes and Haloarenes", topic: "Elimination Reactions" },
  { conceptId: "CHEM_ORG_HALO_005", chapter: "Haloalkanes and Haloarenes", topic: "Haloarenes" },
  { conceptId: "CHEM_ORG_APE_001", chapter: "Alcohols, Phenols and Ethers", topic: "Classification and Structure" },
  { conceptId: "CHEM_ORG_APE_002", chapter: "Alcohols, Phenols and Ethers", topic: "Acidity of Alcohols and Phenols" },
  { conceptId: "CHEM_ORG_APE_003", chapter: "Alcohols, Phenols and Ethers", topic: "Lucas Test" },
  { conceptId: "CHEM_ORG_APE_004", chapter: "Alcohols, Phenols and Ethers", topic: "Reactions of Alcohols" },
  { conceptId: "CHEM_ORG_APE_005", chapter: "Alcohols, Phenols and Ethers", topic: "Ethers" },
  { conceptId: "CHEM_ORG_AKCA_001", chapter: "Aldehydes, Ketones and Carboxylic Acids", topic: "Carbonyl Chemistry" },
  { conceptId: "CHEM_ORG_AKCA_002", chapter: "Aldehydes, Ketones and Carboxylic Acids", topic: "Nucleophilic Addition" },
  { conceptId: "CHEM_ORG_AKCA_003", chapter: "Aldehydes, Ketones and Carboxylic Acids", topic: "Enolate Formation" },
  { conceptId: "CHEM_ORG_AKCA_004", chapter: "Aldehydes, Ketones and Carboxylic Acids", topic: "Aldol Reaction" },
  { conceptId: "CHEM_ORG_AKCA_005", chapter: "Aldehydes, Ketones and Carboxylic Acids", topic: "Cross Aldol Reaction" },
  { conceptId: "CHEM_ORG_AKCA_006", chapter: "Aldehydes, Ketones and Carboxylic Acids", topic: "Cannizzaro Reaction" },
  { conceptId: "CHEM_ORG_AKCA_007", chapter: "Aldehydes, Ketones and Carboxylic Acids", topic: "Haloform Reaction" },
  { conceptId: "CHEM_ORG_AKCA_008", chapter: "Aldehydes, Ketones and Carboxylic Acids", topic: "Clemmensen and Wolf-Kishner Reduction" },
  { conceptId: "CHEM_ORG_AKCA_009", chapter: "Aldehydes, Ketones and Carboxylic Acids", topic: "Carboxylic Acids" },
  { conceptId: "CHEM_ORG_AKCA_010", chapter: "Aldehydes, Ketones and Carboxylic Acids", topic: "Carboxylic Acid Derivatives" },
  { conceptId: "CHEM_ORG_AM_001", chapter: "Amines", topic: "Classification of Amines" },
  { conceptId: "CHEM_ORG_AM_002", chapter: "Amines", topic: "Basicity of Amines" },
  { conceptId: "CHEM_ORG_AM_003", chapter: "Amines", topic: "Diazonium Salts" },
  { conceptId: "CHEM_ORG_AM_004", chapter: "Amines", topic: "Preparation of Amines" },
  { conceptId: "CHEM_ORG_BIO_001", chapter: "Biomolecules", topic: "Carbohydrates" },
  { conceptId: "CHEM_ORG_BIO_002", chapter: "Biomolecules", topic: "Proteins and Amino Acids" },
  { conceptId: "CHEM_ORG_BIO_003", chapter: "Biomolecules", topic: "Nucleic Acids" },
  { conceptId: "CHEM_ORG_BIO_004", chapter: "Biomolecules", topic: "Vitamins and Hormones" },
  { conceptId: "CHEM_ORG_POL_001", chapter: "Polymers", topic: "Classification of Polymers" },
  { conceptId: "CHEM_ORG_POL_002", chapter: "Polymers", topic: "Addition and Condensation Polymerisation" },
  { conceptId: "CHEM_ORG_POL_003", chapter: "Polymers", topic: "Important Commercial Polymers" },
  { conceptId: "CHEM_ORG_CEL_001", chapter: "Chemistry in Everyday Life", topic: "Drugs and Medicines" },
  { conceptId: "CHEM_ORG_CEL_002", chapter: "Chemistry in Everyday Life", topic: "Food Chemicals" },
  { conceptId: "CHEM_ORG_CEL_003", chapter: "Chemistry in Everyday Life", topic: "Cleansing Agents" },
];
```

### Step 4: Prompt templates (`src/prompts.ts`)

Two prompt templates:

**Prompt A — Question Extraction (per page):**

```
You are a chemistry exam paper parser. Extract every question from this page.

Return a JSON array where each element has:
- questionNumber: number
- questionText: string (preserve LaTeX notation using $...$ syntax)
- questionType: one of "MCQ", "NUMERICAL", "ASSERTION_REASON", "MATRIX_MATCH", "INTEGER_ANSWER"
- options: string[] (for MCQ, the 4 options — omit the A/B/C/D prefix)
- hasAnswer: boolean (true if an answer key is provided on this page)
- givenAnswer: string | null (the answer if provided)

Rules:
- Preserve chemical formulas exactly
- Convert subscripts/superscripts to LaTeX: H₂O → $H_2O$, CH₃⁺ → $CH_3^+$
- If a question spans columns or has sub-parts, treat each independently numbered item as one question
- Ignore instructions, headers, student name fields — only extract questions
```

**Prompt B — Solve + Classify (per question):**

```
You are an expert organic chemistry teacher for JEE/KCET preparation.

Given this question, do the following:
1. Solve it step by step
2. Determine the correct answer
3. Write a clear explanation a student can learn from
4. Classify it with the metadata below

Question:
{questionText}
Options: {options}
{if givenAnswer: "The answer key says: {givenAnswer}. Verify this is correct."}

Return JSON with exactly these fields:
{
  "correctOption": "<the correct option text, must exactly match one of the options>",
  "explanation": "<clear explanation with reaction mechanisms where relevant, use LaTeX>",
  "conceptId": "<from the list below>",
  "skill": "<one of: CONCEPT_RECALL, MECHANISM_UNDERSTANDING, PRODUCT_PREDICTION, FORMULA_APPLICATION, NUMERICAL_SOLVING, MULTI_STEP_REASONING, GRAPH_INTERPRETATION, ISOMER_CLASSIFICATION, EXPERIMENTAL_ANALYSIS, UNIT_CONVERSION>",
  "difficultyAi": <1-5 integer>,
  "bloomsLevel": "<one of: REMEMBER, UNDERSTAND, APPLY, ANALYZE, EVALUATE>",
  "expectedTimeSec": <integer, typical time in seconds>,
  "misconceptions": ["<common mistake 1>", "<common mistake 2>"],
  "knowledgeElements": <how many distinct facts needed, integer>,
  "reasoningSteps": <how many logical steps to solve, integer>
}

Difficulty guide:
  1 = Direct recall / definition
  2 = Single-step application
  3 = Multi-concept or moderate reasoning
  4 = Multi-step with traps
  5 = JEE Advanced level, deep reasoning

Skill guide:
  CONCEPT_RECALL = definitions, properties, naming
  MECHANISM_UNDERSTANDING = reaction mechanisms, intermediates
  PRODUCT_PREDICTION = predict major/minor products
  FORMULA_APPLICATION = use a formula to calculate
  NUMERICAL_SOLVING = numerical computation
  MULTI_STEP_REASONING = chain of reasoning across concepts
  ISOMER_CLASSIFICATION = identify/count/classify isomers
  EXPERIMENTAL_ANALYSIS = lab tests, reagent identification
  GRAPH_INTERPRETATION = interpret graphs/data
  UNIT_CONVERSION = convert between units

Available conceptIds:
{CONCEPT_TAXONOMY formatted as: conceptId | chapter | topic}

Pick the MOST SPECIFIC conceptId that matches. If none fits well, use the chapter-level parent.
```

### Step 5: Zod validation schemas (`src/schemas.ts`)

```typescript
// Schema for Step 2 output (extraction)
const ExtractedQuestionSchema = z.object({
  questionNumber: z.number(),
  questionText: z.string().min(1),
  questionType: z.enum(["MCQ", "NUMERICAL", "ASSERTION_REASON", "MATRIX_MATCH", "INTEGER_ANSWER"]),
  options: z.array(z.string()).optional(),
  hasAnswer: z.boolean(),
  givenAnswer: z.string().nullable(),
});

// Schema for Step 3 output (solve + classify)
const ClassifiedQuestionSchema = z.object({
  correctOption: z.string(),
  explanation: z.string().min(10),
  conceptId: z.string().startsWith("CHEM_"),
  skill: z.enum([...all 10 skills]),
  difficultyAi: z.number().int().min(1).max(5),
  bloomsLevel: z.enum([...all 5 levels]),
  expectedTimeSec: z.number().int().min(15).max(600),
  misconceptions: z.array(z.string()),
  knowledgeElements: z.number().int().min(1).max(10),
  reasoningSteps: z.number().int().min(1).max(10),
});
```

Validate every LLM response. On failure, retry once with the validation error appended to the prompt.

### Step 6: Text extraction (`src/extract-text.ts`)

- Use `pdf-parse` to extract text from all pages
- Return `string[]` — one string per page

### Step 7: Image extraction (`src/extract-image.ts`)

- Use `pdf2pic` to convert each page to a PNG image
- Return `Buffer[]` — one image buffer per page
- Resolution: 300 DPI (good balance of quality vs file size)

### Step 8: Question splitter (`src/split-questions.ts`)

- Takes either `string[]` (text pages) or `Buffer[]` (image pages)
- Sends each page to Gemini with Prompt A
- For text: uses `callGeminiText`
- For images: uses `callGeminiVision`
- Merges results across pages, deduplicates by questionNumber
- Returns `ExtractedQuestion[]`

### Step 9: Solver + classifier (`src/solve-classify.ts`)

- Takes `ExtractedQuestion[]` and optional user-provided metadata (exam, year, source)
- Loops through each question, sends to Gemini with Prompt B
- Validates response with Zod schema
- On validation failure: retry once with error message
- On second failure: log warning, skip question, add to errors list
- Merges extraction data + classification data into final format
- Rate limiting: add 500ms delay between calls to avoid hitting free tier limits
- Returns array matching `import-questions.ts` expected format

### Step 10: CLI entry point (`classify.ts`)

```typescript
// 1. Parse CLI args: path to PDF
// 2. Prompt: "Text PDF or Scanned copy?"
// 3. Prompt: "Exam source?" (optional — KCET, JEE_MAINS, etc)
// 4. Prompt: "Year?" (optional)
// 5. Prompt: "Source label?" (optional — e.g. "KCET 2023 Paper 1")
// 6. Prompt: "Chapter filter?" (optional — helps LLM accuracy)
//
// 7. Extract (text or image path based on step 2)
// 8. Split into questions (with progress bar)
// 9. Solve + classify each (with progress bar)
// 10. Write JSON to output/ directory
// 11. Print summary: X questions extracted, Y classified, Z errors
// 12. Print: "npm run import -- ./tools/question-classifier/output/<filename>.json"
```

### Step 11: Output format

The final JSON must exactly match what `scripts/import-questions.ts` expects:

```json
[
  {
    "conceptId": "CHEM_ORG_AKCA_004",
    "skill": "MECHANISM_UNDERSTANDING",
    "questionType": "MCQ",
    "questionText": "What is the major product of aldol condensation of acetaldehyde?",
    "options": ["Crotonaldehyde", "Acetaldol", "Paraldehyde", "Acetic acid"],
    "correctOption": "Crotonaldehyde",
    "explanation": "Aldol condensation of acetaldehyde first forms...",
    "difficultyAi": 3,
    "bloomsLevel": "APPLY",
    "expectedTimeSec": 90,
    "misconceptions": ["Confuses aldol addition with condensation"],
    "knowledgeElements": 2,
    "reasoningSteps": 2,
    "exam": "KCET",
    "year": 2023,
    "source": "KCET 2023"
  }
]
```

---

## Setup Instructions (for the user)

1. Get a Gemini API key from https://aistudio.google.com/apikey (sign in with your college email to check for elevated limits)
2. Create `tools/question-classifier/.env`:
   ```
   GEMINI_API_KEY=your_key_here
   ```
3. Install: `cd tools/question-classifier && npm install`
4. Run: `npx tsx classify.ts ../../path/to/paper.pdf`

---

## Error Handling

| Scenario | Behavior |
|---|---|
| Gemini returns invalid JSON | Parse error → retry once with "Return valid JSON only" appended |
| Zod validation fails | Retry once with validation errors in prompt |
| Second retry fails | Skip question, add to errors summary |
| conceptId not in taxonomy | Flag in output with `"_warning": "conceptId may not exist in DB"` |
| Rate limit (429) | Wait 3s, retry up to 2 times |
| Empty page (no questions) | Skip silently |
| PDF can't be read | Exit with clear error message |

---

## Estimated Token Usage per Paper

| Step | Tokens (approx) |
|---|---|
| Extract questions (text, 10 pages) | ~15K input + ~5K output |
| Extract questions (images, 10 pages) | ~25K input + ~5K output |
| Solve + classify (30 questions) | ~60K input + ~15K output |
| **Total per paper (text)** | **~95K tokens** |
| **Total per paper (scanned)** | **~105K tokens** |

Gemini free tier: 1M tokens/day → ~10 papers/day comfortably.

---

## Future Enhancements (not in initial build)

- Batch mode: process a folder of PDFs
- Answer key image: separate page/file with just the answer key, cross-referenced
- Confidence scores: LLM self-rates confidence, flag low-confidence for manual review
- Duplicate detection: compare against existing questions in DB before import
- Support for physics/math chapters when the platform expands beyond organic chemistry
