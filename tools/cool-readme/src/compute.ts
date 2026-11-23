// What the cards show, worked out from what was collected from GitHub and the settings. Each card
// works out its own (its data.ts), from what they share: which repos count, and notes for you.
import { CARD_DEFS, type CardDefs } from './cards/index.ts';
import type { Config } from './config.ts';
import { repoKey } from './repos.ts';
import type { Snapshot } from './types.ts';

/** What every card's data is worked out from. */
export interface Counted {
  snapshot: Snapshot;
  config: Config;
  /** Your login, in lowercase. */
  login: string;
  /** Whether a repo's work counts: it's known, and the count settings don't leave it out. */
  included: (key: string) => boolean;
  /** The count settings leave some work out: private, or organizations'. */
  filtering: boolean;
  /** The repos a setting names, as keys; a note for each that matched none you contributed to. */
  known: (refs: string[], setting: string) => Set<string>;
  /** Something you should know, e.g. a setting that matched nothing. */
  note: (text: string) => void;
}

/** Each card's data, by its name, and the notes. */
export type Model = { [D in CardDefs as D['name']]: ReturnType<D['data']> } & {
  /** Things the user should know, e.g. config entries that matched nothing. */
  notes: string[];
};

export function compute(snapshot: Snapshot, config: Config): Model {
  const notes: string[] = [];
  const login = snapshot.user.login.toLowerCase();
  const include = config.count;

  const included = (key: string): boolean => {
    const repo = snapshot.repos[key];
    if (!repo) return false;
    if (!include.private && repo.isPrivate) return false;
    if (!include.orgs && repo.ownerIsOrg && snapshot.orgs.includes(repo.owner.toLowerCase())) return false;
    return true;
  };

  const known = (refs: string[], setting: string): Set<string> => {
    const keys = new Set(refs.map((r) => repoKey(r, login)));
    for (const k of keys) if (!snapshot.repos[k]) notes.push(`${setting}: "${k}" matched no repository you contributed to`);
    return keys;
  };

  const counted: Counted = {
    snapshot,
    config,
    login,
    included,
    filtering: !include.private || !include.orgs,
    known,
    note: (text) => notes.push(text),
  };
  // In the cards' order, so the notes are too.
  const data = Object.fromEntries(CARD_DEFS.map((card) => [card.name, card.data(counted)]));
  return { ...data, notes } as Model;
}
