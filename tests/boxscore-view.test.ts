import { describe, expect, it } from 'vitest';
import { MATCHES } from '../src/data/fixtures.ts';
import type { BoxScore, Match } from '../src/data/types.ts';
import { MESSAGES } from '../src/i18n/index.ts';
import { boxScoreHash, boxScoreHtml, defaultBoxTab, gameFromHash, hasBoxScore } from '../src/ui/boxscore.ts';
import { esc } from '../src/ui/format.ts';

const files = import.meta.glob<BoxScore>('../src/data/boxscores/*.json', { eager: true, import: 'default' });
const box = (game: number): BoxScore => Object.entries(files).find(([path]) => path.endsWith(`/${game}.json`))![1];
const match = (game: number): Match => MATCHES.find((m) => m.game === game)!;
const itCtx = { lang: 'it' as const, t: MESSAGES.it };
const enCtx = { lang: 'en' as const, t: MESSAGES.en };

/** The table row of a player, by the printed name. */
const rowOf = (html: string, name: string): string => html.split('<tr').find((r) => r.includes(`>${esc(name)}`))!;
const cells = (row: string): string[] => [...row.matchAll(/<t[dh][^>]*>(.*?)<\/t[dh]>/gs)].map((c) => c[1].replace(/<[^>]+>/g, ''));

describe('box score availability', () => {
  it('is known for the games with data only', () => {
    expect(hasBoxScore(310)).toBe(true);
    expect(hasBoxScore(306)).toBe(true);
    expect(hasBoxScore(999)).toBe(false);
  });
});

describe('box score link', () => {
  it('names the game in the address fragment and reads it back', () => {
    expect(boxScoreHash(310)).toBe('#box-310');
    expect(gameFromHash(boxScoreHash(310))).toBe(310);
  });

  it('ignores fragments of games without a box score and other fragments', () => {
    for (const hash of ['#box-999', '#box-', '#box-310x', '#box-3a10', '#calendar', '']) expect(gameFromHash(hash), hash).toBeUndefined();
  });
});

describe('box score dialog content', () => {
  const m = match(310);
  const b = box(310);

  it('shows both teams, the final score and the title', () => {
    const html = boxScoreHtml(m, b, enCtx);
    expect(html).toContain('id="boxscore-title">Box score · Game 310<');
    expect(html).toContain('FDM A');
    expect(html).toContain('Perignano');
    expect(html).toContain(`>${b.home.totals.pts}</span><span class="bs-colon">:</span><span class="bs-sc`);
    expect(html).toContain(`>${b.away.totals.pts}</span></span>`);
  });

  it('lists referees and spectators', () => {
    const html = boxScoreHtml(m, b, enCtx);
    expect(html).toContain('Referees: L LUCCHESI, N NATALINI');
    expect(html).toContain(`Spectators: ${b.spectators}`);
    expect(boxScoreHtml(m, b, itCtx)).toContain('Arbitri: L LUCCHESI, N NATALINI');
  });

  it('has a row per player plus the team and totals rows in each team table', () => {
    const html = boxScoreHtml(m, b, enCtx);
    const [home, away] = html.split('role="tabpanel"').slice(1);
    expect((home.match(/<tr/g) ?? []).length).toBe(1 + b.home.players.length + 2);
    expect((away.match(/<tr/g) ?? []).length).toBe(1 + b.away.players.length + 2);
    for (const p of b.home.players) expect(home).toContain(`>${esc(p.name)}`);
    expect(home).toContain('class="bs-team"');
    expect(home).toContain('class="bs-totals"');
  });

  it('formats percentages with the locale decimal separator and a dash without attempts', () => {
    const dAngiolo = b.home.players.find((p) => p.name.includes('ANGIOLO'))!;
    expect(dAngiolo.stats!.fg2).toEqual({ made: 3, att: 7 });
    expect(cells(rowOf(boxScoreHtml(m, b, itCtx), dAngiolo.name))).toContain('42,9');
    expect(cells(rowOf(boxScoreHtml(m, b, enCtx), dAngiolo.name))).toContain('42.9');
    const noFt = b.home.players.find((p) => p.stats && p.stats.ft.att === 0)!;
    expect(cells(rowOf(boxScoreHtml(m, b, enCtx), noFt.name))).toContain('–');
  });

  it('prints plus/minus with its sign', () => {
    const html = boxScoreHtml(m, b, enCtx);
    const montini = cells(rowOf(html, 'A MONTINI'));
    expect(montini.at(-1)).toBe('+9');
    const negative = b.home.players.find((p) => p.stats && p.stats.plusMinus < 0)!;
    expect(cells(rowOf(html, negative.name)).at(-1)).toBe(String(negative.stats!.plusMinus));
    const zero = [...b.home.players, ...b.away.players].find((p) => p.stats?.plusMinus === 0);
    if (zero) expect(cells(rowOf(html, zero.name)).at(-1)).toBe('0');
  });

  it('marks the starting five and the captain', () => {
    const html = boxScoreHtml(m, b, enCtx);
    expect(rowOf(html, 'A MONTINI')).toContain('class="bs-star"');
    const captain = b.home.players.find((p) => p.captain)!;
    expect(rowOf(html, captain.name)).toContain('(C)</abbr>');
    expect(html).toContain('<span aria-hidden="true">*</span> Starting five');
  });

  it('opens on the FDM side of the game', () => {
    expect(defaultBoxTab(m)).toBe('home');
    expect(defaultBoxTab({ ...m, home: 'Perignano', away: 'FDM B' })).toBe('away');
    expect(defaultBoxTab({ ...m, home: 'FDM A', away: 'FDM B' })).toBe('home');
    const away = boxScoreHtml({ ...m, home: 'Perignano', away: 'FDM B' }, b, enCtx);
    expect(away).toMatch(/id="bs-tab-away"[^>]*aria-selected="true" tabindex="0"/);
    expect(away).toMatch(/id="bs-panel-home"[^>]*hidden/);
    expect(away).not.toMatch(/id="bs-panel-away"[^>]*hidden/);
  });

  it('links the statistics PDF as a download and the video', () => {
    const html = boxScoreHtml(m, b, enCtx);
    expect(html).toContain('href="/stats/310.pdf" download');
    expect(html).toContain(`href="${m.video}" target="_blank" rel="noopener noreferrer"`);
  });

  it('shows the points of every period and the total, and no score by five minutes', () => {
    const html = boxScoreHtml(m, b, enCtx);
    const table = html.match(/<table class="bs-mini"><caption>Points by period.*?<\/table>/s)![0];
    expect(table).toContain('>Q4<');
    expect(table).toContain(`<td class="bs-sum">${b.home.totals.pts}</td>`);
    expect((html.match(/<table class="bs-mini">/g) ?? []).length).toBe(1);
    expect(html).not.toContain(`5'<`);
  });

  it('writes the team extras in the page language', () => {
    expect(boxScoreHtml(m, b, itCtx)).toContain('<dt>Punti da palle perse</dt>');
    expect(boxScoreHtml(m, b, enCtx)).toContain('<dt>Points off turnovers</dt>');
  });

  it('shows the team extras of both teams, home first, next to the periods and outside the team tabs', () => {
    const html = boxScoreHtml(m, b, enCtx);
    const overview = html.match(/<div class="bs-overview">.*?<\/dl><\/div>/s)![0];
    expect(overview).toContain('<table class="bs-mini">');
    const paint = overview.split('<div><dt>').find((w) => w.startsWith('Points in the paint'))!;
    expect(paint).toContain(`>${b.home.extras.paint} : ${b.away.extras.paint}<`);
    expect(paint).toContain(`FDM A ${b.home.extras.paint}, Perignano ${b.away.extras.paint}`);
    const bench = overview.split('<div><dt>').find((w) => w.startsWith('Bench'))!;
    expect(bench).toContain(`>${b.home.extras.bench.pts} : ${b.away.extras.bench.pts} PTS<`);
    expect(bench).toContain(`>${b.home.extras.bench.reb} : ${b.away.extras.bench.reb} REB<`);
    for (const panel of html.match(/<div role="tabpanel".*?<\/table>\s*<\/div>.*?<\/div>/gs)!) expect(panel).not.toContain('bs-extras');
  });

  it('escapes player names', () => {
    const evil: BoxScore = structuredClone(b);
    evil.home.players[0].name = '<b>X</b> & "Y"';
    const html = boxScoreHtml(m, evil, enCtx);
    expect(html).not.toContain('<b>X</b>');
    expect(html).toContain('&lt;b&gt;X&lt;/b&gt; &amp; &quot;Y&quot;');
  });
});

describe('player who did not enter the game', () => {
  it('shows one spanning cell instead of numbers', () => {
    const m = match(306);
    const html = boxScoreHtml(m, box(306), enCtx);
    const row = rowOf(html, 'S Arrigo');
    expect(row).toContain('colspan="22"');
    expect(row).toContain('>DNP<');
    expect(row).toContain('title="Did not play');
    expect((row.match(/<td/g) ?? []).length).toBe(2);
    expect(boxScoreHtml(m, box(306), itCtx)).toContain('>N.E.<');
  });
});
