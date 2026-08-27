import type { Record_, SmsMessage } from "./types";

/**
 * IN-MEMORY STORE — this is the honest boundary of the prototype.
 *
 * In production this would be:
 *   • `records`  → a Postgres table, one row per submission, with the audit
 *                  log as an append-only child table (never an UPDATE).
 *   • `outbox`   → a durable queue (SQS / PgBoss) consumed by an SMS worker,
 *                  with delivery receipts written back.
 *   • `otps`     → Redis with a 10-minute TTL and a per-mobile rate limit.
 *   • `reminders`→ a scheduled job table, one row per pensioner per year.
 *
 * Consequences of the Map, stated plainly on /about:
 *   • a server restart or a new serverless instance loses everything
 *   • nothing is shared between Vercel regions
 * Both are fine for a demo and disqualifying for real pensions.
 *
 * `globalThis` keeps the Map alive across Next.js dev hot reloads, which
 * otherwise re-evaluate this module and silently drop every record.
 */
interface Store {
  records: Map<string, Record_>;
  /** requestId -> dlcId, so a retried submit returns the first record. */
  idempotency: Map<string, string>;
  outbox: SmsMessage[];
  otps: Map<string, { code: string; at: number }>;
  reminders: { id: string; mobile: string; at: string; ppo: string }[];
}

const g = globalThis as unknown as { __pramaanStore?: Store };

export const store: Store =
  g.__pramaanStore ??
  (g.__pramaanStore = {
    records: new Map(),
    idempotency: new Map(),
    outbox: [],
    otps: new Map(),
    reminders: [],
  });

/** Newest first, and capped so a long demo session cannot grow without bound. */
export function pushSms(msg: SmsMessage): void {
  store.outbox.unshift(msg);
  if (store.outbox.length > 60) store.outbox.length = 60;
}

export function resetStore(): void {
  store.records.clear();
  store.idempotency.clear();
  store.otps.clear();
  store.outbox.length = 0;
  store.reminders.length = 0;
}
