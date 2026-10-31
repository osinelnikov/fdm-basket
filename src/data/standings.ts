import type { Standings } from './types.ts';

/**
 * Serie A/2 girone "Tirreno Nord" league table after round 3.
 * Source: UISP Pallacanestro Pisa–Lucca–Livorno, Comunicato Ufficiale N° 04 del 31/10/2026.
 * Replace the whole object with the table of each new bulletin; keep the bulletin's row order.
 */
export const STANDINGS: Standings = {
  source: 'CU 04 · 31/10/2026',
  date: '2026-10-31',
  rows: [
    { team: 'FDM A', played: 3, won: 3, lost: 0, pointsFor: 200, pointsAgainst: 121, points: 6 },
    { team: 'Pisces Lucca', played: 3, won: 3, lost: 0, pointsFor: 173, pointsAgainst: 145, points: 6 },
    { team: 'CEFA Castelnuovo', played: 3, won: 2, lost: 1, pointsFor: 180, pointsAgainst: 148, points: 4 },
    { team: 'San Miniato', played: 3, won: 2, lost: 1, pointsFor: 170, pointsAgainst: 154, points: 4 },
    { team: 'La Perla', played: 3, won: 1, lost: 2, pointsFor: 153, pointsAgainst: 144, points: 2 },
    { team: 'Perignano', played: 3, won: 1, lost: 2, pointsFor: 166, pointsAgainst: 178, points: 2 },
    { team: 'Valdera', played: 3, won: 0, lost: 3, pointsFor: 110, pointsAgainst: 168, points: 0 },
    { team: 'FDM B', played: 3, won: 0, lost: 3, pointsFor: 116, pointsAgainst: 210, points: 0 },
  ],
};
