// Per-viewer conveniences only: the page works the same when storage is unavailable.
const MONTHS_KEY = 'fdm-collapsed-months';
const LANG_KEY = 'fdm-lang';

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* storage blocked: nothing to remember */
  }
}

export function readCollapsed(): string[] | null {
  try {
    const v: unknown = JSON.parse(read(MONTHS_KEY) ?? 'null');
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : null;
  } catch {
    return null;
  }
}

export const writeCollapsed = (keys: string[]): void => write(MONTHS_KEY, JSON.stringify(keys));
export const readLang = (): string | null => read(LANG_KEY);
export const writeLang = (lang: string): void => write(LANG_KEY, lang);
