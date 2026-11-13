import type { MatchResult } from '../data/types.ts';
import { parseWhole } from './form.ts';

/**
 * The score form of the admin page: the final score and, optionally, the points of every period
 * (four quarters, then any overtimes), as typed.
 */

export interface ScoreForm {
  home: string;
  away: string;
  /** [home, away] per period; all empty when only the final score is known. */
  periods: [string, string][];
}

export const QUARTERS = 4;

/** Name of a period row: Q1–Q4, then OT1, OT2… */
export const periodName = (index: number): string => (index < QUARTERS ? `Q${index + 1}` : `OT${index - QUARTERS + 1}`);

/** The form filled with a result; four empty quarters when there is no result or it has no periods. */
export function scoreFormFrom(result: MatchResult | undefined): ScoreForm {
  const periods: [string, string][] = result?.periods?.map(([h, a]) => [String(h), String(a)]) ?? [];
  while (periods.length < QUARTERS) periods.push(['', '']);
  return { home: result ? String(result.home) : '', away: result ? String(result.away) : '', periods };
}

export interface ScoreReading {
  /** The result to save, when every check holds. */
  result?: MatchResult;
  errors: string[];
  /** Sum of the periods, when every period is filled with valid numbers. */
  sums?: [number, number];
}

/** Reads the form: the result when the numbers are valid and the periods add up to the final score. */
export function readScoreForm(form: ScoreForm): ScoreReading {
  const errors: string[] = [];
  const home = parseWhole(form.home);
  const away = parseWhole(form.away);
  if (home === undefined || away === undefined) errors.push('Final score: enter both scores as whole numbers, 0 or more');

  const cells = form.periods.flat();
  const blank = cells.every((c) => c.trim() === '');
  let periods: [number, number][] | undefined;
  let sums: [number, number] | undefined;
  if (!blank) {
    if (form.periods.length < QUARTERS) errors.push(`Periods: at least ${QUARTERS} quarters are needed`);
    const parsed = form.periods.map(([h, a]) => [parseWhole(h), parseWhole(a)] as const);
    const bad = parsed.findIndex(([h, a]) => h === undefined || a === undefined);
    if (bad >= 0) {
      errors.push(`Periods: fill every period with whole numbers, 0 or more, or leave them all empty (check ${periodName(bad)})`);
    } else {
      periods = parsed.map(([h, a]) => [h!, a!]);
      sums = [periods.reduce((s, [h]) => s + h, 0), periods.reduce((s, [, a]) => s + a, 0)];
      if (home !== undefined && away !== undefined && (sums[0] !== home || sums[1] !== away)) {
        errors.push(`Periods add up to ${sums[0]}–${sums[1]}, the final score is ${home}–${away}`);
      }
    }
  }

  if (errors.length > 0) return { errors, sums };
  const result: MatchResult = { home: home!, away: away! };
  if (periods) result.periods = periods;
  return { result, errors, sums };
}

/** Whether two results are the same score, periods included. */
export const sameResult = (a: MatchResult | undefined, b: MatchResult | undefined): boolean =>
  JSON.stringify(a ? [a.home, a.away, a.periods ?? null] : null) === JSON.stringify(b ? [b.home, b.away, b.periods ?? null] : null);
