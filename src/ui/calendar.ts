import { gcalSubscribeUrl } from '../calendar/gcal.ts';
import { ICS_FILENAME } from '../calendar/ics.ts';
import type { ViewContext } from './context.ts';

export function setupCalendarCard(context: () => ViewContext): void {
  const feed = new URL('/' + ICS_FILENAME, location.origin).href;
  document.querySelector<HTMLAnchorElement>('#cal-subscribe')!.href = feed.replace(/^https?:/, 'webcal:');
  document.querySelector<HTMLAnchorElement>('#cal-google')!.href = gcalSubscribeUrl(feed);
  document.querySelector<HTMLAnchorElement>('#cal-download')!.href = '/' + ICS_FILENAME;
  const code = document.querySelector<HTMLElement>('#feed-url')!;
  code.textContent = feed;

  const status = document.querySelector<HTMLElement>('#copy-status')!;
  document.querySelector<HTMLButtonElement>('#copy-feed')!.addEventListener('click', async () => {
    const { t } = context();
    try {
      await navigator.clipboard.writeText(feed);
      status.textContent = t.copied;
    } catch {
      // Clipboard refused: select the link so it can be copied by hand.
      const range = document.createRange();
      range.selectNodeContents(code);
      const sel = getSelection();
      sel?.removeAllRanges();
      sel?.addRange(range);
      status.textContent = t.copyFallback;
    }
  });
}

/** Clears a status message that belongs to the previous language. */
export const resetCalendarStatus = (): void => {
  document.querySelector<HTMLElement>('#copy-status')!.textContent = '';
};
