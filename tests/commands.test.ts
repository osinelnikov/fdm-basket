import { describe, expect, it } from 'vitest';
import { BOX_SCORES as SNAPSHOT_BOX_SCORES, MATCHES, STANDINGS, STATS_PATHS } from './fixtures/data.ts';
import { serializeMatches } from '../src/data/serialize.ts';
import type { BoxScore, Match, Standings } from '../src/data/types.ts';
import {
  postpone,
  replaceStandings,
  reschedule,
  setScore,
  setStats,
  setVideo,
  unpostpone,
  type CommandResult,
} from '../src/admin/commands.ts';
import type { ChangeSet, Snapshot } from '../src/admin/datastore.ts';

const TODAY = '2026-11-12';

const BOX_SCORES: Record<number, BoxScore> = structuredClone(SNAPSHOT_BOX_SCORES);

/**
 * The real data as it stands, except that game 319 is a regular game dated today:
 * several rules need a game that can still be postponed or scored.
 */
function snapshot(change?: (matches: Match[]) => void): Snapshot {
  const matches = structuredClone(MATCHES) as Match[];
  delete matches.find((m) => m.game === 319)!.postponed;
  change?.(matches);
  return {
    matches,
    standings: structuredClone(STANDINGS),
    boxScores: structuredClone(BOX_SCORES),
    statsPaths: [...STATS_PATHS],
    version: '1',
  };
}

const find = (matches: Match[], game: number) => matches.find((m) => m.game === game)!;

function changed(result: CommandResult): { changes: ChangeSet; message: string } {
  expect(result.kind).toBe('changed');
  if (result.kind !== 'changed') throw new Error('not changed');
  return result;
}

function violationsOf(result: CommandResult, status: 404 | 422): string[] {
  expect(result).toMatchObject({ kind: 'rejected', status });
  if (result.kind !== 'rejected') throw new Error('not rejected');
  return result.violations;
}

/** Games whose entry differs between the snapshot and the changed list. */
function changedGames(before: Snapshot, changes: ChangeSet): number[] {
  const old = new Map(before.matches.map((m) => [m.game, serializeMatches([m])]));
  return changes.matches!.filter((m) => old.get(m.game) !== serializeMatches([m])).map((m) => m.game);
}

const PDF = new TextEncoder().encode('%PDF-1.4\n%%EOF');

describe('setScore', () => {
  const quarters: [number, number][] = [[20, 15], [15, 14], [20, 14], [17, 14]];

  it('adds a score to a game played today', () => {
    const before = snapshot();
    const out = changed(setScore(before, { game: 319, result: { home: 72, away: 57, periods: quarters } }, TODAY));
    expect(out.message).toBe('admin: 319 score 72-57');
    expect(changedGames(before, out.changes)).toEqual([319]);
    expect(find(out.changes.matches!, 319).result).toEqual({ home: 72, away: 57, periods: quarters });
    expect(find(before.matches, 319).result).toBeUndefined();
  });

  it('rejects quarters that do not add up to the final score', () => {
    const result = setScore(snapshot(), { game: 319, result: { home: 72, away: 57, periods: [[20, 15], [15, 14], [20, 14], [17, 13]] } }, TODAY);
    expect(violationsOf(result, 422)).toContainEqual(expect.stringContaining('quarters add up to 72–56'));
  });

  it('answers 404 for an unknown game', () => {
    expect(violationsOf(setScore(snapshot(), { game: 999, result: { home: 1, away: 0 } }, TODAY), 404)).toEqual(['game 999: no such game']);
  });

  it('rejects a postponed game', () => {
    expect(violationsOf(setScore(snapshot(), { game: 317, result: { home: 1, away: 0 } }, TODAY), 422)).toContainEqual(expect.stringContaining('game 317: is postponed'));
  });

  it('rejects a game dated after today', () => {
    expect(violationsOf(setScore(snapshot(), { game: 321, result: { home: 1, away: 0 } }, TODAY), 422)).toContainEqual(expect.stringContaining('game 321: is dated 2026-11-16'));
  });

  it('reports the same result again as unchanged', () => {
    const before = snapshot();
    expect(setScore(before, { game: 310, result: structuredClone(find(before.matches, 310).result!) }, TODAY)).toEqual({ kind: 'unchanged' });
  });

  // Same final score as the table counts, other quarters: contradicts the box score only.
  const corrected310 = { home: 72, away: 57, periods: [[17, 13], [22, 15], [19, 13], [14, 16]] as [number, number][] };

  it('refuses to contradict an existing box score unless it is removed', () => {
    const before = snapshot();
    expect(violationsOf(setScore(before, { game: 310, result: corrected310 }, TODAY), 422)).toContainEqual(expect.stringContaining('differs from the box score'));
    expect(violationsOf(setScore(before, { game: 310, result: corrected310, removeBoxScore: false }, TODAY), 422)).toHaveLength(1);

    const out = changed(setScore(before, { game: 310, result: corrected310, removeBoxScore: true }, TODAY));
    expect(out.changes.removeBoxScores).toEqual([310]);
    expect(changedGames(before, out.changes)).toEqual([310]);
    // The statistics file and its link stay.
    expect(find(out.changes.matches!, 310).stats).toBe('/stats/310.pdf');
  });

  it('keeps the box score when the new final score and periods agree with it', () => {
    const before = snapshot();
    const out = changed(setScore(before, { game: 310, result: { home: 72, away: 57 } }, TODAY));
    expect(out.changes.removeBoxScores).toBeUndefined();
  });

  it('corrects a game without a box score', () => {
    const out = changed(setScore(snapshot(), { game: 304, result: { home: 33, away: 54, periods: [[6, 23], [8, 11], [9, 10], [10, 10]] } }, TODAY));
    expect(out.message).toBe('admin: 304 score 33-54');
    expect(out.changes.removeBoxScores).toBeUndefined();
  });

  it('rejects a corrected score that no longer agrees with the league table', () => {
    // Game 315 is counted in the table of CU 05: FDM B scored 151 points in its four games.
    const result = setScore(snapshot(), { game: 315, result: { home: 36, away: 76, periods: [[7, 15], [9, 23], [11, 20], [9, 18]] } }, TODAY);
    expect(violationsOf(result, 422)).toContainEqual(expect.stringContaining('FDM B: table has 151 points scored, its first 4 games (300, 306, 309, 315) have 152'));
  });

  it('adds the score of a game played on the day of a table that does not count it yet', () => {
    // The bulletin of 12 Nov came out before game 319 (Valdera–FDM B) of that evening.
    const before = snapshot();
    before.standings = { ...before.standings, source: 'CU 06 · 12/11/2026', date: '2026-11-12' };
    const out = changed(setScore(before, { game: 319, result: { home: 60, away: 50 } }, TODAY));
    expect(find(out.changes.matches!, 319).result).toEqual({ home: 60, away: 50 });
  });

  it('appends a comment to the message after a blank line', () => {
    const out = changed(setScore(snapshot(), { game: 304, result: { home: 33, away: 54 }, comment: '  typo in the bulletin \n' }, TODAY));
    expect(out.message).toBe('admin: 304 score 33-54\n\ntypo in the bulletin');
    expect(changed(setScore(snapshot(), { game: 304, result: { home: 33, away: 54 }, comment: '   ' }, TODAY)).message).toBe('admin: 304 score 33-54');
  });
});

describe('setVideo', () => {
  it('drops the si parameter and keeps the others', () => {
    const before = snapshot();
    const out = changed(setVideo(before, { game: 310, video: '  https://youtu.be/abcdefghijk?si=XYZ&t=10 ' }, TODAY));
    expect(find(out.changes.matches!, 310).video).toBe('https://youtu.be/abcdefghijk?t=10');
    expect(out.message).toBe('admin: 310 video');
    expect(changedGames(before, out.changes)).toEqual([310]);
  });

  it('adds a video to a game that has none', () => {
    const out = changed(setVideo(snapshot(), { game: 304, video: 'https://www.youtube.com/watch?v=abcdefghijk&si=Q' }, TODAY));
    expect(find(out.changes.matches!, 304).video).toBe('https://www.youtube.com/watch?v=abcdefghijk');
  });

  it('rejects a link that is not https YouTube', () => {
    expect(violationsOf(setVideo(snapshot(), { game: 310, video: 'http://youtu.be/abcdefghijk' }, TODAY), 422)).toContainEqual(expect.stringContaining('must use https'));
    expect(violationsOf(setVideo(snapshot(), { game: 310, video: 'https://vimeo.com/123' }, TODAY), 422)).toContainEqual(expect.stringContaining('is not YouTube'));
    expect(violationsOf(setVideo(snapshot(), { game: 310, video: '  ' }, TODAY), 422)).toContainEqual(expect.stringContaining('is not a valid URL'));
  });

  it('rejects a video for a game without a result', () => {
    expect(violationsOf(setVideo(snapshot(), { game: 321, video: 'https://youtu.be/abcdefghijk' }, TODAY), 422)).toContainEqual(expect.stringContaining('game 321: has a video but no result'));
  });

  it('answers 404 for an unknown game', () => {
    expect(violationsOf(setVideo(snapshot(), { game: 999, video: 'https://youtu.be/abcdefghijk' }, TODAY), 404)).toHaveLength(1);
  });

  it('reports the same video as unchanged, also when only the si parameter differs', () => {
    expect(setVideo(snapshot(), { game: 310, video: 'https://youtu.be/Oz_boF16vpA' }, TODAY)).toEqual({ kind: 'unchanged' });
    expect(setVideo(snapshot(), { game: 310, video: 'https://youtu.be/Oz_boF16vpA?si=abc' }, TODAY)).toEqual({ kind: 'unchanged' });
  });
});

describe('setStats', () => {
  it('publishes the PDF with its box score', () => {
    const before = snapshot();
    const out = changed(setStats(before, { game: 310, pdf: PDF, boxScore: structuredClone(BOX_SCORES[310]) }, TODAY));
    expect(out.message).toBe('admin: 310 statistics and box score');
    expect(out.changes.putStatsPdfs).toEqual([{ game: 310, content: PDF }]);
    expect(out.changes.putBoxScores).toEqual([BOX_SCORES[310]]);
    expect(out.changes.removeBoxScores).toBeUndefined();
    expect(find(out.changes.matches!, 310).stats).toBe('/stats/310.pdf');
  });

  it('adds statistics to a game that had none', () => {
    const out = changed(setStats(snapshot(), { game: 315, pdf: PDF }, TODAY));
    expect(find(out.changes.matches!, 315).stats).toBe('/stats/315.pdf');
    expect(out.changes.removeBoxScores).toBeUndefined();
    expect(out.message).toBe('admin: 315 statistics');
  });

  it('removes the old box score when the new PDF could not be read', () => {
    const out = changed(setStats(snapshot(), { game: 310, pdf: PDF }, TODAY));
    expect(out.changes.removeBoxScores).toEqual([310]);
    expect(out.changes.putBoxScores).toBeUndefined();
    expect(out.message).toBe('admin: 310 statistics');
  });

  it('rejects bytes that are not a PDF', () => {
    expect(violationsOf(setStats(snapshot(), { game: 310, pdf: new TextEncoder().encode('<html>') }, TODAY), 422)).toContainEqual(expect.stringContaining('not a PDF'));
    expect(violationsOf(setStats(snapshot(), { game: 310, pdf: new Uint8Array(0) }, TODAY), 422)).toContainEqual(expect.stringContaining('not a PDF'));
  });

  it('rejects a PDF over 25 MiB but accepts exactly 25 MiB', () => {
    const big = new Uint8Array(25 * 1024 * 1024 + 1);
    big.set(PDF);
    expect(violationsOf(setStats(snapshot(), { game: 310, pdf: big }, TODAY), 422)).toContainEqual(expect.stringContaining('more than the 26214400 allowed'));
    expect(setStats(snapshot(), { game: 310, pdf: big.subarray(0, 25 * 1024 * 1024) }, TODAY).kind).toBe('changed');
  });

  it('rejects statistics for a game without a result', () => {
    expect(violationsOf(setStats(snapshot(), { game: 321, pdf: PDF }, TODAY), 422)).toContainEqual(expect.stringContaining('game 321: has statistics but no result'));
  });

  it('rejects a box score of another game', () => {
    expect(violationsOf(setStats(snapshot(), { game: 310, pdf: PDF, boxScore: structuredClone(BOX_SCORES[306]) }, TODAY), 422)).toContainEqual(expect.stringContaining('box score is for game 306'));
  });

  it('rejects a box score that contradicts the result', () => {
    const box = structuredClone(BOX_SCORES[310]);
    box.home.totals.pts += 1;
    expect(violationsOf(setStats(snapshot(), { game: 310, pdf: PDF, boxScore: box }, TODAY), 422).length).toBeGreaterThan(0);
  });

  it('answers 404 for an unknown game', () => {
    expect(violationsOf(setStats(snapshot(), { game: 999, pdf: PDF }, TODAY), 404)).toHaveLength(1);
  });
});

describe('replaceStandings', () => {
  const table = (change?: (s: Standings) => void): Standings => {
    const s = structuredClone(STANDINGS);
    change?.(s);
    return s;
  };

  it('reports the current table as unchanged', () => {
    expect(replaceStandings(snapshot(), { standings: table() }, TODAY)).toEqual({ kind: 'unchanged' });
  });

  it('rejects an older table', () => {
    const violations = violationsOf(replaceStandings(snapshot(), { standings: table((s) => { s.date = '2026-10-30'; }) }, TODAY), 422);
    expect(violations).toContainEqual(expect.stringContaining('older than the current table'));
  });

  it('rejects a row whose points are not twice its wins', () => {
    const violations = violationsOf(replaceStandings(snapshot(), { standings: table((s) => { s.date = '2026-11-12'; s.rows[0].points += 1; }) }, TODAY), 422);
    expect(violations).toContainEqual(expect.stringContaining('points for'));
  });

  it('accepts a newer table that agrees with the results', () => {
    // No FDM game was played between the bulletin of 6 Nov and 12 Nov, so only the date and source move.
    const out = changed(replaceStandings(snapshot(), { standings: table((s) => { s.source = 'CU 06 · 12/11/2026'; s.date = '2026-11-12'; }), comment: 'bulletin 6' }, TODAY));
    expect(out.message).toBe('admin: standings CU 06 · 12/11/2026\n\nbulletin 6');
    expect(out.changes.standings!.date).toBe('2026-11-12');
    expect(out.changes.matches).toBeUndefined();
  });

  it('rejects a table that disagrees with the FDM results', () => {
    const violations = violationsOf(replaceStandings(snapshot(), { standings: table((s) => { s.date = '2026-11-12'; const r = s.rows.find((x) => x.team === 'FDM A')!; r.pointsFor += 1; s.rows[0].pointsAgainst += 1; }) }, TODAY), 422);
    expect(violations).toContainEqual(expect.stringContaining('FDM A: table has'));
  });

  it('rejects a table dated after today', () => {
    const violations = violationsOf(replaceStandings(snapshot(), { standings: table((s) => { s.date = '2026-11-13'; }) }, TODAY), 422);
    expect(violations).toEqual(['table: dated 2026-11-13, after today (2026-11-12)']);
  });

  it('accepts a table that does not count a game of its own day yet, and then the one that does', () => {
    // The bulletin of 12 Nov came out before game 319 (Valdera–FDM B) of that evening.
    const before = snapshot();
    const cu06 = table((s) => { s.source = 'CU 06 · 12/11/2026'; s.date = '2026-11-12'; });
    const saved = changed(replaceStandings(before, { standings: cu06 }, TODAY));
    const scored = changed(setScore({ ...before, standings: saved.changes.standings! }, { game: 319, result: { home: 60, away: 50 } }, TODAY));

    const cu07 = table((s) => {
      s.source = 'CU 07 · 12/11/2026';
      s.date = '2026-11-12';
      const valdera = s.rows.find((r) => r.team === 'Valdera')!;
      Object.assign(valdera, { played: 5, won: 1, pointsFor: valdera.pointsFor + 60, pointsAgainst: valdera.pointsAgainst + 50, points: 2 });
      const fdmB = s.rows.find((r) => r.team === 'FDM B')!;
      Object.assign(fdmB, { played: 5, lost: 5, pointsFor: fdmB.pointsFor + 50, pointsAgainst: fdmB.pointsAgainst + 60 });
    });
    const after: Snapshot = { ...before, matches: scored.changes.matches!, standings: saved.changes.standings! };
    expect(changed(replaceStandings(after, { standings: cu07 }, TODAY)).changes.standings).toEqual(cu07);
  });
});

describe('postpone', () => {
  it('postpones a game dated today and leaves date, time and revision', () => {
    const before = snapshot();
    const out = changed(postpone(before, { game: 319 }, TODAY));
    expect(out.message).toBe('admin: 319 postponed');
    expect(changedGames(before, out.changes)).toEqual([319]);
    expect(find(out.changes.matches!, 319)).toEqual({ ...find(before.matches, 319), postponed: true });
    expect(find(before.matches, 319).postponed).toBeUndefined();
  });

  it('rejects a game that has been played', () => {
    expect(violationsOf(postpone(snapshot(), { game: 310 }, TODAY), 422)).toContainEqual(expect.stringContaining('has been played'));
  });

  it('rejects a past game without a result', () => {
    const before = snapshot((matches) => { delete find(matches, 304).result; });
    expect(violationsOf(postpone(before, { game: 304 }, TODAY), 422)).toContainEqual(expect.stringContaining('before today'));
  });

  it('reports an already postponed game as unchanged', () => {
    expect(postpone(snapshot(), { game: 317 }, TODAY)).toEqual({ kind: 'unchanged' });
  });

  it('answers 404 for an unknown game', () => {
    expect(violationsOf(postpone(snapshot(), { game: 999 }, TODAY), 404)).toHaveLength(1);
  });
});

describe('unpostpone', () => {
  it('removes the flag and keeps the revision', () => {
    const before = snapshot();
    const out = changed(unpostpone(before, { game: 317 }, TODAY));
    expect(out.message).toBe('admin: 317 no longer postponed');
    const game = find(out.changes.matches!, 317);
    expect(game.postponed).toBeUndefined();
    expect(game.revision).toBeUndefined();
    expect(changedGames(before, out.changes)).toEqual([317]);
    expect(find(before.matches, 317).postponed).toBe(true);
  });

  it('keeps an existing revision', () => {
    const before = snapshot((matches) => { find(matches, 317).revision = 2; });
    expect(find(changed(unpostpone(before, { game: 317 }, TODAY)).changes.matches!, 317).revision).toBe(2);
  });

  it('reports a game that is not postponed as unchanged', () => {
    expect(unpostpone(snapshot(), { game: 321 }, TODAY)).toEqual({ kind: 'unchanged' });
  });

  it('answers 404 for an unknown game', () => {
    expect(violationsOf(unpostpone(snapshot(), { game: 999 }, TODAY), 404)).toHaveLength(1);
  });
});

describe('reschedule', () => {
  it('moves a postponed game, bumps the revision and keeps the list sorted', () => {
    const before = snapshot();
    const out = changed(reschedule(before, { game: 317, date: '2027-01-15', time: '21:00' }, TODAY));
    expect(out.message).toBe('admin: 317 rescheduled to 2027-01-15 21:00');

    const game = find(out.changes.matches!, 317);
    const old = find(before.matches, 317);
    expect(game).toEqual({ ...old, date: '2027-01-15', time: '21:00', revision: 1, postponed: undefined });
    expect(game.postponed).toBeUndefined();
    expect(game.home).toBe(old.home);
    expect(game.away).toBe(old.away);
    expect(out.changes.matches!.map((m) => m.game).sort()).toEqual(before.matches.map((m) => m.game).sort());
    const keys = out.changes.matches!.map((m) => m.date + m.time);
    expect(keys).toEqual([...keys].sort());

    // Only the entry of that game changes: one line leaves, one line arrives.
    const lines = (matches: Match[]) => serializeMatches(matches).split('\n');
    const oldLines = new Set(lines(before.matches));
    const newLines = new Set(lines(out.changes.matches!));
    expect([...oldLines].filter((l) => !newLines.has(l))).toHaveLength(1);
    expect([...newLines].filter((l) => !oldLines.has(l))).toHaveLength(1);
    expect(find(before.matches, 317).postponed).toBe(true);
  });

  it('bumps an existing revision and can change the venue', () => {
    const before = snapshot((matches) => { find(matches, 317).revision = 1; });
    const game = find(changed(reschedule(before, { game: 317, date: '2026-12-05', time: '20:30', venue: 'cefa' }, TODAY)).changes.matches!, 317);
    expect(game.revision).toBe(2);
    expect(game.venue).toBe('cefa');
  });

  it('rejects a game that is not postponed', () => {
    expect(violationsOf(reschedule(snapshot(), { game: 321, date: '2026-12-05', time: '21:00' }, TODAY), 422)).toContainEqual(expect.stringContaining('is not postponed'));
  });

  it('rejects a date in the past, an impossible date and a malformed one', () => {
    expect(violationsOf(reschedule(snapshot(), { game: 317, date: '2026-11-11', time: '21:00' }, TODAY), 422)).toContainEqual(expect.stringContaining('before today'));
    expect(violationsOf(reschedule(snapshot(), { game: 317, date: '2027-02-30', time: '21:00' }, TODAY), 422)).toContainEqual(expect.stringContaining('not a date'));
    expect(violationsOf(reschedule(snapshot(), { game: 317, date: '15/01/2027', time: '21:00' }, TODAY), 422)).toContainEqual(expect.stringContaining('not a date'));
  });

  it('accepts today and the whole day from 00:00 to 23:59', () => {
    expect(reschedule(snapshot(), { game: 317, date: '2026-11-12', time: '00:00' }, TODAY).kind).toBe('changed');
    expect(reschedule(snapshot(), { game: 317, date: '2026-12-05', time: '23:59' }, TODAY).kind).toBe('changed');
  });

  it('rejects a malformed time', () => {
    for (const time of ['25:00', '21:60', '9:00', '21:00:00', '']) {
      expect(violationsOf(reschedule(snapshot(), { game: 317, date: '2026-12-05', time }, TODAY), 422)).toContainEqual(expect.stringContaining('not a time'));
    }
  });

  it('rejects an unknown venue', () => {
    expect(violationsOf(reschedule(snapshot(), { game: 317, date: '2026-12-05', time: '21:00', venue: 'moon' as never }, TODAY), 422)).toContainEqual(expect.stringContaining('unknown venue "moon"'));
  });

  it('rejects a month without a theme', () => {
    expect(violationsOf(reschedule(snapshot(), { game: 317, date: '2027-05-05', time: '21:00' }, TODAY), 422)).toContainEqual(expect.stringContaining('no month theme for 2027-05'));
  });

  it('rejects a day on which the same FDM side already plays', () => {
    expect(violationsOf(reschedule(snapshot(), { game: 317, date: '2026-11-16', time: '21:00' }, TODAY), 422)).toContainEqual(expect.stringContaining('FDM A: plays twice on 2026-11-16'));
  });

  it('answers 404 for an unknown game', () => {
    expect(violationsOf(reschedule(snapshot(), { game: 999, date: '2026-12-05', time: '21:00' }, TODAY), 404)).toHaveLength(1);
  });
});
