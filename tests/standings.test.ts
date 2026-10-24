import { describe, expect, it } from 'vitest';
import { MATCHES, TEAMS } from '../src/data/fixtures.ts';
import { STANDINGS } from '../src/data/standings.ts';
import type { TeamId } from '../src/data/types.ts';

// The table exactly as printed in CU 03, p. 9: [team, PG, PV, PP, CF, CS, DC, Punti].
const PRINTED: [TeamId, number, number, number, number, number, number, number][] = [
  ['FDM A', 2, 2, 0, 128, 64, 64, 4],
  ['Pisces Lucca', 2, 2, 0, 123, 115, 8, 4],
  ['San Miniato', 2, 1, 1, 115, 101, 14, 2],
  ['La Perla', 2, 1, 1, 100, 89, 11, 2],
  ['Perignano', 2, 1, 1, 109, 106, 3, 2],
  ['CEFA Castelnuovo', 2, 1, 1, 111, 115, -4, 2],
  ['Valdera', 2, 0, 2, 80, 118, -38, 0],
  ['FDM B', 2, 0, 2, 83, 141, -58, 0],
];

const rows = STANDINGS.rows;
const sum = (f: (r: (typeof rows)[number]) => number) => rows.reduce((a, r) => a + f(r), 0);

describe('standings match the latest bulletin', () => {
  it('lists the teams in bulletin order', () => {
    expect(rows.map((r) => r.team)).toEqual(PRINTED.map(([t]) => t));
  });

  it.each(PRINTED)('%s has the printed figures', (team, pg, pv, pp, cf, cs, dc, pts) => {
    const r = rows.find((x) => x.team === team)!;
    expect({ played: r.played, won: r.won, lost: r.lost, pointsFor: r.pointsFor, pointsAgainst: r.pointsAgainst, points: r.points })
      .toEqual({ played: pg, won: pv, lost: pp, pointsFor: cf, pointsAgainst: cs, points: pts });
    expect(r.pointsFor - r.pointsAgainst).toBe(dc);
  });
});

describe('standings are consistent', () => {
  it('has every team of the group exactly once', () => {
    expect([...rows.map((r) => r.team)].sort()).toEqual(Object.keys(TEAMS).sort());
  });

  it.each(rows.map((r) => [r.team, r] as const))('%s: wins plus losses equal games, two points per win', (_, r) => {
    expect(r.won + r.lost).toBe(r.played);
    expect(r.points).toBe(2 * r.won);
  });

  it('balances across the group: wins equal losses, points scored equal points conceded', () => {
    expect(sum((r) => r.won)).toBe(sum((r) => r.lost));
    expect(sum((r) => r.pointsFor)).toBe(sum((r) => r.pointsAgainst));
  });

  it('is ordered by league points', () => {
    const pts = rows.map((r) => r.points);
    expect(pts).toEqual([...pts].sort((a, b) => b - a));
  });

  it.each(['FDM A', 'FDM B'] as const)('%s agrees with the results entered in the schedule', (team) => {
    const played = MATCHES.filter((m) => m.result && m.date <= STANDINGS.date && (m.home === team || m.away === team));
    const scored = played.reduce((a, m) => a + (m.home === team ? m.result!.home : m.result!.away), 0);
    const conceded = played.reduce((a, m) => a + (m.home === team ? m.result!.away : m.result!.home), 0);
    const r = rows.find((x) => x.team === team)!;
    expect({ played: played.length, pointsFor: scored, pointsAgainst: conceded })
      .toEqual({ played: r.played, pointsFor: r.pointsFor, pointsAgainst: r.pointsAgainst });
  });
});
