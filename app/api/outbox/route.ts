import { ok } from "@/lib/reqContext";
import { resetStore, store } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** The mock SMS outbox, newest first. Linked only from /about. */
export async function GET() {
  return ok({ messages: store.outbox, reminders: store.reminders });
}

/** Presenter reset. Clears every record, message and reminder. */
export async function DELETE() {
  resetStore();
  return ok({ cleared: true });
}
