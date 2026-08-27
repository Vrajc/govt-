import { createRecord, settleIfDue, TRANSPORT_FAILURE_RATE } from "@/lib/mockPda";
import { store } from "@/lib/store";
import { demoContext, digitsOnly, fail, langOf, ok, readJson } from "@/lib/reqContext";
import type { Mode } from "@/lib/types";
import { publicRecord } from "@/lib/publicRecord";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Body {
  requestId?: string;
  lang?: string;
  mode?: Mode;
  name?: string;
  helperName?: string;
  ppo?: string;
  aadhaar?: string;
  mobile?: string;
  precheckFlagged?: boolean;
}

export async function POST(req: Request) {
  const body = await readJson<Body>(req);
  if (!body) return fail("BAD_JSON", "Some details were missing.");

  const requestId = typeof body.requestId === "string" ? body.requestId.trim() : "";
  if (!requestId) return fail("NO_REQUEST_ID", "Some details were missing.");

  /* ---- Idempotency ------------------------------------------------
   * A double tap, a retried request after a dropped connection, or a
   * refresh mid-send must never create two pension records. The client
   * generates the key once per attempt and reuses it on retry.
   * ---------------------------------------------------------------- */
  const existingId = store.idempotency.get(requestId);
  if (existingId) {
    const existing = store.records.get(existingId);
    if (existing) {
      return ok({ record: publicRecord(settleIfDue(existing)), duplicate: true });
    }
  }

  const ppo = typeof body.ppo === "string" ? body.ppo.trim() : "";
  const aadhaar = digitsOnly(body.aadhaar);
  const mobile = digitsOnly(body.mobile);
  const name = typeof body.name === "string" ? body.name.trim() : "";

  if (!ppo) return fail("NO_PPO", "The PPO number was missing.");
  if (aadhaar.length !== 12) return fail("AADHAAR_LENGTH", "The Aadhaar number was not 12 digits.");
  if (mobile.length !== 10) return fail("MOBILE_LENGTH", "The mobile number was not 10 digits.");
  if (!name) return fail("NO_NAME", "The name was missing.");

  // Injected failure, so the "couldn't send" recovery path is demonstrable.
  if (TRANSPORT_FAILURE_RATE > 0 && Math.random() < TRANSPORT_FAILURE_RATE) {
    return fail("UPSTREAM_DOWN", "Could not reach the pension office. Nothing was lost.", 503);
  }

  const { forced, resolveInMs } = demoContext(req);

  const rec = createRecord({
    requestId,
    lang: langOf(body.lang),
    mode: body.mode === "assisted" ? "assisted" : "self",
    name,
    // We keep only the last four digits, even in a mock. Storing the full
    // number "just for the demo" is how habits get formed.
    aadhaarLast4: aadhaar.slice(-4),
    helperName: typeof body.helperName === "string" ? body.helperName.trim() : "",
    ppo,
    mobile,
    precheckFlagged: body.precheckFlagged === true,
    resolveInMs,
    forced,
  });

  return ok({ record: publicRecord(settleIfDue(rec)), duplicate: false }, 201);
}
