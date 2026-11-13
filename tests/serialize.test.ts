import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { serializeMatches, serializeStandings } from '../src/data/serialize.ts';
import type { Match, Standings } from '../src/data/types.ts';
import { MATCHES, STANDINGS } from './fixtures/data.ts';

const read = (name: string): string => readFileSync(new URL(`../src/data/${name}`, import.meta.url), 'utf8');

describe('canonical data files', () => {
  it('matches.json is exactly what serializeMatches produces', () => {
    const text = read('matches.json');
    expect(serializeMatches(JSON.parse(text))).toBe(text);
  });

  it('standings.json is exactly what serializeStandings produces', () => {
    const text = read('standings.json');
    expect(serializeStandings(JSON.parse(text))).toBe(text);
  });
});

describe('serializeMatches', () => {
  const scrambled = {
    stats: '/stats/1.pdf',
    result: { periods: [[1, 2]], away: 2, home: 1 },
    video: 'https://youtu.be/abcdefghijk',
    derby: undefined,
    sides: ['a'],
    venue: 'fdm',
    away: 'FDM B',
    home: 'FDM A',
    time: '21:00',
    date: '2026-10-14',
    game: 1,
    revision: 2,
  } as unknown as Match;

  it('writes keys in the field order of the types and drops undefined ones', () => {
    expect(serializeMatches([scrambled])).toBe(
      '[\n  {"game":1,"date":"2026-10-14","time":"21:00","home":"FDM A","away":"FDM B","venue":"fdm","sides":["a"],"revision":2,'
      + '"result":{"home":1,"away":2,"periods":[[1,2]]},"video":"https://youtu.be/abcdefghijk","stats":"/stats/1.pdf"}\n]\n',
    );
  });

  it('changing one match field changes exactly one line', () => {
    const matches = MATCHES;
    const changed = matches.map((m, i) => (i === 3 ? { ...m, time: '20:45' } : m));
    const before = serializeMatches(matches).split('\n');
    const after = serializeMatches(changed).split('\n');
    expect(after).toHaveLength(before.length);
    expect(after.filter((line, i) => line !== before[i])).toHaveLength(1);
  });
});

describe('serializeStandings', () => {
  it('writes row keys in the field order of the types', () => {
    const standings = {
      rows: [{ points: 2, pointsAgainst: 3, pointsFor: 4, lost: 0, won: 1, played: 1, team: 'FDM A' }],
      date: '2026-11-06',
      source: 'CU 05',
    } as unknown as Standings;
    expect(serializeStandings(standings)).toBe(
      '{\n  "source": "CU 05",\n  "date": "2026-11-06",\n  "rows": [\n'
      + '    {"team":"FDM A","played":1,"won":1,"lost":0,"pointsFor":4,"pointsAgainst":3,"points":2}\n  ]\n}\n',
    );
  });

  it('changing one row changes exactly one line', () => {
    const standings = STANDINGS;
    const changed = { ...standings, rows: standings.rows.map((r, i) => (i === 2 ? { ...r, points: r.points + 2 } : r)) };
    const before = serializeStandings(standings).split('\n');
    const after = serializeStandings(changed).split('\n');
    expect(after.filter((line, i) => line !== before[i])).toHaveLength(1);
  });
});
