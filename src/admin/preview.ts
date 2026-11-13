import { VENUES } from '../data/fixtures.ts';
import type { Match, MatchResult, VenueId } from '../data/types.ts';
import { formatDate } from '../ui/format.ts';

/** "Before → after" lines that the admin page shows before saving; every helper is pure. */

export interface Change {
  label: string;
  before: string;
  after: string;
}

export const NONE = '—';

/** Only the lines whose value actually changes. */
const changed = (list: Change[]): Change[] => list.filter((c) => c.before !== c.after);

/** Short date as on the admin page, e.g. "Mon, 16 Nov 2026". */
export const shortDate = (date: string): string => formatDate(date, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });

/** One line naming a game for the pickers, e.g. "321 · La Perla – FDM A · Mon, 16 Nov 2026 21:30". */
export const gameLabel = (m: Match): string => `${m.game} · ${m.home} – ${m.away} · ${shortDate(m.date)} ${m.time}`;

/** A score as shown in the preview, e.g. "74–31 (18–8, 12–7, 22–12, 22–4)". */
export function formatResult(result: MatchResult | undefined): string {
  if (!result) return NONE;
  const periods = result.periods ? ` (${result.periods.map(([h, a]) => `${h}–${a}`).join(', ')})` : '';
  return `${result.home}–${result.away}${periods}`;
}

const status = (m: Pick<Match, 'postponed'>) => (m.postponed ? 'postponed, date to be fixed' : 'scheduled');
const venueName = (venue: VenueId) => VENUES[venue]?.name ?? venue;

export function scoreChanges(match: Match, result: MatchResult, hasBoxScore: boolean, removeBoxScore: boolean): Change[] {
  return changed([
    { label: 'Score', before: formatResult(match.result), after: formatResult(result) },
    { label: 'Box score', before: hasBoxScore ? 'published' : NONE, after: hasBoxScore && !removeBoxScore ? 'published' : NONE },
  ]);
}

export function videoChanges(match: Match, video: string): Change[] {
  return changed([{ label: 'Video', before: match.video ?? NONE, after: video || NONE }]);
}

/** A new statistics PDF always replaces the published one, so its line is shown even when the path stays. */
export function statsChanges(match: Match, hasBoxScore: boolean, withBoxScore: boolean, pdfBytes: number): Change[] {
  const size = `${Math.max(1, Math.round(pdfBytes / 1024))} KB`;
  return [
    { label: 'Statistics PDF', before: match.stats ?? NONE, after: `${match.stats ? 'replaced' : `/stats/${match.game}.pdf`} (${size})` },
    ...changed([
      {
        label: 'Box score',
        before: hasBoxScore ? 'published' : NONE,
        after: withBoxScore ? (hasBoxScore ? 'replaced from the PDF' : 'read from the PDF') : NONE,
      },
    ]),
  ];
}

export function postponeChanges(match: Match, postponed: boolean): Change[] {
  return changed([{ label: 'Status', before: status(match), after: status({ postponed: postponed ? true : undefined }) }]);
}

export function rescheduleChanges(match: Match, date: string, time: string, venue: VenueId): Change[] {
  return changed([
    { label: 'Status', before: status(match), after: status({}) },
    { label: 'Date', before: shortDate(match.date), after: date ? shortDate(date) : NONE },
    { label: 'Time', before: match.time, after: time || NONE },
    { label: 'Venue', before: venueName(match.venue), after: venueName(venue) },
  ]);
}
