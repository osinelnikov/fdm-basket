import { describe, expect, it } from 'vitest';
import { gcalUrl } from '../src/calendar/gcal.ts';
import { MATCHES, MONTH_THEMES } from '../src/data/fixtures.ts';
import { LANGS, MESSAGES, resolveLang, teamName } from '../src/i18n/index.ts';
import { formatDate } from '../src/ui/format.ts';

describe('dictionaries', () => {
  it('offer Italian and English', () => {
    expect([...LANGS].sort()).toEqual(['en', 'it']);
  });

  it.each(LANGS)('%s has every key with non-empty, non-Cyrillic text', (lang) => {
    const t = MESSAGES[lang];
    expect(Object.keys(t).sort()).toEqual(Object.keys(MESSAGES.en).sort());
    for (const [key, value] of Object.entries(t)) {
      const samples =
        typeof value === 'function' ? [value(1, 'x'), value(3, 'y')]
        : typeof value === 'object' ? Object.values(value as Record<string, string>)
        : [value as string];
      for (const s of samples) {
        expect(String(s).trim(), `${lang}.${key}`).not.toBe('');
        expect(String(s), `${lang}.${key}`).not.toMatch(/[Ѐ-ӿ]/);
      }
    }
  });

  it.each(LANGS)('%s has a tagline for every month with games', (lang) => {
    for (const key of Object.keys(MONTH_THEMES)) expect(MESSAGES[lang].monthTaglines[key], `${lang} ${key}`).toBeTruthy();
  });

  it('really translates the page into Italian', () => {
    const differ = (['filterAll', 'tagAway', 'tagHome', 'calTitle', 'noticeHtml', 'footerHtml'] as const)
      .filter((k) => MESSAGES.it[k] === MESSAGES.en[k]);
    expect(differ).toEqual([]);
    expect(MESSAGES.it.gameNo(300)).toBe('Gara n° 300');
    expect(MESSAGES.it.monthGames(1)).toBe('1 gara');
    expect(MESSAGES.it.monthGames(5)).toBe('5 gare');
  });
});

describe('team names', () => {
  it('uses the bulletin names on the Italian page and short names in English', () => {
    expect(teamName('FDM A', 'it')).toBe('Pall. FDM “A”');
    expect(teamName('San Miniato', 'it')).toBe('Casa Cult. S. Miniato');
    expect(teamName('La Perla', 'it')).toBe('Pol. La Perla SMM');
    expect(teamName('Valdera', 'it')).toBe('AB Valdera');
    expect(teamName('Valdera', 'en')).toBe('Valdera');
  });
});

describe('language choice', () => {
  it('prefers ?lang= in the URL', () => {
    expect(resolveLang('?lang=it', 'en', ['en-GB'])).toBe('it');
    expect(resolveLang('?lang=en', 'it', ['it-IT'])).toBe('en');
  });

  it('then the saved choice', () => {
    expect(resolveLang('', 'it', ['en-US'])).toBe('it');
  });

  it('then the first Italian or English browser language', () => {
    expect(resolveLang('', null, ['it-IT', 'en'])).toBe('it');
    expect(resolveLang('', null, ['ru-RU', 'it'])).toBe('it');
    expect(resolveLang('', null, ['de-DE', 'en-GB', 'it'])).toBe('en');
  });

  it('falls back to English and ignores unknown values', () => {
    expect(resolveLang('?lang=fr', 'de', ['ru'])).toBe('en');
    expect(resolveLang('', null, [])).toBe('en');
  });
});

describe('Italian formatting', () => {
  it('writes dates the Italian way', () => {
    expect(formatDate('2026-10-14', { weekday: 'short' }, 'it-IT')).toBe('mer');
    expect(formatDate('2026-10-14', { month: 'short' }, 'it-IT')).toBe('ott');
    expect(formatDate('2027-02-02', { month: 'long', year: 'numeric' }, 'it-IT')).toBe('febbraio 2027');
  });

  it('fills the Google Calendar event in Italian with bulletin names', () => {
    const url = new URL(gcalUrl(MATCHES.find((m) => m.game === 304)!, 'it'));
    expect(url.searchParams.get('text')).toBe('🏀 AB Valdera - Pall. FDM “A”');
    expect(url.searchParams.get('details')).toContain('Gara n° 304');
    expect(url.searchParams.get('dates')).toBe('20261022T213000/20261022T233000');
  });
});
