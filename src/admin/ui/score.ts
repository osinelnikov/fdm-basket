import { esc } from '../../ui/format.ts';
import type { Match } from '../../data/types.ts';
import { defaultScoreGame, scoreGames } from '../eligible.ts';
import { formatResult, scoreChanges } from '../preview.ts';
import { QUARTERS, periodName, readScoreForm, sameResult, scoreFormFrom, type ScoreForm } from '../score-form.ts';
import { gameOptions, selectedGame, type ActionSpec, type Plan } from './shell.ts';

/** Most periods the API accepts: four quarters and six overtimes. */
const MAX_PERIODS = 10;

/** Enter or correct the final score of a game dated today or earlier. */
export function scoreAction(): ActionSpec {
  let body: HTMLElement;
  const $ = <T extends Element>(selector: string) => body.querySelector<T>(selector);
  const input = (name: string) => $<HTMLInputElement>(`[name="${name}"]`)!;
  const rows = () => body.querySelectorAll('tbody tr[data-period]').length;

  function periodRow(i: number, home: string, away: string, m: Match): string {
    const cell = (side: 'h' | 'a', team: string, value: string) =>
      `<td><input name="p${i}${side}" inputmode="numeric" autocomplete="off" size="4" aria-label="${esc(`${periodName(i)} ${team}`)}" value="${esc(value)}"></td>`;
    return `<tr data-period="${i}"><th scope="row">${periodName(i)}</th>${cell('h', m.home, home)}${cell('a', m.away, away)}</tr>`;
  }

  function setPeriods(m: Match, periods: [string, string][]) {
    $('tbody')!.innerHTML = periods.map(([h, a], i) => periodRow(i, h, a, m)).join('');
  }

  /** Fills the fields with the game's current score, or empty ones when it has none. */
  function fill(m: Match) {
    const form = scoreFormFrom(m.result);
    body.querySelectorAll('[data-team="home"]').forEach((el) => (el.textContent = m.home));
    body.querySelectorAll('[data-team="away"]').forEach((el) => (el.textContent = m.away));
    $('#score-mode')!.textContent = m.result ? `Correcting the current score ${formatResult(m.result)}` : 'This game has no score yet.';
    input('home').value = form.home;
    input('away').value = form.away;
    setPeriods(m, form.periods);
  }

  function readForm(): ScoreForm {
    const periods: [string, string][] = [];
    for (let i = 0; i < rows(); i++) periods.push([input(`p${i}h`).value, input(`p${i}a`).value]);
    return { home: input('home').value, away: input('away').value, periods };
  }

  return {
    id: 'score',
    title: 'Score',
    render(container, state) {
      body = container;
      const games = scoreGames(state.matches, state.today);
      if (games.length === 0) {
        body.innerHTML = '<p>No game is dated today or earlier.</p>';
        return;
      }
      body.innerHTML = `<div class="ad-field"><label for="score-game">Game</label><select id="score-game" name="game">${gameOptions(games, defaultScoreGame(games)?.game)}</select></div>
        <p class="ad-hint" id="score-mode"></p>
        <fieldset class="ad-fieldset"><legend>Final score</legend>
          <div class="ad-final">
            <label><span data-team="home"></span><input name="home" inputmode="numeric" autocomplete="off" size="4"></label>
            <span aria-hidden="true">–</span>
            <label><span data-team="away"></span><input name="away" inputmode="numeric" autocomplete="off" size="4"></label>
          </div>
        </fieldset>
        <fieldset class="ad-fieldset" id="score-periods"><legend>Points per period <span class="ad-muted">(optional: leave all empty when only the final score is known)</span></legend>
          <table class="ad-periods"><thead><tr><th scope="col">Period</th><th scope="col" data-team="home"></th><th scope="col" data-team="away"></th></tr></thead><tbody></tbody></table>
          <div class="ad-inline"><button type="button" class="ad-btn small" data-add-ot>Add overtime</button><button type="button" class="ad-btn small" data-remove-ot>Remove last overtime</button></div>
          <p class="ad-check" id="score-check" aria-live="polite"></p>
        </fieldset>
        <div class="ad-boxscore" hidden><label class="ad-checkbox"><input type="checkbox" name="removeBoxScore"> Remove the published box score if it does not match the new score</label></div>`;

      const select = $<HTMLSelectElement>('#score-game')!;
      select.addEventListener('change', () => fill(selectedGame(select, state)!));
      // Listeners go on elements of this rendering: the container itself outlives it.
      $('#score-periods')!.addEventListener('click', (e) => {
        const target = e.target instanceof Element ? e.target : null;
        const m = selectedGame(select, state);
        if (!m) return;
        if (target?.closest('[data-add-ot]') && rows() < MAX_PERIODS) {
          $('tbody')!.insertAdjacentHTML('beforeend', periodRow(rows(), '', '', m));
          input(`p${rows() - 1}h`).focus();
        } else if (target?.closest('[data-remove-ot]') && rows() > QUARTERS) {
          $('tbody tr:last-child')!.remove();
        } else return;
        body.dispatchEvent(new Event('change', { bubbles: true }));
      });
      fill(selectedGame(select, state)!);
    },
    prepare(values, state) {
      const select = $<HTMLSelectElement>('#score-game');
      if (!select) return;
      select.value = String(values.game ?? '');
      const m = selectedGame(select, state);
      if (!m) return;
      fill(m);
      const stored = Object.keys(values).filter((k) => /^p\d+h$/.test(k)).length;
      const count = Math.min(MAX_PERIODS, Math.max(QUARTERS, stored));
      setPeriods(m, Array.from({ length: count }, () => ['', ''] as [string, string]));
    },
    plan(state): Plan {
      const plan: Plan = { command: 'score', changes: [], errors: [] };
      const m = selectedGame($<HTMLSelectElement>('#score-game'), state);
      if (!m) return plan;

      const reading = readScoreForm(readForm());
      const check = $('#score-check')!;
      const final = `${input('home').value.trim()}–${input('away').value.trim()}`;
      const sum = reading.sums ? `${reading.sums[0]}–${reading.sums[1]}` : '';
      check.textContent = !sum ? '' : sum === final ? `Periods add up to ${sum}, as the final score.` : `Periods add up to ${sum}; the final score is ${final}.`;
      check.classList.toggle('is-bad', sum !== '' && sum !== final);
      $('[data-remove-ot]')!.toggleAttribute('disabled', rows() <= QUARTERS);
      $('[data-add-ot]')!.toggleAttribute('disabled', rows() >= MAX_PERIODS);

      const hasBox = state.boxScoreGames.includes(m.game);
      const changing = reading.result !== undefined && !sameResult(m.result, reading.result);
      const boxRow = $<HTMLElement>('.ad-boxscore')!;
      boxRow.hidden = !(hasBox && changing);
      const removeBox = !boxRow.hidden && input('removeBoxScore').checked;

      plan.errors = reading.errors;
      if (!boxRow.hidden && !removeBox) plan.errors.push('This game has a published box score: tick "Remove the published box score" to change its score.');
      const result = reading.result;
      if (!result) return plan;
      plan.changes = scoreChanges(m, result, hasBox, removeBox);
      if (removeBox) {
        const box = plan.changes.find((c) => c.label === 'Box score');
        if (box) box.after = 'removed if it does not match the new score';
      }
      plan.payload = () => ({ game: m.game, result, ...(removeBox ? { removeBoxScore: true } : {}) });
      return plan;
    },
  };
}
