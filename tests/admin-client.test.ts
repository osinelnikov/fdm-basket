import { describe, expect, it } from 'vitest';
import { MAX_BODY_BYTES as SERVER_MAX_BODY_BYTES } from '../functions/_lib/handlers.ts';
import { BOX_SCORES, MATCHES } from './fixtures/data.ts';
import type { BoxScore } from '../src/data/types.ts';
import { normalizeVideo } from '../src/admin/commands.ts';
import { MAX_BODY_BYTES, MAX_PDF_BYTES, bodySize, readOutcome, safeCommitUrl, toBase64 } from '../src/admin/api.ts';
import { decodeDraft, encodeDraft } from '../src/admin/draft.ts';
import { NONE, formatResult, gameLabel, postponeChanges, rescheduleChanges, scoreChanges, statsChanges, videoChanges } from '../src/admin/preview.ts';
import { summarizeBoxScore } from '../src/admin/stats-check.ts';

const box310 = BOX_SCORES[310];
const match = (game: number) => structuredClone(MATCHES.find((m) => m.game === game)!);
const json = (status: number, body: unknown) => readOutcome({ type: 'basic', status, contentType: 'application/json; charset=utf-8' }, JSON.stringify(body));

describe('answers of the admin API', () => {
  it('treats the redirect to the sign-in page as an expired session', () => {
    expect(readOutcome({ type: 'opaqueredirect', status: 0, contentType: null }, '')).toEqual({ kind: 'expired' });
    expect(readOutcome({ type: 'basic', status: 0, contentType: null }, '')).toEqual({ kind: 'expired' });
  });

  it('treats 401 and a page that is not JSON as an expired session', () => {
    expect(json(401, { error: 'not signed in' })).toEqual({ kind: 'expired' });
    expect(readOutcome({ type: 'basic', status: 200, contentType: 'text/html' }, '<html>Sign in</html>')).toEqual({ kind: 'expired' });
    expect(readOutcome({ type: 'basic', status: 200, contentType: 'application/json' }, '<html>')).toEqual({ kind: 'expired' });
  });

  it('keeps a server failure that is not JSON an error, not an expired session', () => {
    expect(readOutcome({ type: 'basic', status: 502, contentType: 'text/html' }, 'Bad gateway')).toMatchObject({ kind: 'error', status: 502 });
  });

  it('reads a saved change and an unchanged one', () => {
    expect(json(200, { saved: true, message: 'admin: 315 video', commitUrl: 'https://github.com/o/r/commit/abc' })).toEqual({
      kind: 'ok',
      body: { saved: true, message: 'admin: 315 video', commitUrl: 'https://github.com/o/r/commit/abc' },
    });
    expect(json(200, { saved: false })).toEqual({ kind: 'ok', body: { saved: false } });
  });

  it('lists the violations of a rejected change (422 and unknown game 404)', () => {
    expect(json(422, { violations: ['game 315: a', 'game 315: b'] })).toEqual({ kind: 'violations', status: 422, violations: ['game 315: a', 'game 315: b'] });
    expect(json(404, { violations: ['game 999: no such game'] })).toMatchObject({ kind: 'violations', status: 404 });
  });

  it('turns the other failures into clear messages', () => {
    expect(json(409, { error: 'the data changed meanwhile; reload and try again' })).toMatchObject({ kind: 'error', message: expect.stringContaining('changed meanwhile') });
    expect(json(413, { error: 'too large' })).toMatchObject({ kind: 'error', message: expect.stringContaining('at most 1.4 MB') });
    expect(json(400, { error: 'invalid request: game: missing' })).toMatchObject({ kind: 'error', message: expect.stringContaining('game: missing') });
    expect(json(502, { error: 'storage error' })).toMatchObject({ kind: 'error', message: expect.stringContaining('nothing was changed') });
    expect(json(503, { error: 'the admin area is not configured' })).toMatchObject({ kind: 'error', message: expect.stringContaining('not configured') });
  });

  it('shows only GitHub links as the commit link', () => {
    expect(safeCommitUrl('https://github.com/o/r/commit/abc')).toBe('https://github.com/o/r/commit/abc');
    for (const bad of [null, '', 'javascript:alert(1)', 'https://evil.example/github.com', 'https://github.com/a b']) expect(safeCommitUrl(bad)).toBeUndefined();
  });
});

describe('request size', () => {
  it('uses the limit of the server', () => {
    expect(MAX_BODY_BYTES).toBe(SERVER_MAX_BODY_BYTES);
  });

  it('fits the largest accepted PDF with a box score into one request', () => {
    const base64 = 4 * Math.ceil(MAX_PDF_BYTES / 3);
    const body = bodySize(JSON.stringify({ game: 310, pdf: '', boxScore: box310, comment: 'x'.repeat(2000) }));
    expect(base64 + body).toBeLessThan(MAX_BODY_BYTES);
  });

  it('encodes bytes as base64 across chunk boundaries', () => {
    const bytes = Uint8Array.from({ length: 100_001 }, (_, i) => (i * 7919) % 256);
    expect(toBase64(bytes)).toBe(Buffer.from(bytes).toString('base64'));
    expect(toBase64(new Uint8Array())).toBe('');
  });
});

describe('draft kept while signing in again', () => {
  it('comes back as it was stored', () => {
    const draft = { action: 'score' as const, values: { game: '315', home: '35', p4h: '', removeBoxScore: true, comment: 'typo' } };
    expect(decodeDraft(encodeDraft(draft))).toEqual(draft);
  });

  it('is ignored when missing or damaged', () => {
    for (const text of [null, '', '{', '[]', '{"v":1,"action":"delete","values":{}}', '{"v":2,"action":"score","values":{}}', '{"v":1,"action":"score","values":{"a":1}}', '{"v":1,"action":"score","values":null}']) {
      expect(decodeDraft(text)).toBeUndefined();
    }
  });
});

describe('preview of changes', () => {
  it('shows a score before and after, and the box score that goes with a confirmed change', () => {
    const m = match(310);
    expect(formatResult(m.result)).toBe('72–57 (16–13, 23–15, 19–13, 14–16)');
    expect(formatResult(undefined)).toBe(NONE);
    expect(scoreChanges(m, { home: 72, away: 57 }, true, false)).toEqual([{ label: 'Score', before: '72–57 (16–13, 23–15, 19–13, 14–16)', after: '72–57' }]);
    expect(scoreChanges(m, { home: 70, away: 57 }, true, true)).toEqual([
      { label: 'Score', before: '72–57 (16–13, 23–15, 19–13, 14–16)', after: '70–57' },
      { label: 'Box score', before: 'published', after: NONE },
    ]);
    expect(scoreChanges(m, m.result!, true, false)).toEqual([]);
  });

  it('shows the video as it will be saved, without the tracking parameter', () => {
    const m = match(315);
    const video = normalizeVideo(' https://youtu.be/NEW?si=abc ');
    expect(video).toBe('https://youtu.be/NEW');
    expect(videoChanges(m, video)).toEqual([{ label: 'Video', before: 'https://youtu.be/IpiUVfIJ5z4', after: 'https://youtu.be/NEW' }]);
    expect(videoChanges(m, 'https://youtu.be/IpiUVfIJ5z4')).toEqual([]);
  });

  it('always shows the PDF line of an upload, and the box score that changes with it', () => {
    expect(statsChanges(match(315), false, true, 51_200)).toEqual([
      { label: 'Statistics PDF', before: NONE, after: '/stats/315.pdf (50 KB)' },
      { label: 'Box score', before: NONE, after: 'read from the PDF' },
    ]);
    expect(statsChanges(match(310), true, false, 51_200)).toEqual([
      { label: 'Statistics PDF', before: '/stats/310.pdf', after: 'replaced (50 KB)' },
      { label: 'Box score', before: 'published', after: NONE },
    ]);
  });

  it('shows postponing, removing the mark and rescheduling', () => {
    expect(postponeChanges(match(321), true)).toEqual([{ label: 'Status', before: 'scheduled', after: 'postponed, date to be fixed' }]);
    expect(postponeChanges(match(317), false)).toEqual([{ label: 'Status', before: 'postponed, date to be fixed', after: 'scheduled' }]);
    expect(rescheduleChanges(match(319), '2026-11-26', '21:30', 'valdera')).toEqual([
      { label: 'Status', before: 'postponed, date to be fixed', after: 'scheduled' },
      { label: 'Date', before: 'Thu, 12 Nov 2026', after: 'Thu, 26 Nov 2026' },
    ]);
    expect(rescheduleChanges(match(319), '2026-11-12', '20:00', 'fdm').map((c) => c.label)).toEqual(['Status', 'Time', 'Venue']);
  });

  it('names a game with its teams, date and time', () => {
    expect(gameLabel(match(321))).toBe('321 · La Perla – FDM A · Mon, 16 Nov 2026 21:30');
  });
});

describe('box score read from a PDF', () => {
  const box = box310 as BoxScore;

  it('fits the game it belongs to', () => {
    const summary = summarizeBoxScore(box, match(310));
    expect(summary.problem).toBeUndefined();
    expect(summary.totals).toEqual([72, 57]);
    expect(summary.periods).toEqual([[16, 23, 19, 14], [13, 15, 13, 16]]);
    expect(summary.scorers[0]).toHaveLength(3);
    expect(summary.scorers[0][0].pts).toBeGreaterThanOrEqual(summary.scorers[0][1].pts);
  });

  it('does not fit another game', () => {
    const summary = summarizeBoxScore(box, match(315));
    expect(summary.otherGame).toBe(true);
    expect(summary.problem).toBe('This PDF is for game 310, not game 315');
  });

  it('does not fit a result with other totals or periods', () => {
    const totals = match(310);
    totals.result = { home: 70, away: 57 };
    expect(summarizeBoxScore(box, totals)).toMatchObject({ otherGame: false, problem: 'The PDF totals 72–57 differ from the game result 70–57' });
    const periods = match(310);
    periods.result!.periods = [[17, 13], [22, 15], [19, 13], [14, 16]];
    expect(summarizeBoxScore(box, periods).problem).toMatch(/period scores differ/);
  });
});
