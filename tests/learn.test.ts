import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import config from '../vite.config.ts';
import { isLang, resolveLang } from '../src/i18n/index.ts';
import { backHref, commitBoardLang, isBoardLang, langToRemember, resolveBoardLang, type BoardLang } from '../src/learn/board-lang.ts';
import { MATERIALS } from '../src/learn/materials.ts';
import { BALL_SPOTS, DEF_POS, I18N, OFF_POS } from '../src/learn/zone-board-data.ts';

const BOARD_LANGS: readonly BoardLang[] = ['en', 'it', 'uk'];

// Key paths of a nested dictionary; arrays contribute their length and the keys of every element
function shape(value: unknown, path = ''): string[] {
  if (Array.isArray(value)) return [`${path}[${value.length}]`, ...value.flatMap((v, i) => shape(v, `${path}[${i}]`))];
  if (value !== null && typeof value === 'object') {
    return Object.entries(value).flatMap(([k, v]) => shape(v, path ? `${path}.${k}` : k));
  }
  return [path];
}

function strings(value: unknown, path = ''): [string, unknown][] {
  if (Array.isArray(value)) return value.flatMap((v, i) => strings(v, `${path}[${i}]`));
  if (value !== null && typeof value === 'object') {
    return Object.entries(value).flatMap(([k, v]) => strings(v, path ? `${path}.${k}` : k));
  }
  return [[path, value]];
}

describe('board dictionary', () => {
  it.each(BOARD_LANGS.filter((l) => l !== 'en'))('%s has exactly the key structure of English', (lang) => {
    expect(shape(I18N[lang]).sort()).toEqual(shape(I18N.en).sort());
  });

  it.each(BOARD_LANGS)('%s has only non-empty strings', (lang) => {
    const all = strings(I18N[lang]);
    expect(all.length).toBeGreaterThan(100);
    for (const [path, value] of all) {
      expect(typeof value, `${lang}.${path}`).toBe('string');
      expect((value as string).trim(), `${lang}.${path}`).not.toBe('');
    }
  });

  it('labels the way back in every language', () => {
    expect(I18N.en.backToSection).toBe('Coaching materials');
    expect(I18N.it.backToSection).toBe('Materiali didattici');
    expect(I18N.uk.backToSection).toBe('Навчальні матеріали');
  });
});

describe('board data', () => {
  it('lists every ball spot once', () => {
    const ids = BALL_SPOTS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.length).toBe(7);
  });

  it.each(Object.entries(DEF_POS))('defense %s places five defenders on every ball spot', (_defense, spots) => {
    for (const { id } of BALL_SPOTS) {
      const players = Object.keys(spots[id] ?? {}).sort();
      expect(players, id).toEqual(['D1', 'D2', 'D3', 'D4', 'D5']);
    }
  });

  it.each(Object.entries(OFF_POS))('offense %s places five attackers on every ball spot', (_offense, spots) => {
    for (const { id } of BALL_SPOTS) {
      const players = Object.keys(spots[id] ?? {}).sort();
      expect(players, id).toEqual(['O1', 'O2', 'O3', 'O4', 'O5']);
    }
  });
});

describe('resolveBoardLang', () => {
  it('takes ?lang= first, including Ukrainian', () => {
    expect(resolveBoardLang('?lang=uk', 'it', ['en-US'])).toBe('uk');
  });

  it('ignores an unknown ?lang= and falls back to the saved site language', () => {
    expect(resolveBoardLang('?lang=xx', 'it', ['uk-UA'])).toBe('it');
  });

  it('uses the browser language when nothing is saved (storage blocked)', () => {
    expect(resolveBoardLang('', null, ['uk-UA'])).toBe('uk');
  });

  it('falls back to English for an unsupported browser language', () => {
    expect(resolveBoardLang('', null, ['de-DE'])).toBe('en');
  });

  it('does not accept ?lang=IT, like the site', () => {
    expect(resolveBoardLang('?lang=IT', null, ['de-DE'])).toBe('en');
    expect(resolveLang('?lang=IT', null, ['de-DE'])).toBe('en');
  });

  it('ignores a saved language the site does not offer', () => {
    expect(resolveBoardLang('', 'uk', ['it-IT'])).toBe('it');
  });

  it('recognises board languages only', () => {
    expect(BOARD_LANGS.every(isBoardLang)).toBe(true);
    expect(isBoardLang('de')).toBe(false);
    expect(isBoardLang(undefined)).toBe(false);
  });
});

describe('language persistence', () => {
  it('never saves Ukrainian as the site language', () => {
    expect(langToRemember('uk')).toBeNull();
  });

  it('saves Italian and English as chosen', () => {
    expect(langToRemember('it')).toBe('it');
    expect(langToRemember('en')).toBe('en');
    expect(isLang(langToRemember('it'))).toBe(true);
  });

  it('keeps a foreign saved value from steering the site', () => {
    expect(resolveLang('', 'uk', ['it-IT'])).toBe('it');
  });
});

describe('commitBoardLang', () => {
  function choose(lang: BoardLang, href = 'https://fdm-basket.pages.dev/learn/zone-tactics/?lang=it&x=1#court') {
    const saved: string[] = [];
    const urls: string[] = [];
    commitBoardLang(lang, { href, replaceUrl: (url) => urls.push(url.href), writeSiteLang: (l) => saved.push(l) });
    return { saved, urls };
  }

  it('keeps Ukrainian in the address only', () => {
    const { saved, urls } = choose('uk');
    expect(saved).toEqual([]);
    expect(urls).toEqual(['https://fdm-basket.pages.dev/learn/zone-tactics/?lang=uk&x=1#court']);
  });

  it.each(['it', 'en'] as const)('saves %s as the site language and puts it in the address', (lang) => {
    const { saved, urls } = choose(lang, 'https://fdm-basket.pages.dev/learn/zone-tactics/');
    expect(saved).toEqual([lang]);
    expect(urls).toEqual([`https://fdm-basket.pages.dev/learn/zone-tactics/?lang=${lang}`]);
  });

  // The board starts on page load and cannot be imported here; its only way to the saved language is this function
  it('is the board’s only way to save the site language', () => {
    const board = readFileSync(join(import.meta.dirname, '..', 'src/learn/zone-board.ts'), 'utf8');
    expect(board.match(/writeLang\s*\(/g)).toBeNull();
    expect(board).not.toMatch(/localStorage/);
    expect(board.match(/commitBoardLang\(lang,/g)).toHaveLength(1);
  });
});

describe('backHref', () => {
  it('carries the language the site knows', () => {
    expect(backHref('it')).toBe('/learn/?lang=it');
    expect(backHref('en')).toBe('/learn/?lang=en');
  });

  it('leaves Ukrainian out of the link', () => {
    expect(backHref('uk')).toBe('/learn/');
  });
});

const ROOT = join(import.meta.dirname, '..');
const readText = (path: string) => readFileSync(join(ROOT, path), 'utf8');

// Every index.html under learn/, as repository-relative paths with forward slashes
const learnPages = (): string[] =>
  readdirSync(join(ROOT, 'learn'), { recursive: true, encoding: 'utf8' })
    .map((name) => name.split(/[\\/]/).join('/'))
    .filter((name) => name === 'index.html' || name.endsWith('/index.html'))
    .map((name) => `learn/${name}`);

// Entry points of the Vite build as absolute paths
function buildInputs(): string[] {
  const input: unknown = config.build?.rolldownOptions?.input;
  if (typeof input === 'string') return [resolve(input)];
  if (Array.isArray(input)) return input.map((p) => resolve(String(p)));
  if (input !== null && typeof input === 'object') return Object.values(input).map((p) => resolve(String(p)));
  return [];
}

describe('learning section build inputs', () => {
  it('finds the learn index and the zone tactics page', () => {
    expect(learnPages()).toEqual(expect.arrayContaining(['learn/index.html', 'learn/zone-tactics/index.html']));
  });

  it('lists build inputs', () => {
    expect(buildInputs().length).toBeGreaterThan(0);
  });

  it('gives every material a /learn/ address with a trailing slash', () => {
    expect(MATERIALS.length).toBeGreaterThan(0);
    for (const m of MATERIALS) expect(m.path, m.id).toMatch(/^\/learn\/.+\/$/);
  });

  it('has a page on disk for every material', () => {
    for (const m of MATERIALS) {
      const page = `${m.path.slice(1)}index.html`;
      expect(existsSync(join(ROOT, page)), `${m.id}: ${page}`).toBe(true);
    }
  });

  it('builds every material page as a Vite input', () => {
    const inputs = buildInputs();
    for (const m of MATERIALS) {
      const page = `${m.path.slice(1)}index.html`;
      expect(inputs, `${m.id}: ${page}`).toContain(resolve(ROOT, page));
    }
  });

  it('builds the learn index as a Vite input', () => {
    expect(buildInputs()).toContain(resolve(ROOT, 'learn/index.html'));
  });

  it('gives every material a unique id', () => {
    const ids = MATERIALS.map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('learning materials text', () => {
  it.each(MATERIALS.map((m) => [m.id, m] as const))('%s has a title and summary in Italian and English', (_id, m) => {
    for (const lang of ['it', 'en'] as const) {
      expect(m.text[lang].title.trim(), `${m.id}.${lang}.title`).not.toBe('');
      expect(m.text[lang].summary.trim(), `${m.id}.${lang}.summary`).not.toBe('');
    }
  });

  it.each(MATERIALS.map((m) => [m.id, m] as const))('%s lists its languages as a non-empty, duplicate-free subset of the board languages', (_id, m) => {
    expect(m.langs.length, m.id).toBeGreaterThan(0);
    expect(
      m.langs.filter((lang) => !BOARD_LANGS.includes(lang)),
      m.id,
    ).toEqual([]);
    expect(new Set(m.langs).size, m.id).toBe(m.langs.length);
  });
});

// The pages that must keep to the Content-Security-Policy: no inline scripts or event handlers
const cspPages = (): string[] => ['index.html', 'admin/index.html', ...learnPages()];

// Sources of script-src in public/_headers, e.g. ["'self'", 'https://static.cloudflareinsights.com']
function scriptSources(): string[] {
  const csp = readText('public/_headers')
    .split('\n')
    .find((line) => line.trim().startsWith('Content-Security-Policy:')) ?? '';
  const directive = csp
    .split(';')
    .map((d) => d.trim())
    .find((d) => d.startsWith('script-src '));
  return directive ? directive.split(/\s+/).slice(1) : [];
}

// A script src is allowed when root-relative (not protocol-relative) or https on a host listed in script-src
function scriptSrcAllowed(src: string, hosts: readonly string[]): boolean {
  if (src.startsWith('/') && !src.startsWith('//')) return true;
  try {
    const url = new URL(src);
    return url.protocol === 'https:' && hosts.includes(url.origin);
  } catch {
    return false;
  }
}

describe('learning pages content security policy', () => {
  const sources = scriptSources();

  it('allows scripts from the page origin in script-src', () => {
    expect(sources).toContain("'self'");
  });

  it.each(cspPages())('%s has no inline event-handler attributes', (page) => {
    const found = [...readText(page).matchAll(/\son[a-z]+\s*=/gi)].map((m) => `${page}: ${m[0].trim()}`);
    expect(found).toEqual([]);
  });

  it.each(cspPages())('%s has no inline scripts and only allowed script sources', (page) => {
    const hosts = sources.filter((s) => s.startsWith('https://')).map((s) => new URL(s).origin);
    const found: string[] = [];
    for (const [tag, attrs] of readText(page).matchAll(/<script\b([^>]*)>/gi)) {
      const src = / src\s*=\s*["']([^"']*)["']/i.exec(` ${attrs}`)?.[1];
      if (src === undefined) found.push(`${page}: inline script ${tag.slice(0, 40)}`);
      else if (!scriptSrcAllowed(src, hosts)) found.push(`${page}: script src ${src}`);
    }
    expect(found.length, found.join('; ')).toBe(0);
  });

  it('builds no inline event-handler attributes inside learn scripts', () => {
    const files = readdirSync(join(ROOT, 'src/learn')).filter((name) => name.endsWith('.ts'));
    expect(files.length).toBeGreaterThan(0);
    const found = files.flatMap((name) =>
      [...readText(`src/learn/${name}`).matchAll(/\son[a-z]+=\s*(["'`\\]|\$\{)/gi)].map((m) => `src/learn/${name}: ${m[0]}`),
    );
    expect(found).toEqual([]);
  });
});

describe('learning section markup', () => {
  it('uses no class names that ad blockers hide', () => {
    const files = [
      ...learnPages(),
      ...readdirSync(join(ROOT, 'src/learn')).map((name) => `src/learn/${name}`),
    ].filter((path) => /\.(html|ts|css)$/.test(path));
    expect(files.length).toBeGreaterThan(0);
    const found = files.flatMap((path) =>
      [...readText(path).matchAll(/(?<![\w-])ads?[-_][a-z0-9]+/g)].map((m) => `${path}: ${m[0]}`),
    );
    expect([...new Set(found)]).toEqual([]);
  });
});

// The board reads its actions from a fixed map (it cannot be imported here: it starts on page load),
// so a misspelt data-action would silently leave a control dead
describe('board actions', () => {
  const BOARD_SOURCES = ['learn/zone-tactics/index.html', 'src/learn/zone-board.ts'];
  const actionMap = (): string[] => {
    const body = /const ACTIONS\b[^=]*=\s*\{([^}]*)\}/.exec(readText('src/learn/zone-board.ts'))?.[1] ?? '';
    return body.split(',').map((name) => name.trim()).filter(Boolean);
  };
  const usedActions = (): [string, string][] =>
    BOARD_SOURCES.flatMap((path) =>
      [...readText(path).matchAll(/data-action="([^"]*)"/g)].map((m): [string, string] => [path, m[1]]),
    );

  it('finds the action map and the controls', () => {
    expect(actionMap().length).toBeGreaterThan(5);
    expect(usedActions().length).toBeGreaterThan(5);
  });

  it('runs a known action for every control', () => {
    const known = new Set(actionMap());
    const unknown = usedActions().filter(([, name]) => !known.has(name)).map(([path, name]) => `${path}: ${name}`);
    expect(unknown).toEqual([]);
  });

  it('has a control for every action', () => {
    const used = new Set(usedActions().map(([, name]) => name));
    expect(actionMap().filter((name) => !used.has(name))).toEqual([]);
  });
});
