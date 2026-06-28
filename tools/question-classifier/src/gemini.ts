import { GoogleGenAI } from "@google/genai";
import * as dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, "../.env") });

if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === "your_key_here") {
  console.error("Error: GEMINI_API_KEY not set in tools/question-classifier/.env");
  process.exit(1);
}

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const MODEL = "gemini-2.5-flash";

const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms));

async function callWithRetry(fn: () => Promise<string>): Promise<string> {
  let lastError: unknown;
  const MAX_ATTEMPTS = 5;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      const msg = err instanceof Error ? err.message : String(err);
      const is429 = msg.includes("429") || msg.includes("RESOURCE_EXHAUSTED");
      const isRetryable = is429 || msg.includes("500") || msg.includes("503");

      if (!isRetryable || attempt === MAX_ATTEMPTS - 1) throw err;

      let delayMs = 5000;
      if (is429) {
        // API response includes "retry in Xs" in the message
        const secMatch = msg.match(/retry in (\d+(?:\.\d+)?)s/i);
        if (secMatch) {
          delayMs = Math.ceil(parseFloat(secMatch[1]) * 1000) + 2000;
        } else {
          const jsonMatch = msg.match(/"retryDelay":"(\d+)s"/);
          if (jsonMatch) delayMs = (parseInt(jsonMatch[1]) + 2) * 1000;
          else delayMs = 65000;
        }
        console.log(`    Rate limited — waiting ${Math.ceil(delayMs / 1000)}s before retry (attempt ${attempt + 1}/${MAX_ATTEMPTS - 1})...`);
      }

      await sleep(delayMs);
    }
  }
  throw lastError;
}

export async function callGeminiText(systemPrompt: string, userPrompt: string): Promise<string> {
  return callWithRetry(async () => {
    const response = await ai.models.generateContent({
      model: MODEL,
      contents: userPrompt,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
      },
    });
    return response.text ?? "";
  });
}

export async function callGeminiVision(systemPrompt: string, imageBuffers: Buffer[]): Promise<string> {
  return callWithRetry(async () => {
    const imageParts = imageBuffers.map((buf) => ({
      inlineData: {
        mimeType: "image/png" as const,
        data: buf.toString("base64"),
      },
    }));

    const response = await ai.models.generateContent({
      model: MODEL,
      contents: [
        {
          role: "user",
          parts: [
            { text: "Extract all questions from these page images as specified in the system instructions." },
            ...imageParts,
          ],
        },
      ],
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
      },
    });
    return response.text ?? "";
  });
}
