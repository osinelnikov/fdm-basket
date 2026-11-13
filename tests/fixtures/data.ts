import type { BoxScore, Match, Standings } from '../../src/data/types.ts';
import matches from './data/matches.json' with { type: 'json' };
import standings from './data/standings.json' with { type: 'json' };

/**
 * A frozen copy of the league data as of CU 05 (6 Nov 2026), for tests of code behaviour.
 * The live files in src/data and public/stats change whenever the admin area saves, so behaviour tests
 * read this snapshot; only the data checks (fixtures, standings, box score files, serialization) read the live files.
 * Game 317 and 319 are postponed, game 321 has no score yet, box scores exist for games 306, 309, 310 and 314.
 */
export const MATCHES = matches as Match[];
export const STANDINGS = standings as Standings;

const boxFiles = import.meta.glob<BoxScore>('./data/boxscores/*.json', { eager: true, import: 'default' });
export const BOX_SCORES: Record<number, BoxScore> = Object.fromEntries(Object.values(boxFiles).map((box) => [box.game, box]));

/** Games whose statistics PDF the snapshot lists. */
export const STATS_PATHS: string[] = MATCHES.flatMap((m) => (m.stats ? [m.stats] : []));

/** The only statistics PDF kept with the snapshot, for tests that need real PDF bytes. */
export const PDF_GAME = 310;
export const PDF_URL = new URL('./data/stats/310.pdf', import.meta.url);
