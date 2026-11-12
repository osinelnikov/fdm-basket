import { describe, expect, it } from 'vitest';
import { MATCHES } from '../src/data/fixtures.ts';
import type { Match } from '../src/data/types.ts';
import { MESSAGES } from '../src/i18n/index.ts';
import { matchCard } from '../src/ui/matches.ts';

// Own data: a real game with a result set here, so entering real links in fixtures.ts changes nothing.
const base: Match = { ...MATCHES.find((m) => m.game === 310)!, result: { home: 72, away: 57 }, video: undefined, stats: undefined };
const itCtx = { lang: 'it' as const, t: MESSAGES.it };
const enCtx = { lang: 'en' as const, t: MESSAGES.en };

describe('video and statistics icons on a match card', () => {
  it('shows no icons when neither link is given', () => {
    expect(matchCard(base, enCtx)).not.toContain('class="media');
  });

  it('links the video to YouTube in a new tab, labelled for screen readers', () => {
    const html = matchCard({ ...base, video: 'https://youtu.be/abc123' }, enCtx);
    expect(html).toContain('href="https://youtu.be/abc123" target="_blank" rel="noopener noreferrer"');
    expect(html).toContain('aria-label="Watch game 310 on YouTube"');
    expect(html).not.toContain('class="media-link pdf"');
  });

  it('opens the box score dialog from a game that has one, labelled in the page language', () => {
    const html = matchCard({ ...base, stats: '/stats/310.pdf' }, itCtx);
    expect(html).toContain('<button type="button" class="media-link box" data-boxscore="310" aria-haspopup="dialog"');
    expect(html).toContain('aria-label="Tabellino della gara n° 310"');
    expect(html).not.toContain('download');
    expect(html).not.toContain('class="media-link pdf"');
    expect(html).not.toContain('class="media-link yt"');
  });

  it('falls back to the PDF download when no box score data exists for the game', () => {
    const html = matchCard({ ...base, game: 999, stats: '/stats/999.pdf' }, itCtx);
    expect(html).toContain('href="/stats/999.pdf" download');
    expect(html).toContain('aria-label="Statistiche della gara n° 999 (PDF)"');
    expect(html).not.toContain('data-boxscore');
  });

  it('shows both icons, video first', () => {
    const html = matchCard({ ...base, video: 'https://www.youtube.com/watch?v=abc123', stats: '/stats/310.pdf' }, enCtx);
    expect(html.indexOf('media-link yt')).toBeGreaterThan(-1);
    expect(html.indexOf('media-link yt')).toBeLessThan(html.indexOf('media-link box'));
  });

  it('escapes the link', () => {
    const html = matchCard({ ...base, video: 'https://www.youtube.com/watch?v=a&t=60"' }, enCtx);
    expect(html).toContain('href="https://www.youtube.com/watch?v=a&amp;t=60&quot;"');
  });
});

describe('postponed game', () => {
  // Own data: a real game marked postponed here; its date and time are pinned below, so rescheduling games
  // in fixtures.ts does not change what these tests expect.
  const scheduled: Match = { ...MATCHES.find((m) => m.game === 319)!, date: '2026-11-12', time: '21:30', postponed: undefined };
  const postponed: Match = { ...scheduled, postponed: true };

  it('is greyed out and says the new date is to be decided, keeping the original date', () => {
    const html = matchCard(postponed, itCtx);
    expect(html).toContain('<article class="match postponed"');
    expect(html).toContain('<span class="tag postponed">Rinviata</span>');
    expect(html).toContain('<p class="postponed-note">Gara rinviata, nuova data da definire.</p>');
    expect(html).toContain('<span class="day">12</span><span class="mon">nov</span><span class="time">gio · 21:30</span>');
    expect(html).toContain('<div class="postponed-mark" title="Gara rinviata, nuova data da definire."><svg');
  });

  it('says the same in English', () => {
    const html = matchCard(postponed, enCtx);
    expect(html).toContain('<span class="tag postponed">Postponed</span>');
    expect(html).toContain('<p class="postponed-note">Game postponed, new date to be announced.</p>');
  });

  it('offers no Google Calendar link for the old date, while a scheduled game keeps it', () => {
    expect(matchCard(postponed, enCtx)).not.toContain('class="gcal"');
    expect(matchCard(scheduled, enCtx)).toContain('class="gcal"');
    expect(matchCard(scheduled, enCtx)).not.toContain('postponed');
  });
});
