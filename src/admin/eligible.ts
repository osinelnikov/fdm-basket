import type { Match } from '../data/types.ts';

/**
 * Which games each admin action may be applied to, as offered by the game pickers.
 * `today` is the date in Europe/Rome reported by the admin API, YYYY-MM-DD.
 */

const startOf = (m: Match) => m.date + m.time;

/** Latest tip-off first. */
const newestFirst = (matches: readonly Match[]): Match[] => [...matches].sort((a, b) => (startOf(a) < startOf(b) ? 1 : startOf(a) > startOf(b) ? -1 : 0));

/** Games whose final score can be entered or corrected: dated today or earlier and not postponed; latest first. */
export const scoreGames = (matches: readonly Match[], today: string): Match[] => newestFirst(matches.filter((m) => !m.postponed && m.date <= today));

/** Games that can get a video or statistics: those with a result; latest first. */
export const mediaGames = (matches: readonly Match[]): Match[] => newestFirst(matches.filter((m) => m.result !== undefined));

/** Games that can still be called off: no result, dated today or later, not postponed already; soonest first. */
export const postponableGames = (matches: readonly Match[], today: string): Match[] =>
  matches.filter((m) => !m.result && !m.postponed && m.date >= today);

/** Postponed games, waiting for a new date or for the mark to be removed; in schedule order. */
export const postponedGames = (matches: readonly Match[]): Match[] => matches.filter((m) => m.postponed === true);

/** The latest game that has a result. */
export const lastResult = (matches: readonly Match[]): Match | undefined => mediaGames(matches)[0];

/** The game the score picker opens on: the latest one still without a score, otherwise the latest one. */
export const defaultScoreGame = (games: readonly Match[]): Match | undefined => games.find((m) => !m.result) ?? games[0];
