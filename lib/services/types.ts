/**
 * The service catalogue's type layer.
 *
 * Every government pension process in this app is a *data definition*, not a
 * hand-built set of screens. One engine renders all of them. That is the
 * whole architectural bet: India runs dozens of pension schemes across the
 * centre and 28 states, and the only version of this that could ever ship
 * for real is one where adding the next scheme is a data file.
 */

export type ServiceId =
  // ---- starting a pension you do not yet have ----
  | "oldage" // IGNOAPS — old-age pension, NSAP
  | "widow" // IGNWPS — widow pension, NSAP
  | "disability" // IGNDPS — disability pension, NSAP
  | "epfpension" // EPS-95 — Form 10D, EPFO
  | "govtretire" // Central civil service — Form 6-A, Bhavishya
  | "apy" // Atal Pension Yojana
  | "annapurna" // Annapurna — foodgrain for the elderly with no pension
  // ---- after a death in the family ----
  | "familypension" // Form 14
  | "nfbs" // National Family Benefit Scheme — one-time grant
  // ---- when you already get a pension ----
  | "lifecert" // annual Digital Life Certificate
  | "changebank" // move the pension to another bank
  | "age80" // additional pension on turning 80
  | "restorecommuted" // commuted portion restored after 15 years
  | "notarrived"; // the pension has not come — grievance

/** The three doors on the hub screen. */
export type Category = "start" | "have" | "family";

/* ==================================================================
 * Form fields
 * ================================================================== */

export type FieldType =
  | "name"
  | "text"
  | "digits"
  | "aadhaar"
  | "mobile"
  | "date"
  | "choice"
  | "money"
  | "ifsc"
  | "account"
  | "ppo"
  | "uan"
  | "address";

export interface FieldDef {
  id: string;
  type: FieldType;
  required: boolean;
  /**
   * Which heading this field sits under. A thirteen-field form reads as
   * four short ones when it is grouped, and that is most of the
   * difference between a form someone finishes and one they abandon.
   * Key into the `groups` dictionary.
   */
  group?: string;
  /** Key into the shared `fields` dictionary. Defaults to `id`. */
  labelKey?: string;
  helpKey?: string;
  /** Exact digit count for `digits` fields. */
  digits?: number;
  options?: { value: string; labelKey: string }[];
  /** Render only when another field holds one of these values. */
  showIf?: { field: string; equals: string[] };
}

/* ==================================================================
 * Documents
 * ==================================================================
 * Every one of these can be satisfied by photographing the paper with the
 * phone. "Scan and upload a PDF" is where these journeys die.
 */

export interface DocDef {
  /** Key into the shared `docs` dictionary. */
  id: string;
  required: boolean;
}

/* ==================================================================
 * Eligibility
 * ==================================================================
 * Asked before anything is filled in, because the cruellest thing the real
 * system does is let someone complete a 20-field form and then tell them
 * they were never eligible.
 */

export interface EligQ {
  id: string;
  type: "yesno" | "age" | "choice";
  /** For yesno/choice: the answers that keep you eligible. */
  pass?: string[];
  /** For age: the inclusive range that keeps you eligible. */
  range?: { min?: number; max?: number };
  options?: { value: string; labelKey: string }[];
  /** Shown when the answer disqualifies. Never a dead end. */
  failKey: string;
  /** Where to send them instead — the whole point of asking. */
  suggest?: ServiceId;
}

/* ==================================================================
 * Tracking stages
 * ==================================================================
 * The real approval chain, named and attributed. "Checking..." for six
 * weeks is the silence this app exists to end — a citizen who can see that
 * their file is sitting with the Taluka office knows who to ring.
 */

export type Actor = "citizen" | "village" | "block" | "district" | "office" | "bank" | "system";

export interface StageDef {
  /** Key into the shared `stages` dictionary. */
  id: string;
  actor: Actor;
  /** Share of the total wait spent here. Relative, not absolute. */
  weight: number;
}

/* ==================================================================
 * The service itself
 * ================================================================== */

/** What a finished service hands back, so the receipt can render anything. */
export type OutcomeKind =
  | "lifecert" // valid until a date
  | "sanction" // a new pension: PPO number, monthly amount, first payment
  | "change" // effective from a date
  | "increase" // a new amount plus arrears
  | "grant" // a one-time payment, or help given in kind rather than money
  | "grievance"; // a docket number and who is looking at it

export interface ServiceDef {
  id: ServiceId;
  category: Category;

  /* ---- grounding in the real world, shown on the service page ---- */
  /** The actual government system this would call. */
  realPortal: string;
  /** The actual paper form, where one exists. */
  realForm: string | null;
  /** Who actually decides. Key into `svc`. */
  authorityKey: string;
  /** Honest expectation, in days. */
  typicalDays: number;

  /* ---- the journey ---- */
  eligibility: EligQ[];
  documents: DocDef[];
  fields: FieldDef[];
  /** A face photo. True for the life certificate and for new applications. */
  needsPhoto: boolean;
  /** Skip the one-time code — used by services that only read, not write. */
  skipOtp?: boolean;

  stages: StageDef[];
  outcome: OutcomeKind;
  /** Codes this service can come back with. */
  codes: string[];
}
