import type { CommandResult } from './commands.ts';
import { VersionConflictError, type DataStore, type Snapshot } from './datastore.ts';

export type RunOutcome =
  | { kind: 'saved'; version: string; url?: string; message: string }
  | { kind: 'unchanged' }
  | { kind: 'rejected'; status: 404 | 422; violations: string[] }
  | { kind: 'conflict' };

/**
 * Loads the data, applies a command and saves the result. When the stored data changed in between,
 * the command is applied once more to the fresh data; a second conflict is reported to the caller.
 */
export async function runCommand(store: DataStore, apply: (snapshot: Snapshot) => CommandResult): Promise<RunOutcome> {
  for (let attempt = 0; attempt < 2; attempt++) {
    const snapshot = await store.load();
    const result = apply(snapshot);
    if (result.kind === 'unchanged') return { kind: 'unchanged' };
    if (result.kind === 'rejected') return { kind: 'rejected', status: result.status, violations: result.violations };
    try {
      const saved = await store.save(result.changes, snapshot.version, result.message);
      return { kind: 'saved', version: saved.version, url: saved.url, message: result.message };
    } catch (error) {
      if (!(error instanceof VersionConflictError)) throw error;
    }
  }
  return { kind: 'conflict' };
}
