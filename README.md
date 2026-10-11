# FDM Basket fixtures 2026/27

Schedule page for Pallacanestro Forte dei Marmi A and B in UISP Serie A/2 “Tirreno Nord”:
match list by month, venue map, Google Calendar links and a subscribable calendar feed.

Live site: https://fdm-basket.sinol-work.workers.dev
Calendar feed: https://fdm-basket.sinol-work.workers.dev/fdm-2026-27.ics

## Update the schedule

All pages and the calendar are generated from one file: `src/data/fixtures.ts`.

1. Edit the match in `MATCHES` using the new UISP bulletin.
2. If the date, time or venue of a match changed, add `revision: 1` to it,
   or increase the existing number. Calendar subscribers then replace the old event.
3. Update the expected row in `tests/fixtures.test.ts` and the `SOURCE.bulletin` text.
4. Run `npm run build`. It type-checks, runs the tests and builds `dist/`.
5. Push to `main`. Cloudflare rebuilds and publishes the site.

A failing test stops the build, so a broken schedule is never published.

## Develop

```bash
npm install
npm run dev      # http://localhost:5173, calendar at /fdm-2026-27.ics
npm test
npm run build    # typecheck + tests + production build into dist/
```

Node version: see `.node-version`.

## Deploy: Cloudflare Workers (static assets)

The site is an assets-only Worker named `fdm-basket`, connected to this repository.
`wrangler.jsonc` publishes `./dist` and returns a real 404 for unknown paths.

| Setting | Value |
|---|---|
| Worker name | `fdm-basket` (must match `name` in `wrangler.jsonc`) |
| Production branch | `main` |
| Build command | `npm run build` |
| Deploy command | `npx wrangler deploy` |
| Node version | from `.node-version` (Wrangler needs Node 22 or newer) |

`public/_headers` sets the calendar content type, caching and security headers.
Preview URLs for other branches are off (`preview_urls: false` in `wrangler.jsonc`).
Rollback: Workers & Pages → fdm-basket → Deployments → pick an older version → Rollback.

## Sources and credits

- Fixtures: UISP Pallacanestro Pisa–Lucca–Livorno, Comunicato Ufficiale N° 01 of 11/10/2026.
- Club logos of CEFA Basket, Lucca Pisces and Pallacanestro Valdera from their public Facebook pages;
  Pallacanestro Forte dei Marmi logo supplied by the team; other teams shown with their town's
  coat of arms from Wikimedia Commons.
- Map data © OpenStreetMap contributors.
