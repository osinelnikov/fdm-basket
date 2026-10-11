import type { Lang, Messages } from '../i18n/index.ts';

/** What every view needs to render in the current language. */
export interface ViewContext {
  lang: Lang;
  t: Messages;
}
