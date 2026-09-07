import "server-only";

/**
 * A pool of Gemini keys, tried in turn.
 *
 * One key is not enough for this app, for two reasons that both showed up
 * within a day of real use:
 *
 *   · A free-tier project can be blocked outright. Three of the four keys
 *     tried here answer 403 "denied access" on every model while still
 *     listing models happily, so the key looks valid and is not.
 *   · The speech models have a very small free daily allowance. Four
 *     sentences exhausted it, and every request after that is a 429.
 *
 * Neither is something a pensioner should ever see. With a pool, a blocked
 * or spent key steps aside and the next one answers, and the app only falls
 * back to its dictionary when every key is genuinely out.
 *
 * Configure as GEMINI_API_KEYS, comma-separated, best first. GEMINI_API_KEY
 * is still read, and appended, so an existing single-key deployment keeps
 * working with no change.
 */

/** How long a key that answered 429 is left alone. Quota is daily; this is
 *  a compromise between honouring that and recovering inside one demo. */
const QUOTA_REST_MS = 15 * 60_000;

/** A 403 is a property of the project, not the moment. Do not retry it. */
const dead = new Set<string>();
const resting = new Map<string, number>();

function parse(): string[] {
  const raw = [
    ...(process.env.GEMINI_API_KEYS ?? "").split(","),
    process.env.GEMINI_API_KEY ?? "",
  ];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const candidate of raw) {
    const key = candidate.trim();
    /* The placeholder in .env.example ends in "...". Treating it as real
       costs a full timeout on every request before the fallback runs. */
    if (!key || key.length <= 20 || key.includes("...")) continue;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(key);
  }
  return out;
}

/** Every key configured, whatever its recent luck. */
export function allKeys(): string[] {
  return parse();
}

/** The keys worth trying right now, in order. */
export function liveKeys(): string[] {
  const now = Date.now();
  return parse().filter((k) => {
    if (dead.has(k)) return false;
    const until = resting.get(k);
    return until === undefined || now >= until;
  });
}

export function hasGeminiKey(): boolean {
  return liveKeys().length > 0;
}

/**
 * What a response means for this key's future.
 *
 * Called by every caller in the pool loop, so one route learning that a key
 * is blocked saves every other route the same round trip.
 */
export function noteKeyResult(key: string, status: number): void {
  if (status === 403 || status === 401) dead.add(key);
  else if (status === 429) resting.set(key, Date.now() + QUOTA_REST_MS);
  else if (status >= 200 && status < 300) resting.delete(key);
}

/** For the health route: what the pool looks like without revealing it. */
export function keyPoolStatus(): {
  total: number;
  live: number;
  blocked: number;
  resting: number;
} {
  const all = parse();
  const now = Date.now();
  return {
    total: all.length,
    live: liveKeys().length,
    blocked: all.filter((k) => dead.has(k)).length,
    resting: all.filter((k) => {
      const until = resting.get(k);
      return until !== undefined && now < until && !dead.has(k);
    }).length,
  };
}
