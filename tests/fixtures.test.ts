import { describe, expect, it } from 'vitest';
import { MATCHES, MONTH_THEMES, TEAMS, VENUES } from '../src/data/fixtures.ts';
import type { TeamId } from '../src/data/types.ts';

// Every FDM row of Serie A/2 "Tirreno Nord", copied from the bulletin CU 01 (11/10/2026), pp. 10–11.
const CU01: [number, string, string, string][] = [
  [300, '2026-10-14', '21:00', 'Pall. FDM “A” Pall. FDM “B”'],
  [304, '2026-10-22', '21:30', 'AB Valdera Pall. FDM “A”'],
  [306, '2026-10-21', '21:00', 'Pall. FDM “B” ASD Perignano'],
  [309, '2026-10-29', '21:45', 'CEFA Castelnuovo Pall. FDM “B”'],
  [310, '2026-10-28', '21:00', 'Pall. FDM “A” ASD Perignano'],
  [314, '2026-11-02', '21:30', 'Pisces Lucca Pall. FDM “A”'],
  [315, '2026-11-04', '21:00', 'Pall. FDM “B” Casa Cult. S. Miniato'],
  [317, '2026-11-11', '21:00', 'Pall. FDM “A” CEFA Castelnuovo'],
  [319, '2026-11-12', '21:30', 'AB Valdera Pall. FDM “B”'],
  [320, '2026-11-18', '21:00', 'Pall. FDM “B” Pisces Lucca'],
  [321, '2026-11-16', '21:30', 'Pol. La Perla SMM Pall. FDM “A”'],
  [324, '2026-11-23', '21:30', 'Pol. La Perla SMM Pall. FDM “B”'],
  [325, '2026-11-25', '21:00', 'Pall. FDM “A” Casa Cult. S. Miniato'],
  [402, '2026-12-02', '21:00', 'Pall. FDM “B” Pall. FDM “A”'],
  [405, '2026-12-11', '21:30', 'ASD Perignano Pall. FDM “B”'],
  [406, '2026-12-09', '21:00', 'Pall. FDM “A” AB Valdera'],
  [410, '2026-12-18', '21:30', 'ASD Perignano Pall. FDM “A”'],
  [411, '2026-12-16', '21:00', 'Pall. FDM “B” CEFA Castelnuovo'],
  [412, '2027-01-13', '21:00', 'Pall. FDM “A” Pisces Lucca'],
  [413, '2027-01-12', '21:45', 'Casa Cult. S. Miniato Pall. FDM “B”'],
  [418, '2027-01-20', '21:00', 'Pall. FDM “B” AB Valdera'],
  [419, '2027-01-21', '21:45', 'CEFA Castelnuovo Pall. FDM “A”'],
  [421, '2027-01-27', '21:00', 'Pall. FDM “A” Pol. La Perla SMM'],
  [422, '2027-01-25', '21:30', 'Pisces Lucca Pall. FDM “B”'],
  [425, '2027-02-03', '21:00', 'Pall. FDM “B” Pol. La Perla SMM'],
  [426, '2027-02-02', '21:45', 'Casa Cult. S. Miniato Pall. FDM “A”'],
];

const BULLETIN_NAMES: [string, TeamId][] = [
  ['Pall. FDM “A”', 'FDM A'],
  ['Pall. FDM “B”', 'FDM B'],
  ['ASD Perignano', 'Perignano'],
  ['CEFA Castelnuovo', 'CEFA Castelnuovo'],
  ['Casa Cult. S. Miniato', 'San Miniato'],
  ['AB Valdera', 'Valdera'],
  ['Pisces Lucca', 'Pisces Lucca'],
  ['Pol. La Perla SMM', 'La Perla'],
];

function parsePairing(text: string): [TeamId, TeamId] {
  const home = BULLETIN_NAMES.find(([name]) => text.startsWith(name + ' '));
  if (!home) throw new Error(`Unknown home team in "${text}"`);
  const rest = text.slice(home[0].length + 1);
  const away = BULLETIN_NAMES.find(([name]) => rest === name);
  if (!away) throw new Error(`Unknown away team in "${text}"`);
  return [home[1], away[1]];
}

const OPPONENTS: TeamId[] = ['Perignano', 'CEFA Castelnuovo', 'San Miniato', 'Valdera', 'Pisces Lucca', 'La Perla'];

describe('fixtures match bulletin CU 01', () => {
  it('lists exactly the FDM games of the bulletin', () => {
    expect(MATCHES.map((m) => m.game).sort()).toEqual(CU01.map(([n]) => n).sort());
  });

  it.each(CU01)('game %i has the bulletin date, time and teams', (game, date, time, pairing) => {
    const m = MATCHES.find((x) => x.game === game)!;
    const [home, away] = parsePairing(pairing);
    expect({ date: m.date, time: m.time, home: m.home, away: m.away }).toEqual({ date, time, home, away });
  });
});

describe('fixtures are internally consistent', () => {
  it('is sorted by date and time', () => {
    const keys = MATCHES.map((m) => m.date + m.time);
    expect(keys).toEqual([...keys].sort());
  });

  it.each(['FDM A', 'FDM B'] as const)('%s plays 14 games, every opponent once at home and once away', (team) => {
    const side = team === 'FDM A' ? 'a' : 'b';
    const games = MATCHES.filter((m) => m.home === team || m.away === team);
    expect(games).toHaveLength(14);
    expect(games.every((m) => m.sides.includes(side))).toBe(true);
    const other = team === 'FDM A' ? 'FDM B' : 'FDM A';
    for (const opp of [...OPPONENTS, other]) {
      expect(games.filter((m) => m.home === team && m.away === opp), `${team} home vs ${opp}`).toHaveLength(1);
      expect(games.filter((m) => m.home === opp && m.away === team), `${team} away at ${opp}`).toHaveLength(1);
    }
  });

  it('marks exactly the two A–B games as derbies on both sides', () => {
    const derbies = MATCHES.filter((m) => m.derby);
    expect(derbies.map((m) => m.game)).toEqual([300, 402]);
    expect(derbies.every((m) => m.sides.length === 2)).toBe(true);
  });

  it('plays home games at Ugo Guidi and away games at the opponent venue', () => {
    const venueOf: Record<string, string> = {
      Perignano: 'perignano', 'CEFA Castelnuovo': 'cefa', 'San Miniato': 'sanminiato',
      Valdera: 'valdera', 'Pisces Lucca': 'pisces', 'La Perla': 'laperla',
    };
    for (const m of MATCHES) {
      const expected = m.home.startsWith('FDM') ? 'fdm' : venueOf[m.home];
      expect(m.venue, `game ${m.game}`).toBe(expected);
    }
  });

  it('never schedules one FDM side twice on the same day', () => {
    for (const side of ['a', 'b'] as const) {
      const days = MATCHES.filter((m) => m.sides.includes(side)).map((m) => m.date);
      expect(new Set(days).size).toBe(days.length);
    }
  });

  it('stores team names exactly as printed in the bulletin', () => {
    for (const [bulletin, id] of BULLETIN_NAMES) expect(TEAMS[id].bulletinName).toBe(bulletin);
  });

  it('references only known teams, venues and month themes', () => {
    for (const m of MATCHES) {
      expect(TEAMS[m.home]).toBeDefined();
      expect(TEAMS[m.away]).toBeDefined();
      expect(VENUES[m.venue]).toBeDefined();
      expect(MONTH_THEMES[m.date.slice(0, 7)], `theme for ${m.date}`).toBeDefined();
    }
  });
});

describe('results', () => {
  const played = MATCHES.filter((m) => m.result);
  const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

  it('records game 300 as reported: 74–31, quarters 18–8, 12–7, 22–12, 22–4', () => {
    expect(MATCHES.find((m) => m.game === 300)!.result).toEqual({
      home: 74, away: 31, periods: [[18, 8], [12, 7], [22, 12], [22, 4]],
    });
  });

  it('records game 304 with the final score only: Valdera 33, FDM A 54 (CU 03)', () => {
    expect(MATCHES.find((m) => m.game === 304)!.result).toEqual({ home: 33, away: 54 });
  });

  it.each(played.map((m) => [m.game, m] as const))('game %i: final score is valid, periods (when known) add up to it', (_, m) => {
    const r = m.result!;
    expect(Number.isInteger(r.home) && r.home >= 0 && Number.isInteger(r.away) && r.away >= 0).toBe(true);
    if (!r.periods) return;
    expect(r.periods.length).toBeGreaterThanOrEqual(4);
    for (const [h, a] of r.periods) {
      expect(Number.isInteger(h) && h >= 0 && Number.isInteger(a) && a >= 0).toBe(true);
    }
    expect(sum(r.periods.map(([h]) => h))).toBe(r.home);
    expect(sum(r.periods.map(([, a]) => a))).toBe(r.away);
  });

  it('has results only for games that have already been played', () => {
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Rome' }).format(new Date());
    for (const m of played) expect(m.date <= today, `game ${m.game} on ${m.date}`).toBe(true);
  });
});
