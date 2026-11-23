import type { Config } from '../../config.ts';
import type { TopRepo } from './data.ts';
import { icon } from '../../render/icons.ts';
import { CONTENT_TOP, PAD, TEXT, WIDTH, card, fadeIn, headerText, truncate, type Theme } from '../../render/classic.ts';
import { esc, formatCompact } from '../../text.ts';

// Two columns of three rows: the most repos there can be, all in view.
const ROW = 46;
const TOP = CONTENT_TOP - 2;
const COL = (WIDTH - 2 * PAD) / 2;
const NAME_X = 16; // after the language's dot

/** What's under a repo's name: its stars, and those of the last 12 months. */
export function describe(r: TopRepo): string {
  return r.recent ? `${formatCompact(r.stars)} · +${formatCompact(r.recent)} this year` : formatCompact(r.stars);
}

export function renderRepos(items: TopRepo[], theme: Theme, config: Config): string {
  const title = config.cards.repos.title;
  const header = title ? headerText(title, PAD) : '';
  if (!items.length) {
    return card({
      title: title ?? 'Top repos', desc: 'No starred repositories yet.', theme, config,
      body: header + `<text x="${PAD}" y="${CONTENT_TOP + 14}" class="label muted">No starred repositories yet</text>`,
    });
  }

  const rows = items
    .map((r, i) =>
      fadeIn(
        PAD + (i % 2) * COL,
        TOP + Math.floor(i / 2) * ROW,
        i,
        (r.language ? `<circle cx="5" cy="8" r="5" fill="${r.language.color ?? theme.neutral}"/>` : '') +
          `<text x="${NAME_X}" y="13" class="label" style="font-weight: 600;">${esc(truncate(r.name, COL - NAME_X - 12, TEXT, true))}</text>` +
          icon('star', NAME_X, 19, 14) +
          `<text x="${NAME_X + 18}" y="30" class="small secondary">${esc(describe(r))}</text>`,
        config,
        70,
      ),
    )
    .join('\n');

  return card({
    title: title ?? 'Top repos',
    desc: items.map((r) => `${r.name}: ${r.stars} stars${r.recent ? `, ${r.recent} in the last 12 months` : ''}${r.language ? `, ${r.language.name}` : ''}`).join('. '),
    theme,
    config,
    body: header + '\n' + rows,
  });
}
