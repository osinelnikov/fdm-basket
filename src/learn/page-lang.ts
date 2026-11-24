import { resolveLang, type Lang } from '../i18n/index.ts';
import { renderLangSwitch } from '../ui/i18n-dom.ts';
import { readLang, writeLang } from '../ui/storage.ts';

/** Where a language chosen on a page is kept: the page address and the viewer's saved site language. */
export interface LangChoiceEnv {
  href: string;
  replaceUrl: (url: URL) => void;
  writeSiteLang: (lang: Lang) => void;
}

/** Keeps a chosen language in the address (so a reload or a shared link keeps it, other parameters and the hash stay) and as the site language. */
export function commitLang(lang: Lang, env: LangChoiceEnv): void {
  const url = new URL(env.href);
  url.searchParams.set('lang', lang);
  env.replaceUrl(url);
  env.writeSiteLang(lang);
}

/**
 * Starts the language handling shared by the learning pages: resolves the language the way the site does,
 * builds the switch in `host` and calls `render` once now and again after every change.
 * Returns the language the page starts in.
 */
export function startPageLang(host: HTMLElement, render: (lang: Lang) => void): Lang {
  let lang = resolveLang(location.search, readLang(), navigator.languages?.length ? navigator.languages : [navigator.language]);
  renderLangSwitch(host, (next) => {
    if (next === lang) return;
    lang = next;
    commitLang(lang, {
      href: location.href,
      replaceUrl: (url) => history.replaceState(null, '', url),
      writeSiteLang: writeLang,
    });
    render(lang);
  });
  render(lang);
  return lang;
}
