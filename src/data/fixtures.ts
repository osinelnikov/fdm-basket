import type { Match, MonthTheme, Team, TeamId, Venue, VenueId } from './types.ts';
import matches from './matches.json';

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

// Data checks live in tests; the JSON literals only widen to string, hence the cast.
export const MATCHES = matches as Match[];

export const MONTH_THEMES: Record<string, MonthTheme> = {
  '2026-10': { theme: 'oct', emoji: '🍂' },
  '2026-11': { theme: 'nov', emoji: '🍁' },
  '2026-12': { theme: 'dec', emoji: '🎄' },
  '2027-01': { theme: 'jan', emoji: '❄️' },
  '2027-02': { theme: 'feb', emoji: '🎭' },
};
