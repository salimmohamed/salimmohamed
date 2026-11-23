import type { CardDef } from '../card.ts';
import { streaksData, type StreaksData } from './data.ts';
import { renderStreaks } from './classic.ts';
import { renderDisplayStreaks } from './display.ts';

export interface StreaksSettings {
  title: string | null;
}

export const streaks: CardDef<'streaks', StreaksSettings, StreaksData> = {
  name: 'streaks',
  on: false,
  alt: 'Streaks',
  settings: { title: 'Streaks' },
  shape: { title: 'string?' },
  data: streaksData,
  classic: (data, theme, config) => renderStreaks(data.tiles, data.days, theme, config),
  display: (data, style, config) => renderDisplayStreaks(data.tiles, data.days, config.cards.streaks.title, style),
};
