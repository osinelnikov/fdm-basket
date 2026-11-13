import { MONTH_THEMES, TEAMS, VENUES } from '../data/fixtures.ts';
import { serializeMatches, serializeStandings } from '../data/serialize.ts';
import type { BoxScore, Match, MatchResult, Standings, TeamBox, VenueId } from '../data/types.ts';
import { validateBoxScore, validateMatches, validateStandings, type DataContext } from '../data/validate.ts';
import type { ChangeSet, Snapshot } from './datastore.ts';

/**
 * The owner's actions on the published data. Every command is a pure function of the loaded snapshot:
 * it checks the whole resulting state and either describes the changes, reports that nothing changes,
 * or rejects the request. Storage and transport are not its concern.
 */

export type CommandResult =
  | { kind: 'changed'; changes: ChangeSet; message: string }
  | { kind: 'unchanged' }
  | { kind: 'rejected'; status: 404 | 422; violations: string[] };

interface Common {
  /** Free text added to the commit message. */
  comment?: string;
}

/** Cloudflare Pages accepts files up to 25 MiB. */
export const MAX_STATS_PDF_BYTES = 25 * 1024 * 1024;

const unchanged: CommandResult = { kind: 'unchanged' };
const rejected = (status: 404 | 422, ...violations: string[]): CommandResult => ({ kind: 'rejected', status, violations });
const unknownGame = (game: number) => rejected(404, `game ${game}: no such game`);

const withComment = (message: string, comment?: string) => {
  const text = comment?.trim();
  return text ? `${message}\n\n${text}` : message;
};

const statsPath = (game: number) => `/stats/${game}.pdf`;

const sameMatches = (a: readonly Match[], b: readonly Match[]) => serializeMatches(a) === serializeMatches(b);

function context(snapshot: Snapshot, today: string, pdfGames: number[] = []): DataContext {
  const published = new Set([...snapshot.statsPaths, ...pdfGames.map(statsPath)]);
  return { today, teams: TEAMS, venues: VENUES, monthThemes: MONTH_THEMES, statsExists: (path) => published.has(path) };
}

/** The list with the match of that game replaced; the snapshot's objects are never touched. */
const withMatch = (matches: readonly Match[], updated: Match): Match[] => matches.map((m) => (m.game === updated.game ? updated : m));

/**
 * Checks the resulting schedule and the box scores that remain after the changes,
 * and describes the changes when everything holds.
 */
function conclude(snapshot: Snapshot, today: string, matches: Match[], changes: ChangeSet, message: string, comment?: string): CommandResult {
  const pdfGames = (changes.putStatsPdfs ?? []).map((p) => p.game);
  const violations = validateMatches(matches, context(snapshot, today, pdfGames));
  // A changed result of a game the table already counts must still agree with the table.
  violations.push(...validateStandings(snapshot.standings, matches, TEAMS));

  const boxScores = new Map<number, BoxScore>(Object.entries(snapshot.boxScores).map(([game, box]) => [Number(game), box]));
  for (const game of changes.removeBoxScores ?? []) boxScores.delete(game);
  for (const box of changes.putBoxScores ?? []) boxScores.set(box.game, box);
  for (const box of boxScores.values()) {
    violations.push(...validateBoxScore(box, matches.find((m) => m.game === box.game)));
  }

  if (violations.length > 0) return rejected(422, ...violations);
  return { kind: 'changed', changes: { matches, ...changes }, message: withComment(message, comment) };
}

/** Whether a finished game's result contradicts the box score read from its statistics. */
function contradicts(box: BoxScore, result: MatchResult): boolean {
  if (box.home.totals.pts !== result.home || box.away.totals.pts !== result.away) return true;
  if (!result.periods) return false;
  const periods = (team: TeamBox) => team.periods.map((p) => p.pts).join(',');
  return periods(box.home) !== result.periods.map(([h]) => h).join(',') || periods(box.away) !== result.periods.map(([, a]) => a).join(',');
}

export interface SetScoreInput extends Common {
  game: number;
  result: MatchResult;
  /** Allows a score that contradicts the existing box score by dropping the box score. */
  removeBoxScore?: boolean;
}

/** Adds or corrects the final score of a game that has been played. */
export function setScore(snapshot: Snapshot, input: SetScoreInput, today: string): CommandResult {
  const match = snapshot.matches.find((m) => m.game === input.game);
  if (!match) return unknownGame(input.game);
  if (match.postponed) return rejected(422, `game ${match.game}: is postponed, it has no score`);
  if (match.date > today) return rejected(422, `game ${match.game}: is dated ${match.date}, after today (${today}), it has no score yet`);

  const { home, away, periods } = input.result;
  const result: MatchResult = { home, away };
  if (periods) result.periods = periods.map(([h, a]) => [h, a]);

  const box = snapshot.boxScores[match.game];
  const dropBox = box !== undefined && contradicts(box, result);
  if (dropBox && input.removeBoxScore !== true) {
    return rejected(
      422,
      `game ${match.game}: score ${home}–${away} differs from the box score (${box.home.totals.pts}–${box.away.totals.pts}); confirm to remove the box score`,
    );
  }

  const matches = withMatch(snapshot.matches, { ...match, result });
  if (sameMatches(matches, snapshot.matches)) return unchanged;
  const changes: ChangeSet = dropBox ? { removeBoxScores: [match.game] } : {};
  return conclude(snapshot, today, matches, changes, `admin: ${match.game} score ${home}-${away}`, input.comment);
}

const YOUTUBE_HOSTS = ['www.youtube.com', 'youtube.com', 'm.youtube.com', 'youtu.be'];

/** Trims the link and drops the `si` tracking parameter of YouTube links; anything else is left as typed. */
export function normalizeVideo(video: string): string {
  const text = video.trim();
  let url: URL;
  try {
    url = new URL(text);
  } catch {
    return text;
  }
  if (!YOUTUBE_HOSTS.includes(url.hostname) || !url.searchParams.has('si')) return text;
  url.searchParams.delete('si');
  return url.toString();
}

export interface SetVideoInput extends Common {
  game: number;
  video: string;
}

/** Adds or replaces the YouTube recording of a game. */
export function setVideo(snapshot: Snapshot, input: SetVideoInput, today: string): CommandResult {
  const match = snapshot.matches.find((m) => m.game === input.game);
  if (!match) return unknownGame(input.game);

  const video = normalizeVideo(input.video);
  if (match.video === video) return unchanged;
  const matches = withMatch(snapshot.matches, { ...match, video });
  return conclude(snapshot, today, matches, {}, `admin: ${match.game} video`, input.comment);
}

export interface SetStatsInput extends Common {
  game: number;
  pdf: Uint8Array;
  /** Read from the PDF; absent when the PDF could not be read. */
  boxScore?: BoxScore;
}

const PDF_MAGIC = [0x25, 0x50, 0x44, 0x46, 0x2d]; // %PDF-

/** Publishes the statistics PDF of a game, with the box score read from it when there is one. */
export function setStats(snapshot: Snapshot, input: SetStatsInput, today: string): CommandResult {
  const match = snapshot.matches.find((m) => m.game === input.game);
  if (!match) return unknownGame(input.game);

  const { pdf, boxScore } = input;
  if (!PDF_MAGIC.every((byte, i) => pdf[i] === byte)) return rejected(422, `game ${match.game}: the file is not a PDF`);
  if (pdf.byteLength > MAX_STATS_PDF_BYTES) {
    return rejected(422, `game ${match.game}: the PDF is ${pdf.byteLength} bytes, more than the ${MAX_STATS_PDF_BYTES} allowed`);
  }
  if (boxScore && boxScore.game !== match.game) {
    return rejected(422, `game ${match.game}: the box score is for game ${boxScore.game}`);
  }

  const matches = withMatch(snapshot.matches, { ...match, stats: statsPath(match.game) });
  // A box score must always come from the published PDF, so one that stays behind an unreadable PDF goes.
  const changes: ChangeSet = { putStatsPdfs: [{ game: match.game, content: pdf }] };
  if (boxScore) changes.putBoxScores = [boxScore];
  else if (snapshot.boxScores[match.game]) changes.removeBoxScores = [match.game];
  return conclude(snapshot, today, matches, changes, `admin: ${match.game} statistics${boxScore ? ' and box score' : ''}`, input.comment);
}

export interface ReplaceStandingsInput extends Common {
  standings: Standings;
}

/** Replaces the league table with a newer one. */
export function replaceStandings(snapshot: Snapshot, input: ReplaceStandingsInput, today: string): CommandResult {
  const { standings } = input;
  if (serializeStandings(standings) === serializeStandings(snapshot.standings)) return unchanged;

  const violations = validateStandings(standings, snapshot.matches, TEAMS);
  if (standings.date < snapshot.standings.date) {
    violations.unshift(`table: dated ${standings.date}, older than the current table (${snapshot.standings.date})`);
  }
  // A bulletin is published on its date, so a later date is a typing mistake that would block every newer table.
  if (standings.date > today) violations.unshift(`table: dated ${standings.date}, after today (${today})`);
  if (violations.length > 0) return rejected(422, ...violations);
  return { kind: 'changed', changes: { standings }, message: withComment(`admin: standings ${standings.source}`, input.comment) };
}

export interface PostponeInput extends Common {
  game: number;
}

/** Calls off a game that has not been played yet; its date stays until a new one is fixed. */
export function postpone(snapshot: Snapshot, input: PostponeInput, today: string): CommandResult {
  const match = snapshot.matches.find((m) => m.game === input.game);
  if (!match) return unknownGame(input.game);
  if (match.result) return rejected(422, `game ${match.game}: has been played, it cannot be postponed`);
  if (match.postponed) return unchanged;
  if (match.date < today) return rejected(422, `game ${match.game}: is dated ${match.date}, before today (${today}), it has no result and cannot be postponed`);

  const matches = withMatch(snapshot.matches, { ...match, postponed: true });
  return conclude(snapshot, today, matches, {}, `admin: ${match.game} postponed`, input.comment);
}

/** Takes the postponed mark off a game that will be played as scheduled after all. */
export function unpostpone(snapshot: Snapshot, input: PostponeInput, today: string): CommandResult {
  const match = snapshot.matches.find((m) => m.game === input.game);
  if (!match) return unknownGame(input.game);
  if (!match.postponed) return unchanged;

  const restored = { ...match };
  delete restored.postponed;
  const matches = withMatch(snapshot.matches, restored);
  return conclude(snapshot, today, matches, {}, `admin: ${match.game} no longer postponed`, input.comment);
}

export interface RescheduleInput extends Common {
  game: number;
  /** YYYY-MM-DD */
  date: string;
  /** HH:MM */
  time: string;
  /** Keeps the current venue when absent. */
  venue?: VenueId;
}

function isCalendarDate(text: string): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
  if (!m) return false;
  return new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]))).toISOString().slice(0, 10) === text;
}

/** Gives a postponed game its new date, time and, if it moves, venue. */
export function reschedule(snapshot: Snapshot, input: RescheduleInput, today: string): CommandResult {
  const match = snapshot.matches.find((m) => m.game === input.game);
  if (!match) return unknownGame(input.game);
  if (!match.postponed) return rejected(422, `game ${match.game}: is not postponed, only a postponed game can be rescheduled`);

  const violations: string[] = [];
  if (!isCalendarDate(input.date)) violations.push(`game ${match.game}: "${input.date}" is not a date in the form YYYY-MM-DD`);
  else if (input.date < today) violations.push(`game ${match.game}: new date ${input.date} is before today (${today})`);
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(input.time)) violations.push(`game ${match.game}: "${input.time}" is not a time in the form HH:MM`);
  const venue = input.venue ?? match.venue;
  if (!Object.hasOwn(VENUES, venue)) violations.push(`game ${match.game}: unknown venue "${venue}"`);
  if (violations.length > 0) return rejected(422, ...violations);

  const moved: Match = { ...match, date: input.date, time: input.time, venue, revision: (match.revision ?? 0) + 1 };
  delete moved.postponed;
  // Array.sort is stable, so games starting together keep their order.
  const matches = withMatch(snapshot.matches, moved).sort((a, b) => {
    const x = a.date + a.time;
    const y = b.date + b.time;
    return x < y ? -1 : x > y ? 1 : 0;
  });
  return conclude(snapshot, today, matches, {}, `admin: ${match.game} rescheduled to ${input.date} ${input.time}`, input.comment);
}
