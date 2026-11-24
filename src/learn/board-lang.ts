// The site's language list comes from the types module: the i18n index would pull the site's dictionaries
// and fixtures into the board bundle
import { LANGS, type Lang } from '../i18n/types.ts';

// Language logic of the tactics board, kept free of DOM access so it can be unit-tested.
// The board offers Ukrainian on top of the site's Italian and English.
export type BoardLang = 'en' | 'it' | 'uk';

export const isBoardLang = (x: unknown): x is BoardLang => x === 'en' || x === 'it' || x === 'uk';

const isSiteLang = (x: unknown): x is Lang => (LANGS as readonly unknown[]).includes(x);

/**
 * Picks the board language: ?lang= in the URL, then the viewer's saved site language (English or Italian only),
 * then the first English, Italian or Ukrainian entry in the browser languages, else English.
 */
export function resolveBoardLang(search: string, stored: string | null, browser: readonly string[]): BoardLang {
  const fromUrl = new URLSearchParams(search).get('lang');
  if (isBoardLang(fromUrl)) return fromUrl;
  if (isSiteLang(stored)) return stored;
  for (const tag of browser) {
    const base = tag.toLowerCase().split('-')[0];
    if (isBoardLang(base)) return base;
  }
  return 'en';
}

/**
 * The value to save as the site language after a choice on the board, or null to leave it untouched:
 * the site has no Ukrainian, so saving it would overwrite the viewer's own site language.
 */
export const langToRemember = (lang: BoardLang): Lang | null => (lang === 'uk' ? null : lang);

/** Where a language chosen on the board is kept: the page address and the viewer's saved site language. */
export interface LangChoiceEnv {
  href: string;
  replaceUrl: (url: URL) => void;
  writeSiteLang: (lang: Lang) => void;
}

/**
 * Keeps a language chosen on the board: in the address (so a reload or a shared link keeps it) and, when the site
 * knows it, as the saved site language; Ukrainian stays out of storage so it cannot replace the viewer's choice.
 */
export function commitBoardLang(lang: BoardLang, env: LangChoiceEnv): void {
  const url = new URL(env.href);
  url.searchParams.set('lang', lang);
  env.replaceUrl(url);
  const remembered = langToRemember(lang);
  if (remembered) env.writeSiteLang(remembered);
}

/** The way back to the materials section; the language travels in the URL only when the site knows it. */
export const backHref = (lang: BoardLang): string => (lang === 'uk' ? '/learn/' : `/learn/?lang=${lang}`);
