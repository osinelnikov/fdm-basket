// Per-viewer convenience only: the page works the same when storage is unavailable.
const KEY = 'fdm-collapsed-months';

export function readCollapsed(): string[] | null {
  try {
    const v: unknown = JSON.parse(localStorage.getItem(KEY) ?? 'null');
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : null;
  } catch {
    return null;
  }
}

export function writeCollapsed(keys: string[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(keys));
  } catch {
    /* storage blocked: nothing to remember */
  }
}
