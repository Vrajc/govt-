import { dictFor, fill } from "./i18n";
import { pushSms, store } from "./store";
import { transition } from "./stateMachine";
import type { ErrorCode, Lang, Record_, SmsMessage } from "./types";

/* ==================================================================
 * Knobs. Turn these on camera to demonstrate degraded-network
 * behaviour without touching any other file.
 * ================================================================== */

/** Base processing time of the pretend pension office, in milliseconds. */
export const LATENCY_MS = {
  instant: 0,
  demo: 8_000,
  real: 120_000,
} as const;

/**
 * Chance that a submission comes back needing a fix, when our own pre-check
 * saw nothing wrong with the photo. Real-world DLC first-attempt failure for
 * elderly users is far worse than this; 0.30 keeps the demo watchable while
 * still exercising the recovery path often enough to be honest.
 */
export const FAILURE_RATE = 0.3;

/** Chance the photo is the culprit once the pre-check has already flagged it. */
const FLAGGED_PHOTO_WEIGHT = 0.85;

/** Simulated transport failure, so the "try again" path is reachable. Off by default. */
export const TRANSPORT_FAILURE_RATE = 0;

/* ==================================================================
 * Mock PPO registry — stands in for the pension-office lookup
 * ================================================================== */
const PPO_REGISTRY: Record<string, { name: string }> = {
  "PPO-2024-000123": { name: "Ramanbhai Patel" },
  "PPO-2024-000456": { name: "Savitri Devi Sharma" },
  "PPO-2023-009871": { name: "Abdul Karim Shaikh" },
};

export const DEMO_PENSIONER = {
  name: "Ramanbhai Patel",
  ppo: "PPO-2024-000123",
  aadhaar: "998812344821",
  mobile: "9825012345",
};

export function lookupPpo(ppo: string): { name: string } | null {
  return PPO_REGISTRY[ppo.trim().toUpperCase()] ?? null;
}

/* ==================================================================
 * Identifiers
 * ================================================================== */
const ID_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no I/O/0/1 — read aloud on the phone

export function newDlcId(now = new Date()): string {
  let tail = "";
  for (let i = 0; i < 8; i++) {
    tail += ID_ALPHABET[Math.floor(Math.random() * ID_ALPHABET.length)];
  }
  return `DLC-${now.getFullYear()}-${tail}`;
}

/**
 * A life certificate submitted now is good until the next annual window
 * closes — 30 November of the following year.
 */
export function validUntilFor(now = new Date()): Date {
  // Whatever month you send it in, the next window closes on 30 November
  // of the following year. Month index 10 is November.
  return new Date(Date.UTC(now.getFullYear() + 1, 10, 30));
}

/* ==================================================================
 * Resolution — honest, not random
 * ================================================================== */
const OTHER_CODES: ErrorCode[] = [
  "ERR_LIVENESS_FAIL",
  "ERR_FACE_NOT_CENTERED",
  "ERR_AADHAAR_NAME_MISMATCH",
];

export function decideOutcome(rec: Record_): {
  state: "ACCEPTED" | "NEEDS_FIX";
  code: ErrorCode | null;
} {
  // A forced outcome from /demo always wins.
  if (rec.forced) {
    return rec.forced.outcome === "ACCEPTED"
      ? { state: "ACCEPTED", code: null }
      : { state: "NEEDS_FIX", code: rec.forced.code ?? "ERR_FACE_QUALITY_LOW" };
  }

  // An unknown PPO could never match a real pension record.
  if (!lookupPpo(rec.ppo)) {
    // Only on the first attempt: a reviewer who retries the same made-up PPO
    // would otherwise be stuck in a loop with no way out of the demo.
    if (rec.attempts <= 1) return { state: "NEEDS_FIX", code: "ERR_PPO_NOT_FOUND" };
  }

  // If our own pre-check disliked the photo, the pension office is very
  // likely to dislike it for the same reason. This is what makes the
  // pre-check feel truthful rather than decorative.
  if (rec.precheckFlagged) {
    if (Math.random() < FLAGGED_PHOTO_WEIGHT) {
      return { state: "NEEDS_FIX", code: "ERR_FACE_QUALITY_LOW" };
    }
    return { state: "ACCEPTED", code: null };
  }

  if (Math.random() < FAILURE_RATE) {
    const code = OTHER_CODES[Math.floor(Math.random() * OTHER_CODES.length)];
    return { state: "NEEDS_FIX", code };
  }
  return { state: "ACCEPTED", code: null };
}

/* ==================================================================
 * The async queue, simulated
 * ==================================================================
 * There is no timer. Nothing in a serverless function may outlive the
 * request. Instead each record carries `resolveAt`, and the status route
 * settles it lazily on the next read — which is exactly how a real worker
 * queue looks from the client's point of view, and survives a cold start.
 */
export function settleIfDue(rec: Record_, now = Date.now()): Record_ {
  if (rec.state === "SUBMITTED") {
    transition(rec, "VERIFYING", "mock-pda", "Picked up from the queue");
  }
  if (rec.state !== "VERIFYING") return rec;
  if (rec.resolveAt === null || now < rec.resolveAt) return rec;

  const { state, code } = decideOutcome(rec);
  rec.errorCode = code;
  rec.resolveAt = null;

  if (state === "ACCEPTED") {
    rec.validUntil = validUntilFor(new Date(rec.createdAt)).toISOString();
    transition(rec, "ACCEPTED", "mock-pda", "Face match succeeded");
    queueSms(rec, "accepted");
  } else {
    transition(rec, "NEEDS_FIX", "mock-pda", `Returned ${code}`);
    queueSms(rec, "needs-fix");
  }
  return rec;
}

/* ==================================================================
 * Outbound messages
 * ================================================================== */
export function formatDate(iso: string, lang: Lang): string {
  const locale = lang === "hi" ? "hi-IN" : lang === "gu" ? "gu-IN" : "en-IN";
  try {
    return new Intl.DateTimeFormat(locale, {
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    }).format(new Date(iso));
  } catch {
    return iso.slice(0, 10);
  }
}

export function queueSms(rec: Record_, kind: SmsMessage["kind"]): void {
  const d = dictFor(rec.lang);
  const vars: Record<string, string> = { id: rec.id };
  if (rec.validUntil) vars.date = formatDate(rec.validUntil, rec.lang);

  const template =
    kind === "accepted"
      ? d.sms.accepted
      : kind === "needs-fix"
        ? d.sms.needsFix
        : kind === "reminder"
          ? d.sms.reminder
          : d.sms.received;

  pushSms({
    id: `sms-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    at: new Date().toISOString(),
    to: rec.mobile,
    lang: rec.lang,
    kind,
    body: fill(template, vars),
  });
}

/* ==================================================================
 * Record construction
 * ================================================================== */
export function createRecord(input: {
  requestId: string;
  lang: Lang;
  mode: Record_["mode"];
  name: string;
  helperName: string;
  ppo: string;
  aadhaarLast4: string;
  mobile: string;
  precheckFlagged: boolean;
  resolveInMs: number;
  forced: Record_["forced"];
}): Record_ {
  const now = new Date();
  const rec: Record_ = {
    id: newDlcId(now),
    requestId: input.requestId,
    createdAt: now.toISOString(),
    state: "DRAFT",
    lang: input.lang,
    mode: input.mode,
    name: input.name,
    helperName: input.helperName,
    ppo: input.ppo,
    aadhaarLast4: input.aadhaarLast4,
    mobile: input.mobile,
    precheckFlagged: input.precheckFlagged,
    errorCode: null,
    validUntil: null,
    attempts: 1,
    audit: [
      {
        at: now.toISOString(),
        from: null,
        to: "DRAFT",
        actor: "citizen",
        note: "Details filled in on the phone",
      },
    ],
    resolveAt: null,
    forced: input.forced,
  };

  transition(rec, "SUBMITTED", "citizen", "Sent from the phone");
  rec.resolveAt = Date.now() + input.resolveInMs;
  queueSms(rec, "received");

  store.records.set(rec.id, rec);
  store.idempotency.set(rec.requestId, rec.id);
  return rec;
}
