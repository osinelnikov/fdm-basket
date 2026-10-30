export type TeamId =
  | 'FDM A'
  | 'FDM B'
  | 'Perignano'
  | 'CEFA Castelnuovo'
  | 'San Miniato'
  | 'Valdera'
  | 'Pisces Lucca'
  | 'La Perla';

export type VenueId = 'fdm' | 'cefa' | 'valdera' | 'laperla' | 'perignano' | 'sanminiato' | 'pisces';

/** Which FDM side a match belongs to. A derby belongs to both. */
export type Side = 'a' | 'b';

export interface Team {
  /** Name as registered in the UISP bulletin ("Anagrafica Società"). */
  official: string;
  /** Short name as printed in the bulletin's fixture tables, used on the Italian page. */
  bulletinName: string;
  /** Path under /public. */
  crest: string;
  /** true for a club logo, false for the home town's coat of arms. */
  isClubLogo: boolean;
  town: string;
}

export interface Venue {
  name: string;
  address: string;
  lat: number;
  lon: number;
  /** FDM home court. */
  home?: boolean;
  /** Pin marks the town, not the exact gym. */
  approximate?: boolean;
}

export interface MatchResult {
  /** Final points of the home team (Match.home). */
  home: number;
  /** Final points of the away team (Match.away). */
  away: number;
  /**
   * Points per period as [home, away]: the four quarters, then any overtimes.
   * Omit when only the final score is known (the bulletin prints final scores only).
   */
  periods?: [number, number][];
}

export interface Match {
  /** Game number in the UISP bulletin. */
  game: number;
  /** Local date, YYYY-MM-DD (Europe/Rome). */
  date: string;
  /** Local tip-off, HH:MM (Europe/Rome). */
  time: string;
  home: TeamId;
  away: TeamId;
  venue: VenueId;
  sides: Side[];
  derby?: boolean;
  /**
   * Bump by one whenever date, time or venue of this match changes,
   * so calendar subscribers replace the old event.
   */
  revision?: number;
  /** Final score, once the game has been played. */
  result?: MatchResult;
  /** YouTube link to the recording of the game; only for a game with a result. */
  video?: string;
  /** Game statistics PDF, as a path under /public: `/stats/<game>.pdf`; only for a game with a result. */
  stats?: string;
}

export interface MonthTheme {
  theme: 'oct' | 'nov' | 'dec' | 'jan' | 'feb';
  emoji: string;
}

/** One team's line in the league table, as printed in the UISP bulletin. */
export interface StandingRow {
  team: TeamId;
  /** PG: games played. */
  played: number;
  /** PV: games won. */
  won: number;
  /** PP: games lost. */
  lost: number;
  /** CF: points scored. */
  pointsFor: number;
  /** CS: points conceded. */
  pointsAgainst: number;
  /** Punti: league points, two per win. */
  points: number;
}

export interface Standings {
  /** Bulletin the table is copied from, as shown on the page. */
  source: string;
  /** Bulletin date, YYYY-MM-DD. */
  date: string;
  /** In bulletin order, which already applies UISP tie-breaks. */
  rows: StandingRow[];
}
