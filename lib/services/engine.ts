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
