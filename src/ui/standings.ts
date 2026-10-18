import { FALLBACK_CREST, TEAMS } from '../data/fixtures.ts';
import { STANDINGS } from '../data/standings.ts';
import { teamName } from '../i18n/index.ts';
import type { StandingsColumn } from '../i18n/types.ts';
import type { ViewContext } from './context.ts';
import { esc } from './format.ts';

const COLUMNS: StandingsColumn[] = ['pos', 'team', 'played', 'won', 'lost', 'pointsFor', 'pointsAgainst', 'diff', 'points'];
const installed = new WeakSet<HTMLElement>();

/** Signed point difference with a typographic minus. */
const signed = (n: number): string => (n > 0 ? `+${n}` : n < 0 ? `−${-n}` : '0');

/** Renders the league table from the latest bulletin. Safe to call again when the language changes. */
export function renderStandings(table: HTMLTableElement, source: HTMLElement, { lang, t }: ViewContext): void {
  source.textContent = t.standingsSource(STANDINGS.source);
  table.setAttribute('aria-label', `${t.standingsTitle}, ${STANDINGS.source}`);

  const head = COLUMNS.map((c) => {
    const [abbr, full] = t.standingsColumns[c];
    return `<th scope="col" class="col-${c}"><abbr title="${esc(full)}">${esc(abbr)}</abbr></th>`;
  }).join('');

  const body = STANDINGS.rows.map((r, i) => {
    const info = TEAMS[r.team];
    const name = teamName(r.team, lang);
    const fdm = r.team === 'FDM A' || r.team === 'FDM B';
    return `<tr class="${fdm ? 'fdm' : ''}">
      <td class="col-pos">${i + 1}</td>
      <th scope="row" class="col-team"><span class="st-team"><span class="st-crest"><img src="${info.crest}" alt="" width="24" height="24" loading="lazy"></span><span title="${esc(info.official)}">${esc(name)}</span></span></th>
      <td class="col-played">${r.played}</td>
      <td class="col-won">${r.won}</td>
      <td class="col-lost">${r.lost}</td>
      <td class="col-pointsFor">${r.pointsFor}</td>
      <td class="col-pointsAgainst">${r.pointsAgainst}</td>
      <td class="col-diff">${signed(r.pointsFor - r.pointsAgainst)}</td>
      <td class="col-points">${r.points}</td>
    </tr>`;
  }).join('');

  table.innerHTML = `<thead><tr>${head}</tr></thead><tbody>${body}</tbody>`;

  if (!installed.has(table)) {
    installed.add(table);
    table.addEventListener('error', (e) => {
      const img = e.target;
      if (img instanceof HTMLImageElement && !img.src.endsWith(FALLBACK_CREST)) img.src = FALLBACK_CREST;
    }, true);
  }
}
