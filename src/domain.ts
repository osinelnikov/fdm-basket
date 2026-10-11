import { VENUES } from './data/fixtures.ts';
import type { Match, Venue } from './data/types.ts';

export type Filter = 'all' | 'a' | 'b' | 'away';

export const GAME_LENGTH_HOURS = 2;

export const isAway = (m: Match): boolean => !VENUES[m.venue].home;

export function matchesFilter(m: Match, f: Filter): boolean {
  if (f === 'all') return true;
  if (f === 'away') return isAway(m);
  return m.sides.includes(f);
}

export const monthKey = (m: Match): string => m.date.slice(0, 7);

export const mapsUrl = (v: Venue): string =>
  'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(v.address);

/** Calendar date of a match as a UTC midnight Date, so formatting never shifts the day. */
export function calendarDate(date: string): Date {
  const [y, mo, d] = date.split('-').map(Number);
  return new Date(Date.UTC(y, mo - 1, d));
}

/** Adds hours to a local date and time, rolling over midnight. */
export function addHours(date: string, time: string, hours: number): { date: string; time: string } {
  const [h, min] = time.split(':').map(Number);
  const t = new Date(calendarDate(date).getTime() + ((h + hours) * 60 + min) * 60_000);
  const pad = (n: number) => String(n).padStart(2, '0');
  return {
    date: `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}`,
    time: `${pad(t.getUTCHours())}:${pad(t.getUTCMinutes())}`,
  };
}

export const matchEnd = (m: Match) => addHours(m.date, m.time, GAME_LENGTH_HOURS);
