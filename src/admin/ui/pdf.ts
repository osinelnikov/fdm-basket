import { parseBoxScore } from '../../boxscore/parse.ts';
import type { BoxScore } from '../../data/types.ts';
import { readTextItems } from '../../pdf/text.ts';

/**
 * Reads the box score of a statistics PDF in the browser. pdf.js is loaded on first use only,
 * and its worker is served from the site itself.
 */
export async function readBoxScore(bytes: Uint8Array): Promise<BoxScore> {
  const pdfjs = await import('pdfjs-dist');
  pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).href;
  // pdf.js takes over the buffer it is given, so it gets a copy and the bytes stay ready for the upload.
  const task = pdfjs.getDocument({ data: bytes.slice(), verbosity: 0 });
  try {
    return parseBoxScore(await readTextItems(await task.promise));
  } finally {
    // Ends the worker of this document.
    void task.destroy();
  }
}
