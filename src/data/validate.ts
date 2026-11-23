import type { BoxScore, Match, MonthTheme, ShotLine, StatLine, Standings, Team, TeamBox, TeamId, Venue, VenueId } from './types.ts';

/**
 * Data rules shared by the tests and by whatever writes the data files.
 * Every validator is pure and returns human-readable violations, each starting with its subject;
 * an empty list means the data is valid.
 */

export interface DataContext {
  /** Today's date in Europe/Rome, YYYY-MM-DD. */
  today: string;
  teams: Record<TeamId, Team>;
  venues: Record<VenueId, Venue>;
  monthThemes: Record<string, MonthTheme>;
  /** Whether a published statistics file exists, e.g. '/stats/310.pdf'. */
  statsExists: (path: string) => boolean;
}

const HOME_VENUE: Partial<Record<TeamId, VenueId>> = {
  'FDM A': 'fdm',
  'FDM B': 'fdm',
  Perignano: 'perignano',
  'CEFA Castelnuovo': 'cefa',
  'San Miniato': 'sanminiato',
  Valdera: 'valdera',
  'Pisces Lucca': 'pisces',
  'La Perla': 'laperla',
};

const YOUTUBE_HOSTS = ['www.youtube.com', 'youtube.com', 'm.youtube.com', 'youtu.be'];

const isCount = (n: unknown): n is number => typeof n === 'number' && Number.isInteger(n) && n >= 0;
const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

export function validateMatches(matches: readonly Match[], ctx: DataContext): string[] {
  const out: string[] = [];

  const seen = new Set<number>();
  for (const m of matches) {
    if (seen.has(m.game)) out.push(`game ${m.game}: game number is used more than once`);
    seen.add(m.game);
  }

  for (let i = 1; i < matches.length; i++) {
    const prev = matches[i - 1];
    const m = matches[i];
    if (m.date + m.time < prev.date + prev.time) {
      out.push(`game ${m.game}: is listed after game ${prev.game} but starts earlier (${m.date} ${m.time})`);
    }
  }

  for (const m of matches) {
    const known = (team: TeamId, role: string) => {
      if (ctx.teams[team] === undefined) out.push(`game ${m.game}: unknown ${role} team "${team}"`);
    };
    known(m.home, 'home');
    known(m.away, 'away');
    if (ctx.venues[m.venue] === undefined) out.push(`game ${m.game}: unknown venue "${m.venue}"`);
    if (ctx.monthThemes[m.date.slice(0, 7)] === undefined) out.push(`game ${m.game}: no month theme for ${m.date.slice(0, 7)}`);

    // A rescheduled game may move to another venue.
    const expected = HOME_VENUE[m.home];
    if (m.revision === undefined && expected !== undefined && m.venue !== expected) {
      out.push(`game ${m.game}: ${m.home} plays at "${expected}", not "${m.venue}"`);
    }

    validateResult(m, ctx, out);
    validateMedia(m, ctx, out);
  }

  for (const [side, name] of [['a', 'FDM A'], ['b', 'FDM B']] as const) {
    const byDay = new Map<string, number[]>();
    for (const m of matches.filter((x) => x.sides.includes(side))) {
      byDay.set(m.date, [...(byDay.get(m.date) ?? []), m.game]);
    }
    for (const [day, games] of byDay) {
      if (games.length > 1) out.push(`${name}: plays twice on ${day} (games ${games.join(', ')})`);
    }
  }

  return out;
}

function validateResult(m: Match, ctx: DataContext, out: string[]) {
  const r = m.result;
  if (m.postponed && (r || m.video || m.stats)) out.push(`game ${m.game}: a postponed game has no result, video or statistics`);
  if (!r) return;
  if (!isCount(r.home) || !isCount(r.away)) {
    out.push(`game ${m.game}: final score ${r.home}–${r.away} must be whole numbers, not negative`);
  }
  if (m.date > ctx.today) out.push(`game ${m.game}: has a result but is dated ${m.date}, after today (${ctx.today})`);
  if (!r.periods) return;
  if (r.periods.length < 4) out.push(`game ${m.game}: has ${r.periods.length} periods, at least 4 expected`);
  if (r.periods.some(([h, a]) => !isCount(h) || !isCount(a))) {
    out.push(`game ${m.game}: period scores must be whole numbers, not negative`);
    return;
  }
  const home = sum(r.periods.map(([h]) => h));
  const away = sum(r.periods.map(([, a]) => a));
  if (home !== r.home || away !== r.away) {
    out.push(`game ${m.game}: quarters add up to ${home}–${away}, final score is ${r.home}–${r.away}`);
  }
}

function validateMedia(m: Match, ctx: DataContext, out: string[]) {
  // An empty link is still a link: it must be a valid YouTube address like any other.
  if (!m.result) {
    if (m.video !== undefined) out.push(`game ${m.game}: has a video but no result`);
    if (m.stats) out.push(`game ${m.game}: has statistics but no result`);
  }
  if (m.video !== undefined) {
    let url: URL | undefined;
    try {
      url = new URL(m.video);
    } catch {
      out.push(`game ${m.game}: video "${m.video}" is not a valid URL`);
    }
    if (url) {
      if (url.protocol !== 'https:') out.push(`game ${m.game}: video must use https, got ${url.protocol}`);
      if (!YOUTUBE_HOSTS.includes(url.hostname)) out.push(`game ${m.game}: video host "${url.hostname}" is not YouTube`);
    }
  }
  if (m.stats) {
    if (m.stats !== `/stats/${m.game}.pdf`) out.push(`game ${m.game}: statistics path must be /stats/${m.game}.pdf, got ${m.stats}`);
    else if (!ctx.statsExists(m.stats)) out.push(`game ${m.game}: statistics file ${m.stats} does not exist`);
  }
}

export function validateStandings(standings: Standings, matches: readonly Match[], teams: Record<TeamId, Team>): string[] {
  const out: string[] = [];
  const rows = standings.rows;

  const listed = rows.map((r) => r.team);
  for (const team of Object.keys(teams) as TeamId[]) {
    const count = listed.filter((t) => t === team).length;
    if (count === 0) out.push(`${team}: missing from the table`);
    else if (count > 1) out.push(`${team}: listed ${count} times in the table`);
  }
  for (const team of listed) {
    if (teams[team] === undefined) out.push(`${team}: unknown team in the table`);
  }

  for (const r of rows) {
    if (r.won + r.lost !== r.played) out.push(`${r.team}: won ${r.won} plus lost ${r.lost} is not played ${r.played}`);
    if (r.points !== 2 * r.won) out.push(`${r.team}: ${r.points} points for ${r.won} wins, expected ${2 * r.won}`);
  }

  const total = (f: (r: (typeof rows)[number]) => number) => sum(rows.map(f));
  if (total((r) => r.won) !== total((r) => r.lost)) out.push(`table: wins ${total((r) => r.won)} and losses ${total((r) => r.lost)} do not balance`);
  if (total((r) => r.pointsFor) !== total((r) => r.pointsAgainst)) {
    out.push(`table: points scored ${total((r) => r.pointsFor)} and conceded ${total((r) => r.pointsAgainst)} do not balance`);
  }

  for (let i = 1; i < rows.length; i++) {
    if (rows[i].points > rows[i - 1].points) out.push(`${rows[i].team}: has more points than ${rows[i - 1].team} above it`);
  }

  // A bulletin may come out before it counts the latest games, e.g. on the morning of a game day,
  // so an FDM row is checked against that team's first games with a result, as many as the row has played.
  for (const team of ['FDM A', 'FDM B'] as const) {
    const r = rows.find((x) => x.team === team);
    if (!r) continue;
    // Array.sort is stable, so games starting together keep their order.
    const results = matches
      .filter((m) => m.result && m.date <= standings.date && (m.home === team || m.away === team))
      .sort((a, b) => (a.date + a.time < b.date + b.time ? -1 : a.date + a.time > b.date + b.time ? 1 : 0));
    if (!isCount(r.played) || r.played > results.length) {
      // Say which of the team's games up to the bulletin date lack a score, and that postponed ones never count.
      const unscored = matches.filter((m) => !m.result && m.date <= standings.date && (m.home === team || m.away === team));
      const games = (list: Match[]) => list.map((m) => m.game).join(', ');
      const missing = unscored.filter((m) => !m.postponed);
      const postponed = unscored.filter((m) => m.postponed);
      const parts = [`${team}: table has ${r.played} games, results have ${results.length} (${games(results) || 'none'})`];
      if (missing.length) parts.push(`no score yet for game${missing.length > 1 ? 's' : ''} ${games(missing)}`);
      if (postponed.length) parts.push(`postponed game${postponed.length > 1 ? 's' : ''} ${games(postponed)} ${postponed.length > 1 ? 'are' : 'is'} not counted`);
      out.push(parts.join('; '));
      continue;
    }
    const counted = results.slice(0, r.played);
    const games = `its first ${counted.length} games (${counted.map((m) => m.game).join(', ') || 'none'})`;
    const scored = sum(counted.map((m) => (m.home === team ? m.result!.home : m.result!.away)));
    const conceded = sum(counted.map((m) => (m.home === team ? m.result!.away : m.result!.home)));
    if (scored !== r.pointsFor) out.push(`${team}: table has ${r.pointsFor} points scored, ${games} have ${scored}`);
    if (conceded !== r.pointsAgainst) out.push(`${team}: table has ${r.pointsAgainst} points conceded, ${games} have ${conceded}`);
  }

  return out;
}

const SIDES = ['home', 'away'] as const;
const COUNTS = ['oreb', 'dreb', 'reb', 'pf', 'fd', 'stl', 'tov', 'ast', 'blk', 'blkAgainst'] as const;
const SHOTS = ['fg2', 'fg3', 'fg', 'ft'] as const;
/** Counting stats that the "Squadra/Allenatore" row can carry. */
const TEAM_ROW = ['oreb', 'dreb', 'reb', 'pf', 'tov'] as const;

function sumOf(lines: Partial<StatLine>[], key: (typeof COUNTS)[number] | 'pts'): number {
  return lines.reduce((s, line) => s + (line[key] ?? 0), 0);
}

function sumShots(lines: StatLine[], key: (typeof SHOTS)[number]): ShotLine {
  return lines.reduce((s, line) => ({ made: s.made + line[key].made, att: s.att + line[key].att }), { made: 0, att: 0 });
}

const sameShots = (a: ShotLine, b: ShotLine) => a.made === b.made && a.att === b.att;

export function validateBoxScore(box: BoxScore, match: Match | undefined): string[] {
  const found: string[] = [];
  const subject = `box score ${box.game}`;

  // Seconds of an "mm:ss" string; a malformed string is a violation and counts as zero.
  const seconds = (min: string, where: string): number => {
    const m = /^(\d+):(\d{2})$/.exec(min);
    if (!m || Number(m[2]) >= 60) {
      found.push(`${where}: minutes "${min}" are not mm:ss`);
      return 0;
    }
    return Number(m[1]) * 60 + Number(m[2]);
  };

  const checkLine = (line: StatLine, where: string) => {
    if (line.pts !== 2 * line.fg2.made + 3 * line.fg3.made + line.ft.made) {
      found.push(`${where}: points ${line.pts} do not match the made shots`);
    }
    if (line.fg.made !== line.fg2.made + line.fg3.made || line.fg.att !== line.fg2.att + line.fg3.att) {
      found.push(`${where}: field goals are not two- plus three-pointers`);
    }
    if (line.reb !== line.oreb + line.dreb) found.push(`${where}: rebounds ${line.reb} are not offensive ${line.oreb} plus defensive ${line.dreb}`);
    for (const key of SHOTS) {
      const shot = line[key];
      if (shot.made < 0 || shot.made > shot.att) found.push(`${where}: ${key} ${shot.made}/${shot.att} is impossible`);
    }
    seconds(line.min, where);
  };

  const played = (team: TeamBox) => team.players.flatMap((p) => (p.stats ? [p.stats] : []));

  for (const side of SIDES) {
    const team = box[side];
    const rival = box[side === 'home' ? 'away' : 'home'];
    const at = `${subject} ${side}`;
    const lines = played(team);

    for (const p of team.players) if (p.stats) checkLine(p.stats, `${at} player ${p.no} ${p.name}`.trimEnd());
    checkLine(team.totals, `${at} totals`);
    team.periods.forEach((p, i) => checkLine(p, `${at} period ${i + 1}`));

    if (sumOf(lines, 'pts') !== team.totals.pts) found.push(`${at}: players' points ${sumOf(lines, 'pts')}, totals ${team.totals.pts}`);
    for (const key of SHOTS) {
      if (!sameShots(sumShots(lines, key), team.totals[key])) found.push(`${at}: players' ${key} do not add up to the totals`);
    }
    for (const key of COUNTS) {
      const teamRow = (TEAM_ROW as readonly string[]).includes(key) ? (team.team[key as (typeof TEAM_ROW)[number]] ?? 0) : 0;
      if (sumOf(lines, key) + teamRow !== team.totals[key]) {
        found.push(`${at}: players' ${key} ${sumOf(lines, key)} plus team row ${teamRow} is not totals ${team.totals[key]}`);
      }
    }
    if (!Object.keys(team.team).every((k) => (TEAM_ROW as readonly string[]).includes(k))) {
      found.push(`${at}: team row has figures a team row cannot carry`);
    }

    if (sumOf(team.periods, 'pts') !== team.totals.pts) found.push(`${at}: periods' points ${sumOf(team.periods, 'pts')}, totals ${team.totals.pts}`);
    for (const key of SHOTS) {
      if (!sameShots(sumShots(team.periods, key), team.totals[key])) found.push(`${at}: periods' ${key} do not add up to the totals`);
    }
    for (const key of COUNTS) {
      if (sumOf(team.periods, key) !== team.totals[key]) found.push(`${at}: periods' ${key} ${sumOf(team.periods, key)}, totals ${team.totals[key]}`);
    }

    // Five players on court: a ten-minute quarter is 50:00, a five-minute overtime 25:00.
    const periodSeconds = (i: number) => (i < 4 ? 50 : 25) * 60;
    team.periods.forEach((p, i) => {
      if (seconds(p.min, `${at} period ${i + 1}`) !== periodSeconds(i)) found.push(`${at} period ${i + 1}: minutes ${p.min} are not ${periodSeconds(i) / 60}:00`);
    });
    const totalSeconds = seconds(team.totals.min, `${at} totals`);
    const expectedSeconds = sum(team.periods.map((_, i) => periodSeconds(i)));
    if (totalSeconds !== expectedSeconds) found.push(`${at}: total minutes ${team.totals.min} do not match the periods`);
    // The program rounds each player's time to whole seconds, so the sum can be off the total by a second.
    const playerSeconds = sum(lines.map((l) => seconds(l.min, at)));
    if (Math.abs(playerSeconds - totalSeconds) > 1) found.push(`${at}: players' minutes (${playerSeconds}s) differ from the total (${totalSeconds}s)`);

    // Five players on court: the players' plus-minus adds up to five times the team's.
    if (sum(lines.map((l) => l.plusMinus)) !== 5 * team.totals.plusMinus) found.push(`${at}: players' plus-minus is not five times the team's`);
    if (team.totals.plusMinus !== team.totals.pts - rival.totals.pts) found.push(`${at}: plus-minus ${team.totals.plusMinus} is not the point difference`);
    if (sum(team.periods.map((l) => l.plusMinus)) !== team.totals.plusMinus) found.push(`${at}: periods' plus-minus do not add up to the totals`);
    // The program credits team rebounds and charges team turnovers to the team efficiency.
    if (sum(lines.map((l) => l.eff)) + (team.team.reb ?? 0) - (team.team.tov ?? 0) !== team.totals.eff) {
      found.push(`${at}: efficiency does not add up to the totals`);
    }

    const expectedRunning = 8 + (team.periods.length - 4);
    if (team.running.length !== expectedRunning) found.push(`${at}: running score has ${team.running.length} values, expected ${expectedRunning}`);
    if (team.running[team.running.length - 1] !== team.totals.pts) found.push(`${at}: running score ends at ${team.running[team.running.length - 1]}, totals ${team.totals.pts}`);
    if (team.running.some((v, i) => i > 0 && v < team.running[i - 1])) found.push(`${at}: running score decreases`);

    const starters = team.players.filter((p) => p.starter && p.stats).map((p) => p.stats!);
    if (sumOf(starters, 'pts') !== team.extras.starters.pts) found.push(`${at}: starters' points ${sumOf(starters, 'pts')}, extras ${team.extras.starters.pts}`);
    if (sumOf(starters, 'reb') !== team.extras.starters.reb) found.push(`${at}: starters' rebounds ${sumOf(starters, 'reb')}, extras ${team.extras.starters.reb}`);
    if (team.extras.starters.pts + team.extras.bench.pts !== team.totals.pts) found.push(`${at}: starters and bench points do not add up to the totals`);
    if (team.extras.starters.reb + team.extras.bench.reb + (team.team.reb ?? 0) !== team.totals.reb) found.push(`${at}: starters and bench rebounds do not add up to the totals`);

    if (team.players.filter((p) => p.starter).length !== 5) found.push(`${at}: expected five starters`);
    if (team.players.filter((p) => p.captain).length > 1) found.push(`${at}: more than one captain`);
    if (new Set(team.players.map((p) => p.no)).size !== team.players.length) found.push(`${at}: jersey numbers are not unique`);
  }

  if (box.home.totals.blk !== box.away.totals.blkAgainst) found.push(`${subject}: home blocks ${box.home.totals.blk}, away blocks received ${box.away.totals.blkAgainst}`);
  if (box.away.totals.blk !== box.home.totals.blkAgainst) found.push(`${subject}: away blocks ${box.away.totals.blk}, home blocks received ${box.home.totals.blkAgainst}`);

  if (!match) {
    found.push(`${subject}: no match with game number ${box.game}`);
  } else {
    if (!match.result) {
      found.push(`${subject}: game ${match.game} has no result`);
    } else {
      const { result } = match;
      if (box.home.totals.pts !== result.home || box.away.totals.pts !== result.away) {
        found.push(`${subject}: totals ${box.home.totals.pts}–${box.away.totals.pts}, result is ${result.home}–${result.away}`);
      }
      if (result.periods) {
        const home = box.home.periods.map((p) => p.pts).join(',');
        const away = box.away.periods.map((p) => p.pts).join(',');
        if (home !== result.periods.map(([h]) => h).join(',') || away !== result.periods.map(([, a]) => a).join(',')) {
          found.push(`${subject}: periods differ from the result's periods`);
        }
      }
    }
    if (match.stats !== `/stats/${box.game}.pdf`) found.push(`${subject}: match links ${match.stats ?? 'no statistics'}, expected /stats/${box.game}.pdf`);
  }

  return [...new Set(found)];
}
