import { gcalSubscribeUrl } from '../calendar/gcal.ts';
import { ICS_FILENAME } from '../calendar/ics.ts';

export function setupCalendarCard(): void {
  const feed = new URL('/' + ICS_FILENAME, location.origin).href;
  document.querySelector<HTMLAnchorElement>('#cal-subscribe')!.href = feed.replace(/^https?:/, 'webcal:');
  document.querySelector<HTMLAnchorElement>('#cal-google')!.href = gcalSubscribeUrl(feed);
  document.querySelector<HTMLAnchorElement>('#cal-download')!.href = '/' + ICS_FILENAME;
  const code = document.querySelector<HTMLElement>('#feed-url')!;
  code.textContent = feed;

  const status = document.querySelector<HTMLElement>('#copy-status')!;
  document.querySelector<HTMLButtonElement>('#copy-feed')!.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(feed);
      status.textContent = 'Link copied.';
    } catch {
      // Clipboard refused: select the link so it can be copied by hand.
      const range = document.createRange();
      range.selectNodeContents(code);
      const sel = getSelection();
      sel?.removeAllRanges();
      sel?.addRange(range);
      status.textContent = 'Press Ctrl+C or Cmd+C to copy.';
    }
  });
}
