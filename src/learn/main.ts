import '../styles.css';
import './learn.css';
import { type Lang, MESSAGES, resolveLang } from '../i18n/index.ts';
import { applyStaticTexts, renderLangSwitch } from '../ui/i18n-dom.ts';
import { readLang, writeLang } from '../ui/storage.ts';
import { MATERIALS, materialHref } from './materials.ts';

let lang: Lang = resolveLang(location.search, readLang(), navigator.languages?.length ? navigator.languages : [navigator.language]);

const list = document.querySelector<HTMLElement>('#materials')!;
const homeLink = document.querySelector<HTMLAnchorElement>('#learn-home')!;

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className?: string, text?: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function renderCards(): void {
  const t = MESSAGES[lang];
  list.replaceChildren(
    ...MATERIALS.map((m) => {
      const card = el('a', 'material-card');
      card.href = materialHref(m, lang);
      // The list label is hidden text rather than aria-label: inside a link an aria-label would replace the codes
      // in the link's accessible name
      const langs = el('ul', 'material-langs');
      for (const l of m.langs) langs.append(el('li', undefined, l));
      const langInfo = el('div');
      langInfo.append(el('span', 'sr-only', `${t.learnLangsLabel}:`), langs);
      const meta = el('div', 'material-meta');
      meta.append(langInfo, el('span', 'material-open', t.learnOpen));
      card.append(el('h2', undefined, m.text[lang].title), el('p', undefined, m.text[lang].summary), meta);
      return card;
    }),
  );
}

function render(): void {
  applyStaticTexts(lang, { title: MESSAGES[lang].learnTitle, description: MESSAGES[lang].learnMetaDescription });
  homeLink.href = `/?lang=${lang}`;
  renderCards();
}

function setLang(next: Lang): void {
  if (next === lang) return;
  lang = next;
  writeLang(lang);
  const url = new URL(location.href);
  url.searchParams.set('lang', lang);
  history.replaceState(null, '', url);
  render();
}

renderLangSwitch(document.querySelector<HTMLElement>('#lang-switch')!, setLang);
render();
