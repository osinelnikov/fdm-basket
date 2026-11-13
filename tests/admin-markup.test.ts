import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = join(import.meta.dirname, '..');
const UI = 'src/admin/ui';
const FILES = ['admin/index.html', ...readdirSync(join(ROOT, UI)).map((name) => `${UI}/${name}`)];

// Ad blockers hide elements whose class names look like ads (".ad-header", ".ad-tile", ...),
// which left the owner with an empty admin page.
describe('admin page markup', () => {
  it('uses no class names that ad blockers hide', () => {
    const found = FILES.flatMap((path) =>
      [...readFileSync(join(ROOT, path), 'utf8').matchAll(/(?<![\w-])ads?[-_][a-z0-9]+/g)].map((m) => `${path}: ${m[0]}`),
    );
    expect([...new Set(found)]).toEqual([]);
  });
});
