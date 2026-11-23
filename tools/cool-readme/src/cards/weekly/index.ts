import type { CardDef } from '../card.ts';
import { weeklyData, type WeekdayItem } from './data.ts';
import { renderWeekly } from './classic.ts';
import { renderDisplayWeekly } from './display.ts';

export interface WeeklySettings {
  title: string | null;
}

export const weekly: CardDef<'weekly', WeeklySettings, WeekdayItem[]> = {
  name: 'weekly',
  on: true,
  alt: 'Weekly rhythm',
  settings: { title: 'Weekly rhythm' },
  shape: { title: 'string?' },
  data: weeklyData,
  classic: (data, theme, config) => renderWeekly(data, theme, config),
  display: (data, style, config) => renderDisplayWeekly(data, config.cards.weekly.title, style),
};
