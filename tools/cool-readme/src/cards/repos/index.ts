import { ConfigError } from '../../shape.ts';
import type { CardDef } from '../card.ts';
import { reposData, type TopRepo } from './data.ts';
import { renderRepos } from './classic.ts';
import { renderDisplayRepos } from './display.ts';

export interface ReposSettings {
  title: string | null;
  /** How many repos: up to MAX_REPOS, the rows that fit on the card. */
  count: number;
  /** Your repos left out, as "repo" or "owner/repo". */
  hide: string[];
}

export const MAX_REPOS = 6;

export const repos: CardDef<'repos', ReposSettings, TopRepo[]> = {
  name: 'repos',
  on: false,
  alt: 'Top repos',
  settings: { title: 'Top repos', count: 6, hide: [] },
  shape: { title: 'string?', count: 'number', hide: 'string[]' },
  check: (s) => {
    if (s.count > MAX_REPOS) throw new ConfigError(`"cards.repos.count" must be at most ${MAX_REPOS}`);
  },
  data: reposData,
  classic: (data, theme, config) => renderRepos(data, theme, config),
  display: (data, style, config) => renderDisplayRepos(data, config.cards.repos.title, style),
};
