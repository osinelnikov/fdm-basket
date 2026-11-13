import { describe, expect, it } from 'vitest';
import { MONTH_THEMES, TEAMS, VENUES } from '../src/data/fixtures.ts';
import { BOX_SCORES, MATCHES, STANDINGS, STATS_PATHS } from './fixtures/data.ts';
import type { Match, Standings, TeamId, VenueId } from '../src/data/types.ts';
import { validateBoxScore, validateMatches, validateStandings, type DataContext } from '../src/data/validate.ts';

const ctx: DataContext = {
  today: '2026-11-12',
  teams: TEAMS,
  venues: VENUES,
  monthThemes: MONTH_THEMES,
  statsExists: (path) => STATS_PATHS.includes(path),
};

/** A copy of the schedule snapshot to break one rule in; `change` gets the copy and the match of a game. */
function matchesWith(game: number, change: (m: Match, all: Match[]) => void): Match[] {
  const all = structuredClone(MATCHES) as Match[];
  change(all.find((m) => m.game === game)!, all);
  return all;
}

describe('validateMatches', () => {
  it('accepts the schedule snapshot', () => {
    expect(validateMatches(structuredClone(MATCHES), ctx)).toEqual([]);
  });

  it('rejects a game number used twice', () => {
    expect(validateMatches(matchesWith(304, (m) => { m.game = 306; }), ctx)).toContainEqual(expect.stringContaining('game 306: game number is used more than once'));
  });

  it('rejects a schedule that is not sorted by date and time', () => {
    const all = structuredClone(MATCHES) as Match[];
    [all[0], all[1]] = [all[1], all[0]];
    expect(validateMatches(all, ctx)).toContainEqual(expect.stringContaining('starts earlier'));
  });

  it('rejects an unknown team and an unknown venue', () => {
    expect(validateMatches(matchesWith(310, (m) => { m.away = 'Nowhere' as TeamId; }), ctx)).toContainEqual(expect.stringContaining('game 310: unknown away team'));
    expect(validateMatches(matchesWith(310, (m) => { m.venue = 'moon' as VenueId; }), ctx)).toContainEqual(expect.stringContaining('game 310: unknown venue'));
  });

  it('rejects a date without a month theme', () => {
    expect(validateMatches(matchesWith(425, (m) => { m.date = '2027-03-03'; }), ctx)).toContainEqual(expect.stringContaining('game 425: no month theme'));
  });

  it('rejects a wrong venue unless the game was rescheduled', () => {
    expect(validateMatches(matchesWith(310, (m) => { m.venue = 'cefa'; }), ctx)).toContainEqual(expect.stringContaining('game 310: FDM A plays at "fdm"'));
    expect(validateMatches(matchesWith(310, (m) => { m.venue = 'cefa'; m.revision = 1; }), ctx)).toEqual([]);
  });

  it('rejects one FDM side playing twice on the same day', () => {
    // The derby of game 300 belongs to both sides, so a second B game on its day collides.
    expect(validateMatches(matchesWith(306, (m) => { m.date = '2026-10-14'; }), ctx)).toContainEqual(expect.stringContaining('FDM B: plays twice on 2026-10-14'));
  });

  it('rejects a score that is negative or not whole', () => {
    expect(validateMatches(matchesWith(310, (m) => { m.result!.home = -1; }), ctx)).toContainEqual(expect.stringContaining('game 310: final score'));
    expect(validateMatches(matchesWith(310, (m) => { m.result!.home = 72.5; }), ctx)).toContainEqual(expect.stringContaining('game 310: final score'));
  });

  it('rejects fewer than four periods and periods that do not add up', () => {
    expect(validateMatches(matchesWith(310, (m) => { m.result!.periods = m.result!.periods!.slice(0, 3); }), ctx)).toContainEqual(expect.stringContaining('game 310: has 3 periods'));
    expect(validateMatches(matchesWith(310, (m) => { m.result!.periods![0][0] += 1; }), ctx)).toContainEqual(expect.stringContaining('game 310: quarters add up to 73–57, final score is 72–57'));
  });

  it('rejects a result dated after today', () => {
    expect(validateMatches(structuredClone(MATCHES), { ...ctx, today: '2026-10-27' })).toContainEqual(expect.stringContaining('game 310: has a result but is dated 2026-10-28'));
  });

  it('rejects a postponed game with a result', () => {
    expect(validateMatches(matchesWith(317, (m) => { m.result = { home: 1, away: 0 }; }), ctx)).toContainEqual(expect.stringContaining('game 317: a postponed game'));
  });

  it('rejects a video or statistics without a result', () => {
    expect(validateMatches(matchesWith(317, (m) => { m.video = 'https://youtu.be/abc'; }), ctx)).toContainEqual(expect.stringContaining('game 317: has a video but no result'));
    expect(validateMatches(matchesWith(317, (m) => { m.stats = '/stats/317.pdf'; }), ctx)).toContainEqual(expect.stringContaining('game 317: has statistics but no result'));
  });

  it('accepts only https YouTube video links', () => {
    expect(validateMatches(matchesWith(306, (m) => { m.video = 'http://youtu.be/abc'; }), ctx)).toContainEqual(expect.stringContaining('game 306: video must use https'));
    expect(validateMatches(matchesWith(306, (m) => { m.video = 'https://vimeo.com/1'; }), ctx)).toContainEqual(expect.stringContaining('game 306: video host "vimeo.com" is not YouTube'));
    expect(validateMatches(matchesWith(306, (m) => { m.video = 'not a url'; }), ctx)).toContainEqual(expect.stringContaining('game 306: video "not a url" is not a valid URL'));
    expect(validateMatches(matchesWith(306, (m) => { m.video = ''; }), ctx)).toContainEqual(expect.stringContaining('game 306: video "" is not a valid URL'));
    expect(validateMatches(matchesWith(321, (m) => { m.video = ''; }), ctx)).toContainEqual(expect.stringContaining('game 321: has a video but no result'));
  });

  it('requires the statistics file at the game path', () => {
    expect(validateMatches(matchesWith(306, (m) => { m.stats = '/stats/999.pdf'; }), ctx)).toContainEqual(expect.stringContaining('game 306: statistics path must be /stats/306.pdf'));
    expect(validateMatches(structuredClone(MATCHES), { ...ctx, statsExists: () => false })).toContainEqual(expect.stringContaining('game 306: statistics file /stats/306.pdf does not exist'));
  });
});

describe('validateStandings', () => {
  const standingsWith = (change: (s: Standings) => void): Standings => {
    const s = structuredClone(STANDINGS);
    change(s);
    return s;
  };
  const check = (s: Standings) => validateStandings(s, MATCHES, TEAMS);

  it('accepts the table snapshot', () => {
    expect(check(structuredClone(STANDINGS))).toEqual([]);
  });

  it('rejects a missing team', () => {
    expect(check(standingsWith((s) => { s.rows = s.rows.filter((r) => r.team !== 'FDM B'); }))).toContainEqual(expect.stringContaining('FDM B: missing from the table'));
  });

  it('rejects wins plus losses that differ from the games played', () => {
    expect(check(standingsWith((s) => { s.rows[0].played += 1; }))).toContainEqual(expect.stringContaining('Pisces Lucca: won 4 plus lost 0 is not played 5'));
  });

  it('rejects points that are not two per win', () => {
    expect(check(standingsWith((s) => { s.rows[0].points = 7; }))).toContainEqual(expect.stringContaining('Pisces Lucca: 7 points for 4 wins'));
  });

  it('rejects a table that does not balance across the group', () => {
    expect(check(standingsWith((s) => { s.rows[6].pointsFor += 1; }))).toContainEqual(expect.stringContaining('table: points scored'));
  });

  it('rejects rows not ordered by points', () => {
    expect(check(standingsWith((s) => { [s.rows[0], s.rows[7]] = [s.rows[7], s.rows[0]]; }))).toContainEqual(expect.stringContaining('has more points than'));
  });

  it('rejects an FDM row that disagrees with the results', () => {
    expect(check(standingsWith((s) => { s.rows.find((r) => r.team === 'FDM A')!.pointsFor += 1; }))).toContainEqual(expect.stringContaining('FDM A: table has 247 points scored, its first 4 games (300, 304, 310, 314) have 246'));
  });

  it('rejects an FDM row with more games than results', () => {
    expect(check(standingsWith((s) => { s.rows.find((r) => r.team === 'FDM A')!.played += 1; }))).toContainEqual(expect.stringContaining('FDM A: table has 5 games, results have 4'));
  });

  describe('a table that does not count the latest FDM result yet', () => {
    // A bulletin of 16 Nov published before game 321 (La Perla–FDM A) of that evening was played.
    const later = (change?: (s: Standings) => void) => standingsWith((s) => { s.date = '2026-11-16'; change?.(s); });
    const with321 = matchesWith(321, (m) => { m.result = { home: 50, away: 60 }; });

    it('is accepted', () => {
      expect(validateStandings(later(), with321, TEAMS)).toEqual([]);
    });

    it('is compared with the games it counts', () => {
      const s = later((t) => { t.rows.find((r) => r.team === 'FDM A')!.pointsAgainst -= 1; t.rows[0].pointsFor -= 1; });
      expect(validateStandings(s, with321, TEAMS)).toEqual(['FDM A: table has 191 points conceded, its first 4 games (300, 304, 310, 314) have 192']);
    });
  });
});

describe('validateBoxScore', () => {
  const box = () => structuredClone(BOX_SCORES[310]);
  const match = () => structuredClone(MATCHES.find((m) => m.game === 310)!) as Match;

  it('accepts a box score snapshot', () => {
    expect(validateBoxScore(box(), match())).toEqual([]);
  });

  it('rejects totals that differ from the result', () => {
    const m = match();
    m.result!.home = 73;
    expect(validateBoxScore(box(), m)).toContainEqual(expect.stringContaining('box score 310: totals 72–57, result is 73–57'));
  });

  it('rejects a player line that does not add up', () => {
    const b = box();
    b.home.players.find((p) => p.stats)!.stats!.pts += 1;
    expect(validateBoxScore(b, match())).toContainEqual(expect.stringContaining('box score 310 home'));
  });

  it('reports malformed minutes instead of throwing', () => {
    const b = box();
    b.home.players.find((p) => p.stats)!.stats!.min = 'abc';
    expect(validateBoxScore(b, match())).toContainEqual(expect.stringContaining('minutes "abc" are not mm:ss'));
  });

  it('rejects a box score without a match', () => {
    expect(validateBoxScore(box(), undefined)).toContainEqual(expect.stringContaining('box score 310: no match with game number 310'));
  });
});
