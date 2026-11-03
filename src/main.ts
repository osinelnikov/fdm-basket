import './styles.css';
import { MATCHES } from './data/fixtures.ts';
import { type Filter, isAway } from './domain.ts';
import { type Lang, MESSAGES, resolveLang } from './i18n/index.ts';
import { openBoxScore, syncBoxScoreWithHash } from './ui/boxscore.ts';
import { resetCalendarStatus, setupCalendarCard } from './ui/calendar.ts';
import type { ViewContext } from './ui/context.ts';
import { applyStaticTexts, renderLangSwitch } from './ui/i18n-dom.ts';
import { createVenueMap } from './ui/map.ts';
import { applyFilter, renderMatches, setAllMonths } from './ui/matches.ts';
import { renderStandings } from './ui/standings.ts';
import { readLang, writeLang } from './ui/storage.ts';
import { withSmoothTransition } from './ui/transition.ts';

const state: { lang: Lang; filter: Filter } = {
  lang: resolveLang(location.search, readLang(), navigator.languages?.length ? navigator.languages : [navigator.language]),
  filter: 'all',
};
const context = (): ViewContext => ({ lang: state.lang, t: MESSAGES[state.lang] });

const root = document.querySelector<HTMLElement>('#matches')!;
const standingsTable = document.querySelector<HTMLTableElement>('#standings')!;
const standingsSource = document.querySelector<HTMLElement>('#standings-source')!;
const venueMap = createVenueMap(document.querySelector<HTMLElement>('#map')!, context);

const setText = (id: string, n: number) => (document.getElementById(id)!.textContent = String(n));
setText('stat-b', MATCHES.filter((m) => m.sides.includes('b')).length);
setText('stat-a', MATCHES.filter((m) => m.sides.includes('a')).length);
setText('stat-away', MATCHES.filter(isAway).length);
setText('stat-all', MATCHES.length);

function select(filter: Filter, fitMap = true): void {
  state.filter = filter;
  for (const b of document.querySelectorAll<HTMLButtonElement>('[data-filter]')) {
    b.classList.toggle('active', b.dataset.filter === filter);
    b.setAttribute('aria-pressed', String(b.dataset.filter === filter));
  }
  applyFilter(root, filter, context());
  venueMap.show(filter, fitMap);
}

function setLang(lang: Lang): void {
  if (lang === state.lang) return;
  state.lang = lang;
  writeLang(lang);
  const url = new URL(location.href);
  url.searchParams.set('lang', lang);
  history.replaceState(null, '', url);
  withSmoothTransition(() => {
    applyStaticTexts(lang);
    resetCalendarStatus();
    renderMatches(root, context());
    renderStandings(standingsTable, standingsSource, context());
    select(state.filter, false);
  });
}

for (const b of document.querySelectorAll<HTMLButtonElement>('[data-filter]')) {
  b.addEventListener('click', () => withSmoothTransition(() => select(b.dataset.filter as Filter)));
}
root.addEventListener('click', (e) => {
  const trigger = e.target instanceof Element ? e.target.closest<HTMLButtonElement>('button[data-boxscore]') : null;
  if (trigger) void openBoxScore(Number(trigger.dataset.boxscore), context(), trigger);
});
document.querySelector('#expand-all')!.addEventListener('click', () => setAllMonths(root, true));
document.querySelector('#collapse-all')!.addEventListener('click', () => setAllMonths(root, false));

renderLangSwitch(document.querySelector<HTMLElement>('#lang-switch')!, setLang);
applyStaticTexts(state.lang);
renderStandings(standingsTable, standingsSource, context());
renderMatches(root, context());
select('all');
setupCalendarCard(context);

// A shared link such as /#box-310 opens that game's box score; an address that no longer names it closes the dialog.
function openFromHash(): void {
  syncBoxScoreWithHash(location.hash, context());
}
window.addEventListener('hashchange', openFromHash);
openFromHash();
