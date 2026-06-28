import inquirer from "inquirer";
import { existsSync, writeFileSync, mkdirSync } from "fs";
import path from "path";

import { extractTextPages } from "./src/extract-text";
import { extractImagePages } from "./src/extract-image";
import { splitQuestions } from "./src/split-questions";
import { solveAndClassify } from "./src/solve-classify";

async function main() {
  const pdfPath = process.argv[2];
  if (!pdfPath) {
    console.error("Usage: npx tsx classify.ts <path-to-pdf>");
    process.exit(1);
  }
  if (!existsSync(pdfPath)) {
    console.error(`Error: File not found: ${pdfPath}`);
    process.exit(1);
  }
  if (!pdfPath.toLowerCase().endsWith(".pdf")) {
    console.error("Error: File must be a PDF.");
    process.exit(1);
  }

  console.log(`\nKEA Question Classifier\n${"─".repeat(40)}`);
  console.log(`PDF: ${pdfPath}\n`);

  const answers = await inquirer.prompt([
    {
      type: "list",
      name: "pdfType",
      message: "Is this a text PDF or a scanned copy?",
      choices: [
        { name: "Text PDF (typed/digital)", value: "text" },
        { name: "Scanned copy (image-based)", value: "image" },
      ],
    },
    {
      type: "list",
      name: "exam",
      message: "Exam source?",
      choices: [
        { name: "KCET", value: "KCET" },
        { name: "JEE Mains", value: "JEE_MAINS" },
        { name: "JEE Advanced", value: "JEE_ADVANCED" },
        { name: "COMEDK", value: "COMEDK" },
        { name: "General / Unknown", value: "GENERAL" },
        { name: "Skip", value: "" },
      ],
    },
    {
      type: "input",
      name: "year",
      message: "Year? (press Enter to skip)",
      validate: (v: string) => !v || /^\d{4}$/.test(v.trim()) || "Enter a 4-digit year or leave blank",
    },
    {
      type: "input",
      name: "source",
      message: "Source label? (e.g. KCET 2023 Paper 1 — press Enter to skip)",
    },
    {
      type: "input",
      name: "chapterHint",
      message: "Chapter filter hint? (helps with conceptId accuracy — press Enter to skip)",
      default: "",
    },
  ]);

  const isImageMode = answers.pdfType === "image";
  const year = answers.year ? parseInt(answers.year.trim(), 10) : undefined;

  // ── Step 1: Extract ──────────────────────────────────────────────────────────
  console.log("\nStep 1/3  Extracting pages...");
  let pages: string[] | Buffer[];
  try {
    if (isImageMode) {
      pages = await extractImagePages(pdfPath);
    } else {
      pages = await extractTextPages(pdfPath);
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`\nFailed to extract PDF: ${msg}`);
    console.error("If this is a scanned PDF, try selecting 'Scanned copy' mode.");
    process.exit(1);
  }

  if (pages.length === 0) {
    console.error("No pages extracted from PDF.");
    process.exit(1);
  }
  console.log(`  ${pages.length} page(s) extracted.`);

  // ── Step 2: Split into questions ─────────────────────────────────────────────
  console.log("\nStep 2/3  Splitting into questions...");
  const extracted = await splitQuestions(
    pages,
    isImageMode,
    answers.chapterHint || undefined
  );

  if (extracted.length === 0) {
    console.error("No questions found in PDF. Check that the PDF contains chemistry questions.");
    process.exit(1);
  }
  console.log(`  ${extracted.length} question(s) extracted.\n`);

  // ── Step 3: Solve + classify ─────────────────────────────────────────────────
  console.log("Step 3/3  Solving and classifying...");
  const { results, errors } = await solveAndClassify(extracted, {
    exam: answers.exam || undefined,
    year,
    source: answers.source || undefined,
    chapterHint: answers.chapterHint || undefined,
  });

  // ── Write output ─────────────────────────────────────────────────────────────
  const outputDir = path.join(__dirname, "output");
  if (!existsSync(outputDir)) mkdirSync(outputDir, { recursive: true });

  const dateStr = new Date().toISOString().slice(0, 10);
  const filename = `paper_${dateStr}_${results.length}q.json`;
  const outputPath = path.join(outputDir, filename);

  writeFileSync(outputPath, JSON.stringify(results, null, 2), "utf-8");

  // ── Summary ──────────────────────────────────────────────────────────────────
  const highConf = results.filter((r) => r._confidence === "HIGH").length;
  const medConf = results.filter((r) => r._confidence === "MEDIUM").length;
  const lowConf = results.filter((r) => r._confidence === "LOW").length;

  console.log(`\n${"─".repeat(40)}`);
  console.log(`Extracted : ${extracted.length} questions`);
  console.log(`Classified: ${results.length} questions`);
  console.log(`  ✓ HIGH confidence  : ${highConf}`);
  console.log(`  ~ MEDIUM confidence: ${medConf}`);
  if (lowConf > 0) {
    console.log(`  ! LOW confidence   : ${lowConf}  ← review these manually`);
  }
  if (errors.length > 0) {
    console.log(`  ✗ Errors           : ${errors.length}`);
    errors.forEach((e) =>
      console.log(`    Q${e.questionNumber}: ${e.error}`)
    );
  }

  console.log(`\nOutput: ${outputPath}`);
  console.log(`\nNext step — import from the project root:`);
  console.log(`  npm run import -- ./tools/question-classifier/output/${filename}\n`);
}

main().catch((err) => {
  console.error("Fatal error:", err instanceof Error ? err.message : err);
  process.exit(1);
});
