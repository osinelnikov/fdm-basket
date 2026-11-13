import type { Match, StandingRow, Standings } from './types.ts';

// Canonical text of src/data/matches.json and src/data/standings.json: one entry per line, keys in
// the field order of the types, so that changing one entry changes exactly one line of the file.

const MATCH_KEYS = ['game', 'date', 'time', 'home', 'away', 'venue', 'sides', 'derby', 'revision', 'postponed', 'result', 'video', 'stats'] as const;
const RESULT_KEYS = ['home', 'away', 'periods'] as const;
const STANDING_ROW_KEYS = ['team', 'played', 'won', 'lost', 'pointsFor', 'pointsAgainst', 'points'] as const;

/** Copies the listed keys in that order, leaving out the ones that are undefined. */
function pick(source: object, keys: readonly string[]): Record<string, unknown> {
  const record = source as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const key of keys) if (record[key] !== undefined) out[key] = record[key];
  return out;
}

function matchLine(match: Match): string {
  const ordered = pick(match, MATCH_KEYS);
  if (match.result) ordered.result = pick(match.result, RESULT_KEYS);
  return JSON.stringify(ordered);
}

/** The text of matches.json: a JSON array with one match per line, in the given order. */
export function serializeMatches(matches: readonly Match[]): string {
  return `[\n${matches.map((m) => `  ${matchLine(m)}`).join(',\n')}\n]\n`;
}

const rowLine = (row: StandingRow): string => JSON.stringify(pick(row, STANDING_ROW_KEYS));

/** The text of standings.json: source and date, then one table row per line, in the given order. */
export function serializeStandings(standings: Standings): string {
  const rows = standings.rows.map((r) => `    ${rowLine(r)}`).join(',\n');
  return `{\n  "source": ${JSON.stringify(standings.source)},\n  "date": ${JSON.stringify(standings.date)},\n  "rows": [\n${rows}\n  ]\n}\n`;
}
