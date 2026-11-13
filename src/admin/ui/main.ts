import './admin.css';
import { esc } from '../../ui/format.ts';
import { loadState, type AdminState } from '../api.ts';
import { DRAFT_KEY, decodeDraft, type ActionId, type Draft } from '../draft.ts';
import { lastResult, postponedGames } from '../eligible.ts';
import { formatResult, gameLabel, shortDate } from '../preview.ts';
import { postponeAction } from './postpone.ts';
import { scoreAction } from './score.ts';
import { ActionDialog, showExpired, type ActionSpec, type App } from './shell.ts';
import { standingsAction } from './standings.ts';
import { statsAction } from './stats.ts';
import { videoAction } from './video.ts';

/**
 * The owner's admin page. Cloudflare Access signs the owner in before the page loads; the page reads the
 * data through the admin API and offers one dialog per action.
 */

const ACTIONS: Record<ActionId, () => ActionSpec> = {
  score: scoreAction,
  video: videoAction,
  stats: statsAction,
  standings: standingsAction,
  postpone: postponeAction,
};

const statusEl = document.querySelector<HTMLElement>('#status')!;
const noticeEl = document.querySelector<HTMLElement>('#notice')!;
const tiles = Array.from(document.querySelectorAll<HTMLButtonElement>('[data-action]'));
const dialogs = new Map<ActionId, ActionDialog>();

let app: App | undefined;

function renderStatus(state: AdminState) {
  const last = lastResult(state.matches);
  const postponed = postponedGames(state.matches);
  statusEl.removeAttribute('aria-busy');
  statusEl.innerHTML = `<dl class="ad-facts">
      <div><dt>Signed in as</dt><dd>${esc(state.email)}</dd></div>
      <div><dt>Today</dt><dd>${esc(shortDate(state.today))}</dd></div>
      <div><dt>Last result</dt><dd>${last ? `${esc(gameLabel(last))} · <b>${esc(formatResult(last.result))}</b>` : '—'}</dd></div>
      <div><dt>Standings</dt><dd>${esc(state.standings.source)}</dd></div>
      <div><dt>Postponed</dt><dd>${postponed.length ? postponed.map((m) => esc(gameLabel(m))).join('<br>') : 'none'}</dd></div>
    </dl>`;
}

function showNotice(text: string, retry?: () => void) {
  noticeEl.hidden = false;
  noticeEl.className = 'ad-message is-error';
  noticeEl.innerHTML = `<p>${esc(text)}</p>${retry ? '<button type="button" class="ad-btn" data-retry>Try again</button>' : ''}`;
  noticeEl.querySelector('[data-retry]')?.addEventListener('click', retry!);
}

function hideNotice() {
  noticeEl.hidden = true;
  noticeEl.innerHTML = '';
}

/** Loads the data; true when it is there. */
async function load(): Promise<boolean> {
  const outcome = await loadState();
  if (outcome.kind === 'ok') {
    hideNotice();
    if (app) app.state = outcome.body;
    else app = { state: outcome.body, refresh: async () => void (await load()) };
    renderStatus(outcome.body);
    tiles.forEach((t) => (t.disabled = false));
    return true;
  }
  if (outcome.kind === 'expired') showExpired(noticeEl);
  else if (outcome.kind === 'violations') showNotice(`Could not load the data: ${outcome.violations.join('; ')}`, () => void load());
  else showNotice(`Could not load the data. ${outcome.message}`, () => void load());
  if (!app) statusEl.innerHTML = '<p>The data is not loaded.</p>';
  return false;
}

function dialogFor(action: ActionId): ActionDialog {
  let dialog = dialogs.get(action);
  if (!dialog) {
    dialog = new ActionDialog(ACTIONS[action](), app!);
    dialogs.set(action, dialog);
  }
  return dialog;
}

/** The draft kept before signing in again, taken out of storage so it is restored once only. */
function takeDraft(): Draft | undefined {
  try {
    const draft = decodeDraft(sessionStorage.getItem(DRAFT_KEY));
    sessionStorage.removeItem(DRAFT_KEY);
    return draft;
  } catch {
    return undefined;
  }
}

for (const tile of tiles) {
  tile.addEventListener('click', () => {
    if (app) dialogFor(tile.dataset.action as ActionId).open();
  });
}

void (async () => {
  if (!(await load())) return;
  const draft = takeDraft();
  if (draft) dialogFor(draft.action).restore(draft.values);
})();
