import type { TextItem } from './text.ts';

// Items whose baselines differ by no more than this belong to one row.
const ROW_TOLERANCE = 1.5;

export interface Row {
  y: number;
  items: TextItem[];
}

/** A table column: centre of its header token and the x range of the cells that belong to it. */
export interface Column {
  key: string;
  center: number;
  lo: number;
  hi: number;
}

export function fail(message: string): never {
  throw new Error(message);
}

export function int(text: string, what: string): number {
  if (!/^-?\d+$/.test(text)) fail(`${what}: "${text}" is not an integer`);
  // Adding zero turns "-0" into 0: JSON has no negative zero.
  return Number(text) + 0;
}

export function decimal(text: string, what: string, digits: number): void {
  if (!new RegExp(`^-?\\d+,\\d{${digits}}$`).test(text)) fail(`${what}: "${text}" is not a decimal with ${digits} digit(s)`);
}

/** Items grouped into rows by y, top to bottom, each row left to right. */
export function rowsOf(items: TextItem[]): Row[] {
  const rows: Row[] = [];
  for (const item of [...items].sort((a, b) => b.y - a.y)) {
    const row = rows[rows.length - 1];
    if (row && Math.abs(row.y - item.y) <= ROW_TOLERANCE) row.items.push(item);
    else rows.push({ y: item.y, items: [item] });
  }
  for (const row of rows) row.items.sort((a, b) => a.x - b.x);
  return rows;
}

/** Whitespace-separated words of the items, each with the x of its centre inside the item. */
export function wordCenters(items: TextItem[]): { str: string; center: number }[] {
  const tokens: { str: string; center: number }[] = [];
  for (const item of items) {
    for (const m of item.str.matchAll(/\S+/g)) {
      tokens.push({ str: m[0], center: item.x + item.w * ((m.index + m[0].length / 2) / item.str.length) });
    }
  }
  return tokens;
}

/** Sets the x range of every column: halfway to the neighbours, `edgeWidth` beyond the outer centres. */
export function setColumnBounds(columns: Column[], edgeWidth: number): void {
  columns.forEach((c, i) => {
    c.lo = i === 0 ? c.center - edgeWidth : (columns[i - 1].center + c.center) / 2;
    c.hi = i === columns.length - 1 ? c.center + edgeWidth : (c.center + columns[i + 1].center) / 2;
  });
}

/** The column whose range contains the centre of the item. */
export function columnAt(columns: Column[], item: TextItem): Column | undefined {
  const center = item.x + item.w / 2;
  return columns.find((c) => center >= c.lo && center <= c.hi);
}

/** Whether the item stays inside the column range, give or take `slack` on either side. */
export function fitsColumn(column: Column, item: TextItem, slack: number): boolean {
  return !(item.x < column.lo - slack || item.x + item.w > column.hi + slack);
}
