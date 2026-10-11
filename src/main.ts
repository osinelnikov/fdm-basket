import './styles.css';
import { MATCHES } from './data/fixtures.ts';
import { type Filter, isAway } from './domain.ts';
import { setupCalendarCard } from './ui/calendar.ts';
import { createVenueMap } from './ui/map.ts';
import { applyFilter, renderMatches, setAllMonths } from './ui/matches.ts';

const root = document.querySelector<HTMLElement>('#matches')!;
const venueMap = createVenueMap(document.querySelector<HTMLElement>('#map')!);

const setText = (id: string, n: number) => (document.getElementById(id)!.textContent = String(n));
setText('stat-b', MATCHES.filter((m) => m.sides.includes('b')).length);
setText('stat-a', MATCHES.filter((m) => m.sides.includes('a')).length);
setText('stat-away', MATCHES.filter(isAway).length);
setText('stat-all', MATCHES.length);

function select(filter: Filter): void {
  for (const b of document.querySelectorAll<HTMLButtonElement>('[data-filter]')) {
    const on = b.dataset.filter === filter;
    b.classList.toggle('active', on);
    b.setAttribute('aria-pressed', String(on));
  }
  applyFilter(root, filter);
  venueMap.show(filter);
}

for (const b of document.querySelectorAll<HTMLButtonElement>('[data-filter]')) {
  b.addEventListener('click', () => select(b.dataset.filter as Filter));
}
document.querySelector('#expand-all')!.addEventListener('click', () => setAllMonths(root, true));
document.querySelector('#collapse-all')!.addEventListener('click', () => setAllMonths(root, false));

renderMatches(root);
select('all');
setupCalendarCard();
