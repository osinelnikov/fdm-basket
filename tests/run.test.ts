import { describe, expect, it } from 'vitest';
import { MATCHES, STANDINGS, STATS_PATHS } from './fixtures/data.ts';
import type { Match } from '../src/data/types.ts';
import { postpone, setVideo, unpostpone } from '../src/admin/commands.ts';
import type { Snapshot } from '../src/admin/datastore.ts';
import { MemoryDataStore } from '../src/admin/memory-datastore.ts';
import { runCommand } from '../src/admin/run.ts';

const TODAY = '2026-11-12';

function store(): MemoryDataStore {
  const matches = structuredClone(MATCHES) as Match[];
  const snapshot: Snapshot = {
    matches,
    standings: structuredClone(STANDINGS),
    boxScores: {},
    statsPaths: [...STATS_PATHS],
    version: '0',
  };
  // Boxes are not needed here; statistics without a box score are valid.
  return new MemoryDataStore(snapshot);
}

const VIDEO = 'https://youtu.be/abcdefghijk';

describe('runCommand', () => {
  it('saves a change with the loaded version and the message', async () => {
    const s = store();
    const outcome = await runCommand(s, (snap) => setVideo(snap, { game: 310, video: VIDEO }, TODAY));
    expect(outcome).toEqual({ kind: 'saved', version: '1', url: undefined, message: 'admin: 310 video' });
    expect(s.saves).toHaveLength(1);
    expect((await s.load()).matches.find((m) => m.game === 310)!.video).toBe(VIDEO);
  });

  it('does not save when nothing changes', async () => {
    const s = store();
    expect(await runCommand(s, (snap) => unpostpone(snap, { game: 321 }, TODAY))).toEqual({ kind: 'unchanged' });
    expect(s.saves).toHaveLength(0);
  });

  it('does not save a rejected command', async () => {
    const s = store();
    expect(await runCommand(s, (snap) => postpone(snap, { game: 310 }, TODAY))).toMatchObject({ kind: 'rejected', status: 422 });
    expect(await runCommand(s, (snap) => postpone(snap, { game: 999 }, TODAY))).toMatchObject({ kind: 'rejected', status: 404 });
    expect(s.saves).toHaveLength(0);
  });

  it('retries once on a concurrent write and applies the command on top of it', async () => {
    const s = store();
    let writes = 0;
    s.beforeSave = (self) => {
      if (writes++ > 0) return;
      const matches = structuredClone(MATCHES) as Match[];
      matches.find((m) => m.game === 306)!.video = 'https://youtu.be/zzzzzzzzzzz';
      self.commit({ matches });
    };
    const outcome = await runCommand(s, (snap) => setVideo(snap, { game: 310, video: VIDEO }, TODAY));
    expect(outcome).toMatchObject({ kind: 'saved', version: '2' });
    const after = await s.load();
    expect(after.matches.find((m) => m.game === 306)!.video).toBe('https://youtu.be/zzzzzzzzzzz');
    expect(after.matches.find((m) => m.game === 310)!.video).toBe(VIDEO);
    expect(s.saves).toHaveLength(1);
  });

  it('reports a conflict after a second concurrent write', async () => {
    const s = store();
    s.beforeSave = (self) => self.commit({});
    expect(await runCommand(s, (snap) => setVideo(snap, { game: 310, video: VIDEO }, TODAY))).toEqual({ kind: 'conflict' });
    expect(s.saves).toHaveLength(0);
  });

  it('lets other errors through', async () => {
    const s = store();
    s.beforeSave = () => {
      throw new Error('storage down');
    };
    await expect(runCommand(s, (snap) => setVideo(snap, { game: 310, video: VIDEO }, TODAY))).rejects.toThrow('storage down');
  });
});
