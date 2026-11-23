// What every classic card shares: its colours, its size and frame, the header line, text measured in
// the card font, and the animations: fading in and scrolling a page at a time.
import type { Config } from '../config.ts';
import { H, W } from '../display/dmd.ts';
import { PALETTE, THEMES, type Color, type Mode, type Theme } from '../palette.ts';
import { esc, marked } from '../text.ts';
import { MONO_BOLD, MONO_REGULAR } from './font-data.ts';

export type { Theme } from '../palette.ts';

/** The classic cards' colours for a mode, in `color`: github leaves GitHub's own. */
export function themeFor(mode: Mode, color: Color): Theme {
  if (color === 'github') return THEMES[mode];
  const tint = PALETTE[color].classic[mode];
  // A colour's marked words are in its highlight, which reads as text on either page.
  return { ...THEMES[mode], ...tint, emphasis: tint.highlight };
}

// Every card is a W x H file, 450 x 219 like the displays, and is shown 400 wide in a README, so two
// fill a profile's 800px. The classic cards are drawn on 400 x 195, the same shape: shown 400 wide,
// their text is at its real size, not scaled down. Every card has the same header line: small
// uppercase text (a title, column names) at HEADER_Y, with the content starting at CONTENT_TOP.
export const WIDTH = 400;
export const CARD_HEIGHT = 195;
export const PAD = 20;
export const HEADER_Y = 28;
export const CONTENT_TOP = 46;

// Font sizes, the same on every card: main text, secondary text, header line.
export const TEXT = 14;
export const SMALL = 12;
export const CAPS = 11;

/** Small uppercase text on the header line, e.g. a card title or a column name. */
export function headerText(text: string, x: number, anchor: 'start' | 'middle' | 'end' = 'start'): string {
  return `<text x="${x}" y="${HEADER_Y}" class="col"${anchor === 'start' ? '' : ` text-anchor="${anchor}"`}>${esc(text.toLowerCase())}</text>`;
}

export const FONT = `'CardMono', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace`;

/** Rough text width for the card fonts, to truncate long names. */
export function textWidth(s: string, fontSize: number, bold = false): number {
  return s.length * fontSize * 0.602; // monospace: every glyph is the same width
}

export function truncate(s: string, maxWidth: number, fontSize: number, bold = false): string {
  if (textWidth(s, fontSize, bold) <= maxWidth) return s;
  let out = s;
  while (out.length > 1 && textWidth(`${out}…`, fontSize, bold) > maxWidth) out = out.slice(0, -1);
  return `${out}…`;
}

/**
 * Text wrapped by words into rows that `fits`, each row with its own marks, so a marked phrase
 * split over two rows is marked on both. A word longer than a row gets one to itself.
 */
export function wrapMarked(text: string, fits: (row: string) => boolean): string[] {
  const chars: { ch: string; mark: boolean }[] = [];
  for (const part of marked(text.trim().replace(/\s+/g, ' '))) for (const ch of part.text) chars.push({ ch, mark: part.mark });
  const plain = chars.map((c) => c.ch).join('');
  // Rows as [start, end) in plain, broken at spaces.
  const rows: [number, number][] = [];
  let start = 0;
  let end = 0;
  for (const word of plain.matchAll(/\S+/g)) {
    const wordEnd = word.index + word[0].length;
    if (end > start && !fits(plain.slice(start, wordEnd))) {
      rows.push([start, end]);
      start = word.index;
    }
    end = wordEnd;
  }
  if (end > start) rows.push([start, end]);
  // Each row's text again, with * around its marked runs.
  return rows.map(([from, to]) => {
    let out = '';
    for (let i = from; i < to; i++) {
      const c = chars[i];
      if (c.mark && (i === from || !chars[i - 1].mark)) out += '*';
      out += c.ch;
      if (c.mark && (i === to - 1 || !chars[i + 1].mark)) out += '*';
    }
    return out;
  });
}

/** A text element's content: the text cut to fit like `truncate`, its marked parts in `colour`. */
export function markedText(text: string, maxWidth: number, fontSize: number, colour: string, bold = false): string {
  const parts = marked(text);
  const whole = parts.map((p) => p.text).join('');
  const cut = truncate(whole, maxWidth, fontSize, bold);
  let left = cut === whole ? whole.length : cut.length - 1; // the characters that stay, before the …
  let out = '';
  for (const p of parts) {
    if (left <= 0) break;
    const t = esc(p.text.slice(0, left));
    left -= p.text.length;
    out += p.mark ? `<tspan fill="${colour}">${t}</tspan>` : t;
  }
  return cut === whole ? out : `${out}…`;
}

const ANIMATIONS = `
  .fade { animation: fade 0.45s ease-out both; }
  .grow { transform-box: fill-box; transform-origin: left center; animation: grow 0.9s cubic-bezier(.2,.7,.2,1) 0.15s both; }
  .ring { animation: ring 1.2s cubic-bezier(.2,.7,.2,1) 0.2s both; }
  .pop { transform-box: fill-box; transform-origin: center; animation: pop 0.4s ease-out 0.5s both; }
  @keyframes fade { from { opacity: 0; transform: translateY(4px); } }
  @keyframes grow { from { transform: scaleX(0); } }
  @keyframes pop { from { opacity: 0; transform: scale(0.6); } }
  @media (prefers-reduced-motion: reduce) { * { animation: none !important; } }`;

export interface CardOptions {
  title: string;
  desc: string;
  theme: Theme;
  config: Config;
  /** Extra CSS, e.g. the ring keyframes that depend on the data. */
  css?: string;
  body: string;
}

export function card(o: CardOptions): string {
  const { theme: t, config } = o;
  // "solid" only comes from settings in the layout before v1.5 (legacy.ts): GitHub's page colour, the viewer's.
  const bg = config.look.background === 'none' ? 'none' : config.look.background === 'solid' ? t.background : config.look.background;
  const stroke = config.look.border ? t.border : 'none';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${WIDTH} ${CARD_HEIGHT}" fill="none" role="img" aria-labelledby="title desc">
<title id="title">${esc(o.title)}</title>
<desc id="desc">${esc(o.desc)}</desc>
<style>
  @font-face { font-family: 'CardMono'; font-weight: 400; src: url(data:font/woff2;base64,${MONO_REGULAR}) format('woff2'); }
  @font-face { font-family: 'CardMono'; font-weight: 700; src: url(data:font/woff2;base64,${MONO_BOLD}) format('woff2'); }
  text { font-family: ${FONT}; fill: ${t.text}; }
  .label { font-size: ${TEXT}px; }
  .value { font-size: ${TEXT}px; font-weight: 600; font-variant-numeric: tabular-nums; }
  .small { font-size: ${SMALL}px; }
  .col { font-size: ${CAPS + 1}px; fill: ${t.muted}; }
  .secondary { fill: ${t.secondary}; }
  .muted { fill: ${t.muted}; }
  .icon { fill: ${t.secondary}; }${config.look.animations ? ANIMATIONS : ''}${o.css ?? ''}
</style>
<rect x="0.5" y="0.5" width="${WIDTH - 1}" height="${CARD_HEIGHT - 1}" rx="6" fill="${bg}" stroke="${stroke}"/>
${o.body}
</svg>
`;
}

/** How long a page of a scrolling list stays in view, and how long it takes to scroll to the next. */
export const PAGE_HOLD = 3.5;
export const PAGE_MOVE = 0.8;

/** Scroll offsets of the pages of `count` rows, `visible` at a time; the last page is moved up so it's full. */
export function pageOffsets(count: number, visible: number, row: number): number[] {
  const offsets = [0];
  for (let first = visible; offsets.at(-1)! < (count - visible) * row; first += visible) {
    offsets.push(Math.min(first, count - visible) * row);
  }
  return offsets;
}

/** CSS for `.name`: hold each page, scroll to the next, and from the last back to the top. */
export function scrolling(name: string, offsets: number[]): string {
  const step = PAGE_HOLD + PAGE_MOVE;
  const seconds = offsets.length * step;
  const pct = (t: number) => `${((t / seconds) * 100).toFixed(2)}%`;
  const frames = offsets.map((y, i) => `${pct(i * step)}, ${pct(i * step + PAGE_HOLD)} { transform: translateY(-${y}px); }`);
  frames.push('100% { transform: translateY(0); }');
  return `\n  .${name} { animation: ${name} ${seconds}s ease-in-out infinite; }\n  @keyframes ${name} { ${frames.join(' ')} }`;
}

/** Staggered fade-in wrapper; the transform lives on an outer group so CSS can animate the inner one. */
export function fadeIn(x: number, y: number, index: number, content: string, config: Config, step = 90): string {
  const delay = config.look.animations ? ` style="animation-delay: ${200 + index * step}ms"` : '';
  return `<g transform="translate(${x} ${y})"><g class="fade"${delay}>${content}</g></g>`;
}
