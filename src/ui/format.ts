import { calendarDate } from '../domain.ts';

/** Formats a YYYY-MM-DD calendar date in the given locale, without any time-zone shift. */
export const formatDate = (date: string, opts: Intl.DateTimeFormatOptions, locale = 'en-GB'): string =>
  calendarDate(date).toLocaleDateString(locale, { ...opts, timeZone: 'UTC' });

export const capitalize = (s: string): string => s.charAt(0).toLocaleUpperCase() + s.slice(1);

/** Today's date in Forte dei Marmi, as YYYY-MM-DD. */
export const romeToday = (): string => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Rome' }).format(new Date());

const HTML_ESCAPES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const esc = (s: string): string => s.replace(/[&<>"']/g, (c) => HTML_ESCAPES[c]);
