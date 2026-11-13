import { GitHubDataStore } from '../../../src/admin/github-datastore.ts';
import { authorize, type Env } from '../../_lib/auth.ts';
import { handleAdminRequest, romeToday } from '../../_lib/handlers.ts';
import { failure } from '../../_lib/respond.ts';

/** The part of the Pages Functions context the admin API uses. */
interface PagesContext {
  request: Request;
  env: Env;
}

/** Every request under /api/admin: signed-in owners only, data kept in the GitHub repository. */
export async function onRequest(context: PagesContext): Promise<Response> {
  try {
    const auth = await authorize(context.request, context.env);
    if (!auth.ok) return auth.response;
    const store = new GitHubDataStore({ token: auth.config.githubToken, repo: auth.config.githubRepo, branch: 'main' });
    return await handleAdminRequest(context.request, { email: auth.email }, { store, today: () => romeToday() });
  } catch (error) {
    console.error(`admin: unexpected error - ${error instanceof Error ? error.name : 'unknown'}`);
    return failure(500, 'internal error');
  }
}
