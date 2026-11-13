import { esc } from '../../ui/format.ts';
import { TEAMS } from '../../data/fixtures.ts';
import type { StandingRow, Standings } from '../../data/types.ts';
import type { Change } from '../preview.ts';
import {
  NUMBER_FIELDS,
  TABLE_SIZE,
  formFromStandings,
  formatSource,
  moveRow,
  parseBulletinNumber,
  readStandingsForm,
  standingsChanges,
  type StandingsForm,
  type StandingsFormRow,
} from '../standings-form.ts';
import type { ActionSpec, Plan } from './shell.ts';

const ROW_KEYS: (keyof StandingsFormRow)[] = ['team', ...NUMBER_FIELDS.map((f) => f.key)];
const STORED_NUMBERS = NUMBER_FIELDS.filter((f) => f.key !== 'diff');

function previewHtml(current: Standings, next: Standings, cells: Set<string>): string {
  const cell = (i: number, key: keyof StandingRow, value: string | number) => {
    const before = current.rows[i]?.[key];
    const changed = cells.has(`${i}:${key}`);
    const title = changed ? ` title="${esc(`was ${before ?? '—'}`)}"` : '';
    const mark = changed ? `<span class="sr-only"> (was ${esc(String(before ?? '—'))})</span>` : '';
    return `<td class="${changed ? 'cp-changed' : ''}"${title}>${esc(String(value))}${mark}</td>`;
  };
  const rows = next.rows
    .map((r, i) => `<tr><th scope="row">${i + 1}</th>${cell(i, 'team', r.team)}${STORED_NUMBERS.map((f) => cell(i, f.key as keyof StandingRow, r[f.key as keyof StandingRow])).join('')}</tr>`)
    .join('');
  return `<div class="cp-table-wrap"><table class="cp-mini cp-standings-preview"><caption>New table, changed cells highlighted</caption>
    <thead><tr><th scope="col">#</th><th scope="col">Team</th>${STORED_NUMBERS.map((f) => `<th scope="col"><abbr title="${esc(f.title)}">${f.label}</abbr></th>`).join('')}</tr></thead>
    <tbody>${rows}</tbody></table></div>`;
}

/** Replace the league table with the one of a newer UISP bulletin. */
export function standingsAction(): ActionSpec {
  let body: HTMLElement;
  const $ = <T extends Element>(selector: string) => body.querySelector<T>(selector);
  const control = (name: string) => $<HTMLInputElement | HTMLSelectElement>(`[name="${name}"]`)!;

  function readRows(): StandingsFormRow[] {
    return Array.from({ length: TABLE_SIZE }, (_, i) => {
      const row = {} as StandingsFormRow;
      for (const key of ROW_KEYS) row[key] = control(`${key}-${i}`).value;
      return row;
    });
  }

  function writeRows(rows: StandingsFormRow[]) {
    rows.forEach((row, i) => {
      for (const key of ROW_KEYS) control(`${key}-${i}`).value = row[key];
    });
  }

  const readForm = (): StandingsForm => ({ number: control('number').value, date: control('date').value, rows: readRows() });

  function rowHtml(i: number): string {
    const teams = `<option value=""></option>${Object.keys(TEAMS)
      .map((t) => `<option value="${esc(t)}">${esc(t)}</option>`)
      .join('')}`;
    const inputs = NUMBER_FIELDS.map(
      (f) =>
        `<td><input name="${f.key}-${i}" inputmode="${f.key === 'diff' ? 'text' : 'numeric'}" autocomplete="off" size="4" aria-label="${esc(`Row ${i + 1} ${f.label}: ${f.title}`)}"></td>`,
    ).join('');
    return `<tr><th scope="row">${i + 1}</th><td><select name="team-${i}" aria-label="Row ${i + 1} team">${teams}</select></td>${inputs}
      <td class="cp-order"><button type="button" class="cp-btn small" data-move="-1" data-row="${i}" aria-label="Move row ${i + 1} up"${i === 0 ? ' disabled' : ''}>↑</button><button type="button" class="cp-btn small" data-move="1" data-row="${i}" aria-label="Move row ${i + 1} down"${i === TABLE_SIZE - 1 ? ' disabled' : ''}>↓</button></td></tr>`;
  }

  return {
    id: 'standings',
    title: 'Standings',
    render(container, state) {
      body = container;
      const form = formFromStandings(state.standings);
      body.innerHTML = `<p class="cp-hint">Copy the table from the latest UISP bulletin, in the bulletin's order. Current: ${esc(state.standings.source)}.</p>
        <div class="cp-grid2">
          <div class="cp-field"><label for="st-number">Bulletin number (CU)</label><input id="st-number" name="number" inputmode="numeric" autocomplete="off" placeholder="05"></div>
          <div class="cp-field"><label for="st-date">Bulletin date</label><input id="st-date" name="date" type="date"></div>
        </div>
        <p class="cp-hint" id="st-source"></p>
        <div class="cp-table-wrap"><table class="cp-standings">
          <thead><tr><th scope="col">#</th><th scope="col">Team</th>${NUMBER_FIELDS.map((f) => `<th scope="col"><abbr title="${esc(f.title)}">${f.label}</abbr></th>`).join('')}<th scope="col">Order</th></tr></thead>
          <tbody>${Array.from({ length: TABLE_SIZE }, (_, i) => rowHtml(i)).join('')}</tbody></table></div>
        <p class="cp-hint">DC is a check only: it must equal CF − CS and is not stored.</p>`;
      control('number').value = form.number;
      control('date').value = form.date;
      writeRows(form.rows);

      // Listeners go on elements of this rendering: the container itself outlives it.
      $('.cp-standings')!.addEventListener('click', (e) => {
        const button = e.target instanceof Element ? e.target.closest<HTMLButtonElement>('[data-move]') : null;
        if (!button) return;
        const row = Number(button.dataset.row);
        const delta = Number(button.dataset.move) as -1 | 1;
        writeRows(moveRow(readRows(), row, delta));
        const target = Math.min(TABLE_SIZE - 1, Math.max(0, row + delta));
        const next = $<HTMLButtonElement>(`[data-move="${delta}"][data-row="${target}"]`);
        (next && !next.disabled ? next : $<HTMLButtonElement>(`[data-move="${-delta}"][data-row="${target}"]`))?.focus();
        body.dispatchEvent(new Event('change', { bubbles: true }));
      });
    },
    plan(state): Plan {
      const plan: Plan = { command: 'standings', changes: [], errors: [] };
      const form = readForm();
      const { standings, errors } = readStandingsForm(form);

      body.querySelectorAll('[aria-invalid]').forEach((el) => {
        el.removeAttribute('aria-invalid');
        el.removeAttribute('title');
      });
      for (const e of errors) {
        if (!e.field) continue;
        const el = e.row === undefined ? control(e.field) : control(`${e.field}-${e.row}`);
        el.setAttribute('aria-invalid', 'true');
        el.title = el.title ? `${el.title}\n${e.message}` : e.message;
      }
      const number = parseBulletinNumber(form.number);
      $('#st-source')!.textContent = number !== undefined && /^\d{4}-\d{2}-\d{2}$/.test(form.date) ? `Shown on the site as: ${formatSource(number, form.date)}` : '';

      plan.errors = errors.map((e) => e.message);
      if (!standings) return plan;
      const current = state.standings;
      const diff = standingsChanges(current, standings);
      const changes: Change[] = [];
      if (diff.source) changes.push({ label: 'Source', before: current.source, after: standings.source });
      if (diff.date) changes.push({ label: 'Bulletin date', before: current.date, after: standings.date });
      if (diff.cells.size > 0) changes.push({ label: 'Table', before: 'current', after: `${diff.cells.size} changed cell${diff.cells.size === 1 ? '' : 's'}, highlighted below` });
      plan.changes = changes;
      if (diff.any) plan.html = previewHtml(current, standings, diff.cells);
      plan.payload = () => ({ standings });
      return plan;
    },
  };
}
