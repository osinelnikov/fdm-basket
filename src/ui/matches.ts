import { gcalUrl } from '../calendar/gcal.ts';
import { FALLBACK_CREST, MATCHES, MONTH_THEMES, TEAMS, VENUES } from '../data/fixtures.ts';
import type { Match, TeamId } from '../data/types.ts';
import { type Filter, isAway, mapsUrl, matchesFilter, monthKey, nextMatch } from '../domain.ts';
import { teamName } from '../i18n';
import type { ViewContext } from './context.ts';
import { capitalize, esc, formatDate, romeToday } from './format.ts';
import { readCollapsed, writeCollapsed } from './storage.ts';

function crest(team: TeamId, { lang, t }: ViewContext): string {
  const info = TEAMS[team];
  const name = teamName(team, lang);
  const alt = info.isClubLogo ? t.crestAltLogo(name) : t.crestAltArms(name, info.town);
  return `<span class="crest"><img src="${info.crest}" alt="${esc(alt)}" title="${esc(info.official)}" width="32" height="32" loading="lazy"></span>`;
}

const nextTag = ({ t }: ViewContext): string => `<span class="tag next">${esc(t.tagNext)}</span>`;

function tags(m: Match, ctx: ViewContext, isNext: boolean): string {
  const { t } = ctx;
  const out: string[] = [];
  if (isNext) out.push(nextTag(ctx));
  if (m.sides.includes('b')) out.push(`<span class="tag b">${esc(t.tagB)}</span>`);
  if (m.sides.includes('a')) out.push(`<span class="tag a">${esc(t.tagA)}</span>`);
  out.push(isAway(m) ? `<span class="tag away">${esc(t.tagAway)}</span>` : `<span class="tag home">${esc(t.tagHome)}</span>`);
  if (m.derby) out.push(`<span class="tag derby">${esc(t.tagDerby)}</span>`);
  if (m.result) out.push(`<span class="tag final">${esc(t.tagFinal)}</span>`);
  out.push(`<span class="tag num">${esc(t.gameNo(m.game))}</span>`);
  return out.join('');
}

/** Big final score, with the period scores on one line below. Empty for games not played yet. */
function resultBlock(m: Match, { lang, t }: ViewContext): string {
  const r = m.result;
  if (!r) return '';
  const cls = (mine: number, theirs: number) => (mine > theirs ? 'win' : mine < theirs ? 'lose' : '');
  const periods = r.periods ?? [];
  const line = periods.map(([h, a], i) => `${i >= 4 ? `${t.periodName(i)} ` : ''}${h}:${a}`).join(' · ');
  const spoken = periods.map(([h, a], i) => `${t.periodName(i)} ${h}–${a}`).join(', ');
  return `<div class="result">
      <span class="sr-only">${esc(t.resultAria(teamName(m.home, lang), teamName(m.away, lang), r.home, r.away, spoken))}</span>
      <div class="score" aria-hidden="true"><span class="${cls(r.home, r.away)}">${r.home}</span><span class="colon">:</span><span class="${cls(r.away, r.home)}">${r.away}</span></div>
      ${line ? `<div class="periods" aria-hidden="true">${esc(line)}</div>` : ''}${mediaLinks(m, { lang, t })}
    </div>`;
}

const YOUTUBE_ICON = '<svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true"><rect x="1.5" y="4.5" width="21" height="15" rx="4.5" fill="#ff0033"/><path d="m10 8.8 5.2 3.2-5.2 3.2z" fill="#fff"/></svg>';
const PDF_ICON = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" aria-hidden="true"><path d="M14 2.5H6.5a2 2 0 0 0-2 2v15a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V8z"/><path d="M14 2.5V8h5.5"/><text x="12" y="17.6" text-anchor="middle" font-size="6.4" font-weight="800" font-family="system-ui,sans-serif" fill="currentColor" stroke="none">PDF</text></svg>';

/** Icons under the score: the game video on YouTube and the statistics PDF, each only when known. */
function mediaLinks(m: Match, { t }: ViewContext): string {
  const out: string[] = [];
  if (m.video) {
    const label = esc(t.watchVideo(m.game));
    out.push(`<a class="media-link yt" href="${esc(m.video)}" target="_blank" rel="noopener noreferrer" aria-label="${label}" title="${label}">${YOUTUBE_ICON}</a>`);
  }
  if (m.stats) {
    const label = esc(t.statsPdf(m.game));
    out.push(`<a class="media-link pdf" href="${esc(m.stats)}" download aria-label="${label}" title="${label}">${PDF_ICON}</a>`);
  }
  return out.length ? `<div class="media">${out.join('')}</div>` : '';
}

export function matchCard(m: Match, ctx: ViewContext, isNext = false): string {
  const { lang, t } = ctx;
  const v = VENUES[m.venue];
  const date = (opts: Intl.DateTimeFormatOptions) => formatDate(m.date, opts, t.locale);
  return `<article class="match${m.result ? ' played' : ''}${isNext ? ' next' : ''}" data-game="${m.game}" data-category="${m.sides.join(' ')}">
    <div class="date"><span class="day">${date({ day: '2-digit' })}</span><span class="mon">${date({ month: 'short' })}</span><span class="time">${date({ weekday: 'short' })} · ${m.time}</span></div>
    <div class="details">
      <div class="teams"><span class="team">${crest(m.home, ctx)}${esc(teamName(m.home, lang))}</span><span class="vs">${esc(t.vs)}</span><span class="team">${crest(m.away, ctx)}${esc(teamName(m.away, lang))}</span></div>
      <div class="tags">${tags(m, ctx, isNext)}</div>
      <div class="venue"><span aria-hidden="true">📍</span><a href="${esc(mapsUrl(v))}" target="_blank" rel="noopener noreferrer">${esc(v.name)} · ${esc(v.address)} ↗</a></div>
      <a class="gcal" href="${esc(gcalUrl(m, lang))}" target="_blank" rel="noopener noreferrer">${esc(t.addToGoogle)}</a>
    </div>${resultBlock(m, ctx)}</article>`;
}

const CHEVRON = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>';

const installed = new WeakSet<HTMLElement>();

/**
 * Renders the month blocks. Safe to call again when the language changes.
 * The next game is marked by applyFilter, which must follow.
 */
export function renderMatches(root: HTMLElement, ctx: ViewContext): void {
  const byMonth = new Map<string, Match[]>();
  for (const m of MATCHES) byMonth.set(monthKey(m), [...(byMonth.get(monthKey(m)) ?? []), m]);

  root.innerHTML = [...byMonth].map(([key, games]) => {
    const th = MONTH_THEMES[key];
    const title = capitalize(formatDate(games[0].date, { month: 'long', year: 'numeric' }, ctx.t.locale));
    return `<details class="month" data-key="${key}" data-theme="${th?.theme ?? ''}" open>
      <summary>
        <span class="month-emoji" aria-hidden="true">${th?.emoji ?? '🏀'}</span>
        <span class="month-title"><h2>${esc(title)}</h2><span>${esc(ctx.t.monthTaglines[key] ?? '')}</span></span>
        <span class="month-count"><b class="mc-games"></b><b class="mc-away"></b></span>
        <span class="month-chevron">${CHEVRON}</span>
      </summary>
      <div class="month-body">${games.map((m) => matchCard(m, ctx)).join('')}</div>
    </details>`;
  }).join('');

  if (!installed.has(root)) {
    installed.add(root);
    // Missing crest image: show the Italian flag instead.
    root.addEventListener('error', (e) => {
      const img = e.target;
      if (img instanceof HTMLImageElement && !img.src.endsWith(FALLBACK_CREST)) img.src = FALLBACK_CREST;
    }, true);
  }
  initMonthState(root);
}

function months(root: HTMLElement): HTMLDetailsElement[] {
  return [...root.querySelectorAll<HTMLDetailsElement>('details.month')];
}

function saveMonthState(root: HTMLElement): void {
  writeCollapsed(months(root).filter((d) => !d.open).map((d) => d.dataset.key!));
}

function initMonthState(root: HTMLElement): void {
  const saved = readCollapsed();
  const today = romeToday();
  for (const d of months(root)) {
    const last = MATCHES.filter((m) => monthKey(m) === d.dataset.key).at(-1)!.date;
    // Default: months that are already over start collapsed.
    d.open = saved ? !saved.includes(d.dataset.key!) : last >= today;
    d.addEventListener('toggle', () => saveMonthState(root));
  }
}

export function setAllMonths(root: HTMLElement, open: boolean): void {
  for (const d of months(root)) d.open = open;
  saveMonthState(root);
}

/** Shows the games of the filter and marks the next game among them. */
export function applyFilter(root: HTMLElement, f: Filter, ctx: ViewContext): void {
  const { t } = ctx;
  const next = nextMatch(MATCHES, romeToday(), f)?.game;
  for (const el of root.querySelectorAll<HTMLElement>('.match')) {
    const m = MATCHES.find((x) => x.game === Number(el.dataset.game))!;
    el.hidden = !matchesFilter(m, f);
    const isNext = m.game === next;
    if (el.classList.contains('next') === isNext) continue;
    el.classList.toggle('next', isNext);
    if (isNext) el.querySelector('.tags')!.insertAdjacentHTML('afterbegin', nextTag(ctx));
    else el.querySelector('.tag.next')?.remove();
  }
  for (const d of months(root)) {
    const games = MATCHES.filter((m) => monthKey(m) === d.dataset.key && matchesFilter(m, f));
    const away = games.filter(isAway).length;
    d.hidden = games.length === 0;
    d.querySelector('.mc-games')!.textContent = t.monthGames(games.length);
    const ab = d.querySelector<HTMLElement>('.mc-away')!;
    ab.textContent = t.monthAway(away);
    ab.hidden = away === 0;
  }
}
