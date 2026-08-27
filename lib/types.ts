/**
 * Shared types. Kept in one file so the client, the route handlers and the
 * mock PDA all agree on the shape of a submission without importing each
 * other's implementation.
 */

export type Lang = "en" | "hi" | "gu";
export const LANGS: Lang[] = ["en", "hi", "gu"];

export type Mode = "self" | "assisted";

/** The state machine. Illegal transitions throw — see lib/stateMachine.ts */
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

/** The six codes the real system can return that we know how to explain. */
export const ERROR_CODES = [
  "ERR_FACE_QUALITY_LOW",
  "ERR_LIVENESS_FAIL",
  "ERR_AADHAAR_NAME_MISMATCH",
  "ERR_PPO_NOT_FOUND",
  "ERR_FACE_NOT_CENTERED",
  "ERR_DUPLICATE_SUBMISSION",
] as const;

export type ErrorCode = (typeof ERROR_CODES)[number];

export function isErrorCode(v: unknown): v is ErrorCode {
  return typeof v === "string" && (ERROR_CODES as readonly string[]).includes(v);
}

/** What the client keeps in sessionStorage while filling the form. */
export interface Application {
  requestId: string;
  lang: Lang;
  mode: Mode;
  name: string;
  helperName: string;
  ppo: string;
  aadhaar: string; // digits only, mock
  mobile: string; // digits only
  otpVerified: boolean;
  photo: string | null; // data URL, resized to 512px
  /** Client-side (layer 1) verdict captured at the moment of capture. */
  photoQuality: PhotoQuality | null;
  /** Set when we are re-sending a photo for an existing record. */
  fixingId: string | null;
}

export interface PhotoQuality {
  luminance: number;
  sharpness: number;
  centreVariance: number;
  verdict: "ok" | "dark" | "bright" | "blurry" | "no-face";
}

/** Server-side record. Would be a Postgres row in production. */
export interface Record_ {
  id: string; // DLC-2026-XXXXXXXX
  requestId: string;
  createdAt: string;
  state: AppState;
  lang: Lang;
  mode: Mode;
  name: string;
  helperName: string;
  ppo: string;
  aadhaarLast4: string; // we never keep the full number, even in the mock
  mobile: string;
  /** Advisory only: what our own pre-check thought before sending. */
  precheckFlagged: boolean;
  errorCode: ErrorCode | null;
  validUntil: string | null; // ISO date, set on ACCEPTED
  attempts: number;
  audit: AuditEntry[];
  /** When the mock PDA will resolve. Compared against Date.now() on read. */
  resolveAt: number | null;
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
