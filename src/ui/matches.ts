import { gcalUrl } from '../calendar/gcal.ts';
import { FALLBACK_CREST, MATCHES, MONTH_THEMES, TEAMS, VENUES } from '../data/fixtures.ts';
import type { Match, TeamId } from '../data/types.ts';
import { type Filter, isAway, mapsUrl, matchesFilter, monthKey } from '../domain.ts';
import { esc, formatDate, romeToday } from './format.ts';
import { readCollapsed, writeCollapsed } from './storage.ts';

function crest(team: TeamId): string {
  const t = TEAMS[team];
  const alt = `${t.official} ${t.isClubLogo ? 'logo' : `(coat of arms of ${t.town})`}`;
  return `<span class="crest"><img src="${t.crest}" alt="${esc(alt)}" title="${esc(t.official)}" width="32" height="32" loading="lazy"></span>`;
}

function tags(m: Match): string {
  const out: string[] = [];
  if (m.sides.includes('b')) out.push('<span class="tag b">FDM B match</span>');
  if (m.sides.includes('a')) out.push('<span class="tag a">FDM A match</span>');
  out.push(isAway(m) ? '<span class="tag away">Away</span>' : '<span class="tag home">Home court</span>');
  if (m.derby) out.push('<span class="tag derby">Derby</span>');
  out.push(`<span class="tag num">Game ${m.game}</span>`);
  return out.join('');
}

function matchCard(m: Match): string {
  const v = VENUES[m.venue];
  return `<article class="match" data-game="${m.game}" data-category="${m.sides.join(' ')}">
    <div class="date"><span class="day">${formatDate(m.date, { day: '2-digit' })}</span><span class="mon">${formatDate(m.date, { month: 'short' })}</span><span class="time">${formatDate(m.date, { weekday: 'short' })} · ${m.time}</span></div>
    <div class="details">
      <div class="teams"><span class="team">${crest(m.home)}${esc(m.home)}</span><span class="vs">VS</span><span class="team">${crest(m.away)}${esc(m.away)}</span></div>
      <div class="tags">${tags(m)}</div>
      <div class="venue"><span aria-hidden="true">📍</span><a href="${esc(mapsUrl(v))}" target="_blank" rel="noopener noreferrer">${esc(v.name)} · ${esc(v.address)} ↗</a></div>
      <a class="gcal" href="${esc(gcalUrl(m))}" target="_blank" rel="noopener noreferrer">📅 Add to Google Calendar ↗</a>
    </div></article>`;
}

const CHEVRON = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>';

export function renderMatches(root: HTMLElement): void {
  const byMonth = new Map<string, Match[]>();
  for (const m of MATCHES) byMonth.set(monthKey(m), [...(byMonth.get(monthKey(m)) ?? []), m]);

  root.innerHTML = [...byMonth].map(([key, games]) => {
    const th = MONTH_THEMES[key];
    return `<details class="month" data-key="${key}" data-theme="${th?.theme ?? ''}" open>
      <summary>
        <span class="month-emoji" aria-hidden="true">${th?.emoji ?? '🏀'}</span>
        <span class="month-title"><h2>${formatDate(games[0].date, { month: 'long', year: 'numeric' })}</h2><span>${esc(th?.tagline ?? '')}</span></span>
        <span class="month-count"><b class="mc-games"></b><b class="mc-away"></b></span>
        <span class="month-chevron">${CHEVRON}</span>
      </summary>
      <div class="month-body">${games.map(matchCard).join('')}</div>
    </details>`;
  }).join('');

  // Missing crest image: show the Italian flag instead.
  root.addEventListener('error', (e) => {
    const img = e.target;
    if (img instanceof HTMLImageElement && !img.src.endsWith(FALLBACK_CREST)) img.src = FALLBACK_CREST;
  }, true);

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

export function applyFilter(root: HTMLElement, f: Filter): void {
  for (const el of root.querySelectorAll<HTMLElement>('.match')) {
    const m = MATCHES.find((x) => x.game === Number(el.dataset.game))!;
    el.hidden = !matchesFilter(m, f);
  }
  for (const d of months(root)) {
    const games = MATCHES.filter((m) => monthKey(m) === d.dataset.key && matchesFilter(m, f));
    const away = games.filter(isAway).length;
    d.hidden = games.length === 0;
    d.querySelector('.mc-games')!.textContent = `${games.length} ${games.length === 1 ? 'game' : 'games'}`;
    const ab = d.querySelector<HTMLElement>('.mc-away')!;
    ab.textContent = `${away} away`;
    ab.hidden = away === 0;
  }
}
