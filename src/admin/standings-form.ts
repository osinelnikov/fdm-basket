import { TEAMS } from '../data/fixtures.ts';
import type { StandingRow, Standings, TeamId } from '../data/types.ts';
import { isCalendarDate, parseSigned, parseWhole } from './form.ts';

/**
 * The league table form of the admin page: eight rows copied from the UISP bulletin, in bulletin order,
 * plus the bulletin number and date. The form holds the text as typed; reading it gives either the new
 * table or the list of problems, each tied to the cell it concerns.
 */

/** One table row as typed. `diff` (DC) is only a control against CF − CS and is not stored. */
export interface StandingsFormRow {
  team: string;
  played: string;
  won: string;
  lost: string;
  pointsFor: string;
  pointsAgainst: string;
  diff: string;
  points: string;
}

export type RowField = keyof StandingsFormRow;
export type NumberField = Exclude<RowField, 'team'>;

export interface StandingsForm {
  /** Bulletin number, e.g. "05" or "CU 05". */
  number: string;
  /** Bulletin date, YYYY-MM-DD. */
  date: string;
  rows: StandingsFormRow[];
}

export interface FormError {
  message: string;
  /** Row index, from 0, when the problem concerns one cell. */
  row?: number;
  field?: RowField | 'number' | 'date';
}

/** Columns in bulletin order, with their bulletin abbreviation. */
export const NUMBER_FIELDS: { key: NumberField; label: string; title: string }[] = [
  { key: 'played', label: 'PG', title: 'Games played' },
  { key: 'won', label: 'PV', title: 'Games won' },
  { key: 'lost', label: 'PP', title: 'Games lost' },
  { key: 'pointsFor', label: 'CF', title: 'Points scored' },
  { key: 'pointsAgainst', label: 'CS', title: 'Points conceded' },
  { key: 'diff', label: 'DC', title: 'Point difference (check only, not stored)' },
  { key: 'points', label: 'Punti', title: 'League points' },
];

export const TABLE_SIZE = Object.keys(TEAMS).length;

const label = (field: NumberField) => NUMBER_FIELDS.find((f) => f.key === field)!.label;
const pad2 = (n: number) => String(n).padStart(2, '0');

/** The source line shown on the site, e.g. "CU 05 · 06/11/2026". */
export function formatSource(number: number, date: string): string {
  const [y, m, d] = date.split('-');
  return `CU ${pad2(number)} · ${d}/${m}/${y}`;
}

/** The bulletin number as typed ("5", "05", "CU 05"); undefined when it is not a number from 1 to 999. */
export function parseBulletinNumber(text: string): number | undefined {
  const digits = text.trim().replace(/^CU\s*/i, '');
  if (!/^\d{1,3}$/.test(digits)) return undefined;
  const n = Number(digits);
  return n > 0 ? n : undefined;
}

/** The form filled with a table, DC computed from CF and CS. */
export function formFromStandings(standings: Standings): StandingsForm {
  const number = /^CU\s*(\d+)/i.exec(standings.source)?.[1] ?? '';
  return {
    number,
    date: standings.date,
    rows: standings.rows.map((r) => ({
      team: r.team,
      played: String(r.played),
      won: String(r.won),
      lost: String(r.lost),
      pointsFor: String(r.pointsFor),
      pointsAgainst: String(r.pointsAgainst),
      diff: String(r.pointsFor - r.pointsAgainst),
      points: String(r.points),
    })),
  };
}

/** The rows with one row moved up (delta -1) or down (+1); unchanged when the move would leave the table. */
export function moveRow<T>(rows: readonly T[], index: number, delta: -1 | 1): T[] {
  const target = index + delta;
  const out = [...rows];
  if (index < 0 || index >= rows.length || target < 0 || target >= rows.length) return out;
  [out[index], out[target]] = [out[target], out[index]];
  return out;
}

/** Reads the form: the new table when every check holds, otherwise the problems found. */
export function readStandingsForm(form: StandingsForm): { standings?: Standings; errors: FormError[] } {
  const errors: FormError[] = [];

  const number = parseBulletinNumber(form.number);
  if (number === undefined) errors.push({ field: 'number', message: 'Bulletin number: enter the CU number, e.g. 05' });
  const date = form.date.trim();
  if (!isCalendarDate(date)) errors.push({ field: 'date', message: 'Bulletin date: enter a valid date' });

  if (form.rows.length !== TABLE_SIZE) errors.push({ message: `The table must have ${TABLE_SIZE} rows, it has ${form.rows.length}` });

  const known = new Set(Object.keys(TEAMS));
  const counts = new Map<string, number>();
  for (const r of form.rows) counts.set(r.team, (counts.get(r.team) ?? 0) + 1);

  const rows: StandingRow[] = [];
  form.rows.forEach((r, row) => {
    const at = `Row ${row + 1}${r.team ? ` (${r.team})` : ''}`;
    if (!r.team) errors.push({ row, field: 'team', message: `${at}: choose a team` });
    else if (!known.has(r.team)) errors.push({ row, field: 'team', message: `${at}: unknown team` });
    else if ((counts.get(r.team) ?? 0) > 1) errors.push({ row, field: 'team', message: `${at}: the team is listed more than once` });

    const values = {} as Record<NumberField, number | undefined>;
    for (const { key } of NUMBER_FIELDS) {
      const value = key === 'diff' ? parseSigned(r[key]) : parseWhole(r[key]);
      values[key] = value;
      if (value === undefined) {
        const expected = key === 'diff' ? 'a whole number, may be negative' : 'a whole number, 0 or more';
        errors.push({ row, field: key, message: `${at}: ${label(key)} must be ${expected}` });
      }
    }
    const { played, won, lost, pointsFor, pointsAgainst, diff, points } = values;
    if (played !== undefined && won !== undefined && lost !== undefined && won + lost !== played) {
      errors.push({ row, field: 'played', message: `${at}: PV ${won} + PP ${lost} is not PG ${played}` });
    }
    if (won !== undefined && points !== undefined && points !== 2 * won) {
      errors.push({ row, field: 'points', message: `${at}: Punti ${points} for ${won} wins, expected ${2 * won}` });
    }
    if (pointsFor !== undefined && pointsAgainst !== undefined && diff !== undefined && diff !== pointsFor - pointsAgainst) {
      errors.push({ row, field: 'diff', message: `${at}: DC ${diff} is not CF ${pointsFor} − CS ${pointsAgainst} = ${pointsFor - pointsAgainst}` });
    }
    rows.push({
      team: r.team as TeamId,
      played: played ?? 0,
      won: won ?? 0,
      lost: lost ?? 0,
      pointsFor: pointsFor ?? 0,
      pointsAgainst: pointsAgainst ?? 0,
      points: points ?? 0,
    });
  });

  const missing = [...known].filter((team) => !counts.has(team));
  if (form.rows.length === TABLE_SIZE && missing.length > 0) errors.push({ message: `Missing from the table: ${missing.join(', ')}` });

  if (errors.length > 0 || number === undefined) return { errors };
  return { standings: { source: formatSource(number, date), date, rows }, errors };
}

export interface StandingsChanges {
  /** Changed cells as "row:field", by position in bulletin order. */
  cells: Set<string>;
  source: boolean;
  date: boolean;
  /** Whether anything at all changes. */
  any: boolean;
}

const STORED: (keyof StandingRow)[] = ['team', 'played', 'won', 'lost', 'pointsFor', 'pointsAgainst', 'points'];

/** Cells of the new table that differ from the current one at the same position. */
export function standingsChanges(current: Standings, next: Standings): StandingsChanges {
  const cells = new Set<string>();
  next.rows.forEach((row, i) => {
    const before = current.rows[i];
    for (const key of STORED) if (!before || before[key] !== row[key]) cells.add(`${i}:${key}`);
  });
  const source = current.source !== next.source;
  const date = current.date !== next.date;
  return { cells, source, date, any: cells.size > 0 || source || date || current.rows.length !== next.rows.length };
}
