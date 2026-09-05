import { queueSms, settleIfDue } from "@/lib/mockPda";
import { publicRecord } from "@/lib/publicRecord";
import { demoContext, digitsOnly, fail, ok, readJson } from "@/lib/reqContext";
import { serviceById } from "@/lib/services/catalogue";
import { transition } from "@/lib/stateMachine";
import { store } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Body {
  requestId?: string;
  precheckFlagged?: boolean;
  /**
   * The corrected details. Optional: a photo retake sends none, and the
   * record keeps everything it had.
   */
  values?: Record<string, string>;
}

/**
 * The recovery loop. The same record keeps the same reference number and the
 * audit log grows rather than being replaced. That continuity is the point:
 * a pensioner who has to start from zero after one bad photo is a pensioner
 * who gives up.
 *
 * It used to take a new photo and nothing else, on the assumption that a
 * rejection was always about the picture. It is not: the office rejects a
 * PPO that is not in its register, a name that does not match the Aadhaar
 * card, a bank account that has been closed. Every one of those is a
 * correction to a *field*, and this route quietly threw those corrections
 * away — the reader retyped the number, pressed send, and the office
 * re-read the same wrong number and said the same thing again. Which is
 * indistinguishable, from the outside, from the button not working.
 *
 * So corrected values are accepted, validated exactly as a first submission
 * is, and written to the record before it goes back into the chain.
 */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const rec = store.records.get(id);
  if (!rec) return fail("NOT_FOUND", "We could not find that reference number.", 404);

  const body = await readJson<Body>(req);
  const requestId = typeof body?.requestId === "string" ? body.requestId.trim() : "";

  // Same idempotency contract as /api/submit: a retried resend after a
  // dropped connection must not count as a second attempt.
  if (requestId && store.idempotency.get(requestId) === rec.id) {
    return ok({ record: publicRecord(settleIfDue(rec)), duplicate: true });
  }

  if (rec.state !== "NEEDS_FIX") {
    return fail(
      "NOT_FIXABLE",
      "That one is already settled. There is nothing to send again.",
      409
    );
  }

  /* ---- The correction ------------------------------------------------
     Validated against the same service definition /api/submit uses, so a
     resend cannot put a record into a state a first submission could not.
     ------------------------------------------------------------------- */
  if (body?.values && typeof body.values === "object") {
    const svc = serviceById(rec.serviceId);
    if (!svc) return fail("UNKNOWN_SERVICE", "We do not know that one.", 400);

    const values: Record<string, string> = { ...rec.values };
    for (const [k, v] of Object.entries(body.values)) {
      if (typeof v === "string") values[k] = v.trim();
    }

    for (const field of svc.fields) {
      if (!field.required) continue;
      if (field.showIf) {
        const gate = values[field.showIf.field];
        if (!field.showIf.equals.includes(gate)) continue;
      }
      const v = values[field.id] ?? "";
      if (!v) return fail(`MISSING_${field.id.toUpperCase()}`, "Some details were missing.");

      if (field.type === "aadhaar" && digitsOnly(v).length !== 12) {
        return fail("AADHAAR_LENGTH", "The Aadhaar number was not 12 digits.");
      }
      if (field.type === "mobile" && digitsOnly(v).length !== 10) {
        return fail("MOBILE_LENGTH", "The mobile number was not 10 digits.");
      }
    }

    /* The stored record already holds a redacted Aadhaar. Only redact again
       when the reader actually retyped it, or the last four would be cut
       down to their own last four on every resend. */
    const typedAadhaar = typeof body.values.aadhaar === "string";
    if (typedAadhaar && values.aadhaar) {
      values.aadhaar = digitsOnly(values.aadhaar).slice(-4);
    }

    rec.values = values;
    // The name and mobile on the record are copies, kept for the SMS and
    // the receipt; they have to follow the correction or the outbox keeps
    // texting the old number.
    rec.name = values.fullName ?? values.name ?? rec.name;
    if (values.mobile) rec.mobile = digitsOnly(values.mobile);
  }

  const { forced, resolveInMs } = demoContext(req);

  rec.attempts += 1;
  rec.errorCode = null;
  rec.outcome = null;
  rec.precheckFlagged = body?.precheckFlagged === true;
  rec.forced = forced;
  // Back to the start of the approval chain, but the audit log keeps every
  // stage of the first attempt — that continuity is the whole point.
  rec.stageIndex = 0;
  rec.totalMs = resolveInMs;
  transition(rec, "SUBMITTED", "citizen", `Sent again (attempt ${rec.attempts})`);
  rec.nextStageAt = Date.now() + resolveInMs;
  queueSms(rec, "received");

  if (requestId) store.idempotency.set(requestId, rec.id);

  return ok({ record: publicRecord(settleIfDue(rec)), duplicate: false });
}
