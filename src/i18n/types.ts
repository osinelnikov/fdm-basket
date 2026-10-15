export type Lang = 'en' | 'it';

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
  /** Name of a period by 0-based index: quarters, then overtimes. */
  periodName: (index: number) => string;
  resultAria: (home: string, away: string, homePoints: number, awayPoints: number, periods: string) => string;
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
