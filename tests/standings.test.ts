import { describe, expect, it } from 'vitest';
import { MATCHES, TEAMS } from '../src/data/fixtures.ts';
import { STANDINGS } from '../src/data/standings.ts';
import { validateStandings } from '../src/data/validate.ts';

describe('standings', () => {
  it('satisfy the data rules and agree with the results entered in the schedule', () => {
    expect(validateStandings(STANDINGS, MATCHES, TEAMS)).toEqual([]);
  });
});
