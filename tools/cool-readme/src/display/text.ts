// Text on a display: cut to fit, and the card's title on the title line.

import { textCells, textWidth } from './font.ts';
import { COLS, TITLE_ROW, path, type Style } from './dmd.ts';

/** Text cut to fit `cols` cells of the dot font. */
export function fit(text: string, cols: number): string {
  let out = text;
  while (out.length > 1 && textWidth(out) > cols) out = out.slice(0, -1);
  return out;
}

/** A card title on the title line, in the dim colour. */
export function titleLine(title: string | null, style: Style): string {
  const { look } = style;
  return title ? path(style, textCells(fit(title.toUpperCase(), COLS - 8), 4, TITLE_ROW), look.lit, `fill-opacity="${look.dim}"`) : '';
}
