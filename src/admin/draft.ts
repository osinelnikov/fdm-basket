/**
 * Unsaved input of an admin dialog, kept in sessionStorage while the owner signs in again
 * after the Cloudflare Access session expired, and restored after the reload.
 */

export const ACTIONS = ['score', 'video', 'stats', 'standings', 'postpone'] as const;
export type ActionId = (typeof ACTIONS)[number];

export interface Draft {
  action: ActionId;
  /** Form controls by name: text as typed, checkboxes as true/false. */
  values: Record<string, string | boolean>;
}

export const DRAFT_KEY = 'fdm-admin-draft';

const MAX_FIELDS = 200;
const MAX_TEXT = 5000;

export const encodeDraft = (draft: Draft): string => JSON.stringify({ v: 1, action: draft.action, values: draft.values });

/** The draft stored by encodeDraft; undefined for anything else, so a damaged entry is simply ignored. */
export function decodeDraft(text: string | null | undefined): Draft | undefined {
  if (!text) return undefined;
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return undefined;
  }
  if (typeof data !== 'object' || data === null) return undefined;
  const { v, action, values } = data as Record<string, unknown>;
  if (v !== 1 || !(ACTIONS as readonly unknown[]).includes(action)) return undefined;
  if (typeof values !== 'object' || values === null || Array.isArray(values)) return undefined;
  const entries = Object.entries(values);
  if (entries.length > MAX_FIELDS) return undefined;
  const out: Record<string, string | boolean> = {};
  for (const [name, value] of entries) {
    if (typeof value === 'boolean' || (typeof value === 'string' && value.length <= MAX_TEXT)) out[name] = value;
    else return undefined;
  }
  return { action: action as ActionId, values: out };
}
