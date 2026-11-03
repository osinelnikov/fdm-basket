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

/** Made and attempted shots. */
export interface ShotLine {
  made: number;
  att: number;
}

/** One line of the statistics table: a player, a period or the team total. */
export interface StatLine {
  /** Min.: playing time, "mm:ss" ("mmm:ss" for the team total). */
  min: string;
  /** PTI: points. */
  pts: number;
  /** 2 Punti R/T: two-point field goals. */
  fg2: ShotLine;
  /** 3 Punti R/T: three-point field goals. */
  fg3: ShotLine;
  /** Tiri dal campo R/T: all field goals, two- and three-pointers together. */
  fg: ShotLine;
  /** Tiri Liberi R/T: free throws. */
  ft: ShotLine;
  /** RO: offensive rebounds. */
  oreb: number;
  /** RD: defensive rebounds. */
  dreb: number;
  /** RT: total rebounds. */
  reb: number;
  /** F: personal fouls committed. */
  pf: number;
  /** Ag: fouls drawn. */
  fd: number;
  /** PR: steals. */
  stl: number;
  /** PP: turnovers. */
  tov: number;
  /** AS: assists. */
  ast: number;
  /** SD: blocks made. */
  blk: number;
  /** SS: shots blocked by an opponent. */
  blkAgainst: number;
  /** Val.: efficiency rating. */
  eff: number;
  /** +/-: point difference while on court. */
  plusMinus: number;
}

/** A player listed in the statistics table. */
export interface BoxPlayer {
  /** N.: jersey number as printed (a string: "0" and "00" are different numbers). */
  no: string;
  /** Nome: initial and surname as printed, without the captain mark, e.g. "A MONTINI". */
  name: string;
  /** A leading `*` before the number: in the starting five. */
  starter: boolean;
  /** "(C)" after the name. */
  captain: boolean;
  /** Absent for a player listed but not entered in the game ("N.E." in Min.). */
  stats?: StatLine;
}

/** One team's page of the statistics PDF. */
export interface TeamBox {
  /** Player rows in print order, i.e. by jersey number. */
  players: BoxPlayer[];
  /** Squadra/Allenatore: counting stats credited to the team and bench rather than to a player; only the printed cells. */
  team: Partial<Pick<StatLine, 'oreb' | 'dreb' | 'reb' | 'pf' | 'tov'>>;
  /** Totali. */
  totals: StatLine;
  /** Periodo 1..n: the four quarters, then any overtimes. */
  periods: StatLine[];
  /** Punteggio a intervalli di 5 minuti: this team's cumulative score every five minutes. */
  running: number[];
  extras: {
    /** Punti da Palle Perse: points off opponent turnovers. */
    pointsOffTurnovers: number;
    /** Punti in contropiede: fast-break points. */
    fastBreak: number;
    /** Punti da secondi tiri: second-chance points. */
    secondChance: number;
    /** Punti in Area: points in the paint. */
    paint: number;
    /** Quintetti: points (PTI) and rebounds (Rim) of the starting five. */
    starters: { pts: number; reb: number };
    /** Panchina: points (PTI) and rebounds (Rim) of the bench. */
    bench: { pts: number; reb: number };
  };
}

/** Detailed box score of a played game ("Tabellino dettagliato"), read from /stats/<game>.pdf by `npm run boxscore`. */
export interface BoxScore {
  /** N. Gara: game number, same as Match.game. */
  game: number;
  /** Arbitro / Arbitri: referees as printed. */
  referees: string[];
  /** Spettatori. */
  spectators: number;
  /** First page of the PDF; the Match.home team. */
  home: TeamBox;
  /** Second page of the PDF; the Match.away team. */
  away: TeamBox;
}
