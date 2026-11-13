import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { BOX_SCORES as SNAPSHOT_BOX_SCORES, MATCHES, PDF_URL, STANDINGS, STATS_PATHS } from './fixtures/data.ts';
import type { BoxScore, Match } from '../src/data/types.ts';
import type { Snapshot } from '../src/admin/datastore.ts';
import { serializeBoxScore } from '../src/admin/github-datastore.ts';
import { MemoryDataStore } from '../src/admin/memory-datastore.ts';
import { MAX_BODY_BYTES, handleAdminRequest, romeToday } from '../functions/_lib/handlers.ts';

const TODAY = '2026-11-12';
const EMAIL = 'owner@example.com';
const ORIGIN = 'https://fdm-basket.pages.dev';

const BOX_SCORES: Record<number, BoxScore> = structuredClone(SNAPSHOT_BOX_SCORES);

/** The real data as it stands: games 317 and 319 are postponed. */
function store(): MemoryDataStore {
  const matches = structuredClone(MATCHES) as Match[];
  const snapshot: Snapshot = {
    matches,
    standings: structuredClone(STANDINGS),
    boxScores: structuredClone(BOX_SCORES),
    statsPaths: [...STATS_PATHS],
    version: '0',
  };
  return new MemoryDataStore(snapshot);
}

const deps = (s: MemoryDataStore) => ({ store: s, today: () => TODAY });

function post(route: string, body: unknown, headers: Record<string, string> = {}): Request {
  return new Request(`${ORIGIN}/api/admin/${route}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: ORIGIN, ...headers },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

async function call(s: MemoryDataStore, request: Request) {
  const response = await handleAdminRequest(request, { email: EMAIL }, deps(s));
  expect(response.headers.get('Cache-Control')).toBe('no-store');
  return { status: response.status, body: (await response.json()) as Record<string, unknown> };
}

const find = async (s: MemoryDataStore, game: number) => (await s.load()).matches.find((m) => m.game === game)!;

afterEach(() => {
  vi.restoreAllMocks();
});

describe('GET state', () => {
  it('describes the stored data for the admin page', async () => {
    const { status, body } = await call(store(), new Request(`${ORIGIN}/api/admin/state`));
    expect(status).toBe(200);
    expect(body).toEqual({
      email: EMAIL,
      today: TODAY,
      version: '0',
      matches: MATCHES,
      standings: STANDINGS,
      boxScoreGames: [306, 309, 310, 314],
      statsPaths: ['/stats/306.pdf', '/stats/310.pdf', '/stats/309.pdf', '/stats/314.pdf'],
    });
  });

  it('answers 502 without details when the data cannot be loaded', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const s = store();
    s.load = async () => {
      throw new Error('GitHub: HTTP 401 - Bad credentials');
    };
    const { status, body } = await call(s, new Request(`${ORIGIN}/api/admin/state`));
    expect(status).toBe(502);
    expect(body).toEqual({ error: 'storage error' });
  });
});

describe('routes', () => {
  it('answers 404 for an unknown route and 405 for a wrong method', async () => {
    const s = store();
    expect((await call(s, new Request(`${ORIGIN}/api/admin/unknown`))).status).toBe(404);
    expect((await call(s, new Request(`${ORIGIN}/api/admin`))).status).toBe(404);
    expect((await call(s, new Request(`${ORIGIN}/api/admin/score`))).status).toBe(405);
    expect((await call(s, post('state', {}))).status).toBe(405);
    expect(s.saves).toHaveLength(0);
  });
});

describe('POST score', () => {
  it('saves a corrected score as one change', async () => {
    const s = store();
    const { status, body } = await call(s, post('score', { game: 304, result: { home: 33, away: 54 }, comment: 'bulletin fix' }));
    expect(status).toBe(200);
    expect(body).toEqual({ saved: true, message: 'admin: 304 score 33-54\n\nbulletin fix', commitUrl: null });
    expect(s.saves).toHaveLength(1);
    expect((await find(s, 304)).result).toEqual({ home: 33, away: 54 });
  });

  it('answers 422 with the violations of a game not played yet', async () => {
    const s = store();
    const { status, body } = await call(s, post('score', { game: 321, result: { home: 60, away: 50 } }));
    expect(status).toBe(422);
    expect(body.violations).toEqual([expect.stringContaining('after today (2026-11-12)')]);
    expect(s.saves).toHaveLength(0);
  });

  it('answers 404 for an unknown game', async () => {
    const { status, body } = await call(store(), post('score', { game: 999, result: { home: 1, away: 0 } }));
    expect(status).toBe(404);
    expect(body).toEqual({ violations: ['game 999: no such game'] });
  });

  it.each([
    ['periods that are not pairs', { game: 304, result: { home: 33, away: 54, periods: [[1, 2, 3]] } }],
    ['a number sent as text', { game: '304', result: { home: 33, away: 54 } }],
    ['a fraction', { game: 304, result: { home: 33.5, away: 54 } }],
    ['an unknown field', { game: 304, result: { home: 33, away: 54 }, admin: true }],
    ['an unknown nested field', { game: 304, result: { home: 33, away: 54, winner: 'home' } }],
    ['a missing field', { game: 304 }],
    ['a list instead of an object', [304]],
  ])('answers 400 for %s without saving', async (_, body) => {
    const s = store();
    const out = await call(s, post('score', body));
    expect(out.status).toBe(400);
    expect(out.body.error).toMatch(/^invalid request: /);
    expect(s.loads).toBe(0);
    expect(s.saves).toHaveLength(0);
  });

  it('answers 400 for a body that is not JSON', async () => {
    const s = store();
    expect((await call(s, post('score', '{"game": 304,'))).status).toBe(400);
    expect(s.saves).toHaveLength(0);
  });

  it('answers 413 for a body over the limit, declared or not', async () => {
    const s = store();
    const huge = JSON.stringify({ game: 304, comment: 'x'.repeat(MAX_BODY_BYTES) });
    expect((await call(s, post('score', huge))).status).toBe(413);
    expect((await call(s, post('score', '{}', { 'Content-Length': String(MAX_BODY_BYTES + 1) }))).status).toBe(413);
    expect(s.loads).toBe(0);
    expect(s.saves).toHaveLength(0);
  });

  it('answers 409 when the data keeps changing during the save', async () => {
    const s = store();
    s.beforeSave = (st) => {
      st.commit({});
    };
    const { status } = await call(s, post('score', { game: 304, result: { home: 33, away: 54 } }));
    expect(status).toBe(409);
    expect(s.loads).toBe(2);
    expect(s.saves).toHaveLength(0);
  });

  it('answers 502 without the cause when the store fails', async () => {
    const logged = vi.spyOn(console, 'error').mockImplementation(() => {});
    const s = store();
    s.save = async () => {
      throw new Error('GitHub: GraphQL error - something internal');
    };
    const { status, body } = await call(s, post('score', { game: 304, result: { home: 33, away: 54 } }));
    expect(status).toBe(502);
    expect(body).toEqual({ error: 'storage error' });
    expect(JSON.stringify(body)).not.toContain('internal');
    expect(logged).toHaveBeenCalledOnce();
  });
});

describe('POST video', () => {
  it('reports an unchanged video without saving', async () => {
    const s = store();
    const video = MATCHES.find((m) => m.game === 310)!.video;
    expect(await call(s, post('video', { game: 310, video }))).toEqual({ status: 200, body: { saved: false } });
    expect(s.saves).toHaveLength(0);
  });
});

describe('POST stats', () => {
  const pdf = readFileSync(PDF_URL);
  const boxText = readFileSync(new URL('./fixtures/data/boxscores/310.json', import.meta.url), 'utf8');

  it('publishes a real statistics PDF with its box score', async () => {
    const s = store();
    const { status, body } = await call(s, post('stats', { game: 310, pdf: pdf.toString('base64'), boxScore: JSON.parse(boxText) }));
    expect(status).toBe(200);
    expect(body).toMatchObject({ saved: true, message: 'admin: 310 statistics and box score' });
    const { changes } = s.saves[0];
    expect(Buffer.from(changes.putStatsPdfs![0].content).equals(pdf)).toBe(true);
    // The parsed box score is written exactly as the statistics reader writes the file.
    expect(serializeBoxScore(changes.putBoxScores![0])).toBe(boxText);
  });

  it('writes the box score fields in the file order whatever the order sent', async () => {
    const s = store();
    const { home, away, ...rest } = JSON.parse(boxText) as BoxScore;
    const reordered = { away, home, ...rest };
    await call(s, post('stats', { boxScore: reordered, pdf: pdf.toString('base64'), game: 310 }));
    expect(serializeBoxScore(s.saves[0].changes.putBoxScores![0])).toBe(boxText);
  });

  it.each([
    ['text that is not base64', { game: 310, pdf: 'not base64!' }],
    ['base64 of the wrong length', { game: 310, pdf: 'JVBERi0' }],
    ['a box score with a field of the wrong type', { game: 310, pdf: 'JVBERi0x', boxScore: { ...JSON.parse(boxText), spectators: '40' } }],
    ['a box score without a team', { game: 310, pdf: 'JVBERi0x', boxScore: { ...JSON.parse(boxText), away: undefined } }],
  ])('answers 400 for %s', async (_, body) => {
    const s = store();
    expect((await call(s, post('stats', body))).status).toBe(400);
    expect(s.saves).toHaveLength(0);
  });

  it('answers 422 for a file that is not a PDF', async () => {
    const s = store();
    const { status } = await call(s, post('stats', { game: 310, pdf: Buffer.from('hello').toString('base64') }));
    expect(status).toBe(422);
  });
});

describe('POST postpone', () => {
  it('postpones a game and takes the mark off again', async () => {
    const s = store();
    expect((await call(s, post('postpone', { game: 321, postponed: true }))).body).toMatchObject({ saved: true, message: 'admin: 321 postponed' });
    expect((await find(s, 321)).postponed).toBe(true);
    expect((await call(s, post('postpone', { game: 321, postponed: false }))).body).toMatchObject({
      saved: true,
      message: 'admin: 321 no longer postponed',
    });
    expect((await find(s, 321)).postponed).toBeUndefined();
    expect(s.saves).toHaveLength(2);
  });

  it('requires the postponed flag', async () => {
    expect((await call(store(), post('postpone', { game: 321 }))).status).toBe(400);
  });
});

describe('POST reschedule', () => {
  it('gives a postponed game its new date', async () => {
    const s = store();
    const { status, body } = await call(s, post('reschedule', { game: 317, date: '2026-11-30', time: '21:00' }));
    expect(status).toBe(200);
    expect(body).toMatchObject({ saved: true, message: 'admin: 317 rescheduled to 2026-11-30 21:00' });
    expect(await find(s, 317)).toMatchObject({ date: '2026-11-30', time: '21:00', revision: 1 });
  });

  it('answers 422 for a time that is not HH:MM', async () => {
    const { status, body } = await call(store(), post('reschedule', { game: 317, date: '2026-11-30', time: '9pm' }));
    expect(status).toBe(422);
    expect(body.violations).toEqual(['game 317: "9pm" is not a time in the form HH:MM']);
  });
});

describe('POST standings', () => {
  it('answers 400 for a table date that is not a date', async () => {
    const s = store();
    expect((await call(s, post('standings', { standings: { ...STANDINGS, date: 'tomorrow' } }))).status).toBe(400);
  });

  it('reports the same table as unchanged', async () => {
    expect((await call(store(), post('standings', { standings: STANDINGS }))).body).toEqual({ saved: false });
  });
});

describe('romeToday', () => {
  it('uses the date in Rome', () => {
    expect(romeToday(new Date('2026-11-12T23:30:00Z'))).toBe('2026-11-13');
    expect(romeToday(new Date('2026-07-01T21:59:00Z'))).toBe('2026-07-01');
  });
});
