// The cards, in their usual order: README order when the settings don't say, and the order in
// previews. Adding a card: its folder (index.ts, data.ts, classic.ts, display.ts), its line here,
// setup's copies of its name and alt text (tests/setup-sync.test.ts says where), and the README's
// list of cards and its settings.
import { about } from './about/index.ts';
import { contributions } from './contributions/index.ts';
import { languages } from './languages/index.ts';
import { repos } from './repos/index.ts';
import { streaks } from './streaks/index.ts';
import { summary } from './summary/index.ts';
import { weekly } from './weekly/index.ts';

export const CARD_DEFS = [summary, languages, contributions, weekly, streaks, about, repos] as const;

export type CardDefs = (typeof CARD_DEFS)[number];
/** Each card's settings, by its name: what's under cards: in the settings. */
export type CardSettings = { [D in CardDefs as D['name']]: D['settings'] };
