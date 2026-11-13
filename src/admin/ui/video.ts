import { esc } from '../../ui/format.ts';
import { normalizeVideo } from '../commands.ts';
import { mediaGames } from '../eligible.ts';
import { videoChanges } from '../preview.ts';
import { gameOptions, selectedGame, type ActionSpec, type Plan } from './shell.ts';

/** Add or replace the YouTube recording of a game with a result. */
export function videoAction(): ActionSpec {
  let body: HTMLElement;
  const $ = <T extends Element>(selector: string) => body.querySelector<T>(selector);

  return {
    id: 'video',
    title: 'Video',
    render(container, state) {
      body = container;
      const games = mediaGames(state.matches);
      if (games.length === 0) {
        body.innerHTML = '<p>No game has a result yet.</p>';
        return;
      }
      body.innerHTML = `<div class="cp-field"><label for="video-game">Game</label><select id="video-game" name="game">${gameOptions(games, games[0].game)}</select></div>
        <div class="cp-field"><label for="video-url">YouTube link</label>
          <input id="video-url" name="video" type="url" inputmode="url" maxlength="300" autocomplete="off" placeholder="https://youtu.be/…"></div>
        <p class="cp-hint" id="video-normalized"></p>`;
      const select = $<HTMLSelectElement>('#video-game')!;
      const fill = () => ($<HTMLInputElement>('#video-url')!.value = selectedGame(select, state)?.video ?? '');
      select.addEventListener('change', fill);
      fill();
    },
    prepare(values) {
      const select = $<HTMLSelectElement>('#video-game');
      if (select) select.value = String(values.game ?? '');
    },
    plan(state): Plan {
      const plan: Plan = { command: 'video', changes: [], errors: [] };
      const m = selectedGame($<HTMLSelectElement>('#video-game'), state);
      if (!m) return plan;
      const typed = $<HTMLInputElement>('#video-url')!.value.trim();
      const video = normalizeVideo(typed);
      const hint = $('#video-normalized')!;
      hint.innerHTML = video ? `Saved as: <code>${esc(video)}</code>` : '';
      if (!typed) {
        plan.notes = ['Enter the YouTube link of the recording.'];
        return plan;
      }
      plan.changes = videoChanges(m, video);
      plan.payload = () => ({ game: m.game, video: typed });
      return plan;
    },
  };
}
