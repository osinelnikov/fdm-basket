import { VENUES } from '../data/fixtures.ts';
import type { Match } from '../data/types.ts';
import { mapsUrl, matchEnd } from '../domain.ts';
import { type Lang, MESSAGES, teamName } from '../i18n/index.ts';

const compact = (date: string, time: string) => date.replace(/-/g, '') + 'T' + time.replace(':', '') + '00';

/** Opens Google Calendar with this match prefilled, in Rome time, in the page language. */
export function gcalUrl(m: Match, lang: Lang = 'en'): string {
  const t = MESSAGES[lang];
  const v = VENUES[m.venue];
  const end = matchEnd(m);
  const q = new URLSearchParams({
    action: 'TEMPLATE',
    text: t.gcalTitle(teamName(m.home, lang), teamName(m.away, lang)),
    dates: `${compact(m.date, m.time)}/${compact(end.date, end.time)}`,
    ctz: 'Europe/Rome',
    location: `${v.name}, ${v.address}`,
    details: t.gcalDetails(m.game, mapsUrl(v)),
  });
  return 'https://calendar.google.com/calendar/render?' + q.toString();
}

/** Subscribes Google Calendar to the published feed. */
export const gcalSubscribeUrl = (feedUrl: string): string =>
  'https://calendar.google.com/calendar/render?cid=' + encodeURIComponent(feedUrl.replace(/^https?:/, 'webcal:'));
