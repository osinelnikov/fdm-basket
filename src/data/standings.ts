import type { Standings } from './types.ts';

/**
 * Serie A/2 girone "Tirreno Nord" league table.
 * Source: UISP Pallacanestro Pisa–Lucca–Livorno, Comunicato Ufficiale N° 02 del 17/10/2026, p. 10.
 * Replace the whole object with the table of each new bulletin; keep the bulletin's row order.
 */
export const STANDINGS: Standings = {
  source: 'CU 02 · 17/10/2026',
  date: '2026-10-17',
  rows: [
    { team: 'FDM A', played: 1, won: 1, lost: 0, pointsFor: 74, pointsAgainst: 31, points: 2 },
    { team: 'San Miniato', played: 1, won: 1, lost: 0, pointsFor: 64, pointsAgainst: 47, points: 2 },
    { team: 'La Perla', played: 1, won: 1, lost: 0, pointsFor: 54, pointsAgainst: 42, points: 2 },
    { team: 'Pisces Lucca', played: 1, won: 1, lost: 0, pointsFor: 69, pointsAgainst: 64, points: 2 },
    { team: 'CEFA Castelnuovo', played: 1, won: 0, lost: 1, pointsFor: 64, pointsAgainst: 69, points: 0 },
    { team: 'Perignano', played: 1, won: 0, lost: 1, pointsFor: 42, pointsAgainst: 54, points: 0 },
    { team: 'Valdera', played: 1, won: 0, lost: 1, pointsFor: 47, pointsAgainst: 64, points: 0 },
    // The bulletin prints PG 0 for FDM "B"; corrected to 1: game 300 was played and is counted in PP, CF and CS.
    { team: 'FDM B', played: 1, won: 0, lost: 1, pointsFor: 31, pointsAgainst: 74, points: 0 },
  ],
};
