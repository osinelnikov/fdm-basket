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

export default defineConfig({
  plugins: [calendarFeed()],
  build: { target: 'es2022' },
});
