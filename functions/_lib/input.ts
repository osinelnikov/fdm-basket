import type {
  PostponeInput,
  ReplaceStandingsInput,
  RescheduleInput,
  SetScoreInput,
  SetStatsInput,
  SetVideoInput,
} from '../../src/admin/commands.ts';
import type { BoxScore, MatchResult, Standings, VenueId } from '../../src/data/types.ts';

/**
 * Checks the shape of request bodies before any domain rule runs: field names, types, whole numbers,
 * array sizes. A field that is missing, unknown or of the wrong type rejects the whole request.
 * A parsed value is a fresh copy with its keys in the documented order, so whatever is written to the
 * data files never carries anything the request added.
 */

export class InputError extends Error {
  constructor(readonly problems: string[]) {
    super(problems.join('; '));
    this.name = 'InputError';
  }
}

type Parser<T> = (value: unknown, at: string, problems: string[]) => T;

const MAX_COMMENT = 2000;
const MAX_TEXT = 300;
/** Base64 cannot be longer than the request body. */
const MAX_BASE64 = 2 * 1024 * 1024;

const describeAt = (at: string) => at || 'body';

const integer: Parser<number> = (value, at, problems) => {
  if (typeof value !== 'number' || !Number.isSafeInteger(value)) problems.push(`${describeAt(at)}: expected a whole number`);
  return value as number;
};

const boolean: Parser<boolean> = (value, at, problems) => {
  if (typeof value !== 'boolean') problems.push(`${describeAt(at)}: expected true or false`);
  return value as boolean;
};

const string =
  (max: number, pattern?: RegExp, expected = 'text'): Parser<string> =>
  (value, at, problems) => {
    if (typeof value !== 'string') problems.push(`${describeAt(at)}: expected ${expected}`);
    else if (value.length > max) problems.push(`${describeAt(at)}: longer than ${max} characters`);
    else if (pattern && !pattern.test(value)) problems.push(`${describeAt(at)}: expected ${expected}`);
    return value as string;
  };

const arrayOf =
  <T>(item: Parser<T>, max: number, exact?: number): Parser<T[]> =>
  (value, at, problems) => {
    if (!Array.isArray(value)) {
      problems.push(`${describeAt(at)}: expected a list`);
      return [];
    }
    if (exact !== undefined && value.length !== exact) {
      problems.push(`${describeAt(at)}: expected ${exact} items`);
      return [];
    }
    if (value.length > max) {
      problems.push(`${describeAt(at)}: more than ${max} items`);
      return [];
    }
    return value.map((v, i) => item(v, `${at}[${i}]`, problems));
  };

type Fields = Record<string, Parser<unknown>>;

/** An object with exactly the required fields and any of the optional ones, copied in the listed order. */
function object<T>(required: Fields, optional: Fields = {}): Parser<T> {
  return (value, at, problems) => {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      problems.push(`${describeAt(at)}: expected an object`);
      return {} as T;
    }
    const record = value as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    const known = { ...required, ...optional };
    for (const key of Object.keys(record)) {
      if (!Object.hasOwn(known, key)) problems.push(`${describeAt(at)}: unknown field "${key.slice(0, 40)}"`);
    }
    for (const [key, parse] of Object.entries(known)) {
      const field = at ? `${at}.${key}` : key;
      if (!Object.hasOwn(record, key)) {
        if (Object.hasOwn(required, key)) problems.push(`${field}: missing`);
        continue;
      }
      out[key] = parse(record[key], field, problems);
    }
    return out as T;
  };
}

const game = integer;
const comment = string(MAX_COMMENT);
const date = string(10, /^\d{4}-\d{2}-\d{2}$/, 'a date YYYY-MM-DD');

const periods = arrayOf(arrayOf(integer, 2, 2), 10) as Parser<[number, number][]>;
const result = object<MatchResult>({ home: integer, away: integer }, { periods });

const shot = object({ made: integer, att: integer });
const statLine = object({
  min: string(10),
  pts: integer,
  fg2: shot,
  fg3: shot,
  fg: shot,
  ft: shot,
  oreb: integer,
  dreb: integer,
  reb: integer,
  pf: integer,
  fd: integer,
  stl: integer,
  tov: integer,
  ast: integer,
  blk: integer,
  blkAgainst: integer,
  eff: integer,
  plusMinus: integer,
});
const player = object({ no: string(5), name: string(80), starter: boolean, captain: boolean }, { stats: statLine });
const pointsAndRebounds = object({ pts: integer, reb: integer });
const teamBox = object({
  players: arrayOf(player, 30),
  team: object({}, { oreb: integer, dreb: integer, reb: integer, pf: integer, tov: integer }),
  totals: statLine,
  periods: arrayOf(statLine, 10),
  running: arrayOf(integer, 20),
  extras: object({
    pointsOffTurnovers: integer,
    fastBreak: integer,
    secondChance: integer,
    paint: integer,
    starters: pointsAndRebounds,
    bench: pointsAndRebounds,
  }),
});
export const boxScore = object<BoxScore>({
  game: integer,
  referees: arrayOf(string(80), 5),
  spectators: integer,
  home: teamBox,
  away: teamBox,
});

const standingRow = object({
  team: string(40),
  played: integer,
  won: integer,
  lost: integer,
  pointsFor: integer,
  pointsAgainst: integer,
  points: integer,
});
const standings = object<Standings>({ source: string(100), date, rows: arrayOf(standingRow, 20) });

const pdf: Parser<Uint8Array> = (value, at, problems) => {
  const before = problems.length;
  const text = string(MAX_BASE64, /^[A-Za-z0-9+/]*={0,2}$/, 'base64')(value, at, problems);
  if (problems.length > before) return new Uint8Array();
  let binary: string;
  try {
    if (text.length % 4 !== 0) throw new Error('length');
    binary = atob(text);
  } catch {
    problems.push(`${describeAt(at)}: expected base64`);
    return new Uint8Array();
  }
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
};

function parse<T>(parser: Parser<T>, body: unknown): T {
  const problems: string[] = [];
  const value = parser(body, '', problems);
  if (problems.length > 0) throw new InputError(problems.slice(0, 10));
  return value;
}

export const parseScore = (body: unknown) =>
  parse(object<SetScoreInput>({ game, result }, { removeBoxScore: boolean, comment }), body);

export const parseVideo = (body: unknown) => parse(object<SetVideoInput>({ game, video: string(MAX_TEXT) }, { comment }), body);

export const parseStats = (body: unknown) => parse(object<SetStatsInput>({ game, pdf }, { boxScore, comment }), body);

export const parseStandings = (body: unknown) => parse(object<ReplaceStandingsInput>({ standings }, { comment }), body);

export const parsePostpone = (body: unknown) =>
  parse(object<PostponeInput & { postponed: boolean }>({ game, postponed: boolean }, { comment }), body);

export const parseReschedule = (body: unknown) =>
  parse(
    object<RescheduleInput>({ game, date: string(10), time: string(5) }, { venue: string(20) as Parser<VenueId>, comment }),
    body,
  );
