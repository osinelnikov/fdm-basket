/** Parsing of the text the owner types into the admin forms; every helper is pure. */

/** A whole number of at most five digits, not negative; undefined for anything else, empty text included. */
export function parseWhole(text: string): number | undefined {
  const value = text.trim();
  return /^\d{1,5}$/.test(value) ? Number(value) : undefined;
}

/** A whole number of at most five digits with an optional leading + or -; undefined for anything else. */
export function parseSigned(text: string): number | undefined {
  const value = text.trim();
  if (!/^[+-]?\d{1,5}$/.test(value)) return undefined;
  const n = Number(value);
  return Object.is(n, -0) ? 0 : n;
}

/** Whether the text is an existing calendar date in the form YYYY-MM-DD. */
export function isCalendarDate(text: string): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
  if (!m) return false;
  return new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]))).toISOString().slice(0, 10) === text;
}

/** Whether the text is a time of day in the form HH:MM. */
export const isTimeOfDay = (text: string): boolean => /^([01]\d|2[0-3]):[0-5]\d$/.test(text);
