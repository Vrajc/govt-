import type { OutcomeKind, ServiceId } from "./services/types";

/**
 * Shared types. Kept in one file so the client, the route handlers and the
 * mock pension office all agree on the shape of a submission without
 * importing each other's implementation.
 */

export type Lang = "en" | "hi" | "gu";
export const LANGS: Lang[] = ["en", "hi", "gu"];

export type Mode = "self" | "assisted";

/**
 * The state machine. Illegal transitions throw — see lib/stateMachine.ts.
 *
 * VERIFYING is not one opaque wait: a record in VERIFYING carries a
 * `stageIndex` that walks the service's real approval chain, so the citizen
 * sees "sitting at the Taluka office" rather than a spinner.
 */
export type AppState =
  | "DRAFT"
  | "SUBMITTED"
  | "VERIFYING"
  | "ACCEPTED"
  | "NEEDS_FIX";

export type Actor = "citizen" | "mock-pda" | "system";

export interface AuditEntry {
  at: string; // ISO timestamp
  from: AppState | null;
  to: AppState;
  actor: Actor;
  note: string;
}

/**
 * Outcome codes. The first six are the life-certificate codes from the
 * original brief; the rest come from the wider catalogue. Kept as a plain
 * string union so a new service can add one without touching this file.
 */
export const ERROR_CODES = [
  // life certificate
  "ERR_FACE_QUALITY_LOW",
  "ERR_LIVENESS_FAIL",
  "ERR_AADHAAR_NAME_MISMATCH",
  "ERR_PPO_NOT_FOUND",
  "ERR_FACE_NOT_CENTERED",
  "ERR_DUPLICATE_SUBMISSION",
  // means-tested schemes
  "ERR_BPL_NOT_LISTED",
  "ERR_AGE_PROOF_UNCLEAR",
  "ERR_DEATH_CERT_UNCLEAR",
  "ERR_DISABILITY_CERT",
  // employment schemes
  "ERR_UAN_NOT_FOUND",
  "ERR_KYC_PENDING",
  "ERR_EXIT_DATE_MISSING",
  "ERR_SERVICE_BOOK",
  "ERR_NOMINATION_MISSING",
  // family pension
  "ERR_NOT_IN_PPO",
  // service requests
  "ERR_BANK_MISMATCH",
  "ERR_ACCOUNT_CLOSED",
  "ERR_ALREADY_APPLIED",
  // shared
  "ERR_DOC_UNREADABLE",
  "ERR_NEED_MORE_INFO",
] as const;

export type ErrorCode = (typeof ERROR_CODES)[number];

export function isErrorCode(v: unknown): v is ErrorCode {
  return typeof v === "string" && (ERROR_CODES as readonly string[]).includes(v);
}

/* ==================================================================
 * The client-side draft
 * ================================================================== */

export interface PhotoQuality {
  luminance: number;
  sharpness: number;
  centreVariance: number;
  verdict: "ok" | "dark" | "bright" | "blurry" | "no-face";
}

/** What the client keeps in sessionStorage while filling any service in. */
export interface Application {
  requestId: string;
  lang: Lang;
  mode: Mode;
  /** Which service is being filled in. Null on the hub. */
  serviceId: ServiceId | null;

  /** Answers to the eligibility questions, by question id. */
  eligibility: Record<string, string>;
  /** Form values, by field id. */
  values: Record<string, string>;
  /** Photographed documents, by document id — data URLs. */
  docs: Record<string, string>;

  helperName: string;
  otpVerified: boolean;

  /** The face photo, for services that need one. */
  photo: string | null;
  photoQuality: PhotoQuality | null;

  /** Set when re-sending against an existing record. */
  fixingId: string | null;
}

/* ==================================================================
 * The server-side record
 * ================================================================== */

/** What a settled service hands back. Shape depends on the kind. */
export interface OutcomeData {
  kind: OutcomeKind;
  /** lifecert */
  validUntil?: string;
  /** sanction */
  orderNo?: string;
  monthly?: number;
  firstPaymentDate?: string;
  /** change */
  effectiveFrom?: string;
  /** increase */
  newMonthly?: number;
  arrears?: number;
  owedFrom?: string;
  /** grievance */
  docket?: string;
  answerBy?: string;
}

/** Server-side record. Would be a Postgres row in production. */
export interface Record_ {
  id: string; // PS-2026-XXXXXXXX
  requestId: string;
  serviceId: ServiceId;
  createdAt: string;
  state: AppState;
  /** How many of the service's stages are complete. */
  stageIndex: number;

  lang: Lang;
  mode: Mode;
  /** Pulled out of `values` for the receipt and the messages. */
  name: string;
  mobile: string;
  helperName: string;

  /** Everything else the form collected, already redacted. */
  values: Record<string, string>;
  /** How many documents were photographed. Never the images themselves. */
  docCount: number;

  /** Advisory only: what our own pre-check thought before sending. */
  precheckFlagged: boolean;
  errorCode: ErrorCode | null;
  outcome: OutcomeData | null;

  attempts: number;
  audit: AuditEntry[];
  /** When the next stage becomes due. Compared against Date.now() on read. */
  nextStageAt: number | null;
  /** Total wait for this record, in ms — split across the stages by weight. */
  totalMs: number;
  /** Outcome pinned by /demo, if any. */
  forced: { outcome: "ACCEPTED" | "NEEDS_FIX"; code: ErrorCode | null } | null;
}

export interface SmsMessage {
  id: string;
  at: string;
  to: string;
  lang: Lang;
  body: string;
  kind: "received" | "accepted" | "needs-fix" | "reminder";
}

/** Every route handler returns one of these two shapes. */
export type ApiOk<T> = { ok: true } & T;
export interface ApiErr {
  ok: false;
  /** Machine code, for the collapsed technical details. */
  code: string;
  /** Plain-language sentence the UI can render as-is if it has nothing better. */
  message: string;
}

export function apiErr(code: string, message: string): ApiErr {
  return { ok: false, code, message };
}
