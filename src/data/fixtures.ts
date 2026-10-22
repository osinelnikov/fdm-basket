import type { Match, MonthTheme, Team, TeamId, Venue, VenueId } from './types.ts';

/**
 * Source: UISP Pallacanestro Pisa–Lucca–Livorno, Comunicato Ufficiale N° 01
 * of 11/10/2026, Serie A/2 girone "Tirreno Nord" (pp. 10–11).
 * Venue addresses: "Anagrafica Società" (pp. 4–7).
 */
export const SOURCE = {
  bulletin: 'CU 01 of 11 Oct 2026',
  league: 'UISP Serie A/2 Tirreno Nord',
  season: '2026/27',
} as const;

export const TEAMS: Record<TeamId, Team> = {
  'FDM A': { bulletinName: 'Pall. FDM “A”', official: 'ASD Pallacanestro Forte dei Marmi “A”', crest: '/logos/fdm.png', isClubLogo: true, town: 'Forte dei Marmi' },
  'FDM B': { bulletinName: 'Pall. FDM “B”', official: 'ASD Pallacanestro Forte dei Marmi “B”', crest: '/logos/fdm.png', isClubLogo: true, town: 'Forte dei Marmi' },
  Perignano: { bulletinName: 'ASD Perignano', official: 'ASD Perignano', crest: '/logos/perignano.png', isClubLogo: true, town: 'Casciana Terme Lari' },
  'CEFA Castelnuovo': { bulletinName: 'CEFA Castelnuovo', official: 'CEFA Basket Amatori Castelnuovo G.', crest: '/logos/cefa-castelnuovo.jpg', isClubLogo: true, town: 'Castelnuovo di Garfagnana' },
  'San Miniato': { bulletinName: 'Casa Cult. S. Miniato', official: 'Casa Culturale San Miniato', crest: '/logos/san-miniato.png', isClubLogo: true, town: 'San Miniato' },
  Valdera: { bulletinName: 'AB Valdera', official: 'Amatori Basket Valdera', crest: '/logos/valdera.png', isClubLogo: true, town: 'Capannoli' },
  'Pisces Lucca': { bulletinName: 'Pisces Lucca', official: 'Pisces Lucca', crest: '/logos/pisces-lucca.jpg', isClubLogo: true, town: 'Lucca' },
  'La Perla': { bulletinName: 'Pol. La Perla SMM', official: 'Polisportiva La Perla Santa Maria a Monte', crest: '/logos/la-perla.png', isClubLogo: true, town: 'Santa Maria a Monte' },
};

export const FALLBACK_CREST = '/logos/italy.png';

export const VENUES: Record<VenueId, Venue> = {
  fdm: { name: 'Palestra Ugo Guidi', address: 'Via Ignazio da Carrara 80, Forte dei Marmi (LU)', lat: 43.9689, lon: 10.156, home: true },
  cefa: { name: 'Pala CEFA', address: 'Piazza Aldo Rossi 8, Castelnuovo di Garfagnana (LU)', lat: 44.11, lon: 10.4118, approximate: true },
  valdera: { name: 'Palestra Via della Resistenza', address: 'Via della Resistenza, San Pietro Belvedere, Capannoli (PI)', lat: 43.5668, lon: 10.6718 },
  laperla: { name: 'Palestra Via Usciana', address: 'Via Usciana 10, Ponticelli, Santa Maria a Monte (PI)', lat: 43.6992, lon: 10.6943 },
  perignano: { name: 'Palestra scolastica Ciurli e Cardelli', address: 'Via Antica Pontederese, Casciana Terme (PI)', lat: 43.5295, lon: 10.619 },
  sanminiato: { name: 'Palestra Mannucci', address: 'Via G. Toniolo 21, Ponte a Egola, San Miniato (PI)', lat: 43.6848, lon: 10.7965 },
  pisces: { name: 'Palestra Scuola Elementare Sardi', address: 'Via Provinciale di Sant’Alessio, Sant’Alessio, Lucca (LU)', lat: 43.8617, lon: 10.4893, approximate: true },
};

export const MATCHES: Match[] = [
  { game: 300, date: '2026-10-14', time: '21:00', home: 'FDM A', away: 'FDM B', venue: 'fdm', sides: ['a', 'b'], derby: true,
    result: { home: 74, away: 31, periods: [[18, 8], [12, 7], [22, 12], [22, 4]] } },
  { game: 306, date: '2026-10-21', time: '21:00', home: 'FDM B', away: 'Perignano', venue: 'fdm', sides: ['b'],
    result: { home: 52, away: 67, periods: [[6, 15], [14, 13], [15, 22], [17, 17]] } },
  { game: 304, date: '2026-10-22', time: '21:30', home: 'Valdera', away: 'FDM A', venue: 'valdera', sides: ['a'] },
  { game: 310, date: '2026-10-28', time: '21:00', home: 'FDM A', away: 'Perignano', venue: 'fdm', sides: ['a'] },
  { game: 309, date: '2026-10-29', time: '21:45', home: 'CEFA Castelnuovo', away: 'FDM B', venue: 'cefa', sides: ['b'] },
  { game: 314, date: '2026-11-02', time: '21:30', home: 'Pisces Lucca', away: 'FDM A', venue: 'pisces', sides: ['a'] },
  { game: 315, date: '2026-11-04', time: '21:00', home: 'FDM B', away: 'San Miniato', venue: 'fdm', sides: ['b'] },
  { game: 317, date: '2026-11-11', time: '21:00', home: 'FDM A', away: 'CEFA Castelnuovo', venue: 'fdm', sides: ['a'] },
  { game: 319, date: '2026-11-12', time: '21:30', home: 'Valdera', away: 'FDM B', venue: 'valdera', sides: ['b'] },
  { game: 321, date: '2026-11-16', time: '21:30', home: 'La Perla', away: 'FDM A', venue: 'laperla', sides: ['a'] },
  { game: 320, date: '2026-11-18', time: '21:00', home: 'FDM B', away: 'Pisces Lucca', venue: 'fdm', sides: ['b'] },
  { game: 324, date: '2026-11-23', time: '21:30', home: 'La Perla', away: 'FDM B', venue: 'laperla', sides: ['b'] },
  { game: 325, date: '2026-11-25', time: '21:00', home: 'FDM A', away: 'San Miniato', venue: 'fdm', sides: ['a'] },
  { game: 402, date: '2026-12-02', time: '21:00', home: 'FDM B', away: 'FDM A', venue: 'fdm', sides: ['a', 'b'], derby: true },
  { game: 406, date: '2026-12-09', time: '21:00', home: 'FDM A', away: 'Valdera', venue: 'fdm', sides: ['a'] },
  { game: 405, date: '2026-12-11', time: '21:30', home: 'Perignano', away: 'FDM B', venue: 'perignano', sides: ['b'] },
  { game: 411, date: '2026-12-16', time: '21:00', home: 'FDM B', away: 'CEFA Castelnuovo', venue: 'fdm', sides: ['b'] },
  { game: 410, date: '2026-12-18', time: '21:30', home: 'Perignano', away: 'FDM A', venue: 'perignano', sides: ['a'] },
  { game: 413, date: '2027-01-12', time: '21:45', home: 'San Miniato', away: 'FDM B', venue: 'sanminiato', sides: ['b'] },
  { game: 412, date: '2027-01-13', time: '21:00', home: 'FDM A', away: 'Pisces Lucca', venue: 'fdm', sides: ['a'] },
  { game: 418, date: '2027-01-20', time: '21:00', home: 'FDM B', away: 'Valdera', venue: 'fdm', sides: ['b'] },
  { game: 419, date: '2027-01-21', time: '21:45', home: 'CEFA Castelnuovo', away: 'FDM A', venue: 'cefa', sides: ['a'] },
  { game: 422, date: '2027-01-25', time: '21:30', home: 'Pisces Lucca', away: 'FDM B', venue: 'pisces', sides: ['b'] },
  { game: 421, date: '2027-01-27', time: '21:00', home: 'FDM A', away: 'La Perla', venue: 'fdm', sides: ['a'] },
  { game: 426, date: '2027-02-02', time: '21:45', home: 'San Miniato', away: 'FDM A', venue: 'sanminiato', sides: ['a'] },
  { game: 425, date: '2027-02-03', time: '21:00', home: 'FDM B', away: 'La Perla', venue: 'fdm', sides: ['b'] },
];

export const MONTH_THEMES: Record<string, MonthTheme> = {
  '2026-10': { theme: 'oct', emoji: '🍂' },
  '2026-11': { theme: 'nov', emoji: '🍁' },
  '2026-12': { theme: 'dec', emoji: '🎄' },
  '2027-01': { theme: 'jan', emoji: '❄️' },
  '2027-02': { theme: 'feb', emoji: '🎭' },
};
