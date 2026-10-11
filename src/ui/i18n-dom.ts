import { LANGS, MESSAGES, type Lang, type StaticKey } from '../i18n/index.ts';

const IT_FLAG = '<svg class="flag" viewBox="0 0 3 2" aria-hidden="true"><rect width="1" height="2" fill="#009246"/><rect x="1" width="1" height="2" fill="#fff"/><rect x="2" width="1" height="2" fill="#ce2b37"/></svg>';
const UK_FLAG = '<svg class="flag" viewBox="0 0 60 30" aria-hidden="true"><clipPath id="uk-s"><path d="M0,0v30h60V0z"/></clipPath><clipPath id="uk-t"><path d="M30,15h30v15zv15H0zH0V0zV0h30z"/></clipPath><g clip-path="url(#uk-s)"><path d="M0,0v30h60V0z" fill="#012169"/><path d="M0,0L60,30M60,0L0,30" stroke="#fff" stroke-width="6"/><path d="M0,0L60,30M60,0L0,30" clip-path="url(#uk-t)" stroke="#c8102e" stroke-width="4"/><path d="M30,0v30M0,15h60" stroke="#fff" stroke-width="10"/><path d="M30,0v30M0,15h60" stroke="#c8102e" stroke-width="6"/></g></svg>';
const FLAGS: Record<Lang, string> = { it: IT_FLAG, en: UK_FLAG };

/** Builds the IT / EN switch once; `onPick` receives the chosen language. */
export function renderLangSwitch(host: HTMLElement, onPick: (lang: Lang) => void): void {
  host.innerHTML = LANGS.map((l) =>
    `<button type="button" data-lang="${l}" lang="${l}" title="${MESSAGES[l].langName}" aria-label="${MESSAGES[l].langName}">${FLAGS[l]}<span>${l.toUpperCase()}</span></button>`,
  ).join('');
  for (const b of host.querySelectorAll<HTMLButtonElement>('[data-lang]')) {
    b.addEventListener('click', () => onPick(b.dataset.lang as Lang));
  }
}

/** Applies the dictionary to the static page: text, trusted markup, labels, title and meta. */
export function applyStaticTexts(lang: Lang): void {
  const t = MESSAGES[lang];
  const get = (key: string | undefined): string | null => {
    const v = key ? (t as unknown as Record<string, unknown>)[key] : undefined;
    return typeof v === 'string' ? v : null;
  };
  document.documentElement.lang = lang;
  document.title = t.title;
  document.querySelector('meta[name="description"]')?.setAttribute('content', t.metaDescription);
  for (const el of document.querySelectorAll<HTMLElement>('[data-i18n]')) {
    const v = get(el.dataset.i18n as StaticKey);
    if (v !== null) el.textContent = v;
  }
  for (const el of document.querySelectorAll<HTMLElement>('[data-i18n-html]')) {
    const v = get(el.dataset.i18nHtml as StaticKey);
    if (v !== null) el.innerHTML = v; // dictionary markup only, never user input
  }
  for (const el of document.querySelectorAll<HTMLElement>('[data-i18n-aria]')) {
    const v = get(el.dataset.i18nAria as StaticKey);
    if (v !== null) el.setAttribute('aria-label', v);
  }
  for (const el of document.querySelectorAll<HTMLImageElement>('img[data-i18n-alt]')) {
    const v = get(el.dataset.i18nAlt as StaticKey);
    if (v !== null) el.alt = v;
  }
  for (const b of document.querySelectorAll<HTMLButtonElement>('[data-lang]')) {
    b.setAttribute('aria-pressed', String(b.dataset.lang === lang));
  }
}
