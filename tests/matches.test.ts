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

  it('offers the statistics PDF as a download, labelled in the page language', () => {
    const html = matchCard({ ...base, stats: '/stats/310.pdf' }, itCtx);
    expect(html).toContain('href="/stats/310.pdf" download');
    expect(html).toContain('aria-label="Statistiche della gara n° 310 (PDF)"');
    expect(html).not.toContain('class="media-link yt"');
  });

  it('shows both icons, video first', () => {
    const html = matchCard({ ...base, video: 'https://www.youtube.com/watch?v=abc123', stats: '/stats/310.pdf' }, enCtx);
    expect(html.indexOf('media-link yt')).toBeGreaterThan(-1);
    expect(html.indexOf('media-link yt')).toBeLessThan(html.indexOf('media-link pdf'));
  });

  it('escapes the link', () => {
    const html = matchCard({ ...base, video: 'https://www.youtube.com/watch?v=a&t=60"' }, enCtx);
    expect(html).toContain('href="https://www.youtube.com/watch?v=a&amp;t=60&quot;"');
  });
});
