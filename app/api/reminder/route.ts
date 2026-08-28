import { queueSms } from "@/lib/mockPda";
import { fail, ok, readJson } from "@/lib/reqContext";
import { store } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Body {
  id?: string;
}

/**
 * "Remind me next year". In production this is a row in a scheduled-job
 * table; staggering the send date by PPO series is what would flatten the
 * November peak described on /about.
 *
 * Here it writes the reminder and drops the message it would send into the
 * visible outbox immediately, so the design is reviewable today.
 */
export async function POST(req: Request) {
  const body = await readJson<Body>(req);
  const id = typeof body?.id === "string" ? body.id : "";
  const rec = store.records.get(id);
  if (!rec) return fail("NOT_FOUND", "We could not find that reference number.", 404);
  const validUntil = rec.outcome?.validUntil;
  if (!validUntil) return fail("NOT_ACCEPTED", "There is nothing to remind you about yet.", 409);

  const due = new Date(validUntil);
  const remindAt = new Date(due);
  remindAt.setUTCMonth(remindAt.getUTCMonth() - 1); // one month before it lapses

  const already = store.reminders.find((r) => r.id === rec.id);
  if (!already) {
    store.reminders.push({
      id: rec.id,
      mobile: rec.mobile,
      ppo: rec.values.ppo ?? rec.id,
      at: remindAt.toISOString(),
    });
    queueSms(rec, "reminder");
  }

  return ok({ remindAt: remindAt.toISOString() });
}
