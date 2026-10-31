import { describe, expect, it } from 'vitest';
import { MATCHES, TEAMS } from '../src/data/fixtures.ts';
import { STANDINGS } from '../src/data/standings.ts';
import type { TeamId } from '../src/data/types.ts';

// The table exactly as printed in CU 04: [team, PG, PV, PP, CF, CS, DC, Punti].
const PRINTED: [TeamId, number, number, number, number, number, number, number][] = [
  ['FDM A', 3, 3, 0, 200, 121, 79, 6],
  ['Pisces Lucca', 3, 3, 0, 173, 145, 28, 6],
  ['CEFA Castelnuovo', 3, 2, 1, 180, 148, 32, 4],
  ['San Miniato', 3, 2, 1, 170, 154, 16, 4],
  ['La Perla', 3, 1, 2, 153, 144, 9, 2],
  ['Perignano', 3, 1, 2, 166, 178, -12, 2],
  ['Valdera', 3, 0, 3, 110, 168, -58, 0],
  ['FDM B', 3, 0, 3, 116, 210, -94, 0],
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
