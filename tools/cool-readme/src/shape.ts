// What a settings file may hold, and checking one against it: shared by the settings of now
// (config.ts) and those from before v1.5 (legacy.ts).
import { isScalar } from 'yaml';

export class ConfigError extends Error {
  /** Where in the settings file, when it's about one place in it. */
  at?: { file?: string; line: number; col: number };
  constructor(message: string, at?: { line: number; col: number }) {
    super(message);
    this.at = at;
  }
}

export type Shape = { [key: string]: 'boolean' | 'string' | 'string?' | 'number' | 'string[]' | 'weights' | 'strings' | Shape };

export type Raw = Record<string, unknown>;
export const isMap = (v: unknown): v is Raw => typeof v === 'object' && v !== null && !Array.isArray(v);

export function check(value: unknown, shape: Shape, path: string): void {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new ConfigError(`${path || 'config'} must be a mapping`);
  }
  for (const [key, v] of Object.entries(value)) {
    const where = path ? `${path}.${key}` : key;
    const expected = shape[key];
    if (expected === undefined) {
      throw new ConfigError(`unknown setting "${where}"`);
    }
    if (typeof expected === 'object') {
      check(v, expected, where);
      continue;
    }
    const ok =
      expected === 'boolean' ? typeof v === 'boolean'
      : expected === 'string' ? typeof v === 'string'
      : expected === 'string?' ? v === null || typeof v === 'string'
      : expected === 'number' ? typeof v === 'number' && Number.isInteger(v) && v > 0
      : expected === 'string[]' ? Array.isArray(v) && v.every((s) => typeof s === 'string')
      : expected === 'strings' ? typeof v === 'object' && v !== null && !Array.isArray(v) && Object.values(v).every((s) => typeof s === 'string')
      : typeof v === 'object' && v !== null && !Array.isArray(v) &&
        Object.values(v).every((n) => typeof n === 'number' && n >= 0);
    if (!ok) {
      const what = expected === 'weights' ? 'a mapping of repo to a number >= 0'
        : expected === 'strings' ? 'a mapping of label to text'
        : expected === 'number' ? 'a positive whole number'
        : expected === 'string[]' ? 'a list of strings'
        : expected === 'string?' ? 'a string'
        : `a ${expected}`;
      throw new ConfigError(`"${where}" must be ${what}`);
    }
  }
}

/**
 * The background as written: "none", or a colour of six (or three) hex digits, with or without "#".
 * It's read from the file's text, as YAML makes numbers of some colours: 030506 would be 30506.
 */
export function background(node: unknown, where: string): string {
  const text = isScalar(node) ? String(node.source ?? node.value ?? '') : '';
  if (!text) throw new ConfigError(`"${where}" is empty: write none, or a colour without #, like ${where.split('.').pop()}: 030506`);
  const value = text.trim().toLowerCase().replace(/^#/, '');
  if (value === 'none') return 'none';
  if (/^([0-9a-f]{3}){1,2}$/.test(value)) return `#${value}`;
  throw new ConfigError(`"${where}" must be none or a colour like 030506, not "${text}"`);
}

/**
 * A mapping written with nothing under it ("repos:") is null in YAML: taken as an empty one. setup
 * from v1.5.0 to v1.6.1 wrote "repos:" like that when it moved settings without repo weights.
 */
export function emptyMappings(value: unknown, shape: Shape): void {
  if (!isMap(value)) return;
  for (const [key, expected] of Object.entries(shape)) {
    if (!(key in value)) continue;
    if (typeof expected === 'object') emptyMappings(value[key], expected);
    else if ((expected === 'weights' || expected === 'strings') && value[key] === null) value[key] = {};
  }
}
