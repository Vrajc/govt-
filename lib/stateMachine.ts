import type { Actor, AppState, AuditEntry, Record_ } from "./types";

/**
 * DRAFT → SUBMITTED → VERIFYING → ACCEPTED
 *                              ↘ NEEDS_FIX → (resubmit) → SUBMITTED
 *
 * Illegal transitions throw. The point of a real machine rather than a
 * `setTimeout` in a component is that the status page can survive a hard
 * refresh and the audit log can be shown to a judge.
 */
const ALLOWED: Record<AppState, AppState[]> = {
  DRAFT: ["SUBMITTED"],
  SUBMITTED: ["VERIFYING"],
  VERIFYING: ["ACCEPTED", "NEEDS_FIX"],
  ACCEPTED: [], // terminal
  NEEDS_FIX: ["SUBMITTED"], // the recovery loop
};

export class IllegalTransition extends Error {
  constructor(from: AppState, to: AppState) {
    super(`Illegal transition: ${from} -> ${to}`);
    this.name = "IllegalTransition";
  }
}

export function canTransition(from: AppState, to: AppState): boolean {
  return ALLOWED[from].includes(to);
}

export function auditEntry(
  from: AppState | null,
  to: AppState,
  actor: Actor,
  note: string
): AuditEntry {
  return { at: new Date().toISOString(), from, to, actor, note };
}

/** Mutates the record in place and appends to its audit log. */
export function transition(
  record: Record_,
  to: AppState,
  actor: Actor,
  note: string
): Record_ {
  const from = record.state;
  if (!canTransition(from, to)) throw new IllegalTransition(from, to);
  record.state = to;
  record.audit.push(auditEntry(from, to, actor, note));
  return record;
}

/** Terminal states have no pending work — the poller can stop. */
export function isSettled(state: AppState): boolean {
  return state === "ACCEPTED" || state === "NEEDS_FIX";
}
