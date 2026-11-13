import { esc } from '../../ui/format.ts';
import type { Match } from '../../data/types.ts';
import { safeCommitUrl, sendCommand, type AdminState } from '../api.ts';
import { DRAFT_KEY, encodeDraft, type ActionId, type Draft } from '../draft.ts';
import { gameLabel, type Change } from '../preview.ts';

/**
 * The frame every admin action dialog shares: game picker helpers, the optional comment, the preview of
 * changes, Save, and the handling of the API's answer. The action itself only builds its fields and says
 * what Save would do with the current input.
 */

export type Values = Record<string, string | boolean>;

/** What the page offers the dialogs. */
export interface App {
  state: AdminState;
  /** Reloads the data after a change was saved. */
  refresh(): Promise<void>;
}

/** What Save would do with the current input. */
export interface Plan {
  command: string;
  /** Builds the request body; absent while the input cannot be saved. */
  payload?: () => Record<string, unknown>;
  changes: Change[];
  /** Problems that block saving. */
  errors: string[];
  /** Plain-text remarks shown under the changes. */
  notes?: string[];
  /** Extra preview markup, already escaped. */
  html?: string;
}

export interface ActionSpec {
  id: ActionId;
  title: string;
  /** Builds the fields from the current data; `changed` re-runs the preview, e.g. after a file was read. */
  render(body: HTMLElement, state: AdminState, changed: () => void): void;
  /** What Save would do now. Runs on every input. */
  plan(state: AdminState): Plan;
  /** Recreates the structure the stored values need (selected game, extra rows) before they are put back. */
  prepare?(values: Values, state: AdminState): void;
  /** Shown after restoring a draft, e.g. that a file must be chosen again. */
  restoreNote?: string;
}

/** Options of a game picker. */
export const gameOptions = (games: readonly Match[], selected?: number): string =>
  games.map((m) => `<option value="${m.game}"${m.game === selected ? ' selected' : ''}>${esc(gameLabel(m))}</option>`).join('');

/** The selected game of a picker, looked up in the current data. */
export function selectedGame(select: HTMLSelectElement | null, state: AdminState): Match | undefined {
  const game = Number(select?.value);
  return state.matches.find((m) => m.game === game);
}

type Control = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

const controls = (form: HTMLFormElement): Control[] =>
  Array.from(form.elements).filter(
    (el): el is Control => (el instanceof HTMLInputElement || el instanceof HTMLSelectElement || el instanceof HTMLTextAreaElement) && el.name !== '',
  );

/** The input of every named control except file inputs, which cannot be stored. */
export function captureValues(form: HTMLFormElement): Values {
  const out: Values = {};
  for (const el of controls(form)) {
    if (el instanceof HTMLInputElement && el.type === 'file') continue;
    if (el instanceof HTMLInputElement && el.type === 'checkbox') out[el.name] = el.checked;
    else if (el instanceof HTMLInputElement && el.type === 'radio') {
      if (el.checked) out[el.name] = el.value;
    } else out[el.name] = el.value;
  }
  return out;
}

export function applyValues(form: HTMLFormElement, values: Values) {
  for (const el of controls(form)) {
    if (!Object.hasOwn(values, el.name)) continue;
    const value = values[el.name];
    if (el instanceof HTMLInputElement && el.type === 'file') continue;
    if (el instanceof HTMLInputElement && el.type === 'checkbox') el.checked = value === true;
    else if (el instanceof HTMLInputElement && el.type === 'radio') el.checked = el.value === value;
    else if (typeof value === 'string') el.value = value;
  }
}

/** Keeps the draft for after the reload, then reloads the page so Cloudflare Access asks to sign in again. */
function signInAgain(draft?: Draft) {
  if (draft) {
    try {
      sessionStorage.setItem(DRAFT_KEY, encodeDraft(draft));
    } catch {
      // Storage unavailable (private mode, quota): the reload still signs in, only the input is lost.
    }
  }
  location.reload();
}

/** The "session expired" message with its sign-in button, in place of the container's content. */
export function showExpired(container: HTMLElement, draft?: Draft) {
  container.hidden = false;
  container.className = container.className.replace(/\bis-\w+\b/g, '').trim() + ' is-error';
  container.innerHTML = `<p><b>Your session has expired. Sign in again.</b>${draft ? ' Your input is kept and comes back after signing in.' : ''}</p>
    <button type="button" class="ad-btn primary" data-sign-in>Sign in again</button>`;
  container.querySelector('[data-sign-in]')!.addEventListener('click', () => signInAgain(draft));
}

const CLOSE_ICON =
  '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>';

const changesHtml = (changes: Change[]): string =>
  changes.length === 0
    ? '<p class="ad-muted">No changes yet.</p>'
    : `<table class="ad-changes"><tbody>${changes
        .map(
          (c) =>
            `<tr><th scope="row">${esc(c.label)}</th><td class="ad-before">${esc(c.before)}</td><td class="ad-arrow" aria-label="becomes">→</td><td class="ad-after">${esc(c.after)}</td></tr>`,
        )
        .join('')}</tbody></table>`;

const listHtml = (items: string[], cls: string): string => `<ul class="${cls}">${items.map((i) => `<li>${esc(i)}</li>`).join('')}</ul>`;

/** One action dialog: built once, its input kept between openings until the data changes. */
export class ActionDialog {
  readonly dialog: HTMLDialogElement;
  private readonly form: HTMLFormElement;
  private readonly body: HTMLElement;
  private readonly comment: HTMLTextAreaElement;
  private readonly preview: HTMLElement;
  private readonly message: HTMLElement;
  private readonly save: HTMLButtonElement;
  private readonly done: HTMLElement;
  private renderedVersion?: string;
  private busy = false;

  constructor(
    private readonly spec: ActionSpec,
    private readonly app: App,
  ) {
    const id = `ad-${spec.id}`;
    const d = document.createElement('dialog');
    d.className = 'ad-dialog';
    d.setAttribute('aria-labelledby', `${id}-title`);
    d.innerHTML = `<div class="ad-titlebar"><h2 id="${id}-title">${esc(spec.title)}</h2>
        <button type="button" class="ad-close" data-close aria-label="Close" title="Close">${CLOSE_ICON}</button></div>
      <form class="ad-form" novalidate>
        <div class="ad-body"></div>
        <div class="ad-field"><label for="${id}-comment">Comment <span class="ad-muted">(optional, added to the change log)</span></label>
          <textarea id="${id}-comment" name="comment" rows="2" maxlength="2000"></textarea></div>
        <section class="ad-preview" aria-live="polite" aria-labelledby="${id}-preview-title"><h3 id="${id}-preview-title">Preview of changes</h3><div></div></section>
        <div class="ad-message" role="status" hidden></div>
        <div class="ad-actions"><button type="button" class="ad-btn" data-close>Cancel</button><button type="submit" class="ad-btn primary">Save</button></div>
      </form>
      <div class="ad-done" role="status" hidden></div>`;
    document.body.append(d);
    this.dialog = d;
    this.form = d.querySelector('form')!;
    this.body = d.querySelector('.ad-body')!;
    this.comment = d.querySelector('textarea')!;
    this.preview = d.querySelector('.ad-preview > div')!;
    this.message = d.querySelector('.ad-message')!;
    this.save = d.querySelector('button[type="submit"]')!;
    this.done = d.querySelector('.ad-done')!;

    d.addEventListener('click', (e) => {
      if (e.target instanceof Element && e.target.closest('[data-close]')) d.close();
    });
    // Escape closes the dialog, except while a change is being saved.
    d.addEventListener('cancel', (e) => {
      if (this.busy) e.preventDefault();
    });
    this.form.addEventListener('input', () => this.update());
    this.form.addEventListener('change', () => this.update());
    this.form.addEventListener('submit', (e) => {
      e.preventDefault();
      void this.submit();
    });
  }

  /** Opens the dialog; it starts afresh when the data changed since it was filled or after a save. */
  open() {
    if (this.renderedVersion !== this.app.state.version || !this.done.hidden) this.reset();
    if (!this.dialog.open) this.dialog.showModal();
    this.focusFirst();
  }

  /** Opens the dialog with the input kept before an expired session was renewed. */
  restore(values: Values) {
    this.reset();
    this.spec.prepare?.(values, this.app.state);
    applyValues(this.form, values);
    this.update();
    if (!this.dialog.open) this.dialog.showModal();
    this.note(`Your unsaved input was restored.${this.spec.restoreNote ? ` ${this.spec.restoreNote}` : ''}`);
    this.focusFirst();
  }

  private focusFirst() {
    const first = this.dialog.querySelector<HTMLElement>('.ad-form:not([hidden]) :is(select, input, textarea):not([disabled]), .ad-done:not([hidden]) button');
    (first ?? this.dialog.querySelector<HTMLElement>('.ad-close'))?.focus();
  }

  private reset() {
    this.renderedVersion = this.app.state.version;
    this.form.hidden = false;
    this.done.hidden = true;
    this.done.innerHTML = '';
    this.comment.value = '';
    this.clearMessage();
    this.body.innerHTML = '';
    this.spec.render(this.body, this.app.state, () => this.update());
    this.update();
  }

  private update() {
    const plan = this.spec.plan(this.app.state);
    const parts = [changesHtml(plan.changes)];
    if (plan.html) parts.push(plan.html);
    if (plan.notes?.length) parts.push(listHtml(plan.notes, 'ad-notes'));
    if (plan.errors.length) parts.push(listHtml(plan.errors, 'ad-errors'));
    this.preview.innerHTML = parts.join('');
    this.save.disabled = this.busy || !plan.payload || plan.errors.length > 0 || plan.changes.length === 0;
  }

  private clearMessage() {
    this.message.hidden = true;
    this.message.className = 'ad-message';
    this.message.innerHTML = '';
  }

  private note(text: string, kind: 'info' | 'error' = 'info', extra = '') {
    this.message.hidden = false;
    this.message.className = `ad-message is-${kind}`;
    this.message.innerHTML = `<p>${esc(text)}</p>${extra}`;
  }

  private async submit() {
    const plan = this.spec.plan(this.app.state);
    if (this.busy || !plan.payload || plan.errors.length > 0 || plan.changes.length === 0) return;
    this.busy = true;
    this.save.disabled = true;
    this.note('Saving…');
    try {
      const payload = plan.payload();
      const comment = this.comment.value.trim();
      if (comment) payload.comment = comment;
      const outcome = await sendCommand(plan.command, payload);
      switch (outcome.kind) {
        case 'ok':
          if (outcome.body.saved) await this.saved(safeCommitUrl(outcome.body.commitUrl));
          else this.note('Nothing changed: the data already has these values.');
          break;
        case 'expired':
          showExpired(this.message, { action: this.spec.id, values: captureValues(this.form) });
          break;
        case 'violations':
          this.note('The change was not saved:', 'error', listHtml(outcome.violations, 'ad-errors'));
          break;
        case 'error':
          this.note(outcome.message, 'error');
          break;
      }
    } catch (error) {
      this.note(`The change could not be sent: ${error instanceof Error ? error.message : 'unknown error'}`, 'error');
    } finally {
      this.busy = false;
      if (this.form.hidden) this.save.disabled = true;
      else this.update();
    }
  }

  private async saved(commitUrl: string | undefined) {
    this.form.hidden = true;
    this.done.hidden = false;
    const link = commitUrl ? ` <a href="${esc(commitUrl)}" target="_blank" rel="noopener noreferrer">View the change on GitHub ↗</a>` : '';
    this.done.innerHTML = `<p class="ad-success"><b>Saved.</b>${link}</p><p>The site updates in about a minute.</p>
      <div class="ad-actions"><button type="button" class="ad-btn" data-again>Make another change</button><button type="button" class="ad-btn primary" data-close>Close</button></div>`;
    this.done.querySelector('[data-again]')!.addEventListener('click', () => {
      this.reset();
      this.focusFirst();
    });
    this.done.querySelector<HTMLElement>('[data-close]')!.focus();
    await this.app.refresh();
  }
}
