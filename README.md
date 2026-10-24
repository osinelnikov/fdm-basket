# FDM Basket fixtures 2026/27

Schedule page for Pallacanestro Forte dei Marmi A and B in UISP Serie A/2 “Tirreno Nord”:
match list by month, venue map, Google Calendar links and a subscribable calendar feed.

Live site: https://fdm-basket.pages.dev
Calendar feed: https://fdm-basket.pages.dev/fdm-2026-27.ics

## Update the schedule

All pages and the calendar are generated from one file: `src/data/fixtures.ts`.

1. Edit the match in `MATCHES` using the new UISP bulletin.
2. If the date, time or venue of a match changed, add `revision: 1` to it,
   or increase the existing number. Calendar subscribers then replace the old event.
3. Update the expected row in `tests/fixtures.test.ts` and the `SOURCE.bulletin` text.
4. Run `npm run build`. It type-checks, runs the tests and builds `dist/`.
5. Push to `main`. Cloudflare Pages rebuilds and publishes the site.

Keep the match's `game` number unchanged when rescheduling. Published calendar UIDs
are fixed by game number in `src/calendar/ics.ts`; do not update them when dates change.

A failing test stops the build, so a broken schedule is never published.

## Add a result

Add `result` to the match in `src/data/fixtures.ts`, home team first, then push:

```ts
result: { home: 74, away: 31, periods: [[18, 8], [12, 7], [22, 12], [22, 4]] },
```

`periods` lists the four quarters as `[home, away]`, then any overtimes. If only the final score is
known (the bulletin prints final scores only), leave `periods` out: `result: { home: 33, away: 54 }`;
the card then shows the score without the quarter line. Tests check that the periods, when given, add
up to the final score and that the game date is not in the future. The card then
shows the score on the right and a muted "played" style; its links stay active.
The calendar feed does not include results.

## Update the standings

The league table comes from the latest UISP bulletin (Serie A/2 girone "Tirreno Nord", "Classifica").

1. Put the new bulletin PDF into `docs/` (kept out of git).
2. Replace `STANDINGS` in `src/data/standings.ts`: `source` and `date` of the bulletin, then one row
   per team in the bulletin's order (positions follow that order; tie-breaks are UISP's).
   Copy PG, PV, PP, CF, CS and Punti; the point difference is calculated.
3. Replace the copy of the printed table at the top of `tests/standings.test.ts` with the new one.
4. Enter the results of the FDM games up to the bulletin date in `src/data/fixtures.ts`: the tests check
   that FDM A and FDM B in the table agree with those results.
5. Run `npm run build` and push.

Tests also check that wins plus losses equal games, two points per win, and that wins, losses and
points scored and conceded balance across the group. If the bulletin itself has a typo, correct the row
and leave a comment explaining it (as done for FDM B in CU 02).

## Develop

```bash
npm install
npm run dev      # http://localhost:5173, calendar at /fdm-2026-27.ics
npm test
npm run build    # typecheck + tests + production build into dist/
```

Node version: see `.node-version`.

## Deploy: Cloudflare Pages

The site is the Cloudflare Pages project `fdm-basket`, connected to this repository.

| Setting | Value |
|---|---|
| Project name | `fdm-basket` |
| Production branch | `main` |
| Framework preset | None |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Node version | from `.node-version` |

`public/_headers` sets the calendar content type, caching and security headers.
`public/404.html` is served with status 404 for unknown paths.
Other branches get preview URLs that are not indexed by search engines.
Rollback: Workers & Pages → fdm-basket → Deployments → pick an older deployment → Rollback.

## Sources and credits

- Fixtures: UISP Pallacanestro Pisa–Lucca–Livorno, Comunicato Ufficiale N° 01 of 11/10/2026.
- Club logos of CEFA Basket and Lucca Pisces from their public Facebook pages; logos of Pallacanestro
  Forte dei Marmi, Amatori Basket Valdera, Casa Culturale San Miniato, ASD Perignano and Polisportiva
  La Perla supplied to us.
- Map data © OpenStreetMap contributors.
