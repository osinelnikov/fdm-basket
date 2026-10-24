import type { Standings } from './types.ts';

/**
 * Serie A/2 girone "Tirreno Nord" league table after round 2.
 * Source: UISP Pallacanestro Pisa–Lucca–Livorno, Comunicato Ufficiale N° 03 del 24/10/2026, p. 9.
 * Replace the whole object with the table of each new bulletin; keep the bulletin's row order.
 */
export const STANDINGS: Standings = {
  source: 'CU 03 · 24/10/2026',
  date: '2026-10-24',
  rows: [
    { team: 'FDM A', played: 2, won: 2, lost: 0, pointsFor: 128, pointsAgainst: 64, points: 4 },
    { team: 'Pisces Lucca', played: 2, won: 2, lost: 0, pointsFor: 123, pointsAgainst: 115, points: 4 },
    { team: 'San Miniato', played: 2, won: 1, lost: 1, pointsFor: 115, pointsAgainst: 101, points: 2 },
    { team: 'La Perla', played: 2, won: 1, lost: 1, pointsFor: 100, pointsAgainst: 89, points: 2 },
    { team: 'Perignano', played: 2, won: 1, lost: 1, pointsFor: 109, pointsAgainst: 106, points: 2 },
    { team: 'CEFA Castelnuovo', played: 2, won: 1, lost: 1, pointsFor: 111, pointsAgainst: 115, points: 2 },
    { team: 'Valdera', played: 2, won: 0, lost: 2, pointsFor: 80, pointsAgainst: 118, points: 0 },
    { team: 'FDM B', played: 2, won: 0, lost: 2, pointsFor: 83, pointsAgainst: 141, points: 0 },
  ],
};
