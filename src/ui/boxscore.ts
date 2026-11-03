import { FALLBACK_CREST, MATCHES, VENUES } from '../data/fixtures.ts';
import type { BoxPlayer, BoxScore, Match, ShotLine, StatLine, TeamBox } from '../data/types.ts';
import { teamName } from '../i18n';
import type { BoxColumn } from '../i18n/types.ts';
import type { ViewContext } from './context.ts';
import { crest } from './crest.ts';
import { esc, formatDate } from './format.ts';

export type BoxTab = 'home' | 'away';

/** One box score per game, each loaded on demand as its own chunk. */
const LOADERS = import.meta.glob<BoxScore>('../data/boxscores/*.json', { import: 'default' });
const gameOf = (path: string): number => Number(/(\d+)\.json$/.exec(path)![1]);
const BOX_GAMES = new Set(Object.keys(LOADERS).map(gameOf));

export const hasBoxScore = (game: number): boolean => BOX_GAMES.has(game);

/** Address fragment of a game's box score, so a link can open it directly, e.g. "#box-310". */
export const boxScoreHash = (game: number): string => `#box-${game}`;

/** The game whose box score the address fragment names; undefined when there is no such box score. */
export function gameFromHash(hash: string): number | undefined {
  const found = /^#box-(\d+)$/.exec(hash);
  const game = found ? Number(found[1]) : undefined;
  return game !== undefined && hasBoxScore(game) ? game : undefined;
}

function loadBoxScore(game: number): Promise<BoxScore> {
  const path = Object.keys(LOADERS).find((p) => gameOf(p) === game);
  return path ? LOADERS[path]() : Promise.reject(new Error(`No box score for game ${game}`));
}

interface Column {
  key: BoxColumn;
  /** Text of a body cell; empty when the line has no such value (the team row). */
  cell: (line: Partial<StatLine>, f: Formatters) => string;
}

interface Formatters {
  pct: (shot: ShotLine) => string;
}

const shot = (pick: (l: Partial<StatLine>) => ShotLine | undefined) => (l: Partial<StatLine>): string => {
  const s = pick(l);
  return s ? `${s.made}/${s.att}` : '';
};
const shotPct = (pick: (l: Partial<StatLine>) => ShotLine | undefined) => (l: Partial<StatLine>, f: Formatters): string => {
  const s = pick(l);
  return s ? f.pct(s) : '';
};
const count = (key: 'pts' | 'oreb' | 'dreb' | 'reb' | 'ast' | 'stl' | 'tov' | 'blk' | 'blkAgainst' | 'pf' | 'fd' | 'eff') =>
  (l: Partial<StatLine>): string => (l[key] === undefined ? '' : String(l[key]));
const signed = (n: number): string => (n > 0 ? `+${n}` : String(n));

/** Statistic columns after the jersey number and the player name. */
const STAT_COLUMNS: Column[] = [
  { key: 'min', cell: (l) => l.min ?? '' },
  { key: 'pts', cell: count('pts') },
  { key: 'fg2', cell: shot((l) => l.fg2) },
  { key: 'fg2p', cell: shotPct((l) => l.fg2) },
  { key: 'fg3', cell: shot((l) => l.fg3) },
  { key: 'fg3p', cell: shotPct((l) => l.fg3) },
  { key: 'fg', cell: shot((l) => l.fg) },
  { key: 'fgp', cell: shotPct((l) => l.fg) },
  { key: 'ft', cell: shot((l) => l.ft) },
  { key: 'ftp', cell: shotPct((l) => l.ft) },
  { key: 'oreb', cell: count('oreb') },
  { key: 'dreb', cell: count('dreb') },
  { key: 'reb', cell: count('reb') },
  { key: 'ast', cell: count('ast') },
  { key: 'stl', cell: count('stl') },
  { key: 'tov', cell: count('tov') },
  { key: 'blk', cell: count('blk') },
  { key: 'blkAgainst', cell: count('blkAgainst') },
  { key: 'pf', cell: count('pf') },
  { key: 'fd', cell: count('fd') },
  { key: 'eff', cell: count('eff') },
  { key: 'plusMinus', cell: (l) => (l.plusMinus === undefined ? '' : signed(l.plusMinus)) },
];

const NO_ATTEMPTS = '–';

function formatters(locale: string): Formatters {
  const nf = new Intl.NumberFormat(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  return { pct: (s) => (s.att === 0 ? NO_ATTEMPTS : nf.format((s.made / s.att) * 100)) };
}

const header = ({ t }: ViewContext, key: BoxColumn): string => {
  const [abbr, full] = t.boxColumns[key];
  // The player column shares the sticky "bs-name" class with the name cells below it.
  return `<th scope="col" class="bs-${key === 'player' ? 'name' : key}"><abbr title="${esc(full)}">${esc(abbr)}</abbr></th>`;
};

function playerRow(p: BoxPlayer, ctx: ViewContext, f: Formatters): string {
  const { t } = ctx;
  const star = p.starter ? `<span class="bs-star" title="${esc(t.boxStarter)}"><span aria-hidden="true">*</span><span class="sr-only">${esc(t.boxStarter)}</span></span>` : '';
  const cap = p.captain ? ` <abbr class="bs-cap" title="${esc(t.boxCaptain)}">(C)</abbr>` : '';
  const lead = `<td class="bs-no">${star}${esc(p.no)}</td><th scope="row" class="bs-name">${esc(p.name)}${cap}</th>`;
  if (!p.stats) {
    return `<tr class="bs-dnp-row">${lead}<td class="bs-dnp" colspan="${STAT_COLUMNS.length}" title="${esc(t.boxDnpTitle)}">${esc(t.boxDnp)}</td></tr>`;
  }
  const stats = p.stats;
  return `<tr>${lead}${STAT_COLUMNS.map((c) => `<td class="bs-${c.key}">${esc(c.cell(stats, f))}</td>`).join('')}</tr>`;
}

function summaryRow(label: string, line: Partial<StatLine>, f: Formatters, cls: string): string {
  return `<tr class="${cls}"><td class="bs-no"></td><th scope="row" class="bs-name">${esc(label)}</th>${STAT_COLUMNS.map((c) => `<td class="bs-${c.key}">${esc(c.cell(line, f))}</td>`).join('')}</tr>`;
}

/** Team statistics of both teams, home first as in the score; read out with the team names. */
function extrasHtml(m: Match, box: BoxScore, { lang, t }: ViewContext): string {
  const [pts] = t.boxColumns.pts;
  const [reb] = t.boxColumns.reb;
  const home = esc(teamName(m.home, lang));
  const away = esc(teamName(m.away, lang));
  const pair = (h: number, a: number, unit = ''): string => {
    const u = unit ? ` ${esc(unit)}` : '';
    return `<span class="bs-pair" aria-hidden="true">${h} : ${a}${u}</span><span class="sr-only">${home} ${h}, ${away} ${a}${u}</span>`;
  };
  const x = box.home.extras;
  const y = box.away.extras;
  const items: [string, string][] = [
    [t.boxExtras.pointsOffTurnovers, pair(x.pointsOffTurnovers, y.pointsOffTurnovers)],
    [t.boxExtras.fastBreak, pair(x.fastBreak, y.fastBreak)],
    [t.boxExtras.secondChance, pair(x.secondChance, y.secondChance)],
    [t.boxExtras.paint, pair(x.paint, y.paint)],
    [t.boxExtras.starters, pair(x.starters.pts, y.starters.pts, pts) + pair(x.starters.reb, y.starters.reb, reb)],
    [t.boxExtras.bench, pair(x.bench.pts, y.bench.pts, pts) + pair(x.bench.reb, y.bench.reb, reb)],
  ];
  return `<dl class="bs-extras">${items.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${v}</dd></div>`).join('')}</dl>`;
}

function panelHtml(m: Match, side: BoxTab, team: TeamBox, ctx: ViewContext, selected: boolean): string {
  const { lang, t } = ctx;
  const f = formatters(t.locale);
  const name = teamName(m[side], lang);
  const columns = [header(ctx, 'no'), header(ctx, 'player'), ...STAT_COLUMNS.map((c) => header(ctx, c.key))].join('');
  const rows = [
    ...team.players.map((p) => playerRow(p, ctx, f)),
    summaryRow(t.boxTeamRow, team.team, f, 'bs-team'),
    summaryRow(t.boxTotals, team.totals, f, 'bs-totals'),
  ].join('');
  const caption = t.boxTableCaption(name);
  return `<div role="tabpanel" id="bs-panel-${side}" aria-labelledby="bs-tab-${side}" class="bs-panel"${selected ? '' : ' hidden'}>
      <div class="bs-table-wrap" role="region" tabindex="0" aria-label="${esc(caption)}">
        <table class="bs-table"><caption class="sr-only">${esc(caption)}</caption><thead><tr>${columns}</tr></thead><tbody>${rows}</tbody></table>
      </div>
      <p class="bs-legend"><span aria-hidden="true">*</span> ${esc(t.boxStarter)}</p>
    </div>`;
}

function periodTable(m: Match, box: BoxScore, ctx: ViewContext): string {
  const { lang, t } = ctx;
  const sides = [['home', box.home], ['away', box.away]] as const;
  const periodCount = Math.max(box.home.periods.length, box.away.periods.length);
  const periodHead = Array.from({ length: periodCount }, (_, i) => `<th scope="col">${esc(t.periodName(i))}</th>`).join('');
  const periodRows = sides.map(([side, team]) =>
    `<tr><th scope="row">${esc(teamName(m[side], lang))}</th>${Array.from({ length: periodCount }, (_, i) => `<td>${team.periods[i]?.pts ?? ''}</td>`).join('')}<td class="bs-sum">${team.totals.pts}</td></tr>`).join('');
  return `<div class="bs-periods">
      <div class="bs-table-wrap" role="region" tabindex="0" aria-label="${esc(t.boxByPeriod)}">
        <table class="bs-mini"><caption>${esc(t.boxByPeriod)}</caption><thead><tr><td></td>${periodHead}<th scope="col" class="bs-sum">${esc(t.boxTotal)}</th></tr></thead><tbody>${periodRows}</tbody></table>
      </div>
    </div>`;
}

const CLOSE_ICON = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>';

/** Title bar with the close button: the same in the loading, error and loaded states. */
function titleBar(game: number, { t }: ViewContext): string {
  return `<div class="bs-titlebar"><h2 id="boxscore-title">${esc(t.boxScoreTitle(game))}</h2><button type="button" class="bs-close" id="bs-close" data-bs-close aria-label="${esc(t.boxClose)}" title="${esc(t.boxClose)}">${CLOSE_ICON}</button></div>`;
}

function footerLinks(m: Match, { t }: ViewContext): string {
  const pdf = m.stats ? `<a class="download-btn secondary" href="${esc(m.stats)}" download>${esc(t.statsPdf(m.game))}</a>` : '';
  const video = m.video ? `<a class="download-btn secondary" href="${esc(m.video)}" target="_blank" rel="noopener noreferrer">${esc(t.watchVideo(m.game))}</a>` : '';
  return pdf || video ? `<div class="bs-links">${pdf}${video}</div>` : '';
}

/** The FDM side of the game; the home side in a derby. */
export const defaultBoxTab = (m: Match): BoxTab => (m.home.startsWith('FDM') || !m.away.startsWith('FDM') ? 'home' : 'away');

/** Content of the box score dialog for a loaded game. */
export function boxScoreHtml(m: Match, box: BoxScore, ctx: ViewContext, tab: BoxTab = defaultBoxTab(m)): string {
  const { lang, t } = ctx;
  const v = VENUES[m.venue];
  const date = formatDate(m.date, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }, t.locale);
  const nf = new Intl.NumberFormat(t.locale);
  const referees = box.referees.length ? ` · ${esc(t.boxReferees)}: ${esc(box.referees.join(', '))}` : '';
  const tabs = (['home', 'away'] as const).map((side) =>
    `<button type="button" role="tab" id="bs-tab-${side}" data-bs-tab="${side}" aria-controls="bs-panel-${side}" aria-selected="${side === tab}" tabindex="${side === tab ? 0 : -1}">${esc(teamName(m[side], lang))}</button>`).join('');
  const sideTeam = (side: BoxTab) => `<span class="bs-team-name">${crest(m[side], ctx)}${esc(teamName(m[side], lang))}</span>`;
  const score = (side: BoxTab, other: BoxTab) => {
    const mine = box[side].totals.pts;
    const theirs = box[other].totals.pts;
    return `<span class="bs-sc${mine > theirs ? ' win' : ''}">${mine}</span>`;
  };
  return `${titleBar(m.game, ctx)}
    <div class="bs-content">
      <div class="bs-scoreboard">${sideTeam('home')}<span class="bs-final">${score('home', 'away')}<span class="bs-colon">:</span>${score('away', 'home')}</span>${sideTeam('away')}</div>
      <p class="bs-meta">${esc(date)} · ${esc(m.time)} · ${esc(v.name)}, ${esc(v.address)}${referees} · ${esc(t.boxSpectators)}: ${esc(nf.format(box.spectators))}</p>
      <div class="bs-overview">${periodTable(m, box, ctx)}${extrasHtml(m, box, ctx)}</div>
      <div class="bs-tabs" role="tablist" aria-label="${esc(t.boxTeamsAria)}">${tabs}</div>
      ${panelHtml(m, 'home', box.home, ctx, tab === 'home')}${panelHtml(m, 'away', box.away, ctx, tab === 'away')}
      ${footerLinks(m, ctx)}
    </div>`;
}

function loadingHtml(game: number, ctx: ViewContext): string {
  return `${titleBar(game, ctx)}<div class="bs-content"><p class="bs-status" role="status">${esc(ctx.t.boxLoading)}</p></div>`;
}

function errorHtml(m: Match, ctx: ViewContext): string {
  return `${titleBar(m.game, ctx)}<div class="bs-content"><p class="bs-status" role="alert">${esc(ctx.t.boxError)}</p>${footerLinks(m, ctx)}</div>`;
}

interface Open {
  match: Match;
  ctx: ViewContext;
  tab: BoxTab;
  box?: BoxScore;
  failed: boolean;
  trigger?: HTMLElement;
}

let dialog: HTMLDialogElement | undefined;
let body: HTMLElement;
let current: Open | undefined;
/** Identifies the latest open request, so a slow chunk of an earlier game cannot overwrite a newer dialog. */
let request = 0;

function render(): void {
  if (!current) return;
  const { match, ctx, box, tab, failed } = current;
  body.innerHTML = box ? boxScoreHtml(match, box, ctx, tab) : failed ? errorHtml(match, ctx) : loadingHtml(match.game, ctx);
}

function selectTab(tab: BoxTab, focus: boolean): void {
  if (!current || !dialog) return;
  current.tab = tab;
  for (const side of ['home', 'away'] as const) {
    const el = dialog.querySelector<HTMLElement>(`#bs-tab-${side}`)!;
    el.setAttribute('aria-selected', String(side === tab));
    el.tabIndex = side === tab ? 0 : -1;
    dialog.querySelector<HTMLElement>(`#bs-panel-${side}`)!.hidden = side !== tab;
    if (focus && side === tab) el.focus();
  }
}

function ensureDialog(): HTMLDialogElement {
  if (dialog) return dialog;
  const d = document.createElement('dialog');
  d.className = 'boxscore';
  d.setAttribute('aria-labelledby', 'boxscore-title');
  d.innerHTML = '<div class="bs-body"></div>';
  body = d.querySelector<HTMLElement>('.bs-body')!;
  // The body fills the dialog, so an event on the dialog element itself outside its box is on the backdrop;
  // inside the box it is the dialog's own scrollbar.
  const onBackdrop = (e: MouseEvent): boolean => {
    const r = d.getBoundingClientRect();
    return e.target === d && (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom);
  };
  // A drag that starts inside the dialog (text selection, scrollbar) and ends on the backdrop must not close it.
  let pressedOnBackdrop = false;
  d.addEventListener('pointerdown', (e) => {
    pressedOnBackdrop = onBackdrop(e);
  });
  d.addEventListener('click', (e) => {
    const target = e.target instanceof Element ? e.target : null;
    const backdropClick = pressedOnBackdrop && onBackdrop(e);
    pressedOnBackdrop = false;
    if (backdropClick || target?.closest('[data-bs-close]')) {
      d.close();
      return;
    }
    const tab = target?.closest<HTMLElement>('[data-bs-tab]');
    if (tab) selectTab(tab.dataset.bsTab as BoxTab, false);
  });
  d.addEventListener('keydown', (e) => {
    if (!(e.target instanceof Element) || !e.target.closest('[role="tab"]')) return;
    const other: BoxTab = current?.tab === 'away' ? 'home' : 'away';
    const next = e.key === 'ArrowRight' || e.key === 'ArrowLeft' ? other : e.key === 'Home' ? 'home' : e.key === 'End' ? 'away' : undefined;
    if (!next) return;
    e.preventDefault();
    selectTab(next, true);
  });
  d.addEventListener('close', () => {
    const open = current;
    current = undefined;
    request++;
    if (!open) return;
    if (location.hash === boxScoreHash(open.match.game)) history.replaceState(null, '', location.pathname + location.search);
    // Opened from a link, the dialog has no trigger: focus the game's card button instead.
    const target = open.trigger?.isConnected ? open.trigger : document.querySelector<HTMLElement>(`button[data-boxscore="${open.match.game}"]`);
    target?.focus();
  });
  // Missing crest image: show the Italian flag instead.
  d.addEventListener('error', (e) => {
    const img = e.target;
    if (img instanceof HTMLImageElement && !img.src.endsWith(FALLBACK_CREST)) img.src = FALLBACK_CREST;
  }, true);
  document.body.append(d);
  dialog = d;
  return d;
}

/** Opens the box score of a game in a modal dialog; the chunk with its data loads on first use. */
export async function openBoxScore(game: number, ctx: ViewContext, trigger?: HTMLElement): Promise<void> {
  const match = MATCHES.find((m) => m.game === game);
  if (!match || !hasBoxScore(game)) return;
  const d = ensureDialog();
  const id = ++request;
  current = { match, ctx, tab: defaultBoxTab(match), failed: false, trigger };
  // Replacing, not pushing: the Back button leaves the page as before instead of reopening dialogs.
  if (location.hash !== boxScoreHash(game)) history.replaceState(null, '', boxScoreHash(game));
  render();
  if (!d.open) d.showModal();
  try {
    const box = await loadBoxScore(game);
    if (id !== request || !current) return;
    current.box = box;
  } catch {
    if (id !== request || !current) return;
    current.failed = true;
  }
  render();
  d.querySelector<HTMLElement>('[data-bs-close]')?.focus();
}

/** Opens the box score named by the address hash; any other hash closes an open dialog. */
/** Opens the box score the address fragment names, or closes the dialog when the fragment names none. */
export function syncBoxScoreWithHash(hash: string, ctx: ViewContext): void {
  const game = gameFromHash(hash);
  if (game === undefined) {
    if (dialog?.open) dialog.close();
  } else if (!dialog?.open || current?.match.game !== game) {
    void openBoxScore(game, ctx);
  }
}
