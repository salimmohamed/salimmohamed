// Top repos as a pinball-style display: one repo at a time.

import type { TopRepo } from './data.ts';
import { formatCompact } from '../../text.ts';
import { textCells, textWidth } from '../../display/font.ts';
import { COLS, frame, path, type Style } from '../../display/dmd.ts';
import { fit, titleLine } from '../../display/text.ts';
import { slideshow, type Item } from '../../display/slides.ts';

export function renderDisplayRepos(items: TopRepo[], title: string | null, style: Style): string {
  const { look } = style;
  const header = titleLine(title, style);
  if (!items.length) {
    return frame({
      title: title ?? 'Top repos', desc: 'No starred repositories yet.', ...style, css: '',
      body: header + path(style, textCells('NO STARRED REPOS YET', 4, 24), look.lit),
    });
  }

  const slides: Item[][] = items.map((r, i) => {
    const counter = `${i + 1}/${items.length}`;
    const details = [r.recent ? `+${formatCompact(r.recent)} THIS YEAR` : '', r.language?.name.toUpperCase() ?? ''].filter(Boolean).join(' · ');
    return [
      { text: `*${formatCompact(r.stars).toUpperCase()}`, col: 4, row: 18, scale: 2, shine: true },
      { text: counter, col: COLS - 4 - textWidth(counter), row: 18, dim: true },
      { text: fit(r.name.toUpperCase(), COLS - 8), col: 4, row: 40 },
      ...(details ? [{ text: fit(details, COLS - 8), col: 4, row: 51, dim: true }] : []),
    ];
  });
  const show = slideshow('r', slides, { col: 0, row: 16, cols: COLS, rows: 51 }, style, ['push', 'type', 'wipe']);

  return frame({
    title: title ?? 'Top repos',
    desc: items.map((r) => `${r.name}: ${r.stars} stars${r.recent ? `, ${r.recent} in the last 12 months` : ''}`).join('. '),
    ...style,
    css: show.css,
    body: `<defs>${show.defs}</defs>\n${header}\n${show.markup}`,
  });
}
