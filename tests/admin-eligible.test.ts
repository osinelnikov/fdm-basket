import { describe, expect, it } from 'vitest';
import { MATCHES } from './fixtures/data.ts';
import type { Match } from '../src/data/types.ts';
import { defaultScoreGame, lastResult, mediaGames, postponableGames, postponedGames, scoreGames } from '../src/admin/eligible.ts';

/** The real schedule as it stands: games 317 and 319 are postponed, the last result is game 315. */
const TODAY = '2026-11-12';
const games = (list: Match[]) => list.map((m) => m.game);

describe('score', () => {
  it('offers the games dated today or earlier that are not postponed, latest first', () => {
    expect(games(scoreGames(MATCHES, TODAY))).toEqual([315, 314, 309, 310, 304, 306, 300]);
  });

  it('leaves out postponed games even when their date has come', () => {
    // 317 (11 Nov) and 319 (12 Nov) are both dated on or before today.
    const offered = games(scoreGames(MATCHES, TODAY));
    expect(offered).not.toContain(317);
    expect(offered).not.toContain(319);
  });

  it('offers a game on its own day, and opens on the latest game still without a score', () => {
    const offered = scoreGames(MATCHES, '2026-11-16');
    expect(offered[0].game).toBe(321);
    expect(defaultScoreGame(offered)?.game).toBe(321);
  });

  it('opens on the latest game when every offered game already has a score', () => {
    expect(defaultScoreGame(scoreGames(MATCHES, TODAY))?.game).toBe(315);
    expect(defaultScoreGame([])).toBeUndefined();
  });
});

describe('video and statistics', () => {
  it('offer only the games with a result, latest first', () => {
    expect(games(mediaGames(MATCHES))).toEqual([315, 314, 309, 310, 304, 306, 300]);
  });

  it('do not offer a game dated in the past without a result', () => {
    const withoutResult = MATCHES.map((m) => (m.game === 315 ? { ...m, result: undefined } : m));
    expect(games(mediaGames(withoutResult))).not.toContain(315);
  });
});

describe('postpone', () => {
  it('offers the games without a result dated today or later and not postponed, soonest first', () => {
    const offered = games(postponableGames(MATCHES, TODAY));
    expect(offered[0]).toBe(321);
    expect(offered).toHaveLength(MATCHES.length - 7 - 2);
    expect(offered).not.toContain(317);
    expect(offered).not.toContain(319);
    expect(offered.some((g) => [300, 306, 304, 310, 309, 314, 315].includes(g))).toBe(false);
  });

  it('offers a game on its own day but not after it', () => {
    expect(games(postponableGames(MATCHES, '2026-11-16'))).toContain(321);
    expect(games(postponableGames(MATCHES, '2026-11-17'))).not.toContain(321);
  });

  it('lists the postponed games for rescheduling or removing the mark', () => {
    expect(games(postponedGames(MATCHES))).toEqual([317, 319]);
  });
});

describe('status', () => {
  it('names the latest game with a result', () => {
    expect(lastResult(MATCHES)?.game).toBe(315);
    expect(lastResult(MATCHES.filter((m) => !m.result))).toBeUndefined();
  });
});
