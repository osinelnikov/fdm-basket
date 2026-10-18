import { describe, expect, it } from 'vitest';
import { MATCHES, TEAMS } from '../src/data/fixtures.ts';
import { STANDINGS } from '../src/data/standings.ts';
import type { TeamId } from '../src/data/types.ts';

// The table exactly as printed in CU 02 del 17/10/2026, p. 10: [team, PG, PV, PP, CF, CS, DC, Punti].
const CU02: [TeamId, number, number, number, number, number, number, number][] = [
  ['FDM A', 1, 1, 0, 74, 31, 43, 2],
  ['San Miniato', 1, 1, 0, 64, 47, 17, 2],
  ['La Perla', 1, 1, 0, 54, 42, 12, 2],
  ['Pisces Lucca', 1, 1, 0, 69, 64, 5, 2],
  ['CEFA Castelnuovo', 1, 0, 1, 64, 69, -5, 0],
  ['Perignano', 1, 0, 1, 42, 54, -12, 0],
  ['Valdera', 1, 0, 1, 47, 64, -17, 0],
  ['FDM B', 0, 0, 1, 31, 74, -43, 0],
];

const rows = STANDINGS.rows;
const sum = (f: (r: (typeof rows)[number]) => number) => rows.reduce((a, r) => a + f(r), 0);

describe('standings match bulletin CU 02', () => {
  it('lists the teams in bulletin order', () => {
    expect(rows.map((r) => r.team)).toEqual(CU02.map(([t]) => t));
  });

  it.each(CU02)('%s has the printed figures (only PG of FDM B corrected)', (team, pg, pv, pp, cf, cs, dc, pts) => {
    const r = rows.find((x) => x.team === team)!;
    const printed = { played: pg, won: pv, lost: pp, pointsFor: cf, pointsAgainst: cs, points: pts };
    const expected = team === 'FDM B' ? { ...printed, played: 1 } : printed;
    expect({ played: r.played, won: r.won, lost: r.lost, pointsFor: r.pointsFor, pointsAgainst: r.pointsAgainst, points: r.points })
      .toEqual(expected);
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
