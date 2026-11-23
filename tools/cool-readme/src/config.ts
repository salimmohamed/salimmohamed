import { readFileSync } from 'node:fs';
import { parseDocument, type YAMLError } from 'yaml';
import { CARD_DEFS, type CardDefs, type CardSettings } from './cards/index.ts';
import { fromOld, markOld, oldKeys } from './legacy.ts';
import { COLORS, type Color } from './palette.ts';
import { ConfigError, background, check, emptyMappings, isMap, type Raw, type Shape } from './shape.ts';

export { ConfigError };

/** How to run setup, for the errors it fixes. */
export const SETUP_COMMAND = 'bash <(curl -fsSL https://raw.githubusercontent.com/pedrocatalao/github-cool-readme/v1/setup.sh)';

/** The cards, in their usual order: see cards/index.ts. */
export type Card = CardDefs['name'];
export const CARDS: readonly Card[] = CARD_DEFS.map((c) => c.name);
/** The cards made when the settings don't list any; the others are there to turn on. */
export const DEFAULT_CARDS: Card[] = CARD_DEFS.filter((c) => c.on).map((c) => c.name);

export const STYLES = ['classic', 'oled', 'dotmatrix', 'floating'] as const;
export type Style = (typeof STYLES)[number];
export { COLORS, type Color };

export interface Config {
  /** GitHub login. Defaults to the token's owner. */
  user: string | null;
  /** The cards to make, in README order; the others are left out. [] turns them all off: nothing is made. */
  show: Card[];
  /** Which repositories count in the numbers. */
  count: {
    /** Private repositories. */
    private: boolean;
    /** Repositories of organizations you belong to. */
    orgs: boolean;
  };
  look: {
    /** classic: GitHub-style cards. oled: displays of square pixels. dotmatrix: of round LEDs, over the unlit ones. floating: round LEDs alone. */
    style: Style;
    /** github: GitHub's own blue and greens. amber, green, purple, cyan, red, blue: everything that highlights in that colour. */
    color: Color;
    animations: boolean;
    /**
     * Behind the cards: "none" lets the page show through; a colour ("#030506") is the same for every
     * viewer, and the text takes the shades that suit it. "solid" only comes from the old settings (legacy.ts): the
     * style's own (classic: GitHub's page colour, following the viewer; the displays: the colour's panel).
     */
    background: string;
    /** classic only: a thin outline. */
    border: boolean;
  };
  /** Each card's settings: see the card's folder in cards/. */
  cards: CardSettings;
}

export const DEFAULT_CONFIG: Config = {
  user: null,
  show: [...DEFAULT_CARDS],
  count: { private: true, orgs: true },
  look: { style: 'classic', color: 'github', animations: true, background: 'none', border: false },
  cards: Object.fromEntries(CARD_DEFS.map((c) => [c.name, c.settings])) as CardSettings,
};

const SHAPE: Shape = {
  user: 'string?',
  show: 'string[]',
  count: { private: 'boolean', orgs: 'boolean' },
  look: { style: 'string', color: 'string', animations: 'boolean', background: 'string', border: 'boolean' },
  cards: Object.fromEntries(CARD_DEFS.map((c) => [c.name, c.shape])),
};

/** Settings that are a mapping of their own (repo weights, facts): one in the file replaces the default, not added to it. */
const WHOLE = new Set(CARD_DEFS.flatMap((c) => Object.entries(c.shape).filter(([, t]) => t === 'weights' || t === 'strings').map(([k]) => k)));

function merge<T>(base: T, override: unknown): T {
  if (typeof override !== 'object' || override === null) return base;
  const out: Record<string, unknown> = { ...(base as Record<string, unknown>) };
  for (const [key, v] of Object.entries(override)) {
    const b = out[key];
    out[key] =
      typeof b === 'object' && b !== null && !Array.isArray(b) && typeof v === 'object' && v !== null && !Array.isArray(v)
        && !WHOLE.has(key)
        ? merge(b, v)
        : v;
  }
  return out as T;
}

export const NEW_KEYS = ['show', 'count', 'look'];

export function parseConfig(text: string): Config {
  const doc = parseDocument(text);
  if (doc.errors.length) throw notYaml(doc.errors[0]);
  const parsed: unknown = doc.toJS() ?? {};
  if (!isMap(parsed)) throw new ConfigError('config must be a mapping');
  let raw: Raw = parsed;

  const old = oldKeys(raw);
  const current = NEW_KEYS.filter((k) => k in raw).concat(isMap(raw.cards) ? ['cards'] : []);
  if (old.length && current.length) {
    throw new ConfigError(`"${current[0]}" is in the new layout of the settings, "${old[0]}" in the old one: use the new one (run setup again to move them)`);
  }
  if (old.length) raw = fromOld(raw, doc); // the layout before v1.5: see legacy.ts
  else {
    emptyMappings(raw, SHAPE);
    if (isMap(raw.look) && 'background' in raw.look) {
      (raw.look as Raw).background = background(doc.getIn(['look', 'background'], true), 'look.background');
    }
  }

  check(raw, SHAPE, '');
  const config = merge(DEFAULT_CONFIG, raw);
  if (!(STYLES as readonly string[]).includes(config.look.style)) {
    throw new ConfigError(`"look.style" must be ${STYLES.map((s) => `"${s}"`).join(', ').replace(/, ([^,]*)$/, ' or $1')}`);
  }
  if (!(COLORS as readonly string[]).includes(config.look.color)) {
    throw new ConfigError(`"look.color" must be ${COLORS.map((c) => `"${c}"`).join(', ').replace(/, ([^,]*)$/, ' or $1')}`);
  }
  for (const card of config.show) {
    if (!(CARDS as readonly string[]).includes(card)) {
      throw new ConfigError(`"show" has "${card}"; the cards are ${CARDS.join(', ')}`);
    }
  }
  if (new Set(config.show).size !== config.show.length) throw new ConfigError('"show" names a card twice');
  for (const c of CARD_DEFS) (c.check as ((s: unknown) => void) | undefined)?.(config.cards[c.name]);
  if (old.length) markOld(config);
  return config;
}

/**
 * A file that isn't YAML: where, what yaml says, and how to fix it. Quotes inside quotes are the
 * usual cause, as in text with an HTML link.
 */
function notYaml(err: YAMLError): ConfigError {
  const [head, context = ''] = err.message.split(':\n\n');
  const what = head.replace(/ at line \d+, column \d+$/, '');
  const pos = err.linePos?.[0];
  return new ConfigError(
    `the settings file isn't valid YAML${pos ? ` at line ${pos.line}, column ${pos.col}` : ''}: ${what[0].toLowerCase()}${what.slice(1)}` +
      (context.trim() ? `\n\n${context.trimEnd()}\n\n` : '\n') +
      'Often it\'s a quote inside quoted text, like an HTML link: write each " inside "..." as \\", or put the text in ' +
      "'...' and write each ' inside as ''.\n" +
      'Fix it by hand, or, if it\'s in the about card\'s text, run setup again, answer no to "Keep it?" and type the ' +
      `text again:\n  ${SETUP_COMMAND}`,
    pos && { line: pos.line, col: pos.col },
  );
}

export function loadConfig(path: string): Config {
  let text: string;
  try {
    text = readFileSync(path, 'utf8');
  } catch {
    throw new ConfigError(`cannot read config file ${path}`);
  }
  try {
    return parseConfig(text);
  } catch (err) {
    if (err instanceof ConfigError) {
      err.message = err.message.replace(/^the settings file\b/, path);
      if (err.at) err.at.file = path;
    }
    throw err;
  }
}
