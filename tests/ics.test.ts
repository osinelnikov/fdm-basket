import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { buildIcs, foldLine, escapeText, ICS_SEQUENCE_BASE } from '../src/calendar/ics.ts';
import { MATCHES } from '../src/data/fixtures.ts';
import type { Match } from '../src/data/types.ts';

const NOW = new Date(Date.UTC(2026, 9, 11, 15, 30, 0));
const ics = buildIcs(MATCHES, { now: NOW });

function unfold(text: string): string[] {
  return text.replace(/\r\n[ \t]/g, '').split('\r\n').filter((l) => l !== '');
}
function events(text: string): string[][] {
  const lines = unfold(text);
  const out: string[][] = [];
  let cur: string[] | null = null;
  for (const l of lines) {
    if (l === 'BEGIN:VEVENT') cur = [];
    else if (l === 'END:VEVENT') { out.push(cur!); cur = null; }
    else if (cur) cur.push(l);
  }
  return out;
}
const prop = (ev: string[], name: string) => ev.find((l) => l.startsWith(name + ':') || l.startsWith(name + ';'));
const byGame = (game: number) => events(ics).find((ev) => prop(ev, 'DESCRIPTION')!.includes(`Game ${game}.`))!;

describe('iCalendar format (RFC 5545)', () => {
  it('uses CRLF line endings only and ends with CRLF', () => {
    expect(ics.endsWith('\r\n')).toBe(true);
    expect(ics.replace(/\r\n/g, '')).not.toMatch(/[\r\n]/);
  });

  it('keeps every physical line within 75 octets', () => {
    for (const line of ics.split('\r\n')) expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75);
  });

  it('folds without splitting multi-byte characters', () => {
    const long = 'SUMMARY:' + '🏀 Forte dei Marmi — '.repeat(10);
    const folded = foldLine(long);
    expect(folded.length).toBeGreaterThan(1);
    expect(folded.slice(1).every((l) => l.startsWith(' '))).toBe(true);
    expect(folded.map((l, i) => (i ? l.slice(1) : l)).join('')).toBe(long);
    for (const l of folded) expect(new TextEncoder().encode(l).length).toBeLessThanOrEqual(75);
  });

  it('escapes TEXT values', () => {
    expect(escapeText('a,b;c\\d\ne')).toBe('a\\,b\;c\\\\d\\ne');
  });

  it('has one calendar, the Europe/Rome time zone, 26 events and 52 alarms', () => {
    const lines = unfold(ics);
    expect(lines[0]).toBe('BEGIN:VCALENDAR');
    expect(lines.at(-1)).toBe('END:VCALENDAR');
    expect(lines).toContain('TZID:Europe/Rome');
    expect(lines.filter((l) => l === 'BEGIN:VEVENT')).toHaveLength(26);
    expect(lines.filter((l) => l === 'BEGIN:VALARM')).toHaveLength(52);
  });

  it('is English only', () => {
    expect(ics).not.toMatch(/[Ѐ-ӿ]/);
  });
});

describe('events', () => {
  it('keeps the UIDs of the calendar already published, so imports update instead of duplicating', () => {
    const published = readFileSync(new URL('./fixtures/published-2026-10-11.ics', import.meta.url), 'utf8');
    const uids = (text: string) => events(text).map((ev) => prop(ev, 'UID')).sort();
    expect(uids(ics)).toEqual(uids(published));
  });

  it('starts at the bulletin time in Europe/Rome and lasts two hours', () => {
    const ev = byGame(304);
    expect(prop(ev, 'DTSTART')).toBe('DTSTART;TZID=Europe/Rome:20261022T213000');
    expect(prop(ev, 'DTEND')).toBe('DTEND;TZID=Europe/Rome:20261022T233000');
  });

  it.each([
    [306, '🏀 FDM B | FDM B — Perignano'],
    [310, '🏀 FDM A home | FDM A — Perignano'],
    [304, '🏀 FDM A away | Valdera — FDM A'],
    [300, '🏀 FDM B | FDM A — FDM B'],
  ])('game %i is titled "%s"', (game, summary) => {
    expect(prop(byGame(game), 'SUMMARY')).toBe('SUMMARY:' + summary);
  });

  it('puts venue, game number and a maps link into the event', () => {
    const ev = byGame(422);
    expect(prop(ev, 'LOCATION')).toBe('LOCATION:Palestra Scuola Elementare Sardi · Via Provinciale di Sant’Alessio\\, Sant’Alessio\\, Lucca (LU)');
    expect(prop(ev, 'DESCRIPTION')).toContain('Game 422.');
    expect(prop(ev, 'DESCRIPTION')).toContain('https://www.google.com/maps/search/?api=1&query=');
  });

  it('reminds one day and five hours before', () => {
    const ev = byGame(300);
    expect(ev.filter((l) => l.startsWith('TRIGGER:'))).toEqual(['TRIGGER:-P1D', 'TRIGGER:-PT5H']);
  });

  it('stamps the build time and bumps SEQUENCE by the match revision', () => {
    expect(prop(byGame(300), 'DTSTAMP')).toBe('DTSTAMP:20261011T153000Z');
    expect(prop(byGame(300), 'SEQUENCE')).toBe(`SEQUENCE:${ICS_SEQUENCE_BASE}`);
    const moved: Match = { ...MATCHES[0], revision: 1 };
    const ev = events(buildIcs([moved], { now: NOW }))[0];
    expect(prop(ev, 'SEQUENCE')).toBe(`SEQUENCE:${ICS_SEQUENCE_BASE + 1}`);
  });
});
