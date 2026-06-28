import { callGeminiText, callGeminiVision } from "./gemini";
import { PROMPT_A_EXTRACT } from "./prompts";
import { ExtractedQuestionSchema, type ExtractedQuestion } from "./schemas";

export async function splitQuestions(
  pages: string[] | Buffer[],
  isImageMode: boolean,
  chapterHint?: string
): Promise<ExtractedQuestion[]> {
  const allQuestions: ExtractedQuestion[] = [];
  const seen = new Set<number>();
  const systemPrompt = PROMPT_A_EXTRACT(chapterHint);

  for (let i = 0; i < pages.length; i++) {
    process.stdout.write(`  Extracting page ${i + 1}/${pages.length}...\r`);

    let raw: string;
    try {
      if (isImageMode) {
        raw = await callGeminiVision(systemPrompt, [pages[i] as Buffer]);
      } else {
        const pageText = (pages[i] as string).trim();
        if (!pageText) continue;
        raw = await callGeminiText(systemPrompt, pageText);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      process.stdout.write("\n");
      console.error(`  Warning: page ${i + 1} failed (${msg}), skipping.`);
      continue;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      process.stdout.write("\n");
      console.error(`  Warning: page ${i + 1} returned invalid JSON, skipping.`);
      continue;
    }

    // Handle both raw array and { questions: [...] } response shapes
    const arr = Array.isArray(parsed)
      ? parsed
      : (parsed as Record<string, unknown>).questions;

    if (!Array.isArray(arr)) continue;

    for (const item of arr) {
      const result = ExtractedQuestionSchema.safeParse(item);
      if (!result.success) continue;
      if (seen.has(result.data.questionNumber)) continue;
      seen.add(result.data.questionNumber);
      allQuestions.push(result.data);
    }
  }

  process.stdout.write("\n");
  return allQuestions.sort((a, b) => a.questionNumber - b.questionNumber);
}
