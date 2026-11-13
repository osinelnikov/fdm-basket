import { esc } from '../../ui/format.ts';
import { VENUES } from '../../data/fixtures.ts';
import type { VenueId } from '../../data/types.ts';
import type { AdminState } from '../api.ts';
import { postponableGames, postponedGames } from '../eligible.ts';
import { isCalendarDate, isTimeOfDay } from '../form.ts';
import { postponeChanges, rescheduleChanges, shortDate } from '../preview.ts';
import { gameOptions, selectedGame, type ActionSpec, type Plan } from './shell.ts';

type Mode = 'postpone' | 'reschedule' | 'unpostpone';

/** Call off a game, give a postponed game its new date, or take the postponed mark off. */
export function postponeAction(): ActionSpec {
  let body: HTMLElement;
  const $ = <T extends Element>(selector: string) => body.querySelector<T>(selector);
  const value = (name: string) => $<HTMLInputElement | HTMLSelectElement>(`[name="${name}"]`)?.value ?? '';
  const mode = (): Mode => ($<HTMLInputElement>('[name="mode"]:checked')?.value as Mode | undefined) ?? 'postpone';

  function showMode() {
    const current = mode();
    body.querySelectorAll<HTMLElement>('[data-mode]').forEach((el) => (el.hidden = !el.dataset.mode!.split(' ').includes(current)));
  }

  /** Fills the new schedule with the postponed game's current one. */
  function fillSchedule(state: AdminState) {
    const m = selectedGame($<HTMLSelectElement>('[name="postponedGame"]'), state);
    if (!m) return;
    $<HTMLInputElement>('[name="date"]')!.value = m.date >= state.today ? m.date : '';
    $<HTMLInputElement>('[name="time"]')!.value = m.time;
    $<HTMLSelectElement>('[name="venue"]')!.value = m.venue;
  }

  return {
    id: 'postpone',
    title: 'Postpone / reschedule',
    render(container, state) {
      body = container;
      const open = postponableGames(state.matches, state.today);
      const postponed = postponedGames(state.matches);
      const radio = (value: Mode, label: string, enabled: boolean, checked: boolean) =>
        `<label class="ad-radio"><input type="radio" name="mode" value="${value}"${enabled ? '' : ' disabled'}${checked ? ' checked' : ''}> ${label}</label>`;
      const venues = (Object.keys(VENUES) as VenueId[]).map((v) => `<option value="${v}">${esc(VENUES[v].name)}</option>`).join('');
      body.innerHTML = `<fieldset class="ad-fieldset"><legend>What to do</legend>
          ${radio('postpone', 'Postpone a game', open.length > 0, open.length > 0)}
          ${radio('reschedule', 'Reschedule a postponed game', postponed.length > 0, open.length === 0 && postponed.length > 0)}
          ${radio('unpostpone', 'Remove the postponed mark', postponed.length > 0, false)}
        </fieldset>
        <div data-mode="postpone">${
          open.length > 0
            ? `<div class="ad-field"><label for="pp-game">Game</label><select id="pp-game" name="postponeGame">${gameOptions(open, open[0].game)}</select></div>`
            : '<p>No game without a result is dated today or later.</p>'
        }</div>
        <div data-mode="reschedule unpostpone">${
          postponed.length > 0
            ? `<div class="ad-field"><label for="pp-postponed">Postponed game</label><select id="pp-postponed" name="postponedGame">${gameOptions(postponed, postponed[0].game)}</select></div>`
            : '<p>No game is postponed.</p>'
        }</div>
        <div data-mode="reschedule" class="ad-grid3">
          <div class="ad-field"><label for="pp-date">New date</label><input id="pp-date" name="date" type="date" min="${esc(state.today)}"></div>
          <div class="ad-field"><label for="pp-time">Tip-off</label><input id="pp-time" name="time" type="time"></div>
          <div class="ad-field"><label for="pp-venue">Venue</label><select id="pp-venue" name="venue">${venues}</select></div>
        </div>`;
      body.querySelectorAll('[name="mode"]').forEach((el) => el.addEventListener('change', showMode));
      $('[name="postponedGame"]')?.addEventListener('change', () => fillSchedule(state));
      showMode();
      if (postponed.length > 0) fillSchedule(state);
    },
    prepare(values, state) {
      body.querySelectorAll<HTMLInputElement>('[name="mode"]').forEach((el) => (el.checked = el.value === values.mode));
      const postponed = $<HTMLSelectElement>('[name="postponedGame"]');
      if (postponed && typeof values.postponedGame === 'string') {
        postponed.value = values.postponedGame;
        fillSchedule(state);
      }
      showMode();
    },
    plan(state): Plan {
      const current = mode();
      showMode();
      if (current === 'postpone') {
        const plan: Plan = { command: 'postpone', changes: [], errors: [] };
        const m = selectedGame($<HTMLSelectElement>('[name="postponeGame"]'), state);
        if (!m) return plan;
        plan.notes = [`Game ${m.game} ${m.home} – ${m.away}, scheduled for ${shortDate(m.date)} at ${m.time}, will be shown as postponed with the new date to be fixed.`];
        plan.changes = postponeChanges(m, true);
        plan.payload = () => ({ game: m.game, postponed: true });
        return plan;
      }

      const m = selectedGame($<HTMLSelectElement>('[name="postponedGame"]'), state);
      if (current === 'unpostpone') {
        const plan: Plan = { command: 'postpone', changes: [], errors: [] };
        if (!m) return plan;
        plan.notes = [`The game goes back to ${shortDate(m.date)} at ${m.time}.`];
        if (m.date < state.today) plan.notes.push('That date has passed: the game will then need a score.');
        plan.changes = postponeChanges(m, false);
        plan.payload = () => ({ game: m.game, postponed: false });
        return plan;
      }

      const plan: Plan = { command: 'reschedule', changes: [], errors: [] };
      if (!m) return plan;
      const date = value('date');
      const time = value('time');
      const venue = value('venue') as VenueId;
      if (!isCalendarDate(date)) plan.errors.push('New date: choose a date.');
      else if (date < state.today) plan.errors.push(`New date: ${shortDate(date)} is before today.`);
      if (!isTimeOfDay(time)) plan.errors.push('Tip-off: enter a time as HH:MM.');
      if (plan.errors.length > 0) return plan;
      plan.changes = rescheduleChanges(m, date, time, venue);
      plan.payload = () => ({ game: m.game, date, time, venue });
      return plan;
    },
  };
}
