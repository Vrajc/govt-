import { serviceById } from "./services/catalogue";
import type { AuditEntry, OutcomeData, Record_ } from "./types";

/**
 * What a record looks like on the wire. Deliberately narrower than the
 * server record: the client never needs `requestId`, `forced`, `totalMs` or
 * `nextStageAt`, so it never sees them.
 */
export interface PublicRecord {
  id: string;
  serviceId: string;
  createdAt: string;
  state: Record_["state"];
  /** How many of the service's stages are complete. */
  stageIndex: number;
  /** The stage ids, so the client can render the chain without the catalogue. */
  stages: { id: string; actor: string }[];

  lang: Record_["lang"];
  mode: Record_["mode"];
  name: string;
  mobile: string;
  helperName: string;

  values: Record<string, string>;
  docCount: number;

  errorCode: Record_["errorCode"];
  outcome: OutcomeData | null;
  attempts: number;
  precheckFlagged: boolean;
  audit: AuditEntry[];
  /** Seconds until the next stage is expected. Null once settled. */
  etaSeconds: number | null;
}

/** Values that must never leave the server, even in a mock. */
const REDACT = new Set(["aadhaar", "accountNumber", "newAccountNumber"]);

function redact(values: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(values)) {
    out[k] = REDACT.has(k) && v.length > 4 ? `XXXX XXXX ${v.slice(-4)}` : v;
  }
  return out;
}

export function publicRecord(rec: Record_, now = Date.now()): PublicRecord {
  const svc = serviceById(rec.serviceId);
  return {
    id: rec.id,
    serviceId: rec.serviceId,
    createdAt: rec.createdAt,
    state: rec.state,
    stageIndex: rec.stageIndex,
    stages: (svc?.stages ?? []).map((s) => ({ id: s.id, actor: s.actor })),
    lang: rec.lang,
    mode: rec.mode,
    name: rec.name,
    mobile: rec.mobile,
    helperName: rec.helperName,
    values: redact(rec.values),
    docCount: rec.docCount,
    errorCode: rec.errorCode,
    outcome: rec.outcome,
    attempts: rec.attempts,
    precheckFlagged: rec.precheckFlagged,
    audit: rec.audit,
    etaSeconds:
      rec.nextStageAt === null
        ? null
        : Math.max(0, Math.ceil((rec.nextStageAt - now) / 1000)),
  };
}
