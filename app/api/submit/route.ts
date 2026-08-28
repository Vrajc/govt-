import { createRecord, settleIfDue, TRANSPORT_FAILURE_RATE } from "@/lib/mockPda";
import { serviceById } from "@/lib/services/catalogue";
import { store } from "@/lib/store";
import { demoContext, digitsOnly, fail, langOf, ok, readJson } from "@/lib/reqContext";
import type { Mode } from "@/lib/types";
import { publicRecord } from "@/lib/publicRecord";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Body {
  requestId?: string;
  serviceId?: string;
  lang?: string;
  mode?: Mode;
  helperName?: string;
  values?: Record<string, string>;
  /** Only the count — document images stay on the device. */
  docCount?: number;
  precheckFlagged?: boolean;
}

/**
 * One submit route for all fourteen services. The service definition decides
 * which fields are required, so adding a scheme never touches this file.
 */
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

  const svc = serviceById(String(body.serviceId ?? ""));
  if (!svc) return fail("UNKNOWN_SERVICE", "We do not know that one.", 400);

  const values: Record<string, string> = {};
  for (const [k, v] of Object.entries(body.values ?? {})) {
    if (typeof v === "string") values[k] = v.trim();
  }

  /* ---- Validation, driven by the service definition ---- */
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

  // We keep only the last four Aadhaar digits, even in a mock. Storing the
  // full number "just for the demo" is how habits get formed.
  if (values.aadhaar) values.aadhaar = digitsOnly(values.aadhaar).slice(-4);

  // Injected failure, so the "couldn't send" recovery path is demonstrable.
  if (TRANSPORT_FAILURE_RATE > 0 && Math.random() < TRANSPORT_FAILURE_RATE) {
    return fail("UPSTREAM_DOWN", "Could not reach the pension office. Nothing was lost.", 503);
  }

  const { forced, resolveInMs } = demoContext(req);

  const rec = createRecord({
    requestId,
    serviceId: svc.id,
    lang: langOf(body.lang),
    mode: body.mode === "assisted" ? "assisted" : "self",
    name: values.fullName ?? values.name ?? "",
    mobile: digitsOnly(values.mobile),
    helperName: typeof body.helperName === "string" ? body.helperName.trim() : "",
    values,
    docCount: Number.isFinite(body.docCount) ? Number(body.docCount) : 0,
    precheckFlagged: body.precheckFlagged === true,
    resolveInMs,
    forced,
  });

  return ok({ record: publicRecord(settleIfDue(rec)), duplicate: false }, 201);
}
