import type { AuditEntry, Record_ } from "./types";

/**
 * What a record looks like on the wire. Deliberately narrower than the
 * server record: the client never needs `requestId`, `forced` or `resolveAt`,
 * so it never sees them.
 */
export interface PublicRecord {
  id: string;
  createdAt: string;
  state: Record_["state"];
  lang: Record_["lang"];
  mode: Record_["mode"];
  name: string;
  helperName: string;
  ppo: string;
  aadhaarLast4: string;
  mobile: string;
  errorCode: Record_["errorCode"];
  validUntil: string | null;
  attempts: number;
  precheckFlagged: boolean;
  audit: AuditEntry[];
  /** Seconds until the pension office is expected to answer. Null once settled. */
  etaSeconds: number | null;
}

export function publicRecord(rec: Record_, now = Date.now()): PublicRecord {
  return {
    id: rec.id,
    createdAt: rec.createdAt,
    state: rec.state,
    lang: rec.lang,
    mode: rec.mode,
    name: rec.name,
    helperName: rec.helperName,
    ppo: rec.ppo,
    aadhaarLast4: rec.aadhaarLast4,
    mobile: rec.mobile,
    errorCode: rec.errorCode,
    validUntil: rec.validUntil,
    attempts: rec.attempts,
    precheckFlagged: rec.precheckFlagged,
    audit: rec.audit,
    etaSeconds:
      rec.resolveAt === null ? null : Math.max(0, Math.ceil((rec.resolveAt - now) / 1000)),
  };
}
