import { readFileSync } from 'node:fs';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { describe, expect, it } from 'vitest';
import { parseBoxScore } from '../src/boxscore/parse.ts';
import type { BoxScore } from '../src/data/types.ts';
import { int } from '../src/pdf/table.ts';
import { readTextItems } from '../src/pdf/text.ts';
import { BOX_SCORES, PDF_GAME, PDF_URL } from './fixtures/data.ts';

// pdf.js 6 needs Node 22 (Promise.withResolvers); the site build runs on the version in .node-version.
const PDFJS_RUNS = typeof (Promise as { withResolvers?: unknown }).withResolvers === 'function';

async function parsePdf(file: string | URL): Promise<BoxScore> {
  const data = new Uint8Array(readFileSync(file));
  const doc = await getDocument({ data, verbosity: 0 }).promise;
  return parseBoxScore(await readTextItems(doc));
}

describe('box score parsed from the statistics PDF', () => {
  it.skipIf(!PDFJS_RUNS)('reads the PDF snapshot of the parser into its box score snapshot (needs Node 22)', async () => {
    expect(await parsePdf(PDF_URL)).toEqual(BOX_SCORES[PDF_GAME]);
  });

  // Live PDFs are not compared with their box scores: the admin area saves a box score with its PDF,
  // and the data checks hold it to the game's result and to its own totals instead.

  it('rejects a report that is not two pages', () => {
    const page = [{ str: 'N. Gara: 1', x: 10, y: 10, w: 40 }];
    expect(() => parseBoxScore([page])).toThrow('expected 2 pages (home, away), found 1');
  });

  // A box score is stored as JSON, which has no negative zero; the parsed one must equal it.
  it('reads "-0" as zero, not negative zero', () => {
    expect(Object.is(int('-0', 'plus-minus'), 0)).toBe(true);
    expect(int('-7', 'plus-minus')).toBe(-7);
  });
});
