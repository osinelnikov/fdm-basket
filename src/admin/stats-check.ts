import type { BoxScore, Match, TeamBox } from '../data/types.ts';

/** How a box score read from a statistics PDF fits the game it is uploaded for. */

export interface Scorer {
  no: string;
  name: string;
  pts: number;
}

export interface BoxSummary {
  /** Total points per team: home, away. */
  totals: [number, number];
  /** Points per period per team. */
  periods: [number[], number[]];
  /** Top three scorers per team. */
  scorers: [Scorer[], Scorer[]];
  /** Why the box score cannot be published with this game; undefined when it fits. */
  problem?: string;
  /** Whether the PDF belongs to another game altogether, so it must not be uploaded for this one. */
  otherGame: boolean;
}

const topScorers = (team: TeamBox): Scorer[] =>
  team.players
    .flatMap((p) => (p.stats ? [{ no: p.no, name: p.name, pts: p.stats.pts }] : []))
    .sort((a, b) => b.pts - a.pts)
    .slice(0, 3);

export function summarizeBoxScore(box: BoxScore, match: Match): BoxSummary {
  const totals: [number, number] = [box.home.totals.pts, box.away.totals.pts];
  const periods: [number[], number[]] = [box.home.periods.map((p) => p.pts), box.away.periods.map((p) => p.pts)];
  const summary: BoxSummary = { totals, periods, scorers: [topScorers(box.home), topScorers(box.away)], otherGame: false };

  const result = match.result;
  if (box.game !== match.game) {
    summary.otherGame = true;
    summary.problem = `This PDF is for game ${box.game}, not game ${match.game}`;
  } else if (!result) {
    summary.problem = `Game ${match.game} has no result yet`;
  } else if (totals[0] !== result.home || totals[1] !== result.away) {
    summary.problem = `The PDF totals ${totals[0]}–${totals[1]} differ from the game result ${result.home}–${result.away}`;
  } else if (
    result.periods &&
    (periods[0].join(',') !== result.periods.map(([h]) => h).join(',') || periods[1].join(',') !== result.periods.map(([, a]) => a).join(','))
  ) {
    summary.problem = "The PDF's period scores differ from the periods of the game result";
  }
  return summary;
}
