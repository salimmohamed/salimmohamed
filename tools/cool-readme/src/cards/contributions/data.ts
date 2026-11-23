// The contributions card's entries: the public projects of others you contributed to, by stars.
import type { Counted } from '../../compute.ts';

export interface ContributionItem {
  repo: string;
  owner: string;
  stars: number;
  avatar: string | null;
  merged: number;
  open: number;
  /** ISO date of the latest merge, or of the latest opened pull request if none merged. */
  lastDate: string;
}

export function contributionsData({ snapshot, config, login, known, note }: Counted): ContributionItem[] {
  // Notable contributions: merged (and optionally open) pull requests to public repos of other
  // people and organizations. Pull requests closed without merging never count.
  const cc = config.cards.contributions;
  const pins = known(cc.pin, 'cards.contributions.pin');
  const hidden = known(cc.hide, 'cards.contributions.hide');
  const outside = snapshot.pullRequests.filter((a) => {
    if (hidden.has(a.repo)) return false;
    if (a.state !== 'MERGED' && !(a.state === 'OPEN' && cc.open)) return false;
    const r = snapshot.repos[a.repo];
    const owner = r.owner.toLowerCase();
    return !r.isPrivate && owner !== login && !snapshot.orgs.includes(owner);
  });
  const grouped = new Map<string, ContributionItem & { dates: string[]; mergedDates: string[] }>();
  for (const pr of outside) {
    const repo = snapshot.repos[pr.repo];
    const item = grouped.get(pr.repo) ?? {
      repo: repo.nameWithOwner,
      owner: repo.owner,
      stars: repo.stars,
      avatar: snapshot.avatars[repo.owner.toLowerCase()] ?? null,
      merged: 0,
      open: 0,
      lastDate: '',
      dates: [],
      mergedDates: [],
    };
    if (pr.state === 'MERGED') item.merged++;
    else item.open++;
    item.dates.push(pr.createdAt);
    if (pr.mergedAt) item.mergedDates.push(pr.mergedAt);
    grouped.set(pr.repo, item);
  }
  // Pins take their places first; the remaining places go to the most starred.
  const eligible = [...grouped.entries()].sort((a, b) => b[1].stars - a[1].stars);
  const pinned = eligible.filter(([key]) => pins.has(key));
  const others = eligible.filter(([key]) => !pins.has(key)).slice(0, Math.max(0, cc.count - pinned.length));
  const contributions: ContributionItem[] = [...pinned, ...others]
    .map(([, { dates, mergedDates, ...item }]) => ({
      ...item,
      lastDate: (mergedDates.length ? mergedDates : dates).sort().at(-1) ?? '',
    }))
    .sort((a, b) => b.stars - a.stars);
  for (const key of pins) {
    if (snapshot.repos[key] && !grouped.has(key)) {
      note(`cards.contributions.pin: "${key}" has no merged${cc.open ? ' or open' : ''} pull requests of yours, so it is not shown`);
    }
  }
  return contributions;
}
