import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MATCHES, VENUES } from '../data/fixtures.ts';
import type { VenueId } from '../data/types.ts';
import { type Filter, mapsUrl, matchesFilter } from '../domain.ts';
import { teamName } from '../i18n/index.ts';
import type { ViewContext } from './context.ts';
import { esc, formatDate } from './format.ts';

export interface VenueMap {
  /** Redraws the pins; `fit` re-centres the map on them. */
  show(filter: Filter, fit?: boolean): void;
}

export function createVenueMap(el: HTMLElement, context: () => ViewContext): VenueMap {
  const map = L.map(el, { scrollWheelZoom: false });
  // OpenStreetMap tiles need the browser's Referer header: keep the default referrer policy.
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  }).addTo(map);
  const layer = L.layerGroup().addTo(map);

  let points: L.LatLngTuple[] = [];
  const fitPoints = () => {
    if (points.length > 1) map.fitBounds(points, { padding: [40, 40] });
    else if (points.length === 1) map.setView(points[0], 12);
  };
  // The stylesheet can arrive after this script: until the container has a height,
  // Leaflet would fit the bounds into a 0px box and zoom all the way in.
  let laidOut = el.clientHeight > 0;
  new ResizeObserver(() => {
    map.invalidateSize();
    if (!laidOut && el.clientHeight > 0) {
      laidOut = true;
      fitPoints();
    }
  }).observe(el);

  return {
    show(filter, fit = true) {
      const { lang, t } = context();
      layer.clearLayers();
      points = [];
      for (const [id, v] of Object.entries(VENUES) as [VenueId, (typeof VENUES)[VenueId]][]) {
        const games = MATCHES.filter((m) => m.venue === id && matchesFilter(m, filter));
        if (!games.length) continue;
        const icon = L.divIcon({
          className: '',
          html: `<div class="pin ${v.home ? 'home' : 'away'}"><span>${games.length}</span></div>`,
          iconSize: [30, 30],
          iconAnchor: [15, 30],
          popupAnchor: [0, -28],
        });
        const list = games
          .map((m) => `<li>${formatDate(m.date, { day: '2-digit', month: 'short' }, t.locale)} · ${esc(teamName(m.home, lang))} – ${esc(teamName(m.away, lang))} <small>· ${m.time}</small></li>`)
          .join('');
        const popup = `<b>${esc(v.name)}</b><br>${esc(v.address)}${v.approximate ? `<br><small>${esc(t.pinApprox)}</small>` : ''}
          <br><a href="${esc(mapsUrl(v))}" target="_blank" rel="noopener noreferrer">${esc(t.openInMaps)}</a><ul class="pop-list">${list}</ul>`;
        L.marker([v.lat, v.lon], { icon, zIndexOffset: v.home ? 1000 : 0, title: v.name }).bindPopup(popup).addTo(layer);
        points.push([v.lat, v.lon]);
      }
      if (fit) fitPoints();
    },
  };
}
