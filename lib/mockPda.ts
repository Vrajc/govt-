import { dictFor, fill } from "./i18n";
import { pushSms, store } from "./store";
import { transition } from "./stateMachine";
import { serviceById } from "./services/catalogue";
import type { ServiceDef, ServiceId } from "./services/types";
import type {
  ErrorCode,
  Lang,
  Mode,
  OutcomeData,
  Record_,
  SmsMessage,
} from "./types";

/* ==================================================================
 * Knobs. Turn these on camera to demonstrate degraded-network
 * behaviour without touching any other file.
 * ================================================================== */

/** Total processing time of the pretend offices, in milliseconds. */
export const LATENCY_MS = {
  instant: 0,
  demo: 8_000,
  real: 120_000,
} as const;

/**
 * Chance a submission comes back needing a fix when nothing looked wrong.
 * Real first-attempt failure for elderly users is far worse than this; 0.30
 * keeps the demo watchable while still exercising the recovery path often
 * enough to be honest.
 */
export const FAILURE_RATE = 0.3;

/** Chance the photo is the culprit once our own pre-check flagged it. */
const FLAGGED_PHOTO_WEIGHT = 0.85;

/** Simulated transport failure, so "try again" is reachable. Off by default. */
export const TRANSPORT_FAILURE_RATE = 0;

/* ==================================================================
 * Mock PPO registry — stands in for the pension-office lookup
 * ================================================================== */
const PPO_REGISTRY: Record<string, { name: string; monthly: number }> = {
  "PPO-2024-000123": { name: "Ramanbhai Patel", monthly: 18400 },
  "PPO-2024-000456": { name: "Savitri Devi Sharma", monthly: 12750 },
  "PPO-2023-009871": { name: "Abdul Karim Shaikh", monthly: 21200 },
};

export const DEMO_PENSIONER = {
  name: "Ramanbhai Patel",
  ppo: "PPO-2024-000123",
  aadhaar: "998812344821",
  mobile: "9825012345",
  // Turned 80 in November 2024, so the 80+ arrears have almost two years to
  // count. The whole point of that service is the money already owed.
  dob: "1944-11-12",
};

export function lookupPpo(ppo: string): { name: string; monthly: number } | null {
  return PPO_REGISTRY[ppo.trim().toUpperCase()] ?? null;
}

/* ==================================================================
 * Identifiers
 * ================================================================== */
const ID_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no I/O/0/1 — read aloud on the phone

function tail(n = 8): string {
  let out = "";
  for (let i = 0; i < n; i++) {
    out += ID_ALPHABET[Math.floor(Math.random() * ID_ALPHABET.length)];
  }
  return out;
}

/**
 * One reference format for all fourteen services. It used to read `DLC-`, from
 * when this app was only the life certificate — which meant someone chasing a
 * pension that never arrived got a receipt stamped "Digital Life Certificate".
 * `PS-` says Pension Saral and nothing more, which is the honest thing for a
 * number that has to cover a grievance and an enrolment alike.
 */
export function newDlcId(now = new Date()): string {
  return `PS-${now.getFullYear()}-${tail(8)}`;
}

/**
 * A life certificate submitted now is good until the next annual window
 * closes — 30 November of the following year.
 */
export function validUntilFor(now = new Date()): Date {
  return new Date(Date.UTC(now.getFullYear() + 1, 10, 30));
}

/* ==================================================================
 * Stage timing
 * ==================================================================
 * There is no timer. Nothing in a serverless function may outlive the
 * request, so each record carries `nextStageAt` and the status route walks
 * it forward on read. From the client that is indistinguishable from a real
 * worker queue, and it survives a cold start.
 */
function stageDurations(svc: ServiceDef, totalMs: number): number[] {
  const weights = svc.stages.map((s) => s.weight);
  const sum = weights.reduce((a, b) => a + b, 0) || 1;
  return weights.map((w) => Math.round((w / sum) * totalMs));
}

/* ==================================================================
 * Resolution — honest, not random
 * ================================================================== */
export function decideOutcome(rec: Record_, svc: ServiceDef): {
  state: "ACCEPTED" | "NEEDS_FIX";
  code: ErrorCode | null;
} {
  // A forced outcome from /demo always wins.
  if (rec.forced) {
    return rec.forced.outcome === "ACCEPTED"
      ? { state: "ACCEPTED", code: null }
      : {
          state: "NEEDS_FIX",
          code: rec.forced.code ?? (svc.codes[0] as ErrorCode),
        };
  }

  // A PPO that is not in the registry could never match a real record.
  // Only on the first attempt: a reviewer retrying the same made-up number
  // would otherwise be stuck with no way out of the demo.
  const ppo = rec.values.ppo ?? rec.values.deceasedPpo;
  if (ppo && !lookupPpo(ppo) && rec.attempts <= 1 && svc.codes.includes("ERR_PPO_NOT_FOUND")) {
    return { state: "NEEDS_FIX", code: "ERR_PPO_NOT_FOUND" };
  }

  // If our own pre-check disliked the photo, the office is very likely to
  // dislike it for the same reason. This coupling is what makes the
  // pre-check feel truthful rather than decorative.
  if (rec.precheckFlagged && svc.needsPhoto) {
    const photoCode = svc.codes.includes("ERR_FACE_QUALITY_LOW")
      ? "ERR_FACE_QUALITY_LOW"
      : "ERR_DOC_UNREADABLE";
    if (Math.random() < FLAGGED_PHOTO_WEIGHT) {
      return { state: "NEEDS_FIX", code: photoCode as ErrorCode };
    }
    return { state: "ACCEPTED", code: null };
  }

  if (Math.random() < FAILURE_RATE) {
    // Never the PPO code here — that one is decided above, on evidence.
    const pool = svc.codes.filter((c) => c !== "ERR_PPO_NOT_FOUND");
    const code = (pool[Math.floor(Math.random() * pool.length)] ??
      svc.codes[0]) as ErrorCode;
    return { state: "NEEDS_FIX", code };
  }
  return { state: "ACCEPTED", code: null };
}

/* ==================================================================
 * What a settled service hands back
 * ================================================================== */
const num = (v: string | undefined, fallback = 0): number => {
  const n = Number(String(v ?? "").replace(/[^\d]/g, ""));
  return Number.isFinite(n) && n > 0 ? n : fallback;
};

function addDays(d: Date, days: number): Date {
  const out = new Date(d);
  out.setUTCDate(out.getUTCDate() + days);
  return out;
}

/**
 * The additional pension does not stop at eighty. CCS (Pension) Rules 2021,
 * Rule 44(6): twenty per cent at 80, thirty at 85, forty at 90, fifty at 95
 * and the whole pension again at 100. Banks are supposed to apply each step
 * automatically and routinely miss them, so a ninety-year-old is often still
 * being paid the twenty per cent — which is exactly the money this service
 * exists to go and get.
 */
const AGE_SLABS: { from: number; rate: number }[] = [
  { from: 80, rate: 0.2 },
  { from: 85, rate: 0.3 },
  { from: 90, rate: 0.4 },
  { from: 95, rate: 0.5 },
  { from: 100, rate: 1.0 },
];

/** The first day of the month in which someone turns `age`. */
function slabStart(born: Date, age: number): Date {
  return new Date(Date.UTC(born.getUTCFullYear() + age, born.getUTCMonth(), 1));
}

/**
 * The commuted portion, as a share of what is being paid now.
 *
 * Up to 40 per cent of the pension could be commuted, so someone on the full
 * allowance is receiving 60 per cent of what they earned. Restoring it adds
 * back two thirds of the reduced amount.
 */
function commutedPortion(currentMonthly: number): number {
  return Math.round(currentMonthly * (0.4 / 0.6));
}

/** Fifteen years after the month the pension was first reduced. */
function restorationDueOn(commutedOn: string): Date | null {
  const started = new Date(commutedOn);
  if (Number.isNaN(started.getTime())) return null;
  return new Date(Date.UTC(started.getUTCFullYear() + 15, started.getUTCMonth(), 1));
}

/** When an Atal Pension Yojana subscriber starts drawing: their sixtieth. */
function apySixtiethBirthday(dob: string, now: Date): Date {
  const born = new Date(dob);
  if (Number.isNaN(born.getTime())) return new Date(Date.UTC(now.getUTCFullYear() + 25, 0, 1));
  return new Date(Date.UTC(born.getUTCFullYear() + 60, born.getUTCMonth(), born.getUTCDate()));
}

/** The 80+ increase runs from the FIRST DAY OF THE MONTH, not the birthday. */
export function age80EffectiveFrom(dob: string): Date | null {
  const born = new Date(dob);
  if (Number.isNaN(born.getTime())) return null;
  return slabStart(born, 80);
}

/**
 * The rate they should be on today, and every rupee missed since they turned
 * eighty — accumulated slab by slab, because someone who is ninety-two was
 * owed twenty per cent for five years and thirty for five more before the
 * forty they are owed now.
 */
export function additionalPension(
  dob: string,
  monthly: number,
  now = new Date()
): { rate: number; uplift: number; arrears: number } {
  const born = new Date(dob);
  if (Number.isNaN(born.getTime())) return { rate: 0, uplift: 0, arrears: 0 };

  let rate = 0;
  let arrears = 0;

  for (let i = 0; i < AGE_SLABS.length; i++) {
    const slab = AGE_SLABS[i];
    const start = slabStart(born, slab.from);
    if (start > now) break;
    rate = slab.rate;

    const nextSlab = AGE_SLABS[i + 1];
    const nextStart = nextSlab ? slabStart(born, nextSlab.from) : null;
    const end = nextStart && nextStart < now ? nextStart : now;
    arrears += Math.round(monthly * slab.rate) * monthsBetween(start, end);
  }

  return { rate, uplift: Math.round(monthly * rate), arrears };
}

function monthsBetween(from: Date, to: Date): number {
  return Math.max(
    0,
    (to.getUTCFullYear() - from.getUTCFullYear()) * 12 +
      (to.getUTCMonth() - from.getUTCMonth())
  );
}

export function computeOutcome(rec: Record_, svc: ServiceDef): OutcomeData {
  const now = new Date();

  switch (svc.outcome) {
    case "lifecert":
      return {
        kind: "lifecert",
        validUntil: validUntilFor(new Date(rec.createdAt)).toISOString(),
      };

    case "sanction": {
      const monthly = monthlyFor(rec, svc);
      /* Atal Pension Yojana is an enrolment, not a sanction: the number is a
         PRAN rather than a PPO, and the first payment is the sixtieth
         birthday, which for most applicants is decades away. Saying "first
         money in 30 days" would be a straightforward lie. */
      if (svc.id === "apy") {
        return {
          kind: "sanction",
          orderNo: `PRAN-${now.getFullYear()}-${tail(6)}`,
          monthly,
          firstPaymentDate: apySixtiethBirthday(rec.values.dob ?? "", now).toISOString(),
        };
      }
      return {
        kind: "sanction",
        orderNo: `PPO-${now.getFullYear()}-${tail(6)}`,
        monthly,
        firstPaymentDate: addDays(now, svc.typicalDays).toISOString(),
      };
    }

    case "change":
      return {
        kind: "change",
        effectiveFrom: addDays(now, svc.typicalDays).toISOString(),
      };

    case "increase": {
      const current = num(rec.values.currentPension, 12000);

      /* Restoring a commuted pension is the same shape as the 80+ increase —
         a date decides it and the arrears are the point — but the sum is
         different. The monthly amount was cut to repay a lump sum; putting it
         back means adding that cut portion again, owed from the fifteenth
         anniversary of the day it started. */
      if (svc.id === "restorecommuted") {
        const from = restorationDueOn(rec.values.commutedOn ?? "");
        const uplift = commutedPortion(current);
        const months = from ? monthsBetween(from, now) : 0;
        return {
          kind: "increase",
          newMonthly: current + uplift,
          arrears: uplift * months,
          owedFrom: from ? from.toISOString() : undefined,
        };
      }

      const from = age80EffectiveFrom(rec.values.dob ?? "");
      // Every rupee since the first of the month they turned 80, at whatever
      // rate applied along the way.
      const { rate, uplift, arrears } = additionalPension(rec.values.dob ?? "", current, now);
      return {
        kind: "increase",
        newMonthly: current + uplift,
        ratePercent: Math.round(rate * 100),
        arrears,
        owedFrom: from ? from.toISOString() : undefined,
      };
    }

    /* A one-time payment, or help that is not money at all. */
    case "grant": {
      if (svc.id === "annapurna") {
        const d = dictFor(rec.lang);
        return {
          kind: "grant",
          grantInKind: (d.outcome as Record<string, string>).annapurnaGrain,
          grantFrom: addDays(now, svc.typicalDays).toISOString(),
        };
      }
      return {
        kind: "grant",
        grantAmount: 20000,
        grantFrom: addDays(now, svc.typicalDays).toISOString(),
      };
    }

    case "grievance":
      return {
        kind: "grievance",
        docket: `CPG-${now.getFullYear()}-${tail(7)}`,
        answerBy: addDays(now, svc.typicalDays).toISOString(),
      };
  }
}

/** Plausible monthly amounts. Mocked, but not arbitrary. */
function monthlyFor(rec: Record_, svc: ServiceDef): number {
  const age = num(rec.values.age, 0);
  switch (svc.id) {
    case "oldage":
      return age >= 80 ? 1250 : 1000;
    case "widow":
      return age >= 80 ? 1250 : 1050;
    case "disability":
      return age >= 80 ? 1250 : 1000;
    case "epfpension": {
      // The EPS-95 formula, roughly: pensionable salary x service / 70.
      const years = num(rec.values.serviceYears, 10);
      return Math.max(1000, Math.round((15000 * Math.min(years, 35)) / 70));
    }
    case "govtretire": {
      const years = num(rec.values.serviceYears, 20);
      return Math.round(22500 * Math.min(years / 33, 1));
    }
    case "familypension": {
      const rec2 = lookupPpo(rec.values.deceasedPpo ?? "");
      // Thirty per cent of their last pay, floored at the statutory minimum.
      return Math.max(9000, Math.round((rec2?.monthly ?? 20000) * 0.3));
    }
    case "apy":
      return num(rec.values.apyAmount, 1000);
    default:
      return 1000;
  }
}

/* ==================================================================
 * Advancing a record
 * ================================================================== */
export function settleIfDue(rec: Record_, now = Date.now()): Record_ {
  const svc = serviceById(rec.serviceId);
  if (!svc) return rec;

  if (rec.state === "SUBMITTED") {
    transition(rec, "VERIFYING", "mock-pda", `Picked up: ${stageName(svc, 1)}`);
  }
  if (rec.state !== "VERIFYING") return rec;
  if (rec.nextStageAt === null) return rec;

  const durations = stageDurations(svc, rec.totalMs);
  const last = svc.stages.length - 1;

  // Walk forward as many stages as the clock allows. A page left open for
  // ten minutes must catch up in one read, not one stage per poll.
  while (rec.stageIndex < last && now >= rec.nextStageAt) {
    rec.stageIndex += 1;
    rec.audit.push({
      at: new Date().toISOString(),
      from: "VERIFYING",
      to: "VERIFYING",
      actor: "mock-pda",
      note: `Reached: ${stageName(svc, rec.stageIndex)}`,
    });
    rec.nextStageAt = rec.nextStageAt + (durations[rec.stageIndex] || 0);
  }

  if (rec.stageIndex < last || now < rec.nextStageAt) return rec;

  const { state, code } = decideOutcome(rec, svc);
  rec.errorCode = code;
  rec.nextStageAt = null;

  if (state === "ACCEPTED") {
    rec.outcome = computeOutcome(rec, svc);
    transition(rec, "ACCEPTED", "mock-pda", `Approved (${svc.realPortal})`);
    queueSms(rec, "accepted");
  } else {
    rec.outcome = null;
    transition(rec, "NEEDS_FIX", "mock-pda", `Returned ${code}`);
    queueSms(rec, "needs-fix");
  }
  return rec;
}

function stageName(svc: ServiceDef, i: number): string {
  return svc.stages[Math.min(i, svc.stages.length - 1)]?.id ?? "unknown";
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
  const dateish =
    rec.outcome?.validUntil ??
    rec.outcome?.firstPaymentDate ??
    rec.outcome?.effectiveFrom ??
    rec.outcome?.answerBy;
  if (dateish) vars.date = formatDate(dateish, rec.lang);

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
  serviceId: ServiceId;
  lang: Lang;
  mode: Mode;
  name: string;
  mobile: string;
  helperName: string;
  values: Record<string, string>;
  docCount: number;
  precheckFlagged: boolean;
  resolveInMs: number;
  forced: Record_["forced"];
}): Record_ {
  const svc = serviceById(input.serviceId);
  const now = new Date();

  const rec: Record_ = {
    id: newDlcId(now),
    requestId: input.requestId,
    serviceId: input.serviceId,
    createdAt: now.toISOString(),
    state: "DRAFT",
    stageIndex: 0,
    lang: input.lang,
    mode: input.mode,
    name: input.name,
    mobile: input.mobile,
    helperName: input.helperName,
    values: input.values,
    docCount: input.docCount,
    precheckFlagged: input.precheckFlagged,
    errorCode: null,
    outcome: null,
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
    nextStageAt: null,
    totalMs: input.resolveInMs,
    forced: input.forced,
  };

  transition(rec, "SUBMITTED", "citizen", "Sent from the phone");

  const durations = svc ? stageDurations(svc, input.resolveInMs) : [input.resolveInMs];
  rec.nextStageAt = Date.now() + (durations[1] ?? durations[0] ?? 0);

  queueSms(rec, "received");

  store.records.set(rec.id, rec);
  store.idempotency.set(rec.requestId, rec.id);
  return rec;
}
