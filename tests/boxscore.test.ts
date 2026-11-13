import { describe, expect, it } from 'vitest';
import { MATCHES } from '../src/data/fixtures.ts';
import type { BoxScore } from '../src/data/types.ts';
import { validateBoxScore } from '../src/data/validate.ts';
import { BOX_SCORES } from './fixtures/data.ts';

const files = import.meta.glob<BoxScore>('../src/data/boxscores/*.json', { eager: true, import: 'default' });
const BOXES: [string, BoxScore][] = Object.entries(files).map(([path, box]) => [path.match(/(\d+)\.json$/)![1], box]);

// The admin area may remove every box score, so the live files are checked whatever their number, none included.
describe('box scores match the fixtures', () => {
  it('each is named after its game and satisfies the data rules', () => {
    for (const [name, box] of BOXES) {
      expect.soft(box.game, `game ${name}`).toBe(Number(name));
      expect.soft(validateBoxScore(box, MATCHES.find((m) => m.game === box.game)), `game ${name}`).toEqual([]);
    }
  });
});

describe('box scores keep each figure on its own row', () => {
  // Parsed figures of the box score snapshot, so a new or corrected live box score cannot change what is expected here.
  const box = (game: number) => BOX_SCORES[game];
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
