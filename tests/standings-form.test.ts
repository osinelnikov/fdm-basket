import { describe, expect, it } from 'vitest';
import { STANDINGS } from './fixtures/data.ts';
import {
  formFromStandings,
  formatSource,
  moveRow,
  parseBulletinNumber,
  readStandingsForm,
  standingsChanges,
  type FormError,
  type StandingsForm,
} from '../src/admin/standings-form.ts';

/** The form filled with the current table (CU 05 of 06/11/2026), then changed by `edit`. */
function form(edit: (f: StandingsForm) => void = () => {}): StandingsForm {
  const f = formFromStandings(STANDINGS);
  edit(f);
  return f;
}

const cells = (errors: FormError[]) => errors.map((e) => `${e.row ?? '-'}:${e.field ?? '-'}`);

describe('filling and reading the form', () => {
  it('fills the form from the current table, DC computed', () => {
    const f = form();
    expect(f.number).toBe('05');
    expect(f.date).toBe('2026-11-06');
    expect(f.rows).toHaveLength(8);
    expect(f.rows[0]).toEqual({ team: 'Pisces Lucca', played: '4', won: '4', lost: '0', pointsFor: '244', pointsAgainst: '191', diff: '53', points: '8' });
    expect(f.rows[6].diff).toBe('-71');
  });

  it('reads the unchanged form back as the same table, with no changes', () => {
    const { standings, errors } = readStandingsForm(form());
    expect(errors).toEqual([]);
    expect(standings).toEqual(STANDINGS);
    expect(standingsChanges(STANDINGS, standings!).any).toBe(false);
  });

  it('trims the typed numbers and accepts a DC with a plus sign', () => {
    const { standings, errors } = readStandingsForm(
      form((f) => {
        f.rows[0].played = ' 4 ';
        f.rows[0].diff = '+53';
      }),
    );
    expect(errors).toEqual([]);
    expect(standings!.rows[0].played).toBe(4);
  });
});

describe('source', () => {
  it('is formatted like the site shows it', () => {
    expect(formatSource(5, '2026-11-06')).toBe('CU 05 · 06/11/2026');
    expect(formatSource(12, '2026-12-01')).toBe('CU 12 · 01/12/2026');
  });

  it('takes the bulletin number with or without the CU prefix', () => {
    expect(parseBulletinNumber('5')).toBe(5);
    expect(parseBulletinNumber('06')).toBe(6);
    expect(parseBulletinNumber('CU 07')).toBe(7);
    expect(parseBulletinNumber('cu8')).toBe(8);
    for (const bad of ['', '0', 'x', '1000', '5a', '-5']) expect(parseBulletinNumber(bad)).toBeUndefined();
  });

  it('builds the new source and date from a new bulletin', () => {
    const { standings, errors } = readStandingsForm(
      form((f) => {
        f.number = '6';
        f.date = '2026-11-13';
      }),
    );
    expect(errors).toEqual([]);
    expect(standings!.source).toBe('CU 06 · 13/11/2026');
    expect(standings!.date).toBe('2026-11-13');
    const changes = standingsChanges(STANDINGS, standings!);
    expect(changes).toMatchObject({ source: true, date: true, any: true });
    expect(changes.cells.size).toBe(0);
  });
});

describe('form errors', () => {
  const read = (edit: (f: StandingsForm) => void) => readStandingsForm(form(edit));

  it('rejects a missing or malformed bulletin number', () => {
    const { standings, errors } = read((f) => (f.number = ''));
    expect(standings).toBeUndefined();
    expect(cells(errors)).toEqual(['-:number']);
  });

  it('rejects a date that is not in the calendar', () => {
    for (const date of ['', '2026-02-30', '06/11/2026']) {
      const { standings, errors } = read((f) => (f.date = date));
      expect(standings).toBeUndefined();
      expect(cells(errors)).toEqual(['-:date']);
    }
  });

  it('accepts only whole numbers of 0 or more in the stored columns', () => {
    for (const value of ['', '-1', '1.5', 'four']) {
      const { standings, errors } = read((f) => (f.rows[2].pointsFor = value));
      expect(standings).toBeUndefined();
      expect(cells(errors)).toContain('2:pointsFor');
      expect(errors.find((e) => e.field === 'pointsFor')!.message).toMatch(/^Row 3 \(FDM A\): CF must be a whole number, 0 or more$/);
    }
  });

  it('requires a whole DC, negative allowed', () => {
    const { errors } = read((f) => (f.rows[6].diff = 'x'));
    expect(cells(errors)).toEqual(['6:diff']);
  });

  it('checks DC against CF − CS', () => {
    const { standings, errors } = read((f) => (f.rows[2].pointsFor = '250'));
    expect(standings).toBeUndefined();
    expect(cells(errors)).toEqual(['2:diff']);
    expect(errors[0].message).toContain('DC 54 is not CF 250 − CS 192 = 58');
  });

  it('checks that PV + PP make PG', () => {
    const { errors } = read((f) => (f.rows[0].played = '5'));
    expect(cells(errors)).toEqual(['0:played']);
  });

  it('checks that Punti are two per win', () => {
    const { errors } = read((f) => (f.rows[0].points = '7'));
    expect(cells(errors)).toEqual(['0:points']);
    expect(errors[0].message).toContain('expected 8');
  });

  it('requires a team in every row', () => {
    const { errors } = read((f) => (f.rows[4].team = ''));
    expect(cells(errors)).toContain('4:team');
    expect(errors.map((e) => e.message)).toContain('Missing from the table: La Perla');
  });

  it('rejects a team listed twice, marking both rows, and names the team left out', () => {
    const { standings, errors } = read((f) => (f.rows[7].team = 'Valdera'));
    expect(standings).toBeUndefined();
    expect(cells(errors)).toEqual(['6:team', '7:team', '-:-']);
    expect(errors[2].message).toBe('Missing from the table: FDM B');
  });

  it('rejects an unknown team', () => {
    const { errors } = read((f) => (f.rows[0].team = 'Lakers'));
    expect(cells(errors)).toContain('0:team');
  });

  it('requires eight rows', () => {
    const { errors } = read((f) => f.rows.pop());
    expect(errors.map((e) => e.message)).toContain('The table must have 8 rows, it has 7');
  });
});

describe('ordering', () => {
  it('moves a row up or down and leaves the table alone at its edges', () => {
    const rows = ['a', 'b', 'c'];
    expect(moveRow(rows, 1, -1)).toEqual(['b', 'a', 'c']);
    expect(moveRow(rows, 1, 1)).toEqual(['a', 'c', 'b']);
    expect(moveRow(rows, 0, -1)).toEqual(rows);
    expect(moveRow(rows, 2, 1)).toEqual(rows);
    expect(rows).toEqual(['a', 'b', 'c']);
  });

  it('marks only the cells that differ after a change of bulletin order', () => {
    // San Miniato and FDM A have the same record and points scored; only the team and CS differ.
    const swapped = form((f) => (f.rows = moveRow(f.rows, 2, -1)));
    const { standings, errors } = readStandingsForm(swapped);
    expect(errors).toEqual([]);
    expect(standings!.rows.map((r) => r.team).slice(0, 3)).toEqual(['Pisces Lucca', 'FDM A', 'San Miniato']);
    const changes = standingsChanges(STANDINGS, standings!);
    expect([...changes.cells].sort()).toEqual(['1:pointsAgainst', '1:team', '2:pointsAgainst', '2:team']);
    expect(changes).toMatchObject({ source: false, date: false, any: true });
  });
});
