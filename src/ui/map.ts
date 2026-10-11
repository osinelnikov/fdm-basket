import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MATCHES, VENUES } from '../data/fixtures.ts';
import type { VenueId } from '../data/types.ts';
import { type Filter, mapsUrl, matchesFilter } from '../domain.ts';
import { esc, formatDate } from './format.ts';

export interface VenueMap {
  show(filter: Filter): void;
}

export function createVenueMap(el: HTMLElement): VenueMap {
  const map = L.map(el, { scrollWheelZoom: false });
  // OpenStreetMap tiles need the browser's Referer header: keep the default referrer policy.
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  }).addTo(map);
  const layer = L.layerGroup().addTo(map);

  let points: L.LatLngTuple[] = [];
  const fit = () => {
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
      fit();
    }
  }).observe(el);

  return {
    show(filter) {
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
          .map((m) => `<li>${formatDate(m.date, { day: '2-digit', month: 'short' })} · ${esc(m.home)} vs ${esc(m.away)} <small>· ${m.time}</small></li>`)
          .join('');
        const popup = `<b>${esc(v.name)}</b><br>${esc(v.address)}${v.approximate ? '<br><small>Pin shows the town; exact gym location not geocoded.</small>' : ''}
          <br><a href="${esc(mapsUrl(v))}" target="_blank" rel="noopener noreferrer">Open in Google Maps ↗</a><ul class="pop-list">${list}</ul>`;
        L.marker([v.lat, v.lon], { icon, zIndexOffset: v.home ? 1000 : 0, title: v.name }).bindPopup(popup).addTo(layer);
        points.push([v.lat, v.lon]);
      }
      fit();
    },
  };
}
