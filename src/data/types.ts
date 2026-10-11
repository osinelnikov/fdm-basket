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
  /** Name as registered in the UISP bulletin. */
  official: string;
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
}

export interface MonthTheme {
  theme: 'oct' | 'nov' | 'dec' | 'jan' | 'feb';
  emoji: string;
  tagline: string;
}
