import { esc } from '../../ui/format.ts';
import type { BoxScore, Match } from '../../data/types.ts';
import { MAX_PDF_BYTES, toBase64 } from '../api.ts';
import { mediaGames } from '../eligible.ts';
import { statsChanges } from '../preview.ts';
import { summarizeBoxScore, type BoxSummary } from '../stats-check.ts';
import { gameOptions, selectedGame, type ActionSpec, type Plan } from './shell.ts';

const PDF_MAGIC = [0x25, 0x50, 0x44, 0x46, 0x2d]; // %PDF-

const megabytes = (bytes: number) => `${(bytes / 1024 / 1024).toFixed(2)} MB`;

interface PdfFile {
  bytes: Uint8Array;
  name: string;
  /** The box score read from the file. */
  box?: BoxScore;
  /** Why no box score could be read. */
  parseError?: string;
}

function summaryHtml(m: Match, s: BoxSummary): string {
  const count = Math.max(s.periods[0].length, s.periods[1].length);
  const head = Array.from({ length: count }, (_, i) => `<th scope="col">${i < 4 ? `Q${i + 1}` : `OT${i - 3}`}</th>`).join('');
  const row = (team: string, side: 0 | 1) =>
    `<tr><th scope="row">${esc(team)}</th>${s.periods[side].map((p) => `<td>${p}</td>`).join('')}<td class="cp-total">${s.totals[side]}</td></tr>`;
  const scorers = (team: string, side: 0 | 1) =>
    `<li><b>${esc(team)}:</b> ${s.scorers[side].map((p) => `${esc(p.name || `#${p.no}`)} ${p.pts}`).join(', ') || '—'}</li>`;
  return `<div class="cp-table-wrap"><table class="cp-mini"><caption>Read from the PDF</caption>
      <thead><tr><th scope="col">Team</th>${head}<th scope="col">Total</th></tr></thead>
      <tbody>${row(m.home, 0)}${row(m.away, 1)}</tbody></table></div>
    <ul class="cp-scorers"><li class="cp-muted">Top scorers</li>${scorers(m.home, 0)}${scorers(m.away, 1)}</ul>`;
}

/** Publish the statistics PDF of a game with a result, with the box score read from it in the browser. */
export function statsAction(): ActionSpec {
  let body: HTMLElement;
  let file: PdfFile | undefined;
  let reading = false;
  /** Problem with the chosen file itself (size, type); nothing can be uploaded then. */
  let fileError: string | undefined;
  /** Identifies the latest chosen file, so a slow read of an earlier one cannot overwrite it. */
  let token = 0;
  const $ = <T extends Element>(selector: string) => body.querySelector<T>(selector);

  async function choose(chosen: File | undefined, changed: () => void) {
    const mine = ++token;
    file = undefined;
    fileError = undefined;
    reading = false;
    if (chosen) {
      if (chosen.size > MAX_PDF_BYTES) {
        fileError = `The file is ${megabytes(chosen.size)}; the largest PDF the site accepts is ${megabytes(MAX_PDF_BYTES)}.`;
      } else {
        reading = true;
        changed();
        const bytes = new Uint8Array(await chosen.arrayBuffer());
        if (mine !== token) return;
        if (!PDF_MAGIC.every((b, i) => bytes[i] === b)) {
          fileError = 'The file is not a PDF.';
        } else {
          file = { bytes, name: chosen.name };
          try {
            const { readBoxScore } = await import('./pdf.ts');
            file.box = await readBoxScore(bytes);
          } catch (error) {
            file.parseError = error instanceof Error ? error.message : String(error);
          }
          if (mine !== token) return;
        }
        reading = false;
      }
    }
    changed();
  }

  return {
    id: 'stats',
    title: 'Statistics (PDF)',
    restoreNote: 'Choose the PDF file again.',
    render(container, state, changed) {
      body = container;
      file = undefined;
      fileError = undefined;
      reading = false;
      token++;
      const games = mediaGames(state.matches);
      if (games.length === 0) {
        body.innerHTML = '<p>No game has a result yet.</p>';
        return;
      }
      body.innerHTML = `<div class="cp-field"><label for="stats-game">Game</label><select id="stats-game" name="game">${gameOptions(games, games[0].game)}</select></div>
        <p class="cp-hint" id="stats-current"></p>
        <div class="cp-field"><label for="stats-file">Statistics PDF <span class="cp-muted">(“Tabellino dettagliato”, at most ${megabytes(MAX_PDF_BYTES)})</span></label>
          <input id="stats-file" type="file" accept="application/pdf,.pdf"></div>
        <div class="cp-boxscore" hidden><label class="cp-checkbox"><input type="checkbox" name="withoutBoxScore"> Upload the PDF without a box score</label></div>`;
      const fileInput = $<HTMLInputElement>('#stats-file')!;
      fileInput.addEventListener('change', () => void choose(fileInput.files?.[0], changed));
    },
    prepare(values) {
      const select = $<HTMLSelectElement>('#stats-game');
      if (select) select.value = String(values.game ?? '');
    },
    plan(state): Plan {
      const plan: Plan = { command: 'stats', changes: [], errors: [] };
      const m = selectedGame($<HTMLSelectElement>('#stats-game'), state);
      if (!m) return plan;
      const hasBox = state.boxScoreGames.includes(m.game);
      $('#stats-current')!.textContent = `Published now: ${m.stats ? 'statistics PDF' : 'no statistics PDF'}, ${hasBox ? 'box score' : 'no box score'}.`;
      const optOut = $<HTMLElement>('.cp-boxscore')!;
      optOut.hidden = true;

      if (fileError) {
        plan.errors.push(fileError);
        return plan;
      }
      if (reading) {
        plan.notes = ['Reading the PDF…'];
        return plan;
      }
      if (!file) {
        plan.notes = ['Choose the statistics PDF of the game.'];
        return plan;
      }

      const summary = file.box ? summarizeBoxScore(file.box, m) : undefined;
      if (summary) plan.html = summaryHtml(m, summary);
      if (summary?.otherGame) {
        plan.errors.push(`${summary.problem}. Choose the right file or game.`);
        return plan;
      }
      const usable = summary !== undefined && summary.problem === undefined;
      const notes: string[] = [];
      if (usable) {
        notes.push(`The box score matches the result ${m.result!.home}–${m.result!.away}.`);
      } else {
        notes.push(file.parseError ? `No box score could be read from the PDF: ${file.parseError}.` : `${summary!.problem}.`);
        optOut.hidden = false;
        const without = $<HTMLInputElement>('[name="withoutBoxScore"]')!.checked;
        if (!without) {
          plan.errors.push(
            file.parseError
              ? 'Tick "Upload the PDF without a box score" to publish the file anyway.'
              : 'Correct the score first, or tick "Upload the PDF without a box score".',
          );
        }
        if (hasBox) notes.push('The published box score of this game will be removed.');
      }
      plan.notes = notes;
      plan.changes = statsChanges(m, hasBox, usable, file.bytes.byteLength);
      const { bytes, box } = file;
      plan.payload = () => ({ game: m.game, pdf: toBase64(bytes), ...(usable && box ? { boxScore: box } : {}) });
      return plan;
    },
  };
}
