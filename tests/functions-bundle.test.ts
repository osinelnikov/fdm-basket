import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = join(import.meta.dirname, '..');

function sources(dir: string): string[] {
  return readdirSync(join(ROOT, dir), { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return sources(path);
    return /\.(ts|mts|js|mjs)$/.test(entry.name) ? [path] : [];
  });
}

// Cloudflare Pages bundles functions/ (and everything it imports from src/) with the esbuild of its own
// wrangler 3, which rejects import attributes such as `with { type: 'json' }`: the whole deployment fails.
describe('code bundled into Pages Functions', () => {
  it('uses no import attributes', () => {
    const offenders = [...sources('src'), ...sources('functions')].filter((path) =>
      /\bfrom\s+['"][^'"]+['"]\s+(with|assert)\s*\{/.test(readFileSync(join(ROOT, path), 'utf8')),
    );
    expect(offenders.map((path) => relative(ROOT, join(ROOT, path)))).toEqual([]);
  });
});
