import type { EligQ, FieldDef, ServiceDef } from "./types";

/**
 * The shared logic behind /apply/[service]/[step]. Kept out of the page so
 * the step order and the validation rules can be reasoned about — and one
 * day tested — without a browser.
 */

export const STEPS = ["who", "eligibility", "documents", "details", "photo", "review"] as const;
export type Step = (typeof STEPS)[number];

/** Which steps this particular service actually has. */
export function stepsFor(svc: ServiceDef): Step[] {
  const out: Step[] = ["who"];
  if (svc.eligibility.length > 0) out.push("eligibility");
  if (svc.documents.length > 0) out.push("documents");
  out.push("details");
  if (svc.needsPhoto) out.push("photo");
  out.push("review");
  return out;
}

export function stepIndex(svc: ServiceDef, step: Step): number {
  return stepsFor(svc).indexOf(step);
}

export function nextStep(svc: ServiceDef, step: Step): Step | null {
  const list = stepsFor(svc);
  const i = list.indexOf(step);
  return i >= 0 && i < list.length - 1 ? list[i + 1] : null;
}

export function prevStep(svc: ServiceDef, step: Step): Step | null {
  const list = stepsFor(svc);
  const i = list.indexOf(step);
  return i > 0 ? list[i - 1] : null;
}

export function isStep(v: string): v is Step {
  return (STEPS as readonly string[]).includes(v);
}

/**
 * Which step a rejection actually belongs to.
 *
 * "Fix and send again" used to drop everyone at the first step of the flow —
 * the photo screen if the service had one, the details form if it did not.
 * So a pensioner told their bank account did not match was made to retake a
 * photograph of their face before they could reach the field with the
 * mistake in it, and a blurred death certificate sent someone to a form
 * they had already filled in correctly.
 *
 * The office tells us which check failed. This turns that into the screen
 * that holds the answer, so the button lands on the thing that is wrong.
 *
 * Codes that are not a mistake in the application — it was already sent,
 * it is a duplicate — deliberately map to `review`: there is nothing to
 * edit, and review is where the reader can see the whole thing before
 * deciding to send it a second time.
 */
const STEP_FOR_ERROR: Record<string, Step> = {
  /* The face, and only the face. */
  ERR_FACE_NOT_CENTERED: "photo",
  ERR_FACE_QUALITY_LOW: "photo",
  ERR_LIVENESS_FAIL: "photo",

  /* A piece of paper that has to be photographed again. */
  ERR_DOC_UNREADABLE: "documents",
  ERR_AGE_PROOF_UNCLEAR: "documents",
  ERR_DEATH_CERT_UNCLEAR: "documents",
  ERR_DISABILITY_CERT: "documents",
  ERR_SERVICE_BOOK: "documents",
  ERR_NOMINATION_MISSING: "documents",

  /* Something typed: a number, a name, a date. */
  ERR_BANK_MISMATCH: "details",
  ERR_ACCOUNT_CLOSED: "details",
  ERR_AADHAAR_NAME_MISMATCH: "details",
  ERR_UAN_NOT_FOUND: "details",
  ERR_EXIT_DATE_MISSING: "details",
  ERR_PPO_NOT_FOUND: "details",
  ERR_NOT_IN_PPO: "details",
  ERR_KYC_PENDING: "details",
  ERR_NEED_MORE_INFO: "details",

  /* An answer about who they are, which is the eligibility questions. */
  ERR_BPL_NOT_LISTED: "eligibility",

  /* Nothing to correct. */
  ERR_ALREADY_APPLIED: "review",
  ERR_DUPLICATE_SUBMISSION: "review",
};

/**
 * The step to reopen for a rejection, clamped to the steps this service
 * actually has. A service with no photo step cannot be sent to `photo`
 * however the office phrased the failure, so an unmapped or impossible
 * code falls back to the last editable step before review — which is the
 * widest net, not the narrowest.
 */
export function stepForError(svc: ServiceDef, code: string | null | undefined): Step {
  const list = stepsFor(svc);
  const want = code ? STEP_FOR_ERROR[code] : undefined;
  if (want && list.includes(want)) return want;
  const editable = list.filter((s) => s !== "review" && s !== "who");
  return editable.length > 0 ? editable[editable.length - 1] : list[0];
}

/* ==================================================================
 * Eligibility
 * ================================================================== */

export interface EligResult {
  /** Every question has an answer. */
  complete: boolean;
  /** The first question whose answer disqualifies, if any. */
  failed: EligQ | null;
}

export function evaluateEligibility(
  svc: ServiceDef,
  answers: Record<string, string>
): EligResult {
  let complete = true;

  for (const q of svc.eligibility) {
    const a = answers[q.id];
    if (a === undefined || a === "") {
      complete = false;
      continue;
    }

    if (q.type === "age") {
      const n = Number(a);
      if (!Number.isFinite(n)) {
        complete = false;
        continue;
      }
      const { min, max } = q.range ?? {};
      if ((min !== undefined && n < min) || (max !== undefined && n > max)) {
        return { complete: true, failed: q };
      }
      continue;
    }

    if (q.pass && !q.pass.includes(a)) {
      return { complete: true, failed: q };
    }
  }

  return { complete, failed: null };
}

/* ==================================================================
 * Field validation
 * ==================================================================
 * Errors are sentences, never "Invalid input" — the caller passes a
 * translator so the message comes back already in the right language.
 */

export type T = (key: string, vars?: Record<string, string | number>) => string;

const digits = (v: string) => v.replace(/\D/g, "");

export function validateField(f: FieldDef, raw: string, t: T): string | null {
  const v = (raw ?? "").trim();

  if (!v) return f.required ? t("apply.errRequired") : null;

  switch (f.type) {
    case "aadhaar": {
      const n = digits(v).length;
      return n === 12 ? null : t("apply.errDigits", { n, want: 12 });
    }
    case "mobile": {
      const n = digits(v).length;
      return n === 10 ? null : t("apply.errDigits", { n, want: 10 });
    }
    case "uan": {
      const n = digits(v).length;
      // Optional field: empty is fine, a wrong length is not.
      return n === 12 ? null : t("apply.errDigits", { n, want: 12 });
    }
    case "digits": {
      if (!/^\d+$/.test(v)) return t("apply.errRequired");
      if (f.digits && digits(v).length > f.digits) {
        return t("apply.errDigits", { n: digits(v).length, want: f.digits });
      }
      return null;
    }
    case "ifsc":
      return /^[A-Z]{4}0[A-Z0-9]{6}$/i.test(v) ? null : t("apply.errIfsc");
    case "date":
      return Number.isNaN(new Date(v).getTime()) ? t("apply.errDate") : null;
    case "money":
      return /^\d+$/.test(digits(v)) && digits(v).length > 0 ? null : t("apply.errRequired");
    case "choice":
      return f.options?.some((o) => o.value === v) ? null : t("apply.errPick");
    case "account":
      return digits(v).length >= 6 ? null : t("apply.errRequired");
    default:
      return null;
  }
}

/** Fields that should be shown, given what has been answered so far. */
export function visibleFields(svc: ServiceDef, values: Record<string, string>): FieldDef[] {
  return svc.fields.filter((f) => {
    if (!f.showIf) return true;
    return f.showIf.equals.includes(values[f.showIf.field] ?? "");
  });
}

export function validateAll(
  svc: ServiceDef,
  values: Record<string, string>,
  t: T
): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const f of visibleFields(svc, values)) {
    const err = validateField(f, values[f.id] ?? "", t);
    if (err) errors[f.id] = err;
  }
  return errors;
}

/** The keyboard and autofill hints for each field type. */
export function inputPropsFor(f: FieldDef): {
  inputMode?: "numeric" | "tel" | "text";
  type?: string;
  maxLength?: number;
  autoComplete?: string;
  placeholder?: string;
} {
  switch (f.type) {
    case "aadhaar":
      return { inputMode: "numeric", maxLength: 14, autoComplete: "off", placeholder: "0000 0000 0000" };
    case "mobile":
      return { inputMode: "numeric", maxLength: 10, autoComplete: "tel-national", placeholder: "00000 00000" };
    case "uan":
      return { inputMode: "numeric", maxLength: 12, autoComplete: "off" };
    case "digits":
      return { inputMode: "numeric", maxLength: f.digits ?? 4, autoComplete: "off" };
    case "money":
      return { inputMode: "numeric", autoComplete: "off" };
    /* Dates never reach a plain <input>: `DateField` renders them as three
       boxes. Handing back `type: "date"` here would quietly restore the
       native picker, whose written format follows the browser's locale
       rather than the reader's language. */
    case "name":
      return { autoComplete: "name" };
    case "ifsc":
      return { autoComplete: "off", maxLength: 11, placeholder: "SBIN0001234" };
    case "account":
      return { inputMode: "numeric", autoComplete: "off" };
    case "ppo":
      return { autoComplete: "off", placeholder: "PPO-2024-000123" };
    default:
      return { autoComplete: "off" };
  }
}

/** `XXXX XXXX XXXX` while typing, digits only underneath. */
export function formatAadhaar(d: string): string {
  return d.slice(0, 12).replace(/(\d{4})(?=\d)/g, "$1 ").trim();
}

/** Normalise what goes into state, per field type. */
export function normalise(f: FieldDef, raw: string): string {
  switch (f.type) {
    case "aadhaar":
      return digits(raw).slice(0, 12);
    case "mobile":
      return digits(raw).slice(0, 10);
    case "uan":
      return digits(raw).slice(0, 12);
    case "digits":
      return digits(raw).slice(0, f.digits ?? 4);
    case "money":
      return digits(raw).slice(0, 9);
    case "account":
      return digits(raw).slice(0, 20);
    case "ifsc":
    case "ppo":
      return raw.toUpperCase().trim();
    default:
      return raw;
  }
}

/** Does this service need the one-time code step inside details? */
export function needsOtp(svc: ServiceDef): boolean {
  return !svc.skipOtp && svc.fields.some((f) => f.type === "mobile");
}
