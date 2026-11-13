import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { VersionConflictError, type ChangeSet } from '../src/admin/datastore.ts';
import { GitHubDataStore, serializeBoxScore } from '../src/admin/github-datastore.ts';
import { serializeMatches, serializeStandings } from '../src/data/serialize.ts';
import type { BoxScore, Match, Standings } from '../src/data/types.ts';

const TOKEN = 'github_pat_SECRET123';
const OID = 'a'.repeat(40);
const NEW_OID = 'b'.repeat(40);

const file = (path: string) => readFileSync(new URL(`./fixtures/data/${path}`, import.meta.url), 'utf8');
const MATCHES_TEXT = file('matches.json');
const STANDINGS_TEXT = file('standings.json');
const BOX_GAMES = [306, 309, 310, 314];
const BOX_TEXTS = Object.fromEntries(BOX_GAMES.map((game) => [game, file(`boxscores/${game}.json`)]));

interface Call {
  url: string;
  headers: Headers;
  query: string;
  variables: Record<string, unknown>;
}

type Answer = { status?: number; body: unknown } | Error;

/** A fake GitHub GraphQL endpoint answering the head query, the data query and the commit mutation. */
function fakeGitHub(commitAnswer: Answer = { body: { data: { createCommitOnBranch: { commit: { oid: NEW_OID, url: `https://github.com/o/r/commit/${NEW_OID}` } } } } }) {
  const calls: Call[] = [];
  const fetch = (async (input: string | URL | Request, init?: RequestInit) => {
    const { query, variables } = JSON.parse(String(init!.body)) as { query: string; variables: Record<string, unknown> };
    calls.push({ url: String(input), headers: new Headers(init!.headers), query, variables });
    let answer: Answer;
    if (query.includes('createCommitOnBranch')) answer = commitAnswer;
    else if (query.includes('qualifiedName')) answer = { body: { data: { repository: { ref: { target: { oid: OID } } } } } };
    else {
      const blob = (text: string) => ({ text, isTruncated: false });
      answer = {
        body: {
          data: {
            repository: {
              matches: blob(MATCHES_TEXT),
              standings: blob(STANDINGS_TEXT),
              boxScores: {
                entries: [
                  ...BOX_GAMES.map((game) => ({ name: `${game}.json`, type: 'blob', object: blob(BOX_TEXTS[game]) })),
                  { name: 'README.md', type: 'blob', object: blob('notes') },
                ],
              },
              stats: { entries: [{ name: '306.pdf', type: 'blob' }, { name: '310.pdf', type: 'blob' }, { name: '.gitkeep', type: 'blob' }] },
            },
          },
        },
      };
    }
    if (answer instanceof Error) throw answer;
    const text = typeof answer.body === 'string' ? answer.body : JSON.stringify(answer.body);
    return new Response(text, { status: answer.status ?? 200, headers: { 'Content-Type': 'application/json' } });
  }) as typeof globalThis.fetch;
  return { calls, fetch };
}

const storeWith = (fetch: typeof globalThis.fetch) => new GitHubDataStore({ token: TOKEN, repo: 'owner/fdm-basket', branch: 'main', fetch });

const decode = (base64: string) => Buffer.from(base64, 'base64').toString('utf8');

async function failureOf(promise: Promise<unknown>): Promise<Error> {
  try {
    await promise;
  } catch (error) {
    return error as Error;
  }
  throw new Error('did not fail');
}

describe('GitHubDataStore.load', () => {
  it('reads every file at the head commit of the branch', async () => {
    const github = fakeGitHub();
    const snapshot = await storeWith(github.fetch).load();

    expect(github.calls).toHaveLength(2);
    expect(github.calls[0].variables).toEqual({ owner: 'owner', name: 'fdm-basket', ref: 'refs/heads/main' });
    const { owner, name, ...expressions } = github.calls[1].variables;
    expect({ owner, name }).toEqual({ owner: 'owner', name: 'fdm-basket' });
    expect(expressions).toEqual({
      matches: `${OID}:src/data/matches.json`,
      standings: `${OID}:src/data/standings.json`,
      boxScores: `${OID}:src/data/boxscores`,
      stats: `${OID}:public/stats`,
    });

    expect(snapshot.version).toBe(OID);
    expect(snapshot.matches).toEqual(JSON.parse(MATCHES_TEXT));
    expect(snapshot.standings).toEqual(JSON.parse(STANDINGS_TEXT));
    expect(Object.keys(snapshot.boxScores).map(Number)).toEqual(BOX_GAMES);
    expect(snapshot.boxScores[310]).toEqual(JSON.parse(BOX_TEXTS[310]));
    expect(snapshot.statsPaths).toEqual(['/stats/306.pdf', '/stats/310.pdf']);
  });

  it('sends the token and a User-Agent to the GraphQL endpoint', async () => {
    const github = fakeGitHub();
    await storeWith(github.fetch).load();
    for (const call of github.calls) {
      expect(call.url).toBe('https://api.github.com/graphql');
      expect(call.headers.get('Authorization')).toBe(`bearer ${TOKEN}`);
      expect(call.headers.get('User-Agent')).toBeTruthy();
    }
  });
});

describe('GitHubDataStore.save', () => {
  const matches = JSON.parse(MATCHES_TEXT) as Match[];
  const standings = JSON.parse(STANDINGS_TEXT) as Standings;
  const box = JSON.parse(BOX_TEXTS[310]) as BoxScore;
  box.home.players[0].name = 'À NICCOLÒ';
  const pdf = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x00, 0xff, 0x80, 0xe2]);

  it('commits the changed files on the loaded version in one call', async () => {
    const github = fakeGitHub();
    const changes: ChangeSet = { matches, standings, putBoxScores: [box], removeBoxScores: [306], putStatsPdfs: [{ game: 310, content: pdf }] };
    const saved = await storeWith(github.fetch).save(changes, OID, 'admin: 310 statistics and box score\n\nfixed · typo\nsecond line');

    expect(saved).toEqual({ version: NEW_OID, url: `https://github.com/o/r/commit/${NEW_OID}` });
    expect(github.calls).toHaveLength(1);
    const { input } = github.calls[0].variables as {
      input: {
        branch: unknown;
        expectedHeadOid: string;
        message: unknown;
        fileChanges: { additions: { path: string; contents: string }[]; deletions: { path: string }[] };
      };
    };
    expect(input.branch).toEqual({ repositoryNameWithOwner: 'owner/fdm-basket', branchName: 'main' });
    expect(input.expectedHeadOid).toBe(OID);
    expect(input.message).toEqual({ headline: 'admin: 310 statistics and box score', body: 'fixed · typo\nsecond line' });

    const added = Object.fromEntries(input.fileChanges.additions.map((a) => [a.path, a.contents]));
    expect(Object.keys(added)).toEqual(['src/data/matches.json', 'src/data/standings.json', 'src/data/boxscores/310.json', 'public/stats/310.pdf']);
    expect(decode(added['src/data/matches.json'])).toBe(serializeMatches(matches));
    expect(decode(added['src/data/standings.json'])).toBe(serializeStandings(standings));
    expect(decode(added['src/data/standings.json'])).toContain('CU 05 · 06/11/2026');
    expect(decode(added['src/data/boxscores/310.json'])).toBe(serializeBoxScore(box));
    expect(decode(added['src/data/boxscores/310.json'])).toContain('À NICCOLÒ');
    expect([...Buffer.from(added['public/stats/310.pdf'], 'base64')]).toEqual([...pdf]);
    expect(input.fileChanges.deletions).toEqual([{ path: 'src/data/boxscores/306.json' }]);
  });

  it('encodes a statistics file larger than one chunk', async () => {
    const github = fakeGitHub();
    const big = new Uint8Array(200_000).map((_, i) => (i * 7) % 256);
    await storeWith(github.fetch).save({ putStatsPdfs: [{ game: 310, content: big }] }, OID, 'admin: 310 statistics');
    const { input } = github.calls[0].variables as { input: { message: unknown; fileChanges: { additions: { contents: string }[] } } };
    expect(Buffer.from(input.fileChanges.additions[0].contents, 'base64').equals(Buffer.from(big))).toBe(true);
    expect(input.message).toEqual({ headline: 'admin: 310 statistics' });
  });

  it.each([
    ['a box score of a game that is not a whole number', { putBoxScores: [{ ...box, game: 1.5 }] }],
    ['a removal outside the box scores', { removeBoxScores: ['../../package' as unknown as number] }],
    ['a statistics file of game 0', { putStatsPdfs: [{ game: 0, content: pdf }] }],
    ['an unknown kind of change', { files: [{ path: '.github/workflows/x.yml' }] } as unknown as ChangeSet],
    ['the same file put and removed', { putBoxScores: [box], removeBoxScores: [310] }],
    ['no change at all', {}],
  ])('refuses %s without calling GitHub', async (_, changes) => {
    const github = fakeGitHub();
    await expect(storeWith(github.fetch).save(changes as ChangeSet, OID, 'admin: x')).rejects.toThrow();
    expect(github.calls).toHaveLength(0);
  });

  it('reports a moved branch as a version conflict', async () => {
    const stale = {
      body: {
        data: { createCommitOnBranch: null },
        errors: [{ type: 'STALE_DATA', path: ['createCommitOnBranch'], message: `Expected branch to point to "${OID}" but it did not. Pull and try again.` }],
      },
    };
    const github = fakeGitHub(stale);
    await expect(storeWith(github.fetch).save({ matches }, OID, 'admin: x')).rejects.toBeInstanceOf(VersionConflictError);

    const untyped = { body: { data: null, errors: [{ message: `Expected branch to point to "${OID}" but it did not. Pull and try again.` }] } };
    await expect(storeWith(fakeGitHub(untyped).fetch).save({ matches }, OID, 'admin: x')).rejects.toBeInstanceOf(VersionConflictError);
  });

  it.each<[string, Answer]>([
    ['bad credentials', { status: 401, body: { message: 'Bad credentials' } }],
    ['a GraphQL error echoing the token', { body: { data: null, errors: [{ type: 'FORBIDDEN', message: `token ${TOKEN} cannot push` }] } }],
    ['a network failure naming the token', new TypeError(`invalid header value bearer ${TOKEN}`)],
    ['an unreadable answer', { status: 502, body: 'not json' }],
  ])('fails on %s without revealing the token', async (_, answer) => {
    const error = await failureOf(storeWith(fakeGitHub(answer).fetch).save({ matches }, OID, 'admin: x'));
    expect(error).not.toBeInstanceOf(VersionConflictError);
    expect(error.message).toMatch(/^GitHub: /);
    expect(error.message).not.toContain(TOKEN);
    expect(error.stack ?? '').not.toContain(TOKEN);
  });
});
