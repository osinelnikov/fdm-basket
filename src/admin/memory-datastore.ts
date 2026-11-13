import { VersionConflictError, type ChangeSet, type DataStore, type Snapshot } from './datastore.ts';

export interface SavedChange {
  changes: ChangeSet;
  message: string;
  version: string;
}

/** A data store that keeps everything in memory, for tests. */
export class MemoryDataStore implements DataStore {
  private state: Snapshot;
  private counter: number;

  /** Statistics files by game number. */
  readonly pdfs = new Map<number, Uint8Array>();
  /** Changes saved through save(), in order. */
  readonly saves: SavedChange[] = [];
  loads = 0;
  /** Runs at the start of every save(), before the version check: simulates a write by someone else after load(). */
  beforeSave?: (store: MemoryDataStore) => void;

  constructor(initial: Snapshot) {
    this.state = structuredClone(initial);
    this.counter = Number.parseInt(initial.version, 10) || 0;
    this.state.version = String(this.counter);
  }

  async load(): Promise<Snapshot> {
    this.loads++;
    return structuredClone(this.state);
  }

  async save(changes: ChangeSet, expectedVersion: string, message: string): Promise<{ version: string }> {
    this.beforeSave?.(this);
    if (expectedVersion !== this.state.version) throw new VersionConflictError();
    const version = this.commit(changes);
    this.saves.push({ changes, message, version });
    return { version };
  }

  /** Applies the changes and moves to the next version, without a version check. */
  commit(changes: ChangeSet): string {
    const next = structuredClone(this.state);
    if (changes.matches) next.matches = structuredClone(changes.matches);
    if (changes.standings) next.standings = structuredClone(changes.standings);
    for (const box of changes.putBoxScores ?? []) next.boxScores[box.game] = structuredClone(box);
    for (const game of changes.removeBoxScores ?? []) delete next.boxScores[game];
    for (const { game, content } of changes.putStatsPdfs ?? []) {
      const path = `/stats/${game}.pdf`;
      if (!next.statsPaths.includes(path)) next.statsPaths.push(path);
      this.pdfs.set(game, content);
    }
    this.counter++;
    next.version = String(this.counter);
    this.state = next;
    return next.version;
  }
}
