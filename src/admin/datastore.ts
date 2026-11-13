import type { BoxScore, Match, Standings } from '../data/types.ts';

/** Everything the admin commands need to know about the published data. */
export interface Snapshot {
  matches: Match[];
  standings: Standings;
  /** Detailed box scores by game number. */
  boxScores: Record<number, BoxScore>;
  /** Published statistics files, e.g. '/stats/310.pdf'. */
  statsPaths: string[];
  /** Opaque marker of the stored state, compared when saving. */
  version: string;
}

/** Changes in domain terms; absent fields are untouched. */
export interface ChangeSet {
  /** The whole new list of matches. */
  matches?: Match[];
  standings?: Standings;
  putBoxScores?: BoxScore[];
  removeBoxScores?: number[];
  putStatsPdfs?: { game: number; content: Uint8Array }[];
}

/** The stored data changed after it was loaded. */
export class VersionConflictError extends Error {
  constructor(message = 'The stored data changed since it was loaded') {
    super(message);
    this.name = 'VersionConflictError';
  }
}

export interface DataStore {
  load(): Promise<Snapshot>;
  /** Atomically applies the changes if the stored version is still `expectedVersion`; otherwise throws VersionConflictError. */
  save(changes: ChangeSet, expectedVersion: string, message: string): Promise<{ version: string; url?: string }>;
}
