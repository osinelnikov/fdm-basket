import type { Match, Standings } from '../data/types.ts';

/**
 * The admin page's side of the admin API: requests and the reading of answers.
 * Cloudflare Access stands in front of the API; when its session has expired it answers with a redirect
 * to the sign-in page, which a request made with `redirect: 'manual'` sees as an opaque redirect.
 */

/** What GET /api/admin/state returns. */
export interface AdminState {
  email: string;
  /** Today's date in Europe/Rome, YYYY-MM-DD. */
  today: string;
  version: string;
  matches: Match[];
  standings: Standings;
  /** Games with a published box score. */
  boxScoreGames: number[];
  /** Published statistics files, e.g. '/stats/310.pdf'. */
  statsPaths: string[];
}

/** What a command returns when it is accepted. */
export type SaveResult = { saved: true; message: string; commitUrl: string | null } | { saved: false };

export type ApiOutcome<T> =
  | { kind: 'ok'; body: T }
  | { kind: 'expired' }
  | { kind: 'violations'; status: number; violations: string[] }
  | { kind: 'error'; status: number; message: string };

/** Largest request body the API accepts; a statistics PDF is limited so that its base64 and box score fit. */
export const MAX_BODY_BYTES = 2 * 1024 * 1024;
export const MAX_PDF_BYTES = Math.floor(1.4 * 1024 * 1024);

/** The parts of a fetch Response the outcome depends on. */
export interface ResponseLike {
  type: string;
  status: number;
  contentType: string | null;
}

const MESSAGES: Record<number, string> = {
  400: 'The server rejected the request as malformed',
  403: 'The server refused the request',
  404: 'The server does not know this request',
  409: 'The data changed meanwhile, for example from another tab or device. Reload the page and try again.',
  413: 'The request is too large: the statistics PDF must be at most 1.4 MB.',
  415: 'The server expected JSON',
  500: 'The server failed unexpectedly; nothing was changed',
  502: 'Saving to the repository failed; nothing was changed. Try again in a minute.',
  503: 'The admin area is not available right now',
};

function describe(status: number, error: unknown): string {
  const known = MESSAGES[status] ?? `Unexpected answer from the server (status ${status})`;
  // 409 and 413 have their own complete wording; elsewhere the server's own reason helps.
  if (typeof error === 'string' && error && status !== 409 && status !== 413) return `${known}: ${error}`;
  return known;
}

/**
 * Reads an answer of the admin API. An expired Access session shows up as an opaque redirect, status 0,
 * 401, or a page that is not JSON (the sign-in page); a non-JSON server failure (5xx) stays an error.
 */
export function readOutcome<T>(response: ResponseLike, text: string): ApiOutcome<T> {
  if (response.type === 'opaqueredirect' || response.status === 0 || response.status === 401) return { kind: 'expired' };
  const isJson = (response.contentType ?? '').toLowerCase().includes('application/json');
  let body: unknown;
  try {
    body = isJson ? JSON.parse(text) : undefined;
  } catch {
    body = undefined;
  }
  if (body === undefined || typeof body !== 'object' || body === null) {
    if (response.status >= 500) return { kind: 'error', status: response.status, message: describe(response.status, undefined) };
    return { kind: 'expired' };
  }
  const record = body as Record<string, unknown>;
  if (response.status >= 200 && response.status < 300) return { kind: 'ok', body: body as T };
  if (Array.isArray(record.violations)) {
    return { kind: 'violations', status: response.status, violations: record.violations.map(String) };
  }
  return { kind: 'error', status: response.status, message: describe(response.status, record.error) };
}

/** Only links to commits on GitHub are shown as links. */
export const safeCommitUrl = (url: unknown): string | undefined =>
  typeof url === 'string' && /^https:\/\/github\.com\/[^\s"'<>]+$/.test(url) ? url : undefined;

/** Whether a state answer has the expected shape. */
export function isAdminState(body: unknown): body is AdminState {
  if (typeof body !== 'object' || body === null) return false;
  const s = body as Record<string, unknown>;
  return (
    typeof s.email === 'string' &&
    typeof s.today === 'string' &&
    typeof s.version === 'string' &&
    Array.isArray(s.matches) &&
    typeof s.standings === 'object' &&
    s.standings !== null &&
    Array.isArray(s.boxScoreGames) &&
    Array.isArray(s.statsPaths)
  );
}

async function request<T>(path: string, init: RequestInit): Promise<ApiOutcome<T>> {
  let response: Response;
  try {
    response = await fetch(path, { ...init, redirect: 'manual', credentials: 'same-origin', cache: 'no-store' });
  } catch {
    return { kind: 'error', status: 0, message: 'The server could not be reached. Check the connection and try again.' };
  }
  const text = response.type === 'opaqueredirect' ? '' : await response.text().catch(() => '');
  return readOutcome<T>({ type: response.type, status: response.status, contentType: response.headers.get('Content-Type') }, text);
}

export async function loadState(): Promise<ApiOutcome<AdminState>> {
  const outcome = await request<AdminState>('/api/admin/state', { method: 'GET' });
  if (outcome.kind === 'ok' && !isAdminState(outcome.body)) {
    return { kind: 'error', status: 200, message: 'The server answered with unexpected data' };
  }
  return outcome;
}

/** The size in bytes of a request body as sent. */
export const bodySize = (body: string): number => new TextEncoder().encode(body).byteLength;

/** Sends a command; a body over the API limit is refused here with a clear message instead of a 413. */
export async function sendCommand(command: string, payload: Record<string, unknown>): Promise<ApiOutcome<SaveResult>> {
  const body = JSON.stringify(payload);
  if (bodySize(body) > MAX_BODY_BYTES) return { kind: 'error', status: 413, message: MESSAGES[413] };
  return request<SaveResult>(`/api/admin/${command}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body });
}

/** Base64 of the bytes, in chunks so a large file does not overflow the call stack. */
export function toBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  return btoa(binary);
}
