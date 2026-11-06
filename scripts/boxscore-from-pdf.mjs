// Converts the statistics PDFs of the scoring program ("Tabellino dettagliato", one page per team,
// home first) into src/data/boxscores/<game>.json.
//
// Usage: node scripts/boxscore-from-pdf.mjs <file.pdf> [more.pdf...]   (Node >= 22.13, needs pdfjs-dist)
//
// The tables have empty cells, so a cell is assigned to its column by the x position of the text item
// relative to the column headers of the same page, never by counting tokens. Anything unexpected
// (missing header, unknown row label, text outside every column, malformed cell, page count) fails the
// file with a message and nothing is written for it.

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';

const OUT_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '../src/data/boxscores');

// The statistics table ends where the side panel (ratios, rebound shares, Quintetti/Panchina, extras) starts.
const PANEL_GAP = 20;
// Row label zone ends this far left of the centre of the "Min." column.
const LABEL_GAP = 17;
// Slack for the outer columns and for an item's edges beyond its column cell.
const EDGE_WIDTH = 14;
const EDGE_SLACK = 3;
const ROW_TOLERANCE = 1.5;

// Table columns in print order: key, header token, index among repeated header tokens.
const COLUMNS = [
  ['min', 'Min.'], ['pts', 'PTI'],
  ['fg2', 'R/T', 0], ['fg2Pct', '%', 0], ['sch', 'Sch'],
  ['fg3', 'R/T', 1], ['fg3Pct', '%', 1],
  ['fg', 'R/T', 2], ['fgPct', '%', 2],
  ['ft', 'R/T', 3], ['ftPct', '%', 3],
  ['oreb', 'RO'], ['dreb', 'RD'], ['reb', 'RT'],
  ['pf', 'F'], ['fd', 'Ag'], ['stl', 'PR'], ['tov', 'PP'], ['ast', 'AS'],
  ['blk', 'SD'], ['blkAgainst', 'SS'],
  ['eff', 'Val.'], ['oer', 'OER'], ['pm', 'P/M'], ['plusMinus', '+/-'],
];
const TEAM_ROW_FIELDS = ['oreb', 'dreb', 'reb', 'pf', 'tov'];
const EXTRAS = [
  ['pointsOffTurnovers', 'Punti da Palle Perse'],
  ['fastBreak', 'Punti in contropiede'],
  ['secondChance', 'Punti da secondi tiri'],
  ['paint', 'Punti in Area'],
];

function fail(message) {
  throw new Error(message);
}

function int(text, what) {
  if (!/^-?\d+$/.test(text)) fail(`${what}: "${text}" is not an integer`);
  return Number(text);
}

function shots(text, what) {
  const m = /^(\d+)\/(\d+)$/.exec(text);
  if (!m) fail(`${what}: "${text}" is not made/attempted`);
  return { made: Number(m[1]), att: Number(m[2]) };
}

function decimal(text, what, digits) {
  if (!new RegExp(`^-?\\d+,\\d{${digits}}$`).test(text)) fail(`${what}: "${text}" is not a decimal with ${digits} digit(s)`);
}

/** Text items of one page without blanks: { str, x, y, w }. */
async function readPages(file) {
  const doc = await getDocument({ data: new Uint8Array(readFileSync(file)), verbosity: 0 }).promise;
  if (doc.numPages !== 2) fail(`expected 2 pages (home, away), found ${doc.numPages}`);
  const pages = [];
  for (let p = 1; p <= doc.numPages; p++) {
    const content = await (await doc.getPage(p)).getTextContent();
    pages.push(
      content.items
        .filter((i) => i.str.trim() !== '')
        .map((i) => ({ str: i.str.trim(), x: i.transform[4], y: i.transform[5], w: i.width })),
    );
  }
  return pages;
}

/** Items grouped into rows by y, top to bottom, each row left to right. */
function rowsOf(items) {
  const rows = [];
  for (const item of [...items].sort((a, b) => b.y - a.y)) {
    const row = rows[rows.length - 1];
    if (row && Math.abs(row.y - item.y) <= ROW_TOLERANCE) row.items.push(item);
    else rows.push({ y: item.y, items: [item] });
  }
  for (const row of rows) row.items.sort((a, b) => a.x - b.x);
  return rows;
}

/** Column centres of the statistics table, taken from the header of this very page. */
function readColumns(table) {
  const sub = table.find((i) => i.str === 'R/T');
  if (!sub) fail('header column "R/T" not found');
  const tokens = [];
  for (const item of table.filter((i) => i.y >= sub.y - 1 && i.y <= sub.y + 7)) {
    for (const m of item.str.matchAll(/\S+/g)) {
      tokens.push({ str: m[0], center: item.x + item.w * ((m.index + m[0].length / 2) / item.str.length) });
    }
  }
  const columns = COLUMNS.map(([key, token, nth = 0]) => {
    const found = tokens.filter((t) => t.str === token).sort((a, b) => a.center - b.center);
    const expected = token === 'R/T' || token === '%' ? 4 : 1;
    if (found.length !== expected) fail(`header column "${token}": expected ${expected}, found ${found.length}`);
    return { key, center: found[nth].center };
  });
  for (let i = 1; i < columns.length; i++) {
    if (columns[i].center <= columns[i - 1].center) fail(`header column ${columns[i].key} is not right of ${columns[i - 1].key}`);
  }
  columns.forEach((c, i) => {
    c.lo = i === 0 ? c.center - EDGE_WIDTH : (columns[i - 1].center + c.center) / 2;
    c.hi = i === columns.length - 1 ? c.center + EDGE_WIDTH : (c.center + columns[i + 1].center) / 2;
  });
  return { columns, headerBottom: sub.y };
}

/** One table row: its label and its filled cells by column key. */
function splitRow(row, columns) {
  const minCenter = columns.find((c) => c.key === 'min').center;
  const labelItems = row.items.filter((i) => i.x + i.w / 2 < minCenter - LABEL_GAP);
  const label = labelItems.map((i) => i.str).join(' ').replace(/\s+/g, ' ');
  const cells = {};
  for (const item of row.items.filter((i) => !labelItems.includes(i))) {
    const center = item.x + item.w / 2;
    const column = columns.find((c) => center >= c.lo && center <= c.hi);
    if (!column) fail(`row "${label}": "${item.str}" at x=${item.x.toFixed(1)} falls into no column`);
    if (item.x < column.lo - EDGE_SLACK || item.x + item.w > column.hi + EDGE_SLACK) {
      fail(`row "${label}": "${item.str}" at x=${item.x.toFixed(1)} overlaps the neighbours of column ${column.key}`);
    }
    if (column.key in cells) fail(`row "${label}": column ${column.key} is filled twice`);
    cells[column.key] = item.str;
  }
  return { label, cells };
}

function statLine(cells, label) {
  for (const [key] of COLUMNS) if (!(key in cells)) fail(`row "${label}": column ${key} is empty`);
  if (!/^\d{1,3}:\d{2}$/.test(cells.min)) fail(`row "${label}": minutes "${cells.min}" are not mm:ss`);
  for (const key of ['fg2Pct', 'fg3Pct', 'fgPct', 'ftPct']) decimal(cells[key], `row "${label}" ${key}`, 1);
  for (const key of ['oer', 'pm']) decimal(cells[key], `row "${label}" ${key}`, 2);
  int(cells.sch, `row "${label}" sch`);
  const n = (key) => int(cells[key], `row "${label}" ${key}`);
  const s = (key) => shots(cells[key], `row "${label}" ${key}`);
  return {
    min: cells.min,
    pts: n('pts'),
    fg2: s('fg2'),
    fg3: s('fg3'),
    fg: s('fg'),
    ft: s('ft'),
    oreb: n('oreb'),
    dreb: n('dreb'),
    reb: n('reb'),
    pf: n('pf'),
    fd: n('fd'),
    stl: n('stl'),
    tov: n('tov'),
    ast: n('ast'),
    blk: n('blk'),
    blkAgainst: n('blkAgainst'),
    eff: n('eff'),
    plusMinus: n('plusMinus'),
  };
}

function parseTable(table) {
  const { columns, headerBottom } = readColumns(table);
  const body = rowsOf(table.filter((i) => i.y < headerBottom - 2));
  const players = [];
  const periods = [];
  let team;
  let totals;
  for (const row of body) {
    const { label, cells } = splitRow(row, columns);
    const player = /^(\*)?(\d+) (.+)$/.exec(label);
    if (player) {
      const captain = / \(C\)$/.test(player[3]);
      const name = player[3].replace(/ \(C\)$/, '');
      if (!/^\p{L} \S/u.test(name)) fail(`player "${label}": name is not "initial surname"`);
      const entry = { no: player[2], name, starter: player[1] === '*', captain };
      if (cells.min === 'N.E.') {
        if (Object.keys(cells).length !== 1) fail(`player "${label}": N.E. with other cells filled`);
      } else {
        entry.stats = statLine(cells, label);
      }
      players.push(entry);
    } else if (label === 'Squadra/Allenatore') {
      if (team) fail('row "Squadra/Allenatore" appears twice');
      team = {};
      for (const key of Object.keys(cells)) {
        if (!TEAM_ROW_FIELDS.includes(key)) fail(`row "Squadra/Allenatore": unexpected column ${key}`);
      }
      for (const key of TEAM_ROW_FIELDS) if (key in cells) team[key] = int(cells[key], `row "Squadra/Allenatore" ${key}`);
    } else if (label === 'Totali') {
      if (totals) fail('row "Totali" appears twice');
      totals = statLine(cells, label);
    } else if (/^Periodo \d+$/.test(label)) {
      if (label !== `Periodo ${periods.length + 1}`) fail(`row "${label}" out of order`);
      periods.push(statLine(cells, label));
    } else {
      fail(`unknown row label "${label}"`);
    }
  }
  if (players.length === 0) fail('no player rows');
  if (!team) fail('row "Squadra/Allenatore" not found');
  if (!totals) fail('row "Totali" not found');
  if (periods.length === 0) fail('no "Periodo" rows');
  return { players, team, totals, periods };
}

/** The first row under `label` that consists of exactly six numbers: PTI, PTI %, Tiri %, Rim, Rim %, Min. %. */
function lineupShare(rows, label) {
  const at = rows.findIndex((r) => r.items.length === 1 && r.items[0].str === label);
  if (at < 0) fail(`side panel "${label}" not found`);
  for (const row of rows.slice(at + 1)) {
    if (row.items.length === 6 && row.items.every((i) => /^\d+$/.test(i.str))) {
      return { pts: Number(row.items[0].str), reb: Number(row.items[3].str) };
    }
    if (row.items.length === 1 && /^[A-Za-z]/.test(row.items[0].str) && row.items[0].str !== 'Panchina') break;
  }
  fail(`side panel "${label}": numbers not found`);
}

function parsePanel(panel) {
  const rows = rowsOf(panel);
  const extras = {};
  for (const [key, label] of EXTRAS) {
    const row = rows.find((r) => r.items.some((i) => i.str === label));
    const value = row && row.items.find((i) => i.str !== label);
    if (!value) fail(`side panel "${label}" not found`);
    extras[key] = int(value.str, `side panel "${label}"`);
  }
  return { ...extras, starters: lineupShare(rows, 'Quintetti'), bench: lineupShare(rows, 'Panchina') };
}

function singleText(items, pattern, what) {
  const found = items.map((i) => pattern.exec(i.str)).filter(Boolean);
  if (found.length !== 1) fail(`${what}: expected one match, found ${found.length}`);
  return found[0];
}

/** Game data repeated on both pages: number, spectators, score, quarters, referees, running score. */
function parseHeader(items) {
  const game = Number(singleText(items, /^N\. Gara:\s*(\d+)$/, 'game number')[1]);
  const spectators = Number(singleText(items, /^Spettatori:\s*(\d+)$/, 'spectators')[1]);
  const quarters = singleText(items, /^\((\d+-\d+(?:, \d+-\d+)*)\)$/, 'quarter scores')[1]
    .split(', ')
    .map((q) => q.split('-').map(Number));
  const rows = rowsOf(items);

  const scoreRow = rows.find((r) => r.items.some((i) => i.str === '–'));
  if (!scoreRow) fail('score line not found');
  const dash = scoreRow.items.findIndex((i) => i.str === '–');
  const score = [scoreRow.items[dash - 1], scoreRow.items[dash + 1]].map((i) => int(i && i.str, 'score line'));

  // Some reports print no referees at all; a printed line must still have the expected form.
  const refRow = rows.find((r) => r.items.some((i) => i.str.startsWith('Arbitro:')));
  const refs = refRow && /^Arbitro:\s*(.+?)(?:\s+Arbitri:\s*(.+))?$/.exec(refRow.items.map((i) => i.str).join(' '));
  if (refRow && !refs) fail('referees line is not "Arbitro: … [Arbitri: …]"');
  const referees = refs ? [refs[1], refs[2]].filter(Boolean) : [];

  const at = rows.findIndex((r) => r.items.some((i) => i.str === 'Punteggio a intervalli di 5 minuti'));
  if (at < 0 || !rows[at + 1]) fail('running score rows not found');
  const running = [rows[at], rows[at + 1]].map((row, n) => {
    const numbers = row.items.filter((i) => i.str !== 'Punteggio a intervalli di 5 minuti').slice(1);
    if (numbers.length < 8) fail(`running score row ${n + 1}: expected at least 8 values, found ${numbers.length}`);
    return numbers.map((i) => int(i.str, `running score row ${n + 1}`));
  });
  return { game, spectators, score, quarters, referees, running };
}

function parsePage(items) {
  const table = items.filter((i) => i.x < panelStart(items));
  return {
    header: parseHeader(items),
    box: parseTable(table),
    extras: parsePanel(items.filter((i) => i.x >= panelStart(items))),
  };
}

function panelStart(items) {
  const ratio = items.find((i) => i.str === 'AS/PP');
  if (!ratio) fail('side panel header "AS/PP" not found');
  return ratio.x - PANEL_GAP;
}

function teamBox(page, running) {
  const { players, team, totals, periods } = page.box;
  return { players, team, totals, periods, running, extras: page.extras };
}

async function convert(file) {
  const [homePage, awayPage] = (await readPages(file)).map(parsePage);
  if (JSON.stringify(homePage.header) !== JSON.stringify(awayPage.header)) fail('the two pages disagree on the game header');
  const { game, spectators, score, quarters, referees, running } = homePage.header;
  const home = teamBox(homePage, running[0]);
  const away = teamBox(awayPage, running[1]);
  if (home.totals.pts !== score[0] || away.totals.pts !== score[1]) {
    fail(`totals ${home.totals.pts}-${away.totals.pts} differ from the score line ${score[0]}-${score[1]}`);
  }
  for (const [side, team] of [['home', home], ['away', away]]) {
    const last = team.running[team.running.length - 1];
    if (last !== team.totals.pts) fail(`${side} running score ends at ${last} instead of the total ${team.totals.pts}`);
  }
  const printed = quarters.map(([h, a]) => `${h}-${a}`).join(' ');
  const summed = home.periods.map((p, i) => `${p.pts}-${away.periods[i] && away.periods[i].pts}`).join(' ');
  if (printed !== summed) fail(`period points ${summed} differ from the quarter line ${printed}`);
  return { game, referees, spectators, home, away };
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
