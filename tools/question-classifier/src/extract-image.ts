import { fromPath } from "pdf2pic";
import { existsSync, mkdirSync, rmdirSync } from "fs";
import path from "path";
import os from "os";

export async function extractImagePages(pdfPath: string): Promise<Buffer[]> {
  const tmpDir = path.join(os.tmpdir(), `kea-pdf-${Date.now()}`);
  if (!existsSync(tmpDir)) mkdirSync(tmpDir, { recursive: true });

  const convert = fromPath(pdfPath, {
    density: 300,
    saveFilename: "page",
    savePath: tmpDir,
    format: "png",
    width: 2480,
    height: 3508,
  });

  const results = await convert.bulk(-1, { responseType: "buffer" });

  // Clean up temp dir (buffer mode writes no files, but clean up anyway)
  try { rmdirSync(tmpDir); } catch {}

  return results
    .map((r) => (r as { buffer?: Buffer }).buffer)
    .filter((b): b is Buffer => Buffer.isBuffer(b));
}
