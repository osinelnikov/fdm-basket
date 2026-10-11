import { TEAMS } from '../data/fixtures.ts';
import type { TeamId } from '../data/types.ts';
import { en } from './en.ts';
import { it } from './it.ts';
import type { Lang, Messages } from './types.ts';

export type { Lang, Messages, StaticKey } from './types.ts';
export { LANGS } from './types.ts';

export const MESSAGES: Record<Lang, Messages> = { en, it };

export const isLang = (x: unknown): x is Lang => x === 'en' || x === 'it';

/**
 * Picks the page language: ?lang= in the URL, then the viewer's saved choice,
 * then the first Italian or English entry in the browser languages, else English.
 */
export function resolveLang(search: string, stored: string | null, browser: readonly string[]): Lang {
  const fromUrl = new URLSearchParams(search).get('lang');
  if (isLang(fromUrl)) return fromUrl;
  if (isLang(stored)) return stored;
  for (const tag of browser) {
    const base = tag.toLowerCase().split('-')[0];
    if (isLang(base)) return base;
  }
  return 'en';
}

/** Team name as shown on the page: short English name, or the bulletin's name in Italian. */
export const teamName = (id: TeamId, lang: Lang): string => (lang === 'it' ? TEAMS[id].bulletinName : id);
