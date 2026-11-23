import type { CardDef } from '../card.ts';
import { contributionsData, type ContributionItem } from './data.ts';
import { renderContributions } from './classic.ts';
import { renderDisplayContributions } from './display.ts';

export interface ContributionsSettings {
  title: string | null;
  /** How many repos to show; 3 are in view at a time, the rest scroll past in a loop. */
  count: number;
  /** Count open pull requests too, not only merged ones. */
  open: boolean;
  /** Shown before the others, if they have a merged (or open) pull request of yours. */
  pin: string[];
  hide: string[];
}

export const contributions: CardDef<'contributions', ContributionsSettings, ContributionItem[]> = {
  name: 'contributions',
  on: true,
  alt: 'Notable contributions',
  settings: { title: 'Notable contributions', count: 6, open: true, pin: [], hide: [] },
  shape: { title: 'string?', count: 'number', open: 'boolean', pin: 'string[]', hide: 'string[]' },
  data: contributionsData,
  classic: (data, theme, config) => renderContributions(data, theme, config),
  display: (data, style, config) => renderDisplayContributions(data, config.cards.contributions.title, style),
};
