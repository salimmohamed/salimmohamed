// The summary card's numbers: what you did in the last 12 months and all time, the stars your
// repos earned, and the share of days you were active.
import type { Counted } from '../../compute.ts';
import type { Config } from '../../config.ts';
import type { ContributionWindow } from '../../types.ts';

export type CountKey = 'commits' | 'pullRequests' | 'reviews' | 'issues';

export interface SummaryModel {
  title: string | null;
  ring: Config['cards']['summary']['ring'];
  rows: { key: CountKey; label: string; last12Months: number; allTime: number }[];
  /** Stars received in the last 12 months, and the current total. */
  stars: { last12Months: number; allTime: number };
  activity: { activeDays: number; totalDays: number; percent: number };
}

const ROW_LABELS: Record<CountKey, string> = {
  commits: 'Commits',
  pullRequests: 'PRs created',
  reviews: 'PRs reviewed',
  issues: 'Issues',
};

const FIELDS = ['commits', 'pullRequests', 'reviews', 'issues'] as const;

export function summaryData({ snapshot, config, included, filtering }: Counted): SummaryModel {
  // Summary: both columns from the contributions API, only the time window differs.
  const counts = (windows: ContributionWindow[]) => {
    const sums: Record<CountKey, number> = { commits: 0, pullRequests: 0, reviews: 0, issues: 0 };
    for (const w of windows) {
      const listed = { commits: 0, pullRequests: 0, reviews: 0, issues: 0 };
      for (const [key, c] of Object.entries(w.byRepo)) {
        for (const f of FIELDS) listed[f] += c[f];
        if (!included(key)) continue;
        for (const f of FIELDS) sums[f] += c[f];
      }
      // GitHub lists at most 100 repos per type and window; the rest only shows in the totals.
      // That rest can be counted only when nothing is filtered out.
      if (!filtering) for (const f of FIELDS) sums[f] += Math.max(0, w.totals[f] - listed[f]);
    }
    return sums;
  };
  const last12 = counts([snapshot.last12Months]);
  const all = counts(snapshot.allTime);
  const activeDays = snapshot.calendar.filter((d) => d.count > 0).length;
  const totalDays = snapshot.calendar.length;

  const summary: SummaryModel = {
    title: config.cards.summary.title,
    ring: config.cards.summary.ring,
    rows: (Object.keys(ROW_LABELS) as CountKey[]).map((key) => ({
      key,
      label: ROW_LABELS[key],
      last12Months: last12[key],
      allTime: all[key],
    })),
    stars: snapshot.ownedRepos
      .filter((k) => included(k) && !snapshot.repos[k].isFork)
      .reduce(
        (sum, k) => ({
          last12Months: sum.last12Months + (snapshot.recentStars[k] ?? 0),
          allTime: sum.allTime + snapshot.repos[k].stars,
        }),
        { last12Months: 0, allTime: 0 },
      ),
    activity: {
      activeDays,
      totalDays,
      percent: totalDays ? Math.round((activeDays / totalDays) * 100) : 0,
    },
  };
  return summary;
}
