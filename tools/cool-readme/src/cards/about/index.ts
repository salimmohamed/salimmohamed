import type { CardDef } from '../card.ts';
import { renderAbout } from './classic.ts';
import { renderDisplayAbout } from './display.ts';

export interface AboutSettings {
  title: string | null;
  /** Shown large; null for none. */
  headline: string | null;
  /** Each is one line of text: they are not wrapped. More than fit scroll past, like the contributions. */
  lines: string[];
  /** Label -> text, one per line under the lines, scrolling with them. */
  facts: Record<string, string>;
}

export const about: CardDef<'about', AboutSettings, null> = {
  name: 'about',
  on: false,
  alt: 'About',
  settings: { title: 'About', headline: null, lines: [], facts: {} },
  shape: { title: 'string?', headline: 'string?', lines: 'string[]', facts: 'strings' },
  // Its text is in its settings: nothing to work out.
  data: () => null,
  classic: (_data, theme, config) => renderAbout(theme, config),
  display: (_data, style, config) => renderDisplayAbout(config.cards.about, style),
};
