import type { Standings } from './types.ts';
import standings from './standings.json';

/**
 * League table of the Serie A/2 girone "Tirreno Nord", copied from the latest UISP bulletin
 * in the bulletin's row order. The data lives in standings.json.
 */
// Data checks live in tests; the JSON literals only widen to string, hence the cast.
export const STANDINGS = standings as Standings;
