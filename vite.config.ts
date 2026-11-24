import { readdirSync, readFileSync } from 'node:fs';
import type { IncomingMessage } from 'node:http';
import { fileURLToPath } from 'node:url';
import { defineConfig, type Plugin } from 'vite';
import { buildIcs, ICS_FILENAME } from './src/calendar/ics.ts';
import { MATCHES } from './src/data/fixtures.ts';

/** Generates the calendar feed from the fixtures: emitted at build, served live in dev. */
function calendarFeed(): Plugin {
  return {
    name: 'fdm-calendar-feed',
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: ICS_FILENAME, source: buildIcs(MATCHES, { now: new Date() }) });
    },
    configureServer(server) {
      server.middlewares.use('/' + ICS_FILENAME, (_req, res) => {
        res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
        res.end(buildIcs(MATCHES, { now: new Date() }));
      });
    },
  };
}

/**
 * Keeps `blocking="render"` of a page's entry script in the build, where Vite rewrites the tag without it:
 * the browser then waits for the script that draws the page in the viewer's language before its first paint.
 */
function renderBlockingEntry(): Plugin {
  return {
    name: 'fdm-render-blocking-entry',
    apply: 'build',
    transformIndexHtml: {
      order: 'post',
      handler(html, ctx) {
        const source = readFileSync(ctx.filename, 'utf8');
        if (!/<script\b[^>]*type="module"[^>]*blocking="render"/.test(source)) return html;
        return html.replace(/<script type="module"(?![^>]*\bblocking=)/, '<script type="module" blocking="render"');
      },
    },
  };
}

const fromRoot = (path: string) => fileURLToPath(new URL(path, import.meta.url));

/** A Fetch API request from a Node one, body read in full. */
async function toRequest(req: IncomingMessage): Promise<Request> {
  const chunks: Buffer[] = [];
  if (req.method !== 'GET' && req.method !== 'HEAD') for await (const chunk of req) chunks.push(chunk as Buffer);
  const headers = new Headers();
  for (const [name, value] of Object.entries(req.headers)) {
    if (value !== undefined) headers.set(name, Array.isArray(value) ? value.join(', ') : value);
  }
  const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);
  return new Request(url, { method: req.method, headers, body: chunks.length > 0 ? new Uint8Array(Buffer.concat(chunks)) : undefined });
}

/**
 * Dev server only: answers /api/admin/* for a fixed owner from the repository data held in memory, so the
 * admin page can be tried locally. Saved changes live until the dev server stops; no file is written.
 */
function devAdminApi(): Plugin {
  return {
    name: 'fdm-dev-admin-api',
    apply: 'serve',
    configureServer(server) {
      let handle: Promise<(request: Request) => Promise<Response>> | undefined;
      const load = async () => {
        // Loaded through Vite, which, unlike plain Node, imports the JSON data modules.
        const [{ handleAdminRequest, romeToday }, { MemoryDataStore }] = (await Promise.all([
          server.ssrLoadModule('/functions/_lib/handlers.ts'),
          server.ssrLoadModule('/src/admin/memory-datastore.ts'),
        ])) as [typeof import('./functions/_lib/handlers.ts'), typeof import('./src/admin/memory-datastore.ts')];
        const json = (path: string) => JSON.parse(readFileSync(fromRoot(path), 'utf8'));
        const boxScores = Object.fromEntries(
          readdirSync(fromRoot('./src/data/boxscores/'))
            .filter((f) => /^\d+\.json$/.test(f))
            .map((f) => [Number(f.slice(0, -'.json'.length)), json(`./src/data/boxscores/${f}`)]),
        );
        const statsPaths = readdirSync(fromRoot('./public/stats/'))
          .filter((f) => /^\d+\.pdf$/.test(f))
          .map((f) => `/stats/${f}`);
        const store = new MemoryDataStore({
          matches: json('./src/data/matches.json'),
          standings: json('./src/data/standings.json'),
          boxScores,
          statsPaths,
          version: '0',
        });
        return (request: Request) => handleAdminRequest(request, { email: 'dev@localhost' }, { store, today: () => romeToday() });
      };
      server.config.logger.info('  dev admin API: /api/admin/* uses in-memory data; saved changes are never written to files');
      server.middlewares.use((req, res, next) => {
        if (!req.url?.startsWith('/api/admin/')) return next();
        handle ??= load().catch((error) => {
          handle = undefined;
          throw error;
        });
        void (async () => {
          const response = await (await handle!)(await toRequest(req));
          res.statusCode = response.status;
          response.headers.forEach((value, name) => res.setHeader(name, value));
          res.end(Buffer.from(await response.arrayBuffer()));
        })().catch(next);
      });
    },
  };
}

export default defineConfig({
  plugins: [calendarFeed(), devAdminApi(), renderBlockingEntry()],
  build: {
    target: 'es2022',
    // The public site and the owner's admin page are separate entries, so no admin code reaches the site.
    rolldownOptions: {
      input: {
        main: fromRoot('./index.html'),
        admin: fromRoot('./admin/index.html'),
        learn: fromRoot('./learn/index.html'),
        zoneTactics: fromRoot('./learn/zone-tactics/index.html'),
      },
    },
  },
});
