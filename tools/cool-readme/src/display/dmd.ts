// Shared pieces of the display cards: a grid of 3px cells, looks (amber, green, GitHub
// colours), the panel with optional round LED dots, and keyframe helpers.

import { PALETTE, THEMES, type Color, type Mode } from '../palette.ts';
import { esc } from '../text.ts';

export const PITCH = 3;

// Every display card is 150 x 73 cells, 450 x 219: the size of every card, classic ones too
// (render/classic.ts).
export const COLS = 150;
export const ROWS = 73;
export const W = COLS * PITCH; // 450
export const H = ROWS * PITCH; // 219
/** The row of the title line at the top of every card. */
export const TITLE_ROW = 3;

export type Cell = [number, number];

export interface Look {
  /** Lit dots. */
  lit: string;
  /** Rings and bars; the lit colour on the LED looks. */
  accent: string;
  /** A brighter tint for the shine that sweeps across text. */
  shine: string;
  /** Opacity of secondary text. */
  dim: number;
  /** Panel behind the dots; null for transparent. */
  panel: string | null;
  /** Unlit dots, shown faintly behind the lit ones. */
  unlit: string;
  unlitOpacity: number;
}

/**
 * The colours of a look. A colour is the same on both themes, like a real display, on its dark
 * panel; without the panel, a light page gets its darker shades. github follows the viewer's theme.
 */
export function look(color: Color, mode: Mode, panel = true): Look {
  if (color !== 'github') {
    const d = PALETTE[color].display;
    return !panel && mode === 'light'
      ? { lit: d.dark, accent: d.dark, shine: d.deep, dim: 0.65, panel: null, unlit: d.dark, unlitOpacity: 0.1 }
      : { lit: d.bright, accent: d.bright, shine: d.shine, dim: 0.55, panel: d.panel, unlit: d.bright, unlitOpacity: d.unlit };
  }
  // github: GitHub's Primer colours, on a transparent background, per light or dark theme.
  const t = THEMES[mode];
  return { lit: t.text, accent: t.accent, shine: t.accent, dim: 0.6, panel: null, unlit: t.border, unlitOpacity: mode === 'light' ? 0.3 : 0.35 };
}

/** Cells grouped into rectangles: neighbouring cells in a row form a run, and identical runs in rows that touch merge. */
interface Rect {
  col: number;
  row: number;
  width: number;
  height: number;
}
function cellRects(cells: Cell[]): Rect[] {
  const rows = new Map<number, Set<number>>();
  for (const [c, r] of cells) {
    if (!rows.has(r)) rows.set(r, new Set());
    rows.get(r)!.add(c);
  }
  // Rectangles still growing downwards, by "first column:width".
  const open = new Map<string, Rect>();
  const done: Rect[] = [];
  for (const r of [...rows.keys()].sort((a, b) => a - b)) {
    const cols = [...rows.get(r)!].sort((a, b) => a - b);
    const seen = new Set<string>();
    for (let i = 0; i < cols.length; ) {
      let j = i;
      while (j + 1 < cols.length && cols[j + 1] === cols[j] + 1) j++;
      const key = `${cols[i]}:${j - i + 1}`;
      const rect = open.get(key);
      if (rect && rect.row + rect.height === r) rect.height++;
      else {
        if (rect) done.push(rect);
        open.set(key, { col: cols[i], row: r, width: j - i + 1, height: 1 });
      }
      seen.add(key);
      i = j + 1;
    }
    // Runs that didn't continue into this row are finished.
    for (const [key, rect] of open) if (!seen.has(key)) (done.push(rect), open.delete(key));
  }
  done.push(...open.values());
  return done.sort((a, b) => a.row - b.row || a.col - b.col);
}

/**
 * Lit cells as solid rectangles. Merging rows into one rectangle keeps bars a single shape:
 * separate strips would leave faint seams where they meet when the card is shown scaled.
 */
export function cellsPath(cells: Cell[]): string {
  return cellRects(cells)
    .map((x) => {
      const w = x.width * PITCH;
      return `M${x.col * PITCH} ${x.row * PITCH}h${w}v${x.height * PITCH}h-${w}z`;
    })
    .join('');
}

/**
 * Lit cells as round LEDs: lines through the cell centres, drawn with round-capped dashes of
 * length zero, one cell apart, so every dash is a circle. Real circles stay sharp in every
 * browser (Safari blurs masks and filters in SVG images), and a whole row is one short command.
 * Each line runs half a cell past its last dot: WebKit drops a dash that sits exactly on the end of
 * a line, and skips lines of length zero (a lone dot).
 */
export function dotsPath(cells: Cell[]): string {
  const c = (n: number) => n * PITCH + PITCH / 2;
  const len = (n: number) => (n - 1) * PITCH + PITCH / 2;
  return cellRects(cells)
    .map((x) => {
      const lines: string[] = [];
      if (x.width >= x.height) for (let r = 0; r < x.height; r++) lines.push(`M${c(x.col)} ${c(x.row + r)}h${len(x.width)}`);
      else for (let k = 0; k < x.width; k++) lines.push(`M${c(x.col + k)} ${c(x.row)}v${len(x.height)}`);
      return lines.join('');
    })
    .join('');
}

export const DOT_SIZE = 2.4; // diameter of an LED, in a 3px cell
const dotted = (stroke: string) =>
  `fill="none" stroke="${stroke}" stroke-width="${DOT_SIZE}" stroke-linecap="round" stroke-dasharray="0 ${PITCH}"`;

/** Cells in `fill`, as the style draws them: round LEDs (dot matrix) or square pixels (OLED). */
export function path(style: Style, cells: Cell[], fill: string, attrs = ''): string {
  if (!cells.length) return '';
  if (!style.dots) return `<path d="${cellsPath(cells)}" fill="${fill}"${attrs ? ' ' + attrs : ''}/>`;
  const a = attrs.replace(/fill-opacity=/g, 'stroke-opacity=');
  return `<path d="${dotsPath(cells)}" ${dotted(fill)}${a ? ' ' + a : ''}/>`;
}

/** Solid cells for masks (the sparkle), whatever the dots look like. */
export function maskPath(cells: Cell[]): string {
  return cells.length ? `<path d="${cellsPath(cells)}" fill="#fff"/>` : '';
}

/** Cells of a ring of the given outer radius and thickness, all in cells. */
export function ringCells(cx: number, cy: number, outer: number, thickness: number): Cell[] {
  const cells: Cell[] = [];
  for (let r = Math.floor(cy - outer); r <= Math.ceil(cy + outer); r++) {
    for (let c = Math.floor(cx - outer); c <= Math.ceil(cx + outer); c++) {
      const d = Math.hypot(c + 0.5 - cx, r + 0.5 - cy);
      if (d <= outer && d > outer - thickness) cells.push([c, r]);
    }
  }
  return cells;
}

/** A keyframes rule on a shared timeline of `total` seconds; times in seconds. */
export function keyframes(name: string, total: number, frames: { t: number; css: string; ease?: string }[]): string {
  const sorted = [...frames].sort((a, b) => a.t - b.t);
  const pct = (t: number) => `${Math.min(100, Math.max(0, (t / total) * 100)).toFixed(3)}%`;
  const body = sorted.map((f) => `${pct(f.t)} { ${f.css}${f.ease ? ` animation-timing-function: ${f.ease};` : ''} }`).join(' ');
  return `\n  @keyframes ${name} { ${body} }`;
}

/** How a display card is drawn. */
export interface Style {
  look: Look;
  /** Round LED dots; otherwise the cells are drawn as solid square pixels. */
  dots: boolean;
  /** With round dots: the faint unlit ones in every cell, behind the lit ones. */
  grid: boolean;
  animations: boolean;
  /** The fill behind the dots; null for none, so the page shows through. */
  background: string | null;
}

export interface FrameOptions {
  title: string;
  desc: string;
  look: Look;
  dots: boolean;
  grid: boolean;
  animations: boolean;
  background: string | null;
  css: string;
  body: string;
}

export function frame(o: FrameOptions): string {
  const { look: l } = o;
  const panel = o.background ? `<rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="8" fill="${o.background}"/>` : '';
  // The unlit LEDs: one dotted line per row, faint. No masks or filters: Safari blurs those in images.
  let unlit = '';
  if (o.dots && o.grid) {
    const rows: string[] = [];
    for (let y = PITCH / 2; y < H; y += PITCH) rows.push(`M${PITCH / 2} ${y}h${(COLS - 1) * PITCH + PITCH / 2}`);
    unlit = `<path d="${rows.join('')}" ${dotted(l.unlit)} stroke-opacity="${l.unlitOpacity}"/>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" fill="none" role="img" aria-labelledby="title desc">
<title id="title">${esc(o.title)}</title>
<desc id="desc">${esc(o.desc)}</desc>
<style>${o.animations ? o.css : ''}
  @media (prefers-reduced-motion: reduce) { * { animation: none !important; } }
</style>
${panel}
${unlit}
${o.body}
</svg>
`;
}
