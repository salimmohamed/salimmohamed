// Every colour the cards come in, in one place: its name, and what it looks like in each style.
// github is GitHub's own colours, following the viewer's light or dark theme; each other colour has
// its classic tints and its display shades. A new colour is one entry in PALETTE (and setup's list
// of names and its panel, which tests/setup-sync.test.ts checks).

export type Mode = 'light' | 'dark';

/** The classic cards' colours. */
export interface Theme {
  background: string;
  border: string;
  text: string;
  secondary: string;
  muted: string;
  accent: string;
  track: string;
  /** Fallback for languages without a GitHub color, and "Other". */
  neutral: string;
  /** The contribution graph's greens, from least to most active: darker on light, brighter on dark. */
  heat: [string, string, string, string];
  /** GitHub's success green, readable as text: what a graph highlights, and its number. */
  highlight: string;
  /** Words marked *like this* in the about card's text. */
  emphasis: string;
}

// GitHub's own Primer colors, so the cards sit naturally on the profile page.
export const THEMES: Record<Mode, Theme> = {
  light: {
    background: '#ffffff',
    border: '#d1d9e0',
    text: '#1f2328',
    secondary: '#59636e',
    muted: '#818b98',
    accent: '#0969da',
    track: '#d1d9e0',
    neutral: '#8c959f',
    heat: ['#9be9a8', '#40c463', '#30a14e', '#216e39'],
    highlight: '#2da44e',
    emphasis: '#0969da',
  },
  dark: {
    background: '#0d1117',
    border: '#3d444d',
    text: '#f0f6fc',
    secondary: '#9198a1',
    muted: '#7d8590',
    accent: '#4493f8',
    track: '#3d444d',
    neutral: '#6e7681',
    heat: ['#0e4429', '#006d32', '#26a641', '#39d353'],
    highlight: '#3fb950',
    emphasis: '#4493f8',
  },
};

/** What a colour changes on the classic cards: the ring, the weekly bars, the streaks highlight. */
export type Tint = Pick<Theme, 'accent' | 'heat' | 'highlight'>;

/**
 * A colour on the display cards: bright on its dark panel, and for a light page without the panel a
 * darker shade (the bright ones fade on white) with a deeper one for the shine.
 */
export interface Shades {
  bright: string;
  shine: string;
  panel: string;
  dark: string;
  deep: string;
  /** Opacity of the unlit dots on the panel. */
  unlit: number;
}

export interface Colour {
  classic: Record<Mode, Tint>;
  display: Shades;
}

export const PALETTE = {
  // Grays only, to match a minimal monospace profile card.
  mono: {
    classic: {
      light: { accent: '#57606a', heat: ['#d0d7de', '#afb8c1', '#6e7781', '#424a53'], highlight: '#1f2328' },
      dark: { accent: '#8b949e', heat: ['#21262d', '#30363d', '#6e7681', '#c9d1d9'], highlight: '#e6edf3' },
    },
    display: { bright: '#c9d1d9', shine: '#ffffff', panel: '#0d1117', dark: '#57606a', deep: '#30363d', unlit: 0.08 },
  },
  // Classic: like the greens, deep to pale on a light page, dim to bright on a dark one; the
  // highlight dark enough to read as text on white.
  amber: {
    classic: {
      light: { accent: '#e08a00', heat: ['#ffd58a', '#f0a020', '#c26a00', '#9a4d00'], highlight: '#b35c00' },
      dark: { accent: '#ffab1a', heat: ['#5c3300', '#8f5200', '#d98a00', '#ffab1a'], highlight: '#ffab1a' },
    },
    display: { bright: '#ffab1a', shine: '#fff2cc', panel: '#0d0b07', dark: '#b35c00', deep: '#6e3800', unlit: 0.09 },
  },
  // Classic: GitHub's greens, with the ring green too.
  green: {
    classic: {
      light: { accent: '#2da44e', heat: THEMES.light.heat, highlight: THEMES.light.highlight },
      dark: { accent: '#3fb950', heat: THEMES.dark.heat, highlight: THEMES.dark.highlight },
    },
    display: { bright: '#3dff74', shine: '#e8ffef', panel: '#070d09', dark: '#1a7f37', deep: '#0b4d1f', unlit: 0.08 },
  },
  // Classic: GitHub's purple, cyan, red and blue, the same way as amber.
  purple: {
    classic: {
      light: { accent: '#8250df', heat: ['#d8b9ff', '#a475f9', '#6639ba', '#4c2889'], highlight: '#8250df' },
      dark: { accent: '#a371f7', heat: ['#2e1a4f', '#553098', '#8957e5', '#c297ff'], highlight: '#a371f7' },
    },
    display: { bright: '#c77dff', shine: '#f3e6ff', panel: '#0c0710', dark: '#8250df', deep: '#4c2889', unlit: 0.1 },
  },
  cyan: {
    classic: {
      light: { accent: '#0e8a9a', heat: ['#a5e8ef', '#3fb8c6', '#0a7b8a', '#054952'], highlight: '#0a7b8a' },
      dark: { accent: '#39c5cf', heat: ['#0a3a40', '#0e6b75', '#1fa3b0', '#56d4dd'], highlight: '#39c5cf' },
    },
    display: { bright: '#22e3ff', shine: '#e0fbff', panel: '#050c0d', dark: '#0a7b8a', deep: '#054952', unlit: 0.08 },
  },
  red: {
    classic: {
      light: { accent: '#cf222e', heat: ['#ffc1bd', '#f2706f', '#cf222e', '#82071e'], highlight: '#cf222e' },
      dark: { accent: '#f85149', heat: ['#4d1215', '#8e1b20', '#da3633', '#ff7b72'], highlight: '#f85149' },
    },
    display: { bright: '#ff4d4d', shine: '#ffe5e5', panel: '#0d0606', dark: '#cf222e', deep: '#82071e', unlit: 0.1 },
  },
  blue: {
    classic: {
      light: { accent: '#0969da', heat: ['#b6e3ff', '#54aeff', '#0969da', '#0a3069'], highlight: '#0969da' },
      dark: { accent: '#4493f8', heat: ['#0c2d6b', '#1158c7', '#388bfd', '#79c0ff'], highlight: '#4493f8' },
    },
    display: { bright: '#4da3ff', shine: '#e3f0ff', panel: '#05080d', dark: '#0969da', deep: '#0a3069', unlit: 0.1 },
  },
} satisfies Record<string, Colour>;

/** A colour other than github's own. */
export type Tinted = keyof typeof PALETTE;

/** The colours, in the order they're listed: github first, then the palette's. */
export const COLORS = ['github', ...(Object.keys(PALETTE) as Tinted[])] as const;
export type Color = 'github' | Tinted;

/** Whether text on `colour` ("#rrggbb" or "#rgb") reads best in the light theme's shades or the dark one's. */
export function surfaceOf(colour: string): Mode {
  const hex = colour.length === 4 ? colour.replace(/[0-9a-f]/gi, (d) => d + d) : colour;
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  // Dark text where it contrasts more than light text would.
  return (luminance + 0.05) / 0.05 > 1.05 / (luminance + 0.05) ? 'light' : 'dark';
}
