import { describe, expect, it } from 'vitest';
import { MATCHES } from './fixtures/data.ts';
import { periodName, readScoreForm, sameResult, scoreFormFrom, type ScoreForm } from '../src/admin/score-form.ts';

const game300 = MATCHES.find((m) => m.game === 300)!;

describe('score form', () => {
  it('fills the form with the current score and reads it back unchanged', () => {
    const form = scoreFormFrom(game300.result);
    expect(form).toEqual({ home: '74', away: '31', periods: [['18', '8'], ['12', '7'], ['22', '12'], ['22', '4']] });
    const { result, errors } = readScoreForm(form);
    expect(errors).toEqual([]);
    expect(result).toEqual(game300.result);
    expect(sameResult(result, game300.result)).toBe(true);
  });

  it('starts a game without a score with four empty quarters', () => {
    expect(scoreFormFrom(undefined)).toEqual({ home: '', away: '', periods: [['', ''], ['', ''], ['', ''], ['', '']] });
  });

  it('accepts a final score alone when every period is empty', () => {
    const { result, errors, sums } = readScoreForm({ ...scoreFormFrom(undefined), home: '60', away: ' 58 ' });
    expect(errors).toEqual([]);
    expect(result).toEqual({ home: 60, away: 58 });
    expect(sums).toBeUndefined();
  });

  it('requires both final scores as whole numbers', () => {
    for (const [home, away] of [['', '58'], ['60', '-1'], ['6.5', '58'], ['x', 'y']]) {
      const { result, errors } = readScoreForm({ ...scoreFormFrom(undefined), home, away });
      expect(result).toBeUndefined();
      expect(errors[0]).toMatch(/^Final score:/);
    }
  });

  it('rejects periods that are filled only in part', () => {
    const form: ScoreForm = { home: '20', away: '10', periods: [['20', '10'], ['', ''], ['', ''], ['', '']] };
    const { result, errors } = readScoreForm(form);
    expect(result).toBeUndefined();
    expect(errors).toEqual(['Periods: fill every period with whole numbers, 0 or more, or leave them all empty (check Q2)']);
  });

  it('reports periods that do not add up to the final score, with their sum', () => {
    const form = scoreFormFrom(game300.result);
    form.home = '75';
    const { result, errors, sums } = readScoreForm(form);
    expect(result).toBeUndefined();
    expect(sums).toEqual([74, 31]);
    expect(errors).toEqual(['Periods add up to 74–31, the final score is 75–31']);
  });

  it('takes overtimes as further periods', () => {
    const form: ScoreForm = { home: '70', away: '68', periods: [['15', '15'], ['15', '15'], ['15', '15'], ['15', '15'], ['10', '8']] };
    const { result, errors } = readScoreForm(form);
    expect(errors).toEqual([]);
    expect(result!.periods).toHaveLength(5);
    expect(periodName(3)).toBe('Q4');
    expect(periodName(4)).toBe('OT1');
    expect(periodName(5)).toBe('OT2');
  });

  it('tells a changed score from the same one', () => {
    expect(sameResult({ home: 1, away: 2 }, { home: 1, away: 2 })).toBe(true);
    expect(sameResult({ home: 1, away: 2 }, { home: 2, away: 1 })).toBe(false);
    expect(sameResult({ home: 1, away: 2 }, { home: 1, away: 2, periods: [[1, 2], [0, 0], [0, 0], [0, 0]] })).toBe(false);
    expect(sameResult(undefined, { home: 1, away: 2 })).toBe(false);
  });
});
