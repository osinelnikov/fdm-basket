import { describe, expect, it } from 'vitest';
import { MATCHES } from '../src/data/fixtures.ts';
import type { BoxScore, ShotLine, StatLine, TeamBox } from '../src/data/types.ts';

const files = import.meta.glob<BoxScore>('../src/data/boxscores/*.json', { eager: true, import: 'default' });
const BOXES: [string, BoxScore][] = Object.entries(files).map(([path, box]) => [path.match(/(\d+)\.json$/)![1], box]);

const SIDES = ['home', 'away'] as const;
const COUNTS = ['oreb', 'dreb', 'reb', 'pf', 'fd', 'stl', 'tov', 'ast', 'blk', 'blkAgainst'] as const;
const SHOTS = ['fg2', 'fg3', 'fg', 'ft'] as const;
/** Counting stats that the "Squadra/Allenatore" row can carry. */
const TEAM_ROW = ['oreb', 'dreb', 'reb', 'pf', 'tov'] as const;

function seconds(min: string): number {
  const m = /^(\d+):(\d{2})$/.exec(min);
  if (!m) throw new Error(`"${min}" is not mm:ss`);
  expect(Number(m[2])).toBeLessThan(60);
  return Number(m[1]) * 60 + Number(m[2]);
}

function played(team: TeamBox): StatLine[] {
  return team.players.flatMap((p) => (p.stats ? [p.stats] : []));
}

function lineIsConsistent(line: StatLine) {
  expect(line.pts).toBe(2 * line.fg2.made + 3 * line.fg3.made + line.ft.made);
  expect(line.fg).toEqual({ made: line.fg2.made + line.fg3.made, att: line.fg2.att + line.fg3.att });
  expect(line.reb).toBe(line.oreb + line.dreb);
  for (const key of SHOTS) {
    const shot: ShotLine = line[key];
    expect(shot.made).toBeGreaterThanOrEqual(0);
    expect(shot.made).toBeLessThanOrEqual(shot.att);
  }
  seconds(line.min);
}

function sumOf(lines: Partial<StatLine>[], key: (typeof COUNTS)[number] | 'pts'): number {
  return lines.reduce((sum, line) => sum + (line[key] ?? 0), 0);
}

function sumShots(lines: StatLine[], key: (typeof SHOTS)[number]): ShotLine {
  return lines.reduce((sum, line) => ({ made: sum.made + line[key].made, att: sum.att + line[key].att }), { made: 0, att: 0 });
}

describe('box scores match the fixtures', () => {
  it('has at least one box score', () => {
    expect(BOXES.length).toBeGreaterThan(0);
  });

  it.each(BOXES)('game %s is a played game that links its PDF', (name, box) => {
    expect(box.game).toBe(Number(name));
    const match = MATCHES.find((m) => m.game === box.game)!;
    expect(match).toBeDefined();
    expect(match.result).toBeDefined();
    expect(match.stats).toBe(`/stats/${box.game}.pdf`);
  });

  it.each(BOXES)('game %s totals, periods and running score agree with the result', (_name, box) => {
    const { result } = MATCHES.find((m) => m.game === box.game)!;
    expect(box.home.totals.pts).toBe(result!.home);
    expect(box.away.totals.pts).toBe(result!.away);
    if (result!.periods) {
      expect(box.home.periods.map((p) => p.pts)).toEqual(result!.periods.map(([home]) => home));
      expect(box.away.periods.map((p) => p.pts)).toEqual(result!.periods.map(([, away]) => away));
    }
    for (const side of SIDES) {
      const { running, totals } = box[side];
      expect(running[running.length - 1]).toBe(totals.pts);
      expect(running).toEqual([...running].sort((a, b) => a - b));
    }
  });
});

describe('box scores are internally consistent', () => {
  it.each(BOXES)('game %s: every line adds up', (_name, box) => {
    for (const side of SIDES) {
      const team = box[side];
      for (const line of [...played(team), team.totals, ...team.periods]) lineIsConsistent(line);
    }
  });

  it.each(BOXES)('game %s: players plus the team row add up to the totals', (_name, box) => {
    for (const side of SIDES) {
      const team = box[side];
      const lines = played(team);
      expect(sumOf(lines, 'pts')).toBe(team.totals.pts);
      for (const key of SHOTS) expect(sumShots(lines, key)).toEqual(team.totals[key]);
      for (const key of COUNTS) {
        const teamRow = (TEAM_ROW as readonly string[]).includes(key) ? (team.team[key as (typeof TEAM_ROW)[number]] ?? 0) : 0;
        expect(sumOf(lines, key) + teamRow).toBe(team.totals[key]);
      }
      expect(Object.keys(team.team).every((k) => (TEAM_ROW as readonly string[]).includes(k))).toBe(true);
    }
  });

  it.each(BOXES)('game %s: periods add up to the totals', (_name, box) => {
    for (const side of SIDES) {
      const { periods, totals } = box[side];
      expect(sumOf(periods, 'pts')).toBe(totals.pts);
      for (const key of SHOTS) expect(sumShots(periods, key)).toEqual(totals[key]);
      for (const key of COUNTS) expect(sumOf(periods, key)).toBe(totals[key]);
    }
  });

  it.each(BOXES)('game %s: minutes add up', (_name, box) => {
    for (const side of SIDES) {
      const { periods, totals } = box[side];
      // Five players on court: a ten-minute quarter is 50:00, a five-minute overtime 25:00.
      const periodSeconds = (i: number) => (i < 4 ? 50 : 25) * 60;
      expect(periods.map((p) => seconds(p.min))).toEqual(periods.map((_, i) => periodSeconds(i)));
      expect(seconds(totals.min)).toBe(periods.reduce((sum, _, i) => sum + periodSeconds(i), 0));
      // The program rounds each player's time to whole seconds, so the sum can be off the total by a second
      // (game 306, home: 200:01 against 200:00).
      const playerSeconds = played(box[side]).reduce((sum, line) => sum + seconds(line.min), 0);
      expect(Math.abs(playerSeconds - seconds(totals.min))).toBeLessThanOrEqual(1);
    }
  });

  it.each(BOXES)('game %s: plus-minus and efficiency agree with the totals', (_name, box) => {
    for (const side of SIDES) {
      const team = box[side];
      const rival = box[side === 'home' ? 'away' : 'home'];
      const lines = played(team);
      // Five players on court: the players' plus-minus adds up to five times the team's.
      expect(lines.reduce((sum, line) => sum + line.plusMinus, 0)).toBe(5 * team.totals.plusMinus);
      expect(team.totals.plusMinus).toBe(team.totals.pts - rival.totals.pts);
      expect(team.periods.reduce((sum, line) => sum + line.plusMinus, 0)).toBe(team.totals.plusMinus);
      // The program credits team rebounds and charges team turnovers to the team efficiency.
      expect(lines.reduce((sum, line) => sum + line.eff, 0) + (team.team.reb ?? 0) - (team.team.tov ?? 0)).toBe(team.totals.eff);
    }
  });

  it.each(BOXES)('game %s: running score has a value per five minutes and per overtime', (_name, box) => {
    for (const side of SIDES) {
      expect(box[side].running).toHaveLength(8 + (box[side].periods.length - 4));
    }
  });

  it.each(BOXES)('game %s: blocks made by one team are the blocks received by the other', (_name, box) => {
    expect(box.home.totals.blk).toBe(box.away.totals.blkAgainst);
    expect(box.away.totals.blk).toBe(box.home.totals.blkAgainst);
  });

  it.each(BOXES)('game %s: starting five and bench split the points and rebounds', (_name, box) => {
    for (const side of SIDES) {
      const team = box[side];
      const starters = team.players.filter((p) => p.starter && p.stats).map((p) => p.stats!);
      expect(sumOf(starters, 'pts')).toBe(team.extras.starters.pts);
      expect(sumOf(starters, 'reb')).toBe(team.extras.starters.reb);
      expect(team.extras.starters.pts + team.extras.bench.pts).toBe(team.totals.pts);
      expect(team.extras.starters.reb + team.extras.bench.reb + (team.team.reb ?? 0)).toBe(team.totals.reb);
    }
  });

  it.each(BOXES)('game %s: roster is well formed', (_name, box) => {
    for (const side of SIDES) {
      const { players } = box[side];
      expect(players.filter((p) => p.starter)).toHaveLength(5);
      expect(players.filter((p) => p.captain).length).toBeLessThanOrEqual(1);
      expect(new Set(players.map((p) => p.no)).size).toBe(players.length);
    }
  });
});

describe('box scores keep each figure on its own row', () => {
  const box = (game: number) => BOXES.find(([name]) => name === String(game))![1];
  const player = (game: number, name: string) => box(game).home.players.find((p) => p.name === name);

  it("game 310: G D'ANGIOLO", () => {
    expect(player(310, "G D'ANGIOLO")).toEqual({
      no: '6',
      name: "G D'ANGIOLO",
      starter: true,
      captain: false,
      stats: {
        min: '30:40', pts: 15, fg2: { made: 3, att: 7 }, fg3: { made: 2, att: 6 }, fg: { made: 5, att: 13 }, ft: { made: 3, att: 4 },
        oreb: 3, dreb: 7, reb: 10, pf: 3, fd: 4, stl: 0, tov: 2, ast: 6, blk: 0, blkAgainst: 0, eff: 20, plusMinus: 12,
      },
    });
  });

  it('game 306: F Lupo', () => {
    expect(player(306, 'F Lupo')).toEqual({
      no: '10',
      name: 'F Lupo',
      starter: true,
      captain: false,
      stats: {
        min: '27:23', pts: 14, fg2: { made: 5, att: 12 }, fg3: { made: 0, att: 0 }, fg: { made: 5, att: 12 }, ft: { made: 4, att: 7 },
        oreb: 8, dreb: 9, reb: 17, pf: 4, fd: 9, stl: 1, tov: 0, ast: 0, blk: 1, blkAgainst: 0, eff: 23, plusMinus: -1,
      },
    });
  });

  it('game 310: home extras', () => {
    expect(box(310).home.extras).toEqual({
      pointsOffTurnovers: 20, fastBreak: 16, secondChance: 23, paint: 44, starters: { pts: 36, reb: 21 }, bench: { pts: 36, reb: 32 },
    });
  });
});
