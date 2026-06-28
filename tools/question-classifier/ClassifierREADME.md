# KEA Question Classifier

A standalone CLI tool that ingests a chemistry exam PDF, processes it through a multi-pass Gemini 2.5 Flash pipeline, and outputs import-ready JSON for the KEA Platform question bank.

```
PDF  →  extract  →  split  →  solve  →  verify  →  batch classify  →  output JSON  →  import
```

---

## Directory Layout

```
tools/question-classifier/
├── classify.ts              # CLI entry point
├── .env                     # GEMINI_API_KEY (gitignored)
├── package.json
├── tsconfig.json
├── types.d.ts               # manual inquirer types
├── src/
│   ├── gemini.ts            # Gemini API client + retry/rate-limit logic
│   ├── prompts.ts           # All 4 prompt templates (A, B, C, D)
│   ├── schemas.ts           # Zod schemas for every LLM output shape
│   ├── concept-taxonomy.ts  # 45 hardcoded concepts injected into prompts
│   ├── extract-text.ts      # pdf-parse → string[] per page
│   ├── extract-image.ts     # pdf2pic → Buffer[] per page (scanned mode)
│   ├── split-questions.ts   # Prompt A orchestrator
│   └── solve-classify.ts    # Two-phase pipeline (solve + batch classify)
└── output/                  # Generated JSON files (gitignored)
```

---

## Prerequisites

| Requirement | Notes |
|---|---|
| Node.js 18+ | Project uses Zed's bundled node: `~/.local/share/zed/node/node-v24.11.0-linux-x64/bin` |
| Gemini API key | Free tier works; paid tier removes rate limits |
| Ghostscript + GraphicsMagick | **Scanned mode only** — `sudo apt install ghostscript graphicsmagick` |

---

## Setup

**1. Get a Gemini API key**

Go to https://aistudio.google.com/apikey and create a key.

**2. Set it in the `.env` file**

```
tools/question-classifier/.env
```
```
GEMINI_API_KEY=your_actual_key_here
```

**3. Install dependencies** (from inside the tool directory)

```bash
export PATH="$HOME/.local/share/zed/node/node-v24.11.0-linux-x64/bin:$PATH"
cd tools/question-classifier
npm install
```

**4. (Scanned PDFs only) Install system dependencies**

```bash
sudo apt install ghostscript graphicsmagick
```

---

## Running

Always run from inside `tools/question-classifier/`:

```bash
export PATH="$HOME/.local/share/zed/node/node-v24.11.0-linux-x64/bin:$PATH"
cd tools/question-classifier
npx tsx classify.ts ./your-paper.pdf
```

You will be prompted interactively:

| Prompt | Options | Notes |
|---|---|---|
| PDF type | Text PDF / Scanned copy | Use Scanned for image-based PDFs |
| Exam | KCET / JEE_MAINS / JEE_ADVANCED / COMEDK / GENERAL / Skip | Stored in output JSON |
| Year | 4-digit year or Enter to skip | e.g. `2026` |
| Source label | Free text or Enter to skip | e.g. `KCET 2023 Paper 1` |
| Chapter hint | Free text or Enter to skip | e.g. `Alcohols Phenols and Ethers` — narrows conceptId accuracy |

The chapter hint is injected into both the extraction and classification prompts. Use it whenever you know which chapter the paper covers — it significantly reduces classification errors.

---

## Console Output

```
KEA Question Classifier
────────────────────────────────────────
PDF: ./paper.pdf

Step 1/3  Extracting pages...
  8 page(s) extracted.

Step 2/3  Splitting into questions...
  Extracting page 8/8...
  11 question(s) extracted.

Step 3/3  Solving and classifying...

  Phase 1/2  Solving 11 questions...
  [1/11] The correct sequence of reagents... ✓ (HIGH)
  [2/11] Match List - I with List - II...    ✓ (HIGH)
  [3/11] The reactions which produce alcohol... ✓ (HIGH)
  ...

  Phase 2/2  Classifying in 3 batch(es) of up to 5...
  Batch 1/3 classified (5 questions)
  Batch 2/3 classified (5 questions)
  Batch 3/3 classified (1 question)

────────────────────────────────────────
Extracted : 11 questions
Classified: 11 questions
  ✓ HIGH confidence  : 9
  ~ MEDIUM confidence: 1
  ! LOW confidence   : 1  ← review these manually

Output: /home/.../tools/question-classifier/output/paper_2026-06-28_11q.json

Next step — import from the project root:
  npm run import -- ./tools/question-classifier/output/paper_2026-06-28_11q.json
```

---

## How the Pipeline Works

### Step 0 — PDF Extraction (no LLM calls)

**Text PDF** (`pdf-parse`):
Reads the PDF buffer and reconstructs text per page by tracking the Y-axis position of each text item. When the Y coordinate changes, a newline is inserted. Returns `string[]` — one string per page.

**Scanned PDF** (`pdf2pic`):
Converts each page to a PNG image at 300 DPI (2480×3508 pixels), using Ghostscript under the hood. Returns `Buffer[]` — one buffer per page. Requires Ghostscript + GraphicsMagick to be installed.

---

### Step 1 — Split into Questions (Prompt A, 1 call per page)

Each page is sent to Gemini individually. The system prompt instructs Gemini to act as a chemistry paper parser and return a JSON array. For scanned pages, the page image is sent as a base64-encoded PNG inline; for text pages, the raw text string is sent.

**What Gemini extracts per question:**

| Field | Type | Description |
|---|---|---|
| `questionNumber` | integer | As printed in the paper |
| `questionText` | string | Full text, formulas converted to LaTeX (`$H_2O$`, `$CH_3^+$`) |
| `questionType` | enum | MCQ / NUMERICAL / ASSERTION_REASON / MATRIX_MATCH / INTEGER_ANSWER |
| `options` | string[] or null | For MCQ only; A/B/C/D prefix stripped, only text stored |
| `hasAnswer` | boolean | True if an answer key entry is present |
| `givenAnswer` | string or null | The answer from the key (letter or number) |
| `hasExplanation` | boolean | True if a worked solution is present |
| `existingExplanation` | string or null | The full solution text if present |

After all pages are processed, questions are deduplicated by `questionNumber` and sorted.

---

### Phase 1 — Solve (Prompt B, 1 call per question)

Each question is sent to Gemini to be solved. The user prompt contains the question text and, for MCQ, lettered options (`A. ... B. ... C. ... D. ...`).

**Output:**

| Field | Type | Description |
|---|---|---|
| `correctOption` | string | For MCQ: the letter (`A`, `B`, `C`, or `D`). For NUMERICAL/INTEGER: the numeric answer. |
| `explanation` | string | Concise explanation, capped at ~150 words. Covers the key concept and why other options are wrong. |
| `confidence` | HIGH / MEDIUM / LOW | Gemini's self-assessed certainty. |

**Solve-skip optimisation:** If the PDF already contains both a worked solution (`hasExplanation=true`, `existingExplanation` non-null) AND an answer (`givenAnswer` non-null), the Prompt B call is skipped entirely. The existing explanation and answer are reused, and `_llm_metadata.solve_skipped` is set to `true` with confidence automatically set to `HIGH`. This saves one API call per such question.

---

### Phase 1b — Verify (Prompt C, conditional)

Runs only when:
- The PDF contains an official answer key (`hasAnswer=true`, `givenAnswer` non-null), AND
- Solve was NOT skipped

Gemini is given the question, the solved answer with explanation, and the official answer key value. It checks whether they agree.

**Output:**

| Field | Type | Description |
|---|---|---|
| `verifiedAnswer` | string | The confirmed correct answer (letter for MCQ) |
| `verificationNote` | string | Brief note on the verification |
| `overridden` | boolean | `true` if the official key was wrong |

If `overridden=true`, `correctOption` is replaced with `verifiedAnswer` and a correction note is appended to the explanation. `_llm_metadata.answer_overridden` is set to `true`.

Verification is best-effort: if this call fails, the pipeline continues with the solved answer.

---

### Phase 2 — Batch Classify (Prompt D, 1 call per 5 questions)

After all questions are solved, they are grouped into batches of 5 and sent to Gemini for classification in a single call each. This is more efficient than one classify call per question.

The system prompt injects the full 45-concept taxonomy so Gemini can only pick from known `conceptId` values.

**Input per question in the batch:**
```json
{
  "questionNumber": 3,
  "questionText": "...",
  "options": ["...", "...", "...", "..."],
  "correctOption": "C",
  "explanation": "..."
}
```

**Output per question:**

| Field | Type | Description |
|---|---|---|
| `questionNumber` | integer | Matches input — used to map results back |
| `conceptId` | string | e.g. `CHEM_ORG_APE_002` |
| `skill` | enum | See skill list below |
| `difficultyAi` | integer 1–5 | 1=recall, 3=multi-concept, 5=JEE Advanced |
| `bloomsLevel` | enum | REMEMBER / UNDERSTAND / APPLY / ANALYZE / EVALUATE |
| `expectedTimeSec` | integer | Typical solve time for a prepared student |
| `misconceptions` | string[] | Common student mistakes for this question |
| `knowledgeElements` | integer 1–10 | Distinct facts/concepts needed |
| `reasoningSteps` | integer 1–10 | Logical steps to reach the answer |

**Batch fallback:** If a batch call fails (e.g. rate limit mid-batch), each question in that batch is classified individually using the single-question Prompt D. No questions are silently dropped.

**Unknown conceptId:** If Gemini returns a `conceptId` not in the hardcoded taxonomy, a `_warning: "conceptId not in taxonomy"` field is added to that question's output entry. Fix it manually before importing.

---

### Phase 3 — Merge + Validate (no LLM calls)

All three outputs (extracted, solved, classified) are merged into a single `FinalQuestion` object per question. Zod validates the merged result against `FinalQuestionSchema`.

Two metadata fields are added:

**`_confidence`** — top-level copy of the solve confidence (HIGH / MEDIUM / LOW)

**`_llm_metadata`:**
```json
{
  "model": "gemini-2.5-flash",
  "generated_at": "2026-06-28T11:00:00Z",
  "pipeline_version": 2,
  "confidence": "HIGH",
  "solve_skipped": false,
  "answer_verified": true,
  "answer_overridden": false
}
```

Both `_confidence` and `_llm_metadata` are stripped automatically by `scripts/import-questions.ts` (Zod strips unknown keys). They exist for human review of the intermediate JSON only.

---

### Retry Logic

Every Gemini call is wrapped in two layers:

**`callWithRetry`** (transport-level):
- Up to 5 attempts per call
- `429 RESOURCE_EXHAUSTED`: reads `"retry in Xs"` from the API error message, waits exactly that many seconds + 2s buffer before retrying. Prints: `Rate limited — waiting 48s before retry (attempt 1/4)...`
- `500 / 503`: waits 5s before retrying

**`callAndParse`** (schema-level):
- Calls `callWithRetry`, then JSON-parses and Zod-validates the result
- If Zod validation fails on the first attempt, it appends the specific field-level errors to the prompt for the retry — not just "return valid JSON". Example: `- correctOption: String must contain at least 1 character(s)`
- If both attempts fail, the question is added to the errors list

**Inter-call delay:**
4 seconds between sequential calls. The free tier limit is 20 RPM; 4s spacing keeps traffic at ~15 RPM to avoid hitting it in the first place.

---

## API Call & Token Analysis

### Worked Example

**Paper:** 8-page, 11-question JEE Mains text PDF, no answer key provided (matches the actual test run on 2026-06-28)

#### Call Breakdown

| Phase | Prompt | Calls | Reason |
|---|---|---|---|
| Extract | A (extract) | 8 | 1 per page |
| Solve | B (solve) | 11 | 1 per question; no solve-skip (no existing explanations) |
| Verify | C (verify) | 0 | No answer key present in this PDF |
| Classify | D batch | 3 | Batches: Q1–5 (1 call), Q6–10 (1 call), Q11 (1 call) |
| **Total** | | **22** | |

Compare to the old per-question classify approach: 8 + 11 + 0 + 11 = **30 calls**. Batching saves 8 calls for this paper (more savings on larger papers).

#### Token Breakdown

Estimates; 1 token ≈ 4 characters. Gemini 2.5 Flash counts input and output separately.

| Phase | Input tokens | Output tokens | Notes |
|---|---|---|---|
| Prompt A × 8 | ~14,400 | ~6,400 | System ~400 tokens. Average page of exam text ~1,400 tokens. Output: ~800 tokens of structured JSON per page. |
| Prompt B × 11 | ~3,300 | ~1,650 | System ~180 tokens. Question + options ~120 tokens. Output capped at ~150 tokens (150-word explanation + letter + confidence). |
| Prompt D batch × 3 | ~8,400 | ~1,200 | System ~800 tokens (incl. 45-concept taxonomy ≈ 700 tokens). 5 solved questions ~2,000 tokens input. Output ~400 tokens per batch. |
| **Total** | **~26,100** | **~9,250** | **~35,350 combined** |

#### Time Estimate

| Component | Duration |
|---|---|
| Inter-call delays (22 calls × 4s) | ~88s |
| LLM response time (~3s avg per call) | ~66s |
| PDF extraction (local, no network) | ~2–5s |
| **Realistic total** | **2.5–4 minutes** |

#### How the numbers change with an answer key

If the PDF contains an official answer key for all 11 questions, Prompt C (verify) runs for each:

| Change | Impact |
|---|---|
| +11 verify calls | +11 calls (total: 33) |
| +~300 input + 150 output tokens per verify call | +~4,950 tokens (total: ~40,300) |
| +11 × 4s inter-call delays | +44s (total: ~3.5–5 minutes) |

#### Free tier limits

- **20 RPM** (requests per minute) — the 4s inter-call delay keeps traffic at ~15 RPM
- If you do hit a rate limit: the tool reads the exact wait time from the `"retry in Xs"` API message and waits before retrying — no manual intervention needed

---

## Output Format

Each entry in the output JSON array:

```json
{
  "conceptId": "CHEM_ORG_APE_002",
  "skill": "MECHANISM_UNDERSTANDING",
  "questionType": "MCQ",
  "questionText": "3, 3-Dimethyl-2-butanol cannot be prepared by:",
  "options": [
    "Acid catalysed hydration of 3, 3-dimethyl-1-butene",
    "Grignard reagent reaction with an aldehyde",
    "Hydroboration-oxidation of 3, 3-dimethyl-1-butene",
    "Reduction of 3, 3-dimethyl-2-butanone"
  ],
  "correctOption": "C",
  "explanation": "Hydroboration-oxidation follows anti-Markovnikov addition...",
  "difficultyAi": 3,
  "bloomsLevel": "APPLY",
  "expectedTimeSec": 90,
  "misconceptions": ["Confusing Markovnikov vs anti-Markovnikov selectivity"],
  "knowledgeElements": 3,
  "reasoningSteps": 2,
  "exam": "JEE_MAINS",
  "year": 2026,
  "source": "JEE Mains 2026",
  "_confidence": "HIGH",
  "_llm_metadata": {
    "model": "gemini-2.5-flash",
    "generated_at": "2026-06-28T11:00:00Z",
    "pipeline_version": 2,
    "confidence": "HIGH",
    "solve_skipped": false,
    "answer_verified": false,
    "answer_overridden": false
  }
}
```

`_` prefixed fields (`_confidence`, `_llm_metadata`, `_warning`) are for human review only. The import script (`scripts/import-questions.ts`) strips them automatically via Zod.

---

## Confidence Levels

| Level | Indicator | Meaning | Recommended action |
|---|---|---|---|
| `HIGH` | `✓` | Gemini is certain; chemistry is unambiguous | Safe to bulk-approve in teacher dashboard |
| `MEDIUM` | `~` | Likely correct; some ambiguity or assumption | Quick review recommended before approving |
| `LOW` | `!` | Uncertain; question may be unclear or answer wrong | Mandatory manual review — do not approve blindly |

---

## Skill Taxonomy

| Skill | When assigned |
|---|---|
| `CONCEPT_RECALL` | Naming, definitions, properties, classification |
| `MECHANISM_UNDERSTANDING` | Reaction mechanisms, intermediates, reagents |
| `PRODUCT_PREDICTION` | Predict major/minor/final products |
| `FORMULA_APPLICATION` | Apply a known formula to compute something |
| `NUMERICAL_SOLVING` | Numerical computation (Kp, Kc, pH, yield, etc.) |
| `MULTI_STEP_REASONING` | Chain of reasoning across multiple concepts |
| `ISOMER_CLASSIFICATION` | Identify, count, or classify isomers |
| `EXPERIMENTAL_ANALYSIS` | Interpret lab tests, identify reagents, lab observations |
| `GRAPH_INTERPRETATION` | Read or interpret a graph or data table |
| `UNIT_CONVERSION` | Unit conversion calculations |

---

## Concept Taxonomy

45 concepts across 9 chapters. The full list is in `src/concept-taxonomy.ts`. Injected into every classify call so Gemini can only pick from known IDs.

| Chapter | Concept IDs |
|---|---|
| General Organic Chemistry | GOC\_001–006 (Hybridisation, Inductive Effect, Resonance, Hyperconjugation, Isomerism, IUPAC) |
| Hydrocarbons | HC\_001–005 (Alkanes, Alkenes, Alkynes, Arenes, Markovnikov) |
| Haloalkanes and Haloarenes | HALO\_001–005 (Classification, SN1, SN2, Elimination, Haloarenes) |
| Alcohols, Phenols and Ethers | APE\_001–005 (Classification, Acidity, Lucas Test, Reactions, Ethers) |
| Aldehydes, Ketones and Carboxylic Acids | AKCA\_001–010 |
| Amines | AM\_001–004 (Classification, Basicity, Diazonium, Preparation) |
| Biomolecules | BIO\_001–004 (Carbohydrates, Proteins, Nucleic Acids, Vitamins) |
| Polymers | POL\_001–003 |
| Chemistry in Everyday Life | CEL\_001–003 (Drugs, Food, Cleansing Agents) |

**Tip:** Provide a chapter hint (e.g. `Alcohols Phenols and Ethers`) when running the classifier to significantly improve concept mapping accuracy.

---

## After Classifying: Import

From the **project root** (not from inside `tools/question-classifier/`):

```bash
npm run import -- ./tools/question-classifier/output/<filename>.json
```

What the importer does:
1. Strips all `_` prefixed fields silently
2. Validates each entry against `QuestionSchema` (Zod)
3. Checks each `conceptId` exists in the `ConceptTaxonomy` database table
4. Skips duplicates (matched by `questionText` within the same institute)
5. Inserts with `status: PENDING`
6. Reports: inserted, skipped, errors

Questions then appear in the teacher dashboard at `/admin/questions` for review. Click **View full** on any card to see the full question, options, correct answer highlighted in green, and explanation before approving.

---

## Troubleshooting

| Problem | Likely cause | Fix |
|---|---|---|
| `Error: GEMINI_API_KEY not set` | `.env` has placeholder text | Edit `tools/question-classifier/.env`, replace `your_key_here` with the real key |
| `Rate limited — waiting Xs...` | Free tier 20 RPM hit | Normal — the tool reads the exact wait from the API and retries automatically. No action needed. |
| `spawn gs ENOENT` or `spawn gm ENOENT` | Ghostscript or GraphicsMagick not installed | `sudo apt install ghostscript graphicsmagick` (scanned mode only) |
| Questions with figures show no image | Text extraction cannot capture embedded images | Re-run using **Scanned mode** — Gemini receives the page as an image and can read/describe figures |
| `_warning: "conceptId not in taxonomy"` | Gemini returned an invented conceptId | Manually edit the output JSON, replace with the nearest valid ID from `src/concept-taxonomy.ts`, then import |
| `conceptId not found: CHEM_...` on import | DB `ConceptTaxonomy` table doesn't have that ID | Same fix as above |
| Questions from errors list not in output | Solve or classify failed after all retries | Run the classifier again on a cropped single-page PDF containing just those questions |
| `No institute found. Run prisma db seed first.` | Database not seeded | From project root: `npx prisma db seed` |
| `SASL: client password must be a string` | `DATABASE_URL` missing or has placeholder password | Check `.env` and `.env.local` in project root; ensure `DATABASE_URL` has the correct PostgreSQL password |
| `npm error Missing script: "import"` | Running `npm run import` from inside `tools/question-classifier/` | The import script is in the **project root** `package.json`. `cd` back to the project root first. |
