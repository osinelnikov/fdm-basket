import {
  postpone,
  replaceStandings,
  reschedule,
  setScore,
  setStats,
  setVideo,
  unpostpone,
  type CommandResult,
} from '../../src/admin/commands.ts';
import type { DataStore, Snapshot } from '../../src/admin/datastore.ts';
import { runCommand } from '../../src/admin/run.ts';
import { InputError, parsePostpone, parseReschedule, parseScore, parseStandings, parseStats, parseVideo } from './input.ts';
import { failure, json } from './respond.ts';

export interface HandlerDeps {
  store: DataStore;
  /** Today's date in Europe/Rome, YYYY-MM-DD. */
  today: () => string;
}

/** Signed-in owner, as established by authorize(). */
export interface Identity {
  email: string;
}

/** Largest accepted request body: a statistics PDF of about 50 KB grows by a third in base64, plus its box score. */
export const MAX_BODY_BYTES = 2 * 1024 * 1024;

const PREFIX = '/api/admin/';

/** Today's date in Europe/Rome, YYYY-MM-DD. */
export function romeToday(now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Rome', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
  const part = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  return `${part('year')}-${part('month')}-${part('day')}`;
}

/**
 * Each command checks the shape of its body first; the parsed input is then applied to whatever data
 * runCommand loads, once more after a conflict.
 */
const COMMANDS: Record<string, (body: unknown) => (snapshot: Snapshot, today: string) => CommandResult> = {
  score: (body) => {
    const input = parseScore(body);
    return (s, today) => setScore(s, input, today);
  },
  video: (body) => {
    const input = parseVideo(body);
    return (s, today) => setVideo(s, input, today);
  },
  stats: (body) => {
    const input = parseStats(body);
    return (s, today) => setStats(s, input, today);
  },
  standings: (body) => {
    const input = parseStandings(body);
    return (s, today) => replaceStandings(s, input, today);
  },
  postpone: (body) => {
    const { postponed, ...input } = parsePostpone(body);
    return (s, today) => (postponed ? postpone(s, input, today) : unpostpone(s, input, today));
  },
  reschedule: (body) => {
    const input = parseReschedule(body);
    return (s, today) => reschedule(s, input, today);
  },
};

class BodyTooLarge extends Error {}

/** The body as text, read no further than the limit. */
async function readBody(request: Request, limit: number): Promise<string> {
  const declared = request.headers.get('Content-Length');
  if (declared !== null && Number(declared) > limit) throw new BodyTooLarge();
  if (!request.body) return '';

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > limit) {
      await reader.cancel();
      throw new BodyTooLarge();
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
}

/** Logs a storage failure by its kind and message only; the messages of the data store never carry the token. */
function logFailure(error: unknown) {
  const text = error instanceof Error ? `${error.name}: ${error.message}` : 'unknown error';
  console.error(`admin: storage error - ${text.slice(0, 500)}`);
}

async function state(identity: Identity, deps: HandlerDeps): Promise<Response> {
  let snapshot: Snapshot;
  try {
    snapshot = await deps.store.load();
  } catch (error) {
    logFailure(error);
    return failure(502, 'storage error');
  }
  return json(200, {
    email: identity.email,
    today: deps.today(),
    version: snapshot.version,
    matches: snapshot.matches,
    standings: snapshot.standings,
    boxScoreGames: Object.keys(snapshot.boxScores)
      .map(Number)
      .sort((a, b) => a - b),
    statsPaths: snapshot.statsPaths,
  });
}

async function command(name: string, request: Request, deps: HandlerDeps): Promise<Response> {
  let body: unknown;
  try {
    body = JSON.parse(await readBody(request, MAX_BODY_BYTES));
  } catch (error) {
    if (error instanceof BodyTooLarge) return failure(413, `the request is larger than ${MAX_BODY_BYTES} bytes`);
    return failure(400, 'the request is not valid JSON');
  }

  let apply: (snapshot: Snapshot, today: string) => CommandResult;
  try {
    apply = COMMANDS[name](body);
  } catch (error) {
    if (error instanceof InputError) return failure(400, `invalid request: ${error.message}`);
    throw error;
  }

  const today = deps.today();
  try {
    const outcome = await runCommand(deps.store, (snapshot) => apply(snapshot, today));
    switch (outcome.kind) {
      case 'saved':
        return json(200, { saved: true, message: outcome.message, commitUrl: outcome.url ?? null });
      case 'unchanged':
        return json(200, { saved: false });
      case 'rejected':
        return json(outcome.status, { violations: outcome.violations });
      case 'conflict':
        return failure(409, 'the data changed meanwhile; reload and try again');
    }
  } catch (error) {
    logFailure(error);
    return failure(502, 'storage error');
  }
}

/**
 * Answers the admin API for an owner that authorize() has already let through:
 * GET state, and one POST per command.
 */
export async function handleAdminRequest(request: Request, identity: Identity, deps: HandlerDeps): Promise<Response> {
  const path = new URL(request.url).pathname;
  const route = path.startsWith(PREFIX) ? path.slice(PREFIX.length) : '';

  if (route === 'state') {
    return request.method === 'GET' ? state(identity, deps) : failure(405, 'method not allowed', { Allow: 'GET' });
  }
  if (Object.hasOwn(COMMANDS, route)) {
    return request.method === 'POST' ? command(route, request, deps) : failure(405, 'method not allowed', { Allow: 'POST' });
  }
  return failure(404, 'not found');
}
