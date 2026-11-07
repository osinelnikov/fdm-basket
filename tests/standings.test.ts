import { describe, expect, it } from 'vitest';
import { MATCHES, TEAMS } from '../src/data/fixtures.ts';
import { STANDINGS } from '../src/data/standings.ts';
import type { TeamId } from '../src/data/types.ts';

// The table exactly as printed in CU 05: [team, PG, PV, PP, CF, CS, DC, Punti].
const PRINTED: [TeamId, number, number, number, number, number, number, number][] = [
  ['Pisces Lucca', 4, 4, 0, 244, 191, 53, 8],
  ['San Miniato', 4, 3, 1, 246, 189, 57, 6],
  ['FDM A', 4, 3, 1, 246, 192, 54, 6],
  ['CEFA Castelnuovo', 3, 2, 1, 180, 148, 32, 4],
  ['La Perla', 4, 2, 2, 212, 190, 22, 4],
  ['Perignano', 3, 1, 2, 166, 178, -12, 2],
  ['Valdera', 4, 0, 4, 156, 227, -71, 0],
  ['FDM B', 4, 0, 4, 151, 286, -135, 0],
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
