import { SOURCE, VENUES } from '../data/fixtures.ts';
import type { Match } from '../data/types.ts';
import { isAway, mapsUrl, matchEnd } from '../domain.ts';

/** SEQUENCE for an unchanged match. 1 was the hand-made calendar of 11 Oct 2026. */
export const ICS_SEQUENCE_BASE = 2;
export const ICS_FILENAME = 'fdm-2026-27.ics';

export interface IcsOptions {
  /** Build time, written as DTSTAMP. */
  now: Date;
}

const encoder = new TextEncoder();

/** RFC 5545 §3.1: physical lines of at most 75 octets, continuation lines start with a space. */
export function foldLine(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let curBytes = 0;
  for (const ch of line) {
    const b = encoder.encode(ch).length;
    if (curBytes + b > 75) {
      out.push(cur);
      cur = ' ';
      curBytes = 1;
    }
    cur += ch;
    curBytes += b;
  }
  out.push(cur);
  return out;
}

/** RFC 5545 §3.3.11 TEXT escaping. */
export const escapeText = (s: string): string =>
  s.replace(/\\/g, '\\\\').replace(/;/g, '\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
const compact = (date: string, time: string) => date.replace(/-/g, '') + 'T' + time.replace(':', '') + '00';

function utcStamp(d: Date): string {
  return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}

export const eventUid = (m: Match): string =>
  `uisp-2026-27-${m.date.replace(/-/g, '')}-${slug(m.home)}${slug(m.away)}@fdm-calendar.local`;

export function eventSummary(m: Match): string {
  const label = m.sides.includes('b') ? 'FDM B' : isAway(m) ? 'FDM A away' : 'FDM A home';
  return `🏀 ${label} | ${m.home} — ${m.away}`;
}

function eventDescription(m: Match): string {
  const v = VENUES[m.venue];
  const kind = m.derby
    ? 'Derby FDM A vs FDM B at the home court, Forte dei Marmi.'
    : isAway(m)
      ? `${m.sides.includes('b') ? 'FDM B' : 'FDM A'} away game.`
      : 'Home court, Forte dei Marmi.';
  return `${SOURCE.league}. Game ${m.game}. ${kind}\nGoogle Maps: ${mapsUrl(v)}`;
}

const VTIMEZONE = [
  'BEGIN:VTIMEZONE',
  'TZID:Europe/Rome',
  'BEGIN:DAYLIGHT',
  'TZOFFSETFROM:+0100',
  'TZOFFSETTO:+0200',
  'TZNAME:CEST',
  'DTSTART:19700329T020000',
  'RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU',
  'END:DAYLIGHT',
  'BEGIN:STANDARD',
  'TZOFFSETFROM:+0200',
  'TZOFFSETTO:+0100',
  'TZNAME:CET',
  'DTSTART:19701025T030000',
  'RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU',
  'END:STANDARD',
  'END:VTIMEZONE',
];

function eventLines(m: Match, stamp: string): string[] {
  const v = VENUES[m.venue];
  const end = matchEnd(m);
  const title = `${m.home} — ${m.away}`;
  return [
    'BEGIN:VEVENT',
    `UID:${eventUid(m)}`,
    `DTSTAMP:${stamp}`,
    `SEQUENCE:${ICS_SEQUENCE_BASE + (m.revision ?? 0)}`,
    `DTSTART;TZID=Europe/Rome:${compact(m.date, m.time)}`,
    `DTEND;TZID=Europe/Rome:${compact(end.date, end.time)}`,
    `SUMMARY:${escapeText(eventSummary(m))}`,
    `LOCATION:${escapeText(`${v.name} · ${v.address}`)}`,
    `GEO:${v.lat};${v.lon}`,
    `DESCRIPTION:${escapeText(eventDescription(m))}`,
    'STATUS:CONFIRMED',
    'TRANSP:OPAQUE',
    'BEGIN:VALARM',
    'TRIGGER:-P1D',
    'ACTION:DISPLAY',
    `DESCRIPTION:${escapeText(`Basketball tomorrow: ${title}`)}`,
    'END:VALARM',
    'BEGIN:VALARM',
    'TRIGGER:-PT5H',
    'ACTION:DISPLAY',
    `DESCRIPTION:${escapeText(`Basketball in 5 hours: ${title}`)}`,
    'END:VALARM',
    'END:VEVENT',
  ];
}

export function buildIcs(matches: readonly Match[], opts: IcsOptions): string {
  const stamp = utcStamp(opts.now);
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//FDM Basketball//UISP 2026-27//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:FDM Basket 2026-27',
    'X-WR-TIMEZONE:Europe/Rome',
    'REFRESH-INTERVAL;VALUE=DURATION:PT6H',
    'X-PUBLISHED-TTL:PT6H',
    ...VTIMEZONE,
    ...matches.flatMap((m) => eventLines(m, stamp)),
    'END:VCALENDAR',
  ];
  return lines.flatMap(foldLine).join('\r\n') + '\r\n';
}
