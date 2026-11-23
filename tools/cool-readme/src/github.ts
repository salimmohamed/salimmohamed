const ENDPOINT = 'https://api.github.com/graphql';
const USER_AGENT = 'github-cool-readme';

export class GitHubError extends Error {}

interface GraphQLError {
  type?: string;
  message: string;
  path?: (string | number)[];
}

export interface Client {
  query<T>(query: string, variables?: Record<string, unknown>): Promise<T>;
  /** Messages for parts GitHub refused to return (e.g. SAML-protected organizations). */
  warnings: string[];
  /** The token's scopes, known after the first query; null for tokens without scopes (fine-grained, apps). */
  scopes(): string[] | null;
}

export interface ClientOptions {
  /** How the client waits between attempts; tests pass one that doesn't. */
  sleep?: (ms: number) => Promise<void>;
  /** How long one request may take before it's given up and tried again. */
  timeoutMs?: number;
  /** The longest wait for a rate limit to reset; longer, and the run fails instead (the workflow has 15 minutes). */
  maxWaitMs?: number;
}

/** Tries per request: the first and three more. */
const ATTEMPTS = 4;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * How long to wait before trying again, or null when trying again won't help. GitHub's errors
 * (5xx) and rate limits are worth waiting for; any other refusal, like a 403 for missing access,
 * is the same the next time.
 */
function retryWait(status: number, headers: Headers, text: string, attempt: number): { ms: number; why: string } | null {
  const retryAfter = Number(headers.get('retry-after'));
  const exhausted = headers.get('x-ratelimit-remaining') === '0';
  const rateLimited =
    status === 429 || (status === 403 && (exhausted || retryAfter > 0 || /rate limit/i.test(text)));
  if (!rateLimited && status < 500) return null;
  const why = rateLimited ? 'hit a rate limit' : `answered ${status}`;
  if (retryAfter > 0) return { ms: retryAfter * 1000, why };
  const reset = Number(headers.get('x-ratelimit-reset'));
  if (exhausted && reset) return { ms: Math.max(1000, reset * 1000 - Date.now()), why };
  return { ms: 2000 * attempt, why };
}

export function createClient(token: string, log: (msg: string) => void = () => {}, options: ClientOptions = {}): Client {
  const { sleep: wait = sleep, timeoutMs = 30_000, maxWaitMs = 5 * 60_000 } = options;
  const warnings: string[] = [];
  let scopes: string[] | null = null;

  const pause = async (ms: number, why: string) => {
    if (ms > maxWaitMs) {
      throw new GitHubError(`GitHub ${why}; it resets in ${Math.ceil(ms / 60_000)} minutes, too long to wait. Try again later`);
    }
    log(`GitHub ${why}, retrying in ${Math.round(ms / 1000)}s`);
    await wait(ms);
  };

  async function query<T>(query: string, variables: Record<string, unknown> = {}): Promise<T> {
    for (let attempt = 1; ; attempt++) {
      const last = attempt >= ATTEMPTS;
      let res: Response;
      try {
        res = await fetch(ENDPOINT, {
          method: 'POST',
          headers: {
            authorization: `bearer ${token}`,
            'content-type': 'application/json',
            'user-agent': USER_AGENT,
          },
          body: JSON.stringify({ query, variables }),
          signal: AbortSignal.timeout(timeoutMs),
        });
      } catch (err) {
        // No answer at all: the network, or GitHub taking longer than timeoutMs.
        const why =
          err instanceof Error && err.name === 'TimeoutError'
            ? `did not answer within ${timeoutMs / 1000}s`
            : `could not be reached (${err instanceof Error ? err.message : String(err)})`;
        if (last) throw new GitHubError(`GitHub ${why}`);
        await pause(2000 * attempt, why);
        continue;
      }

      const header = res.headers.get('x-oauth-scopes');
      if (header !== null) scopes = header.split(',').map((s) => s.trim()).filter(Boolean);
      if (res.status === 401) throw new GitHubError('the token was rejected (401); check that it is valid');

      if (!res.ok) {
        const text = await res.text();
        const retry = retryWait(res.status, res.headers, text, attempt);
        if (retry && !last) {
          await pause(retry.ms, retry.why);
          continue;
        }
        throw new GitHubError(`GitHub answered ${res.status}: ${text.slice(0, 300)}`);
      }

      const body = (await res.json()) as { data?: T; errors?: GraphQLError[] };
      if (body.errors?.length) {
        // GraphQL reports its own rate limit as an error in a 200 answer.
        if (body.errors.some((e) => e.type === 'RATE_LIMITED') && !last) {
          await pause(retryWait(429, res.headers, '', attempt)!.ms, 'hit a rate limit');
          continue;
        }
        // These come with partial data (e.g. a SAML-protected org, a deleted repo): the rest is usable.
        const fatal = body.errors.filter((e) => e.type !== 'FORBIDDEN' && e.type !== 'NOT_FOUND');
        if (fatal.length || !body.data) {
          throw new GitHubError(body.errors.map((e) => e.message).join('; '));
        }
        for (const e of body.errors) {
          const msg = `${e.message}${e.path ? ` (at ${e.path.join('.')})` : ''}`;
          if (!warnings.includes(msg)) warnings.push(msg);
        }
      }
      return body.data as T;
    }
  }

  return { query, warnings, scopes: () => scopes };
}

/** An image as a data: URI, or null if it can't be had (the card then goes without it). */
export async function fetchDataUri(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { headers: { 'user-agent': USER_AGENT }, signal: AbortSignal.timeout(15_000) });
    if (!res.ok) return null;
    const type = res.headers.get('content-type') ?? 'image/png';
    const data = Buffer.from(await res.arrayBuffer()).toString('base64');
    return `data:${type};base64,${data}`;
  } catch {
    return null;
  }
}
