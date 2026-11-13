// Converts the statistics PDFs of the scoring program ("Tabellino dettagliato", one page per team,
// home first) into src/data/boxscores/<game>.json. The parsing lives in src/boxscore/parse.ts.
//
// Usage: node scripts/boxscore-from-pdf.mjs <file.pdf> [more.pdf...]   (Node >= 22.18, needs pdfjs-dist)
//
// Anything unexpected fails the file with a message and nothing is written for it.

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { parseBoxScore } from '../src/boxscore/parse.ts';
import { readTextItems } from '../src/pdf/text.ts';

const OUT_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '../src/data/boxscores');

async function convert(file) {
  const doc = await getDocument({ data: new Uint8Array(readFileSync(file)), verbosity: 0 }).promise;
  return parseBoxScore(await readTextItems(doc));
}

let failed = false;
const files = process.argv.slice(2);
if (files.length === 0) {
  console.error('usage: node scripts/boxscore-from-pdf.mjs <file.pdf> [more.pdf...]');
  process.exit(2);
}
for (const file of files) {
  try {
    const box = await convert(file);
    mkdirSync(OUT_DIR, { recursive: true });
    writeFileSync(resolve(OUT_DIR, `${box.game}.json`), JSON.stringify(box, null, 2) + '\n');
    console.log(`game ${box.game}: home ${box.home.totals.pts} (${box.home.totals.min}), away ${box.away.totals.pts} (${box.away.totals.min}) <- ${file}`);
  } catch (e) {
    failed = true;
    console.error(`${file}: ${e.message}`);
  }
}
process.exit(failed ? 1 : 0);
