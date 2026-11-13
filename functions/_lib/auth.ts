import { createRemoteJWKSet, errors, jwtVerify, type JWTVerifyGetKey } from 'jose';
import { failure } from './respond.ts';

/** Pages environment variables and secrets of the admin area. */
export interface Env {
  /** The production host the Access application protects, e.g. 'fdm-basket.pages.dev'. */
  ADMIN_HOST?: string;
  /** Cloudflare Access team domain, e.g. 'fdm-basket.cloudflareaccess.com'. */
  ACCESS_TEAM_DOMAIN?: string;
  /** Application Audience (AUD) tag of the Access application. */
  ACCESS_AUD?: string;
  /** Comma-separated e-mail addresses allowed to change the data. */
  ADMIN_EMAILS?: string;
  /** Fine-grained GitHub token with write access to the repository contents. */
  GITHUB_TOKEN?: string;
  /** 'owner/name' of the repository the site is built from. */
  GITHUB_REPO?: string;
}

export interface AdminConfig {
  adminHost: string;
  teamDomain: string;
  audience: string;
  adminEmails: string[];
  githubToken: string;
  githubRepo: string;
}

export type Authorization = { ok: true; email: string; config: AdminConfig } | { ok: false; response: Response };

export interface AuthDeps {
  /** Resolves the Access signing key; by default the team's published certificates. */
  getKey?: JWTVerifyGetKey;
}

/** The whole configuration, or nothing when any part is missing or malformed: the admin area then stays closed. */
export function readConfig(env: Env): AdminConfig | undefined {
  const value = (v: string | undefined) => (typeof v === 'string' ? v.trim() : '');
  const adminHost = value(env.ADMIN_HOST).toLowerCase();
  const teamDomain = value(env.ACCESS_TEAM_DOMAIN).toLowerCase();
  const audience = value(env.ACCESS_AUD);
  const adminEmails = value(env.ADMIN_EMAILS)
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter((e) => e.length > 0);
  const githubToken = value(env.GITHUB_TOKEN);
  const githubRepo = value(env.GITHUB_REPO);
  if (!/^[a-z0-9.-]+$/.test(adminHost)) return undefined;
  if (!/^[a-z0-9-]+\.cloudflareaccess\.com$/.test(teamDomain)) return undefined;
  if (!audience || adminEmails.length === 0 || !githubToken) return undefined;
  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(githubRepo)) return undefined;
  return { adminHost, teamDomain, audience, adminEmails, githubToken, githubRepo };
}

// One key set per team, kept for the life of the isolate so the certificates are not fetched on every request.
const remoteKeys = new Map<string, JWTVerifyGetKey>();

function teamKeys(teamDomain: string): JWTVerifyGetKey {
  const url = `https://${teamDomain}/cdn-cgi/access/certs`;
  let keys = remoteKeys.get(url);
  if (!keys) {
    keys = createRemoteJWKSet(new URL(url));
    remoteKeys.set(url, keys);
  }
  return keys;
}

/** Errors about the token itself, as opposed to the certificates it is checked against. */
const TOKEN_ERRORS = [
  errors.JWSSignatureVerificationFailed,
  errors.JWTClaimValidationFailed,
  errors.JWTExpired,
  errors.JWSInvalid,
  errors.JWTInvalid,
  errors.JWKSNoMatchingKey,
  errors.JOSEAlgNotAllowed,
  errors.JOSENotSupported,
];

/**
 * Lets a request through only when it comes from an allowed owner through Cloudflare Access on the
 * production host. Access already stands in front of the admin paths; the token is checked again here
 * because preview deployments and direct calls are not covered by Access.
 */
export async function authorize(request: Request, env: Env, deps: AuthDeps = {}): Promise<Authorization> {
  const deny = (status: number, error: string): Authorization => ({ ok: false, response: failure(status, error) });

  const config = readConfig(env);
  if (!config) return deny(503, 'the admin area is not configured');

  if (new URL(request.url).host !== config.adminHost) return deny(403, 'forbidden');

  const token = request.headers.get('Cf-Access-Jwt-Assertion');
  if (!token) return deny(401, 'not signed in');

  let email: unknown;
  try {
    const { payload } = await jwtVerify(token, deps.getKey ?? teamKeys(config.teamDomain), {
      algorithms: ['RS256'],
      issuer: `https://${config.teamDomain}`,
      audience: config.audience,
      // Access tokens always expire; one without an expiry is not accepted.
      requiredClaims: ['exp'],
    });
    email = payload.email;
  } catch (error) {
    // A valid sign-in to another Access application of the team.
    if (error instanceof errors.JWTClaimValidationFailed && error.claim === 'aud') return deny(403, 'forbidden');
    // Only a token that fails verification means the owner has to sign in again.
    if (TOKEN_ERRORS.some((type) => error instanceof type)) return deny(401, 'not signed in');
    // Anything else, e.g. certificates that could not be fetched or read: nothing can be verified right now.
    return deny(503, 'sign-in cannot be verified right now');
  }

  if (typeof email !== 'string' || !config.adminEmails.includes(email.trim().toLowerCase())) return deny(403, 'forbidden');

  if (request.method !== 'GET') {
    // Changes come only from the admin page itself.
    if (request.headers.get('Origin') !== `https://${config.adminHost}`) return deny(403, 'forbidden');
    const type = (request.headers.get('Content-Type') ?? '').toLowerCase();
    if (!type.startsWith('application/json')) return deny(415, 'expected application/json');
  }

  return { ok: true, email: email.trim().toLowerCase(), config };
}
