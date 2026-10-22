import { describe, expect, it } from 'vitest';
import { MATCHES } from '../src/data/fixtures.ts';
import type { Match } from '../src/data/types.ts';
import { addHours, isAway, matchesFilter, monthKey, nextMatch } from '../src/domain.ts';
import { gcalUrl } from '../src/calendar/gcal.ts';

describe('filters', () => {
  it.each([
    ['all', 26],
    ['a', 14],
    ['b', 14],
    ['away', 12],
  ] as const)('filter "%s" shows %i games', (f, n) => {
    expect(MATCHES.filter((m) => matchesFilter(m, f))).toHaveLength(n);
  });

  it('treats only Ugo Guidi as home', () => {
    expect(isAway(MATCHES.find((m) => m.game === 300)!)).toBe(false);
    expect(isAway(MATCHES.find((m) => m.game === 304)!)).toBe(true);
  });
});

describe('dates', () => {
  it('adds hours across midnight', () => {
    expect(addHours('2026-12-31', '23:30', 2)).toEqual({ date: '2027-01-01', time: '01:30' });
    expect(addHours('2026-10-22', '21:30', 2)).toEqual({ date: '2026-10-22', time: '23:30' });
  });

  it('groups by calendar month', () => {
    expect(monthKey(MATCHES[0])).toBe('2026-10');
  });
});

describe('Google Calendar link', () => {
  it('opens a prefilled event in Rome time', () => {
    const url = new URL(gcalUrl(MATCHES.find((m) => m.game === 304)!));
    expect(url.origin + url.pathname).toBe('https://calendar.google.com/calendar/render');
    expect(url.searchParams.get('action')).toBe('TEMPLATE');
    expect(url.searchParams.get('dates')).toBe('20261022T213000/20261022T233000');
    expect(url.searchParams.get('ctz')).toBe('Europe/Rome');
    expect(url.searchParams.get('text')).toBe('🏀 Valdera vs FDM A');
    expect(url.searchParams.get('location')).toContain('Palestra Via della Resistenza');
  });
});

describe('next game', () => {
  // Own data set: the real schedule without results, plus results set by each test.
  // Entering real results in fixtures.ts must not change what these tests expect.
  const unplayed: Match[] = MATCHES.map(({ result: _ignored, ...m }) => m);
  const played = (games: number[]): Match[] =>
    unplayed.map((m) => (games.includes(m.game) ? { ...m, result: { home: 1, away: 0, periods: [[1, 0], [0, 0], [0, 0], [0, 0]] } } : m));

  it('is the first game from today on', () => {
    expect(nextMatch(unplayed, '2026-10-11')?.game).toBe(300);
  });

  it('includes a game played today until its result is entered', () => {
    expect(nextMatch(unplayed, '2026-10-14')?.game).toBe(300);
    expect(nextMatch(played([300]), '2026-10-14')?.game).toBe(306);
  });

  it('skips past games even when their result is missing', () => {
    expect(nextMatch(unplayed, '2026-10-23')?.game).toBe(310);
  });

  it('skips games of later days that already have a result', () => {
    expect(nextMatch(played([306, 304]), '2026-10-20')?.game).toBe(310);
  });

  it('is undefined once the season is over', () => {
    expect(nextMatch(unplayed, '2027-02-04')).toBeUndefined();
  });
});
