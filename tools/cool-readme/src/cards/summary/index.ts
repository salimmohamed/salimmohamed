import { ConfigError } from '../../shape.ts';
import type { CardDef } from '../card.ts';
import { summaryData, type SummaryModel } from './data.ts';
import { renderSummary } from './classic.ts';
import { renderDisplaySummary } from './display.ts';

export interface SummarySettings {
  /** Shown small and uppercase on the card's header line; null for none. */
  title: string | null;
  /** What sits inside the activity ring: the percentage, or the GitHub logo (the percentage moves to the header). */
  ring: 'percent' | 'github';
}

export const summary: CardDef<'summary', SummarySettings, SummaryModel> = {
  name: 'summary',
  on: true,
  alt: 'GitHub stats',
  settings: { title: null, ring: 'percent' },
  shape: { title: 'string?', ring: 'string' },
  check: (s) => {
    if (s.ring !== 'percent' && s.ring !== 'github') throw new ConfigError('"cards.summary.ring" must be "percent" or "github"');
  },
  data: summaryData,
  classic: (data, theme, config) => renderSummary(data, theme, config),
  display: (data, style) => renderDisplaySummary(data, style),
};
