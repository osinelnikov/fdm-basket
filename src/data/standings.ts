import type { Standings } from './types.ts';

/**
 * Serie A/2 girone "Tirreno Nord" league table after round 4 (game 313 postponed to 08/01/2027).
 * Source: UISP Pallacanestro Pisa–Lucca–Livorno, Comunicato Ufficiale N° 05 del 06/11/2026.
 * Replace the whole object with the table of each new bulletin; keep the bulletin's row order.
 */
export const STANDINGS: Standings = {
  source: 'CU 05 · 06/11/2026',
  date: '2026-11-06',
  rows: [
    { team: 'Pisces Lucca', played: 4, won: 4, lost: 0, pointsFor: 244, pointsAgainst: 191, points: 8 },
    { team: 'San Miniato', played: 4, won: 3, lost: 1, pointsFor: 246, pointsAgainst: 189, points: 6 },
    { team: 'FDM A', played: 4, won: 3, lost: 1, pointsFor: 246, pointsAgainst: 192, points: 6 },
    { team: 'CEFA Castelnuovo', played: 3, won: 2, lost: 1, pointsFor: 180, pointsAgainst: 148, points: 4 },
    { team: 'La Perla', played: 4, won: 2, lost: 2, pointsFor: 212, pointsAgainst: 190, points: 4 },
    { team: 'Perignano', played: 3, won: 1, lost: 2, pointsFor: 166, pointsAgainst: 178, points: 2 },
    { team: 'Valdera', played: 4, won: 0, lost: 4, pointsFor: 156, pointsAgainst: 227, points: 0 },
    { team: 'FDM B', played: 4, won: 0, lost: 4, pointsFor: 151, pointsAgainst: 286, points: 0 },
  ],
};
