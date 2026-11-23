// The top repos card's entries: your public repos with the most stars.
import type { Counted } from '../../compute.ts';

export interface TopRepo {
  /** Its name, without your login. */
  name: string;
  stars: number;
  /** Stars it gained in the last 12 months (and still has). */
  recent: number;
  /** Its main language, when known: only for repos you committed to. */
  language: { name: string; color: string | null } | null;
}

export function reposData({ snapshot, config, known }: Counted): TopRepo[] {
  const s = config.cards.repos;
  const hidden = known(s.hide, 'cards.repos.hide');
  // Public ones only, whatever the count settings say: the card would put a private repo's name on
  // your profile. Forks are left out: their stars are mostly the original's.
  return snapshot.ownedRepos
    .filter((key) => {
      const r = snapshot.repos[key];
      return r && !r.isPrivate && !r.isFork && r.stars > 0 && !hidden.has(key);
    })
    .map((key) => [key, snapshot.repos[key]] as const)
    .sort(([, a], [, b]) => b.stars - a.stars || a.nameWithOwner.localeCompare(b.nameWithOwner))
    .slice(0, s.count)
    .map(([key, r]) => {
      const main = [...r.languages].sort((a, b) => b.size - a.size)[0];
      return {
        name: r.nameWithOwner.split('/')[1],
        stars: r.stars,
        recent: snapshot.recentStars[key] ?? 0,
        language: main ? { name: main.name, color: main.color } : null,
      };
    });
}
