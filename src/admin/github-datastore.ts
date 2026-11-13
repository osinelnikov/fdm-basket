import { serializeMatches, serializeStandings } from '../data/serialize.ts';
import type { BoxScore, Match, Standings } from '../data/types.ts';
import { VersionConflictError, type ChangeSet, type DataStore, type Snapshot } from './datastore.ts';

/**
 * Keeps the published data in the GitHub repository the site is built from: every save is one commit
 * on the branch, made through the GraphQL API, so the next Pages build publishes it.
 */

export interface GitHubDataStoreOptions {
  /** Fine-grained personal access token with write access to the repository contents. */
  token: string;
  /** 'owner/name'. */
  repo: string;
  branch: string;
  fetch?: typeof fetch;
}

const ENDPOINT = 'https://api.github.com/graphql';
const USER_AGENT = 'fdm-basket-admin';

const MATCHES_PATH = 'src/data/matches.json';
const STANDINGS_PATH = 'src/data/standings.json';
const BOXSCORES_DIR = 'src/data/boxscores';
const STATS_DIR = 'public/stats';

const CHANGE_KEYS = ['matches', 'standings', 'putBoxScores', 'removeBoxScores', 'putStatsPdfs'];

const HEAD_QUERY = `query($owner: String!, $name: String!, $ref: String!) {
  repository(owner: $owner, name: $name) { ref(qualifiedName: $ref) { target { oid } } }
}`;

const DATA_QUERY = `query($owner: String!, $name: String!, $matches: String!, $standings: String!, $boxScores: String!, $stats: String!) {
  repository(owner: $owner, name: $name) {
    matches: object(expression: $matches) { ... on Blob { text isTruncated } }
    standings: object(expression: $standings) { ... on Blob { text isTruncated } }
    boxScores: object(expression: $boxScores) { ... on Tree { entries { name type object { ... on Blob { text isTruncated } } } } }
    stats: object(expression: $stats) { ... on Tree { entries { name type } } }
  }
}`;

const COMMIT_MUTATION = `mutation($input: CreateCommitOnBranchInput!) {
  createCommitOnBranch(input: $input) { commit { oid url } }
}`;

interface BlobNode {
  text: string | null;
  isTruncated: boolean;
}

interface TreeEntry {
  name: string;
  type: string;
  object?: BlobNode | null;
}

interface GraphQLError {
  type?: string;
  message?: string;
}

const isGame = (game: unknown): game is number => typeof game === 'number' && Number.isSafeInteger(game) && game > 0;

function gamePath(game: unknown, dir: string, extension: string): string {
  if (!isGame(game)) throw new Error(`refusing to write a file for game ${String(game).slice(0, 20)}`);
  return `${dir}/${game}.${extension}`;
}

/** Base64 of bytes, in chunks so that large files do not overflow the argument list. */
export function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binary);
}

const textToBase64 = (text: string) => bytesToBase64(new TextEncoder().encode(text));

/** The text of a box score file, as written by the statistics reader. */
export const serializeBoxScore = (box: BoxScore): string => JSON.stringify(box, null, 2) + '\n';

function blobText(node: BlobNode | null | undefined, path: string): string {
  if (!node) throw new Error(`GitHub: ${path} is missing`);
  if (node.text === null || node.isTruncated) throw new Error(`GitHub: ${path} could not be read as text`);
  return node.text;
}

export class GitHubDataStore implements DataStore {
  private readonly token: string;
  private readonly owner: string;
  private readonly name: string;
  private readonly repo: string;
  private readonly branch: string;
  private readonly send: (input: string, init: RequestInit) => Promise<Response>;

  constructor(options: GitHubDataStoreOptions) {
    const [owner, name, ...rest] = options.repo.split('/');
    const part = /^[A-Za-z0-9_.-]+$/;
    if (rest.length > 0 || !part.test(owner ?? '') || !part.test(name ?? '')) throw new Error('GitHub repository must be "owner/name"');
    if (!options.token) throw new Error('GitHub token is missing');
    this.token = options.token;
    this.owner = owner;
    this.name = name;
    this.repo = options.repo;
    this.branch = options.branch;
    // Called as a plain function: the Workers runtime rejects fetch invoked with another `this`.
    const custom = options.fetch;
    this.send = custom ? (input, init) => custom(input, init) : (input, init) => fetch(input, init);
  }

  async load(): Promise<Snapshot> {
    const head = await this.graphql<{ repository: { ref: { target: { oid: string } } | null } | null }>(HEAD_QUERY, {
      owner: this.owner,
      name: this.name,
      ref: `refs/heads/${this.branch}`,
    });
    const oid = head.repository?.ref?.target.oid;
    if (!oid || !/^[0-9a-f]{40}$/.test(oid)) throw new Error(`GitHub: branch ${this.branch} not found`);

    // Every file is read at the same commit, so the snapshot is consistent even if the branch moves meanwhile.
    const data = await this.graphql<{
      repository: {
        matches: BlobNode | null;
        standings: BlobNode | null;
        boxScores: { entries: TreeEntry[] } | null;
        stats: { entries: TreeEntry[] } | null;
      } | null;
    }>(DATA_QUERY, {
      owner: this.owner,
      name: this.name,
      matches: `${oid}:${MATCHES_PATH}`,
      standings: `${oid}:${STANDINGS_PATH}`,
      boxScores: `${oid}:${BOXSCORES_DIR}`,
      stats: `${oid}:${STATS_DIR}`,
    });
    const repository = data.repository;
    if (!repository) throw new Error('GitHub: repository not found');

    const boxScores: Record<number, BoxScore> = {};
    for (const entry of repository.boxScores?.entries ?? []) {
      const m = /^(\d+)\.json$/.exec(entry.name);
      if (!m || entry.type !== 'blob') continue;
      boxScores[Number(m[1])] = JSON.parse(blobText(entry.object, `${BOXSCORES_DIR}/${entry.name}`)) as BoxScore;
    }
    const statsPaths = (repository.stats?.entries ?? []).flatMap((entry) =>
      entry.type === 'blob' && /^\d+\.pdf$/.test(entry.name) ? [`/stats/${entry.name}`] : [],
    );

    return {
      matches: JSON.parse(blobText(repository.matches, MATCHES_PATH)) as Match[],
      standings: JSON.parse(blobText(repository.standings, STANDINGS_PATH)) as Standings,
      boxScores,
      statsPaths,
      version: oid,
    };
  }

  async save(changes: ChangeSet, expectedVersion: string, message: string): Promise<{ version: string; url?: string }> {
    const additions: { path: string; contents: string }[] = [];
    const deletions: { path: string }[] = [];

    const unknown = Object.keys(changes).filter((key) => !CHANGE_KEYS.includes(key));
    if (unknown.length > 0) throw new Error(`refusing to save unknown changes: ${unknown.join(', ').slice(0, 100)}`);
    if (changes.matches) additions.push({ path: MATCHES_PATH, contents: textToBase64(serializeMatches(changes.matches)) });
    if (changes.standings) additions.push({ path: STANDINGS_PATH, contents: textToBase64(serializeStandings(changes.standings)) });
    for (const box of changes.putBoxScores ?? []) {
      additions.push({ path: gamePath(box.game, BOXSCORES_DIR, 'json'), contents: textToBase64(serializeBoxScore(box)) });
    }
    for (const game of changes.removeBoxScores ?? []) deletions.push({ path: gamePath(game, BOXSCORES_DIR, 'json') });
    for (const { game, content } of changes.putStatsPdfs ?? []) {
      if (!(content instanceof Uint8Array)) throw new Error(`refusing to write statistics of game ${game} that are not bytes`);
      additions.push({ path: gamePath(game, STATS_DIR, 'pdf'), contents: bytesToBase64(content) });
    }

    const paths = [...additions, ...deletions].map((c) => c.path);
    if (paths.length === 0) throw new Error('nothing to save');
    if (new Set(paths).size !== paths.length) throw new Error('refusing to save a file twice in one commit');
    if (!/^[0-9a-f]{40}$/.test(expectedVersion)) throw new Error('the expected version is not a commit id');

    const newline = message.indexOf('\n');
    const headline = (newline < 0 ? message : message.slice(0, newline)).trim();
    const body = newline < 0 ? '' : message.slice(newline + 1).trim();
    if (!headline) throw new Error('the commit message is empty');

    const data = await this.graphql<{ createCommitOnBranch: { commit: { oid: string; url: string } } | null }>(COMMIT_MUTATION, {
      input: {
        branch: { repositoryNameWithOwner: this.repo, branchName: this.branch },
        expectedHeadOid: expectedVersion,
        message: body ? { headline, body } : { headline },
        fileChanges: { additions, deletions },
      },
    });
    const commit = data.createCommitOnBranch?.commit;
    if (!commit) throw new Error('GitHub: the commit was not created');
    return { version: commit.oid, url: commit.url };
  }

  private async graphql<T>(query: string, variables: Record<string, unknown>): Promise<T> {
    let response: Response;
    try {
      response = await this.send(ENDPOINT, {
        method: 'POST',
        headers: {
          Authorization: `bearer ${this.token}`,
          'User-Agent': USER_AGENT,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({ query, variables }),
      });
    } catch (error) {
      // The cause is left out: a malformed token could show up in the runtime's message about the header.
      throw new Error(`GitHub: request failed (${error instanceof Error ? error.name : 'unknown error'})`);
    }

    let payload: { data?: T | null; errors?: GraphQLError[] } | undefined;
    try {
      payload = (await response.json()) as typeof payload;
    } catch {
      payload = undefined;
    }
    const errors = payload?.errors ?? [];
    // createCommitOnBranch answers a moved branch with
    //   { "type": "STALE_DATA", "message": "Expected branch to point to \"<oid>\" but it did not. Pull and try again." }
    // Either marker means the stored data changed after it was loaded.
    if (errors.some((e) => e.type === 'STALE_DATA' || /expected branch to point to/i.test(e.message ?? ''))) {
      throw new VersionConflictError();
    }
    if (!response.ok) throw new Error(this.redact(`GitHub: HTTP ${response.status}${describeErrors(errors)}`));
    if (errors.length > 0) throw new Error(this.redact(`GitHub: GraphQL error${describeErrors(errors)}`));
    if (!payload?.data) throw new Error(`GitHub: response without data (HTTP ${response.status})`);
    return payload.data;
  }

  /** Never lets the token into a message, whatever GitHub echoes back. */
  private redact(text: string): string {
    return text.split(this.token).join('[redacted]');
  }
}

function describeErrors(errors: GraphQLError[]): string {
  if (errors.length === 0) return '';
  const text = errors.map((e) => (e.type ? `${e.type}: ${e.message ?? ''}` : (e.message ?? ''))).join('; ');
  return ` - ${text.slice(0, 500)}`;
}
