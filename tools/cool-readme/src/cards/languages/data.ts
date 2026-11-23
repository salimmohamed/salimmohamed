// The languages card's entries: your languages by share, the last one "Other" when it's on.
import type { Counted } from '../../compute.ts';
import { repoKey } from '../../repos.ts';

export interface LanguageItem {
  name: string;
  /** null for "Other". */
  color: string | null;
  percent: number;
}

export function languagesData({ snapshot, config, login, included, known }: Counted): LanguageItem[] {
  // Languages: each repo's language mix, weighted by your commits there (all time).
  const lc = config.cards.languages;
  const excludedLangs = new Set(lc.hide.map((l) => l.toLowerCase()));
  const weights = new Map<string, number>(); // 0 leaves a repo out
  for (const [ref, w] of Object.entries(lc.repos)) weights.set(repoKey(ref, login), w);
  known(Object.keys(lc.repos), 'cards.languages.repos');

  const commitsByRepo = new Map<string, number>();
  for (const w of snapshot.allTime) {
    for (const [key, c] of Object.entries(w.byRepo)) {
      if (c.commits) commitsByRepo.set(key, (commitsByRepo.get(key) ?? 0) + c.commits);
    }
  }

  const scores = new Map<string, { color: string | null; score: number }>();
  for (const [key, commits] of commitsByRepo) {
    if (!included(key)) continue;
    const weight = weights.get(key) ?? 1;
    if (weight === 0) continue;
    // An excluded language's share of the repo is dropped, not handed to the repo's other languages.
    const langs = snapshot.repos[key].languages;
    const size = langs.reduce((s, l) => s + l.size, 0);
    if (!size) continue;
    for (const l of langs) {
      if (excludedLangs.has(l.name.toLowerCase())) continue;
      const entry = scores.get(l.name) ?? { color: l.color, score: 0 };
      entry.score += (commits * weight * l.size) / size;
      scores.set(l.name, entry);
    }
  }
  const ranked = [...scores.entries()].sort((a, b) => b[1].score - a[1].score);
  const sum = (from: number, to = ranked.length) => ranked.slice(from, to).reduce((s, [, e]) => s + e.score, 0);
  // count is the entries shown, "Other" included: with more languages than that, the last place is
  // "Other"'s, unless the rest is under 0.5%. With count 1, one language and "Other".
  const whole = sum(0);
  const folded = lc.other && ranked.length > lc.count ? Math.max(1, lc.count - 1) : lc.count;
  const other = lc.other && whole > 0 && (sum(folded) / whole) * 100 >= 0.5;
  const named = other ? folded : lc.count;
  // Without "Other", the languages shown share 100% between them, so the bar stays full.
  const total = lc.other ? whole : sum(0, named);
  const languages: LanguageItem[] = ranked.slice(0, named).map(([name, e]) => ({
    name,
    color: e.color,
    percent: total ? (e.score / total) * 100 : 0,
  }));
  if (other) languages.push({ name: 'Other', color: null, percent: (sum(named) / total) * 100 });
  return languages;
}
