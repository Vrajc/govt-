import { settleIfDue } from "@/lib/mockPda";
import { publicRecord } from "@/lib/publicRecord";
import { fail, ok } from "@/lib/reqContext";
import { store } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * The status page polls this every 3 seconds. `settleIfDue` is what advances
 * the state machine — the mock pension office does its work lazily on read,
 * which is the only model that survives a serverless cold start.
 */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const rec = store.records.get(id);

  if (!rec) {
    return fail("NOT_FOUND", "We could not find that reference number.", 404);
  }

  return ok({ record: publicRecord(settleIfDue(rec)) });
}
