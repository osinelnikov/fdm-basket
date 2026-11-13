import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { SignJWT, createLocalJWKSet, errors, exportJWK, generateKeyPair, type CryptoKey, type JWTVerifyGetKey } from 'jose';
import { authorize, type Env } from '../functions/_lib/auth.ts';
import { onRequest } from '../functions/api/admin/[[path]].ts';

const HOST = 'fdm-basket.pages.dev';
const TEAM = 'fdm-basket.cloudflareaccess.com';
const AUD = 'dda655a8c4a4720a69ad7486309b23d352787dfaf4f8bfd01e87ff4e33062862';
const OWNER = 'owner@example.com';

const ENV: Env = {
  ADMIN_HOST: HOST,
  ACCESS_TEAM_DOMAIN: TEAM,
  ACCESS_AUD: AUD,
  ADMIN_EMAILS: `someone@example.com, ${OWNER}`,
  GITHUB_TOKEN: 'github_pat_test',
  GITHUB_REPO: 'owner/fdm-basket',
};

let privateKey: CryptoKey;
let otherPrivateKey: CryptoKey;
let getKey: JWTVerifyGetKey;

beforeAll(async () => {
  const pair = await generateKeyPair('RS256');
  privateKey = pair.privateKey;
  otherPrivateKey = (await generateKeyPair('RS256')).privateKey;
  const jwk = await exportJWK(pair.publicKey);
  getKey = createLocalJWKSet({ keys: [{ ...jwk, kid: 'access-key', alg: 'RS256' }] });
});

afterEach(() => {
  vi.restoreAllMocks();
});

interface TokenOptions {
  email?: string;
  issuer?: string;
  audience?: string;
  expires?: number | string;
  key?: CryptoKey;
}

function token(options: TokenOptions = {}): Promise<string> {
  return new SignJWT({ email: options.email ?? OWNER })
    .setProtectedHeader({ alg: 'RS256', kid: 'access-key' })
    .setIssuer(options.issuer ?? `https://${TEAM}`)
    .setAudience(options.audience ?? AUD)
    .setIssuedAt()
    .setExpirationTime(options.expires ?? '5m')
    .sign(options.key ?? privateKey);
}

function request(init: { host?: string; method?: string; jwt?: string; origin?: string; type?: string } = {}): Request {
  const headers = new Headers();
  if (init.jwt) headers.set('Cf-Access-Jwt-Assertion', init.jwt);
  if (init.origin) headers.set('Origin', init.origin);
  if (init.type) headers.set('Content-Type', init.type);
  const method = init.method ?? 'GET';
  return new Request(`https://${init.host ?? HOST}/api/admin/state`, { method, headers, body: method === 'GET' ? undefined : '{}' });
}

async function denied(result: Awaited<ReturnType<typeof authorize>>, status: number): Promise<string> {
  expect(result.ok).toBe(false);
  if (result.ok) throw new Error('authorized');
  expect(result.response.status).toBe(status);
  expect(result.response.headers.get('Cache-Control')).toBe('no-store');
  return ((await result.response.json()) as { error: string }).error;
}

describe('authorize', () => {
  it.each(['ADMIN_HOST', 'ACCESS_TEAM_DOMAIN', 'ACCESS_AUD', 'ADMIN_EMAILS', 'GITHUB_TOKEN', 'GITHUB_REPO'] as const)(
    'stays closed with 503 when %s is missing, without naming it',
    async (name) => {
      const env = { ...ENV, [name]: undefined };
      const error = await denied(await authorize(request({ jwt: await token() }), env, { getKey }), 503);
      expect(error).not.toContain(name);
    },
  );

  it('stays closed with 503 when the configuration is blank or malformed', async () => {
    const jwt = await token();
    await denied(await authorize(request({ jwt }), { ...ENV, ADMIN_EMAILS: ' , ' }, { getKey }), 503);
    await denied(await authorize(request({ jwt }), { ...ENV, ACCESS_TEAM_DOMAIN: `https://${TEAM}` }, { getKey }), 503);
    await denied(await authorize(request({ jwt }), { ...ENV, GITHUB_REPO: 'fdm-basket' }, { getKey }), 503);
  });

  it('answers 503 through the endpoint without calling anything when unconfigured', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const response = await onRequest({ request: request({ jwt: await token() }), env: { ...ENV, GITHUB_TOKEN: '' } });
    expect(response.status).toBe(503);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('refuses a preview deployment host with 403', async () => {
    await denied(await authorize(request({ host: `2d20cdd1.${HOST}`, jwt: await token() }), ENV, { getKey }), 403);
  });

  it('answers 401 without an Access token', async () => {
    await denied(await authorize(request(), ENV, { getKey }), 401);
  });

  it('answers 401 for a token signed by another key', async () => {
    await denied(await authorize(request({ jwt: await token({ key: otherPrivateKey }) }), ENV, { getKey }), 401);
  });

  it('answers 401 for an expired token', async () => {
    const expired = Math.floor(Date.now() / 1000) - 60;
    await denied(await authorize(request({ jwt: await token({ expires: expired }) }), ENV, { getKey }), 401);
  });

  it('answers 401 for a token without an expiry', async () => {
    const endless = await new SignJWT({ email: OWNER })
      .setProtectedHeader({ alg: 'RS256', kid: 'access-key' })
      .setIssuer(`https://${TEAM}`)
      .setAudience(AUD)
      .setIssuedAt()
      .sign(privateKey);
    await denied(await authorize(request({ jwt: endless }), ENV, { getKey }), 401);
  });

  it('answers 401 for a token of another issuer', async () => {
    await denied(await authorize(request({ jwt: await token({ issuer: 'https://other.cloudflareaccess.com' }) }), ENV, { getKey }), 401);
  });

  it('answers 401 for a token that is not a JWT', async () => {
    await denied(await authorize(request({ jwt: 'not-a-token' }), ENV, { getKey }), 401);
  });

  it('answers 403 for a token of another Access application', async () => {
    await denied(await authorize(request({ jwt: await token({ audience: 'another-application' }) }), ENV, { getKey }), 403);
  });

  it('answers 503 when the signing keys cannot be fetched', async () => {
    const unreachable: JWTVerifyGetKey = async () => {
      throw new TypeError('fetch failed');
    };
    await denied(await authorize(request({ jwt: await token() }), ENV, { getKey: unreachable }), 503);
  });

  it.each([
    ['an answer other than 200 OK', new errors.JOSEError('Expected 200 OK from the JSON Web Key Set HTTP response')],
    ['an answer that is not JSON', new errors.JOSEError('Failed to parse the JSON Web Key Set HTTP response as JSON')],
    ['a timeout', new errors.JWKSTimeout()],
    ['a malformed key set', new errors.JWKSInvalid()],
    ['several matching keys', new errors.JWKSMultipleMatchingKeys()],
  ])('answers 503, not 401, when the signing keys give %s', async (_, error) => {
    const failing: JWTVerifyGetKey = async () => {
      throw error;
    };
    expect(await denied(await authorize(request({ jwt: await token() }), ENV, { getKey: failing }), 503)).toBe('sign-in cannot be verified right now');
  });

  it('answers 401 for a token whose key is not in the key set', async () => {
    const other = createLocalJWKSet({ keys: [] });
    await denied(await authorize(request({ jwt: await token() }), ENV, { getKey: other }), 401);
  });

  it('answers 403 for a signed-in user who is not an owner', async () => {
    await denied(await authorize(request({ jwt: await token({ email: 'guest@example.com' }) }), ENV, { getKey }), 403);
  });

  it('lets an owner in whatever the case of the e-mail', async () => {
    const result = await authorize(request({ jwt: await token({ email: 'Owner@Example.COM' }) }), ENV, { getKey });
    expect(result).toMatchObject({ ok: true, email: OWNER, config: { githubRepo: 'owner/fdm-basket' } });
  });

  it('lets a GET in without Origin', async () => {
    expect((await authorize(request({ jwt: await token() }), ENV, { getKey })).ok).toBe(true);
  });

  it('refuses a POST without Origin or from another origin with 403', async () => {
    const jwt = await token();
    await denied(await authorize(request({ method: 'POST', jwt, type: 'application/json' }), ENV, { getKey }), 403);
    await denied(await authorize(request({ method: 'POST', jwt, type: 'application/json', origin: 'https://evil.example' }), ENV, { getKey }), 403);
    await denied(
      await authorize(request({ method: 'POST', jwt, type: 'application/json', origin: `https://2d20cdd1.${HOST}` }), ENV, { getKey }),
      403,
    );
  });

  it('refuses a POST that is not JSON with 415', async () => {
    const jwt = await token();
    await denied(await authorize(request({ method: 'POST', jwt, origin: `https://${HOST}`, type: 'text/plain' }), ENV, { getKey }), 415);
  });

  it('lets a JSON POST from the admin page in', async () => {
    const jwt = await token();
    const result = await authorize(request({ method: 'POST', jwt, origin: `https://${HOST}`, type: 'application/json; charset=utf-8' }), ENV, { getKey });
    expect(result.ok).toBe(true);
  });
});
