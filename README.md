# FDM Basket fixtures 2026/27

Schedule page for Pallacanestro Forte dei Marmi A and B in UISP Serie A/2 “Tirreno Nord”:
match list by month, venue map, Google Calendar links and a subscribable calendar feed.

Live site: https://fdm-basket.pages.dev
Calendar feed: https://fdm-basket.pages.dev/fdm-2026-27.ics

## Update the schedule

All pages and the calendar are generated from `src/data/matches.json` (one match per line, keys in the existing order) and
`src/data/fixtures.ts` (teams, venues, month themes).

1. Edit the match in `src/data/matches.json` using the new UISP bulletin.
2. If the date, time or venue of a match changed, add `"revision":1` to it,
   or increase the existing number. Calendar subscribers then replace the old event.
3. Update the expected row in `tests/fixtures.test.ts` and the `SOURCE.bulletin` text.
4. Run `npm run build`. It type-checks, runs the tests and builds `dist/`.
5. Push to `main`. Cloudflare Pages rebuilds and publishes the site.

Keep the match's `game` number unchanged when rescheduling. Published calendar UIDs
are fixed by game number in `src/calendar/ics.ts`; do not update them when dates change.

A failing test stops the build, so a broken schedule is never published.

## Postpone a game

When a game is called off and the new date is not known yet (TBD), add `"postponed":true` to it in
`src/data/matches.json` and keep its `date` and `time`. The card stays in its month at the original date,
turns grey, gets a "Postponed" tag and a "new date to be announced" line, and loses its Google Calendar
link; it is never the next game. The calendar feed keeps the event at the original date.

When the new date is announced:

1. Remove `postponed`, set the new `date` and `time` (and `venue`, if it changed) and add `"revision":1`
   or increase the existing number. Calendar subscribers then see the event move.
2. Move the match to its new place in `src/data/matches.json`: the list must stay sorted by date and time.
3. If the new date falls in a month that has no games yet, add the month to `MonthTheme['theme']` in
   `src/data/types.ts` and to `MONTH_THEMES` in `src/data/fixtures.ts`, give it colours with a
   `.month[data-theme="…"]` rule in `src/styles.css`, and add its tagline to `monthTaglines` in
   `src/i18n/it.ts` and `src/i18n/en.ts`.
4. Update the game's row in `tests/fixtures.test.ts` and the `SOURCE.bulletin` text.
5. Run `npm run build` and push.

## Add a result

Add `result` to the match in `src/data/matches.json`, home team first, run `npm run build`, then push:

```json
"result":{"home":74,"away":31,"periods":[[18,8],[12,7],[22,12],[22,4]]},
```

`periods` lists the four quarters as `[home, away]`, then any overtimes. If only the final score is
known (bulletins print final scores only), leave `periods` out: `result: { home: 33, away: 54 }`;
the card then shows the score without the quarter line. Tests check that the periods, when given, add
up to the final score and that the game date is not in the future; they do not pin the scores of
particular games, so adding quarters later or correcting a score needs no test change. The card then
shows the score on the right and a muted "played" style; its links stay active.
The calendar feed does not include results.

## Add a video or statistics

Once a game has a result, its card can show two icons under the score: the game video on YouTube
and the statistics PDF. Add either or both to the match in `src/data/matches.json`:

```json
"video":"https://www.youtube.com/watch?v=…",
"stats":"/stats/310.pdf",
```

Put the PDF into `public/stats/` named after the game number (`310.pdf`); it is published with the
site. Tests check that `video` is an https YouTube link (`youtube.com` or `youtu.be`), that the PDF
exists under that name, and that neither is given for a game without a result.

Then turn the PDF into a box score (Node 22.18 or newer):

```bash
npm run boxscore -- public/stats/310.pdf
```

It writes `src/data/boxscores/310.json`. The statistics icon then opens a box score dialog with both
teams' player tables (the PDF stays downloadable from it), and `/#box-310` opens it directly; a game
with a PDF but no box score keeps the PDF download icon. The script reads the PDF of the scoring program
("Tabellino dettagliato", one page per team, home first) and stops without writing anything when the
layout is not what it expects. Tests check that each box score belongs to a played game with its PDF,
that totals and quarters agree with `result`, and that players, team row, totals and periods add up.
Run `npm run build`, then push.

## Update the standings

The league table comes from the latest UISP bulletin (Serie A/2 girone "Tirreno Nord", "Classifica").

1. Put the new bulletin PDF into `docs/` (kept out of git).
2. Replace the content of `src/data/standings.json` (one row per line): `source` and `date` of the bulletin, then one row
   per team in the bulletin's order (positions follow that order; tie-breaks are UISP's).
   Copy PG, PV, PP, CF, CS and Punti; the point difference is calculated.
3. Enter the results of the FDM games up to the bulletin date in `src/data/matches.json`: the tests check
   that FDM A and FDM B in the table agree with those results. The table may lag behind the results entered
   (a bulletin out before a game of its own day): each FDM row is checked against that team's first PG games
   with a result. The admin area does not accept a table dated in the future.
4. Run `npm run build` and push.

Tests also check that wins plus losses equal games, two points per win, and that wins, losses and
points scored and conceded balance across the group.

## Add a learning material

The section `/learn/` ("Coaching materials" / "Materiali didattici", linked from the home page) lists the
materials registered in `src/learn/materials.ts`. Each material is a page of its own under `learn/`.

1. Put the page at `learn/<id>/index.html`. Load its code only as a module from the project
   (`<script type="module" src="/src/learn/….ts">`) and use no inline scripts or `on…=` attributes:
   the Content Security Policy in `public/_headers` blocks them. Attach handlers with `addEventListener`
   (the tactics board marks controls with `data-action` and uses one delegated listener per event type).
2. Add the page to `build.rolldownOptions.input` in `vite.config.ts`.
3. Add an entry to `MATERIALS` in `src/learn/materials.ts`: `id`, `path` (`/learn/<id>/`), the languages
   the material itself is available in, and the card title and summary in Italian and English.
4. Run `npm run build` and push.

A card opens its material with `?lang=` set to the section's language. Tests in `tests/learn.test.ts`
check that every entry has its page and build input and both texts, and that the pages have no inline
scripts or handlers.

The tactics board (`learn/zone-tactics/`) is in Italian and English; its texts are in
`src/learn/zone-board-data.ts`. It shows the site header with the IT / EN switch and follows the site
language: `?lang=`, then the language saved on the site, then the browser's. Choosing a language in the
header also sets the site language. The language handling is shared with the section page
(`src/learn/page-lang.ts`), so a new material page can use `startPageLang` the same way.

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

## Admin area

`/api/admin/*` is a Pages Function (`functions/api/admin/[[path]].ts`) that lets the owner change
scores, videos, statistics, standings and postponements. Every change is one commit to `main` made
through the GitHub GraphQL API; Pages then rebuilds the site. `public/_routes.json` limits Functions
to `/api/admin/*`, so the public site stays static.

A Cloudflare Access application protects `fdm-basket.pages.dev/admin` and `/api/admin`. The Function
checks the Access token again (signature, issuer, audience, expiry), the allowed e-mail, the production
host (preview hosts are refused) and, for changes, the `Origin` and JSON content type.

Pages → Settings → Variables and Secrets, **Production** only (values set by the owner):

| Name | Kind | Meaning |
|---|---|---|
| `ADMIN_HOST` | variable | production host, `fdm-basket.pages.dev` |
| `ACCESS_TEAM_DOMAIN` | variable | Access team domain, `<team>.cloudflareaccess.com`, without `https://` |
| `ACCESS_AUD` | variable | Audience (AUD) tag of the Access application |
| `ADMIN_EMAILS` | variable | comma-separated e-mails allowed to change data |
| `GITHUB_REPO` | variable | `owner/name` of this repository |
| `GITHUB_TOKEN` | secret | fine-grained token for this repository only, Contents: read and write |

Without all of them the API answers 503 and changes nothing. To rotate `GITHUB_TOKEN`: create a new
fine-grained token with the same scope, replace the secret in Production, redeploy the latest
deployment (secrets apply to new deployments), check the admin page, then revoke the old token on GitHub.

## Sources and credits

- Fixtures: UISP Pallacanestro Pisa–Lucca–Livorno, Comunicato Ufficiale N° 01 of 11/10/2026.
- Club logos of CEFA Basket and Lucca Pisces from their public Facebook pages; logos of Pallacanestro
  Forte dei Marmi, Amatori Basket Valdera, Casa Culturale San Miniato, ASD Perignano and Polisportiva
  La Perla supplied to us.
- Map data © OpenStreetMap contributors.
- Tactics board icons: Lucide (ISC license); the board's own sources are listed in its footer.
