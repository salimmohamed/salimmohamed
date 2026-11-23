// Settings in the layout from before v1.5: everything at the top, the cards as a list, the look
// spread over several keys. Still read, so a profile set up then and never touched again keeps
// working on v1; running setup again moves them to the new layout (setup/migrate.sh).
//
// Frozen: the cards here are the six there were then, whatever cards there are now. Nothing outside
// this file knows the old layout: a v2 would delete it, and setup/migrate.sh.
import type { Document } from 'yaml';
import type { Config } from './config.ts';
import { ConfigError, background, check, emptyMappings, isMap, type Raw, type Shape } from './shape.ts';

/** The cards there were before v1.5. */
export const OLD_CARDS = ['summary', 'languages', 'contributions', 'weekly', 'streaks', 'about'];

/** The layout before v1.5, still read: everything at the top, the look spread over several keys. */
export const OLD_SHAPE: Shape = {
  user: 'string?',
  cards: 'string[]',
  style: 'string',
  matrix: 'boolean',
  color: 'string',
  background: 'string',
  transparent: 'boolean',
  include: { private: 'boolean', orgs: 'boolean' },
  theme: { background: 'string', border: 'boolean', animations: 'boolean' },
  summary: { title: 'string?', ring: 'string' },
  languages: { title: 'string?', count: 'number', exclude: 'string[]', excludeRepos: 'string[]', repoWeights: 'weights', other: 'boolean' },
  contributions: { title: 'string?', count: 'number', includeOpen: 'boolean', pin: 'string[]', hide: 'string[]' },
  weekly: { title: 'string?' },
  streaks: { title: 'string?' },
  about: { title: 'string?', headline: 'string?', lines: 'string[]', facts: 'strings' },
};

export const OLD_KEYS = ['style', 'matrix', 'color', 'background', 'transparent', 'include', 'theme', 'summary', 'languages', 'contributions', 'weekly', 'streaks', 'about'];

/** The keys that mark settings as in the old layout; none for the new one. */
export function oldKeys(raw: Raw): string[] {
  // The old layout had everything at the top, and the cards as a list.
  return OLD_KEYS.filter((k) => k in raw).concat(Array.isArray(raw.cards) ? ['cards'] : []);
}

/** Settings in the layout before v1.5, moved to the new one: the same cards, looking the same. */
export function fromOld(o: Raw, doc: Document): Raw {
  emptyMappings(o, OLD_SHAPE);
  if ('background' in o) o.background = background(doc.get('background', true), 'background');
  check(o, OLD_SHAPE, '');
  const theme = (o.theme ?? {}) as Raw;
  const style = o.style ?? 'classic';
  if (style !== 'classic' && style !== 'oled') throw new ConfigError('"style" must be "classic" or "oled"');
  if (theme.background !== undefined && theme.background !== 'transparent' && theme.background !== 'solid') {
    throw new ConfigError('"theme.background" must be "transparent" or "solid"');
  }
  const look: Raw = {
    // oled was round LEDs unless matrix was false: now the dotmatrix style, and oled is the square pixels.
    style: style === 'oled' ? (o.matrix === false ? 'oled' : 'dotmatrix') : 'classic',
    // The displays were amber unless set; color: theme is github's old name.
    color: o.color === 'theme' ? 'github' : (o.color ?? (style === 'oled' ? 'amber' : 'github')),
    // Before background: the displays' dark panel unless transparent, GitHub's page colour behind classic if solid.
    background: o.background ?? ((style === 'oled' ? o.transparent === false : theme.background === 'solid') ? 'solid' : 'none'),
  };
  if (theme.animations !== undefined) look.animations = theme.animations;
  if (theme.border !== undefined) look.border = theme.border;
  const out: Raw = { look };
  if ('user' in o) out.user = o.user;
  if ('cards' in o) out.show = o.cards;
  if ('include' in o) out.count = o.include;
  const cards: Raw = {};
  for (const card of ['summary', 'weekly', 'streaks', 'about']) if (card in o) cards[card] = o[card];
  if (isMap(o.languages)) {
    const { exclude, excludeRepos, repoWeights, ...rest } = o.languages;
    // Left out was the same as a weight of 0.
    const repos = { ...((repoWeights as Raw) ?? {}), ...Object.fromEntries(((excludeRepos as string[]) ?? []).map((r) => [r, 0])) };
    cards.languages = { ...rest, ...(exclude ? { hide: exclude } : {}), ...(excludeRepos || repoWeights ? { repos } : {}) };
  }
  if (isMap(o.contributions)) {
    const { includeOpen, ...rest } = o.contributions;
    cards.contributions = { ...rest, ...(includeOpen !== undefined ? { open: includeOpen } : {}) };
  }
  if (Object.keys(cards).length) out.cards = cards;
  return out;
}


const OLD_LAYOUT = new WeakSet<Config>();
/** Settings read from a file in the old layout: they still work, and setup moves them to the new one. */
export const usesOldLayout = (config: Config): boolean => OLD_LAYOUT.has(config);
export const markOld = (config: Config): void => void OLD_LAYOUT.add(config);
