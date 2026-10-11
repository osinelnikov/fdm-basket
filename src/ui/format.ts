import { calendarDate } from '../domain.ts';

/** Formats a YYYY-MM-DD calendar date without any time-zone shift. */
export const formatDate = (date: string, opts: Intl.DateTimeFormatOptions): string =>
  calendarDate(date).toLocaleDateString('en-GB', { ...opts, timeZone: 'UTC' });

/** Today's date in Forte dei Marmi, as YYYY-MM-DD. */
export const romeToday = (): string => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Rome' }).format(new Date());

const HTML_ESCAPES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const esc = (s: string): string => s.replace(/[&<>"']/g, (c) => HTML_ESCAPES[c]);
