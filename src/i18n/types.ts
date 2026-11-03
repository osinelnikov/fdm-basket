export type Lang = 'en' | 'it';

export type StandingsColumn = 'pos' | 'team' | 'played' | 'won' | 'lost' | 'pointsFor' | 'pointsAgainst' | 'diff' | 'points';

export type BoxColumn =
  | 'no' | 'player' | 'min' | 'pts' | 'fg2' | 'fg2p' | 'fg3' | 'fg3p' | 'fg' | 'fgp' | 'ft' | 'ftp'
  | 'oreb' | 'dreb' | 'reb' | 'ast' | 'stl' | 'tov' | 'blk' | 'blkAgainst' | 'pf' | 'fd' | 'eff' | 'plusMinus';

export type BoxExtra = 'pointsOffTurnovers' | 'fastBreak' | 'secondChance' | 'paint' | 'starters' | 'bench';

/** Order of the buttons in the language switch. */
export const LANGS: readonly Lang[] = ['it', 'en'];

export interface Messages {
  /** BCP 47 locale for dates. */
  locale: string;
  title: string;
  metaDescription: string;
  langSwitch: string;
  /** Name of the language in itself, for the switch button. */
  langName: string;
  eyebrow: string;
  heroTitleHtml: string;
  heroIntroHtml: string;
  logoAlt: string;
  standingsTitle: string;
  standingsSource: (source: string) => string;
  /** [column heading, full name for the tooltip] */
  standingsColumns: Record<StandingsColumn, [string, string]>;
  mapTitle: string;
  mapSubtitle: string;
  mapAria: string;
  legendHome: string;
  legendAway: string;
  legendApprox: string;
  statB: string;
  statA: string;
  statAway: string;
  statAll: string;
  filterAria: string;
  filterAll: string;
  filterB: string;
  filterA: string;
  filterAway: string;
  expandAll: string;
  collapseAll: string;
  tagB: string;
  tagA: string;
  tagAway: string;
  tagHome: string;
  tagDerby: string;
  gameNo: (game: number) => string;
  tagFinal: string;
  tagNext: string;
  /** Name of a period by 0-based index: quarters, then overtimes. */
  periodName: (index: number) => string;
  /** `periods` is empty when only the final score is known. */
  resultAria: (home: string, away: string, homePoints: number, awayPoints: number, periods: string) => string;
  /** Label of the YouTube icon of a played game. */
  watchVideo: (game: number) => string;
  /** Label of the statistics PDF icon of a played game. */
  statsPdf: (game: number) => string;
  /** Label of the statistics icon that opens the box score of a played game. */
  openBoxScore: (game: number) => string;
  boxScoreTitle: (game: number) => string;
  boxClose: string;
  boxLoading: string;
  boxError: string;
  boxReferees: string;
  boxSpectators: string;
  /** Caption of the points-per-period table. */
  boxByPeriod: string;
  boxTotal: string;
  /** Accessible name of the team switch. */
  boxTeamsAria: string;
  boxTableCaption: (team: string) => string;
  /** [column heading, full name for the tooltip] */
  boxColumns: Record<BoxColumn, [string, string]>;
  /** Row of the counting stats credited to the team rather than to a player. */
  boxTeamRow: string;
  boxTotals: string;
  /** Meaning of the mark before a starter's name. */
  boxStarter: string;
  boxCaptain: string;
  /** Cell of a player who was listed but did not enter the game. */
  boxDnp: string;
  boxDnpTitle: string;
  boxExtras: Record<BoxExtra, string>;
  vs: string;
  addToGoogle: string;
  openInMaps: string;
  pinApprox: string;
  monthGames: (n: number) => string;
  monthAway: (n: number) => string;
  /** Keyed by YYYY-MM. */
  monthTaglines: Record<string, string>;
  noticeHtml: string;
  calTitle: string;
  calText: string;
  calSubscribe: string;
  calGoogle: string;
  calDownload: string;
  copyLink: string;
  copied: string;
  copyFallback: string;
  footerHtml: string;
  crestAltLogo: (team: string) => string;
  crestAltArms: (team: string, town: string) => string;
  gcalTitle: (home: string, away: string) => string;
  gcalDetails: (game: number, mapUrl: string) => string;
}

/** Keys whose value is plain text or trusted markup, usable from data-i18n attributes. */
export type StaticKey = { [K in keyof Messages]: Messages[K] extends string ? K : never }[keyof Messages];
