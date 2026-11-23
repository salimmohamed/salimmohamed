import { CARD_DEFS, type CardDefs } from '../cards/index.ts';
import { CARDS, type Config } from '../config.ts';
import type { Model } from '../compute.ts';
import { look, type Style } from '../display/dmd.ts';
import { surfaceOf, type Mode } from '../palette.ts';
import { themeFor, type Theme } from './classic.ts';

/**
 * File name -> SVG, one light and one dark variant of each card in `config.show`, in the usual
 * card order. The same names for every style.
 */
export function renderAll(model: Model, config: Config): Record<string, string> {
  const files: Record<string, string> = {};
  const bg = config.look.background;
  const colour = bg.startsWith('#') ? bg : null;
  for (const viewer of ['light', 'dark'] as Mode[]) {
    // On a colour of your own, every viewer sees the same card, in the shades that suit the colour.
    const mode = colour ? surfaceOf(colour) : viewer;
    const theme = themeFor(mode, config.look.color);
    let draw: (card: CardDefs) => string;
    if (config.look.style !== 'classic') {
      // Amber and green go darker only where they'd be on something light: no panel on a light page, or a light colour.
      // "solid" only comes from settings in the layout before v1.5 (legacy.ts): the colour's own panel.
      const l = look(config.look.color, mode, bg === 'solid' || (colour !== null && mode === 'dark'));
      const background = bg === 'none' ? null : bg === 'solid' ? l.panel : colour;
      // dotmatrix and floating: round LEDs, over the unlit ones in dotmatrix; oled: square pixels.
      const dots = config.look.style === 'dotmatrix' || config.look.style === 'floating';
      const style: Style = { look: l, dots, grid: config.look.style === 'dotmatrix', animations: config.look.animations, background };
      draw = (card) => (card.display as (data: unknown, style: Style, config: Config) => string)(model[card.name], style, config);
    } else {
      draw = (card) => (card.classic as (data: unknown, theme: Theme, config: Config) => string)(model[card.name], theme, config);
    }
    for (const card of CARD_DEFS) if (config.show.includes(card.name)) files[`${card.name}-${viewer}.svg`] = draw(card);
  }
  return files;
}

/** The width each card is shown at in a README: 400, so two fit a row. Every card is 450 wide, scaled. */
export function cardWidths(_config: Config): Record<string, number> {
  return Object.fromEntries(CARDS.map((card) => [card, 400]));
}
