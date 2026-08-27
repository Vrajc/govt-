import { queueSms, settleIfDue } from "@/lib/mockPda";
import { publicRecord } from "@/lib/publicRecord";
import { demoContext, fail, ok, readJson } from "@/lib/reqContext";
import { transition } from "@/lib/stateMachine";
import { store } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Body {
  requestId?: string;
  precheckFlagged?: boolean;
}

/**
 * The recovery loop. A new photo only — every other detail is preserved,
 * the same record keeps the same reference number, and the audit log grows
 * rather than being replaced. That continuity is the point: a pensioner who
 * has to start from zero after one bad photo is a pensioner who gives up.
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

  const { forced, resolveInMs } = demoContext(req);

  rec.attempts += 1;
  rec.errorCode = null;
  rec.precheckFlagged = body?.precheckFlagged === true;
  rec.forced = forced;
  transition(rec, "SUBMITTED", "citizen", `New photo sent (attempt ${rec.attempts})`);
  rec.resolveAt = Date.now() + resolveInMs;
  queueSms(rec, "received");

  if (requestId) store.idempotency.set(requestId, rec.id);

  return ok({ record: publicRecord(settleIfDue(rec)), duplicate: false });
}
