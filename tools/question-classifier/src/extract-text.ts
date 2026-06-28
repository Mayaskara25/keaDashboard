import pdfParse from "pdf-parse";
import { readFileSync } from "fs";

type PageItem = { str: string; transform: number[] };
type TextContent = { items: PageItem[] };
type PageData = { getTextContent: () => Promise<TextContent> };

export async function extractTextPages(pdfPath: string): Promise<string[]> {
  const buffer = readFileSync(pdfPath);
  const pages: string[] = [];

  await pdfParse(buffer, {
    pagerender: (pageData: PageData) => {
      return pageData.getTextContent().then((content) => {
        let lastY: number | undefined;
        let text = "";
        for (const item of content.items) {
          const y = item.transform[5];
          if (lastY === undefined || lastY === y) {
            text += item.str;
          } else {
            text += "\n" + item.str;
          }
          lastY = y;
        }
        pages.push(text);
        return text;
      });
    },
  });

  return pages;
}
