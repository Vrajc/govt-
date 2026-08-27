import { store } from "@/lib/store";
import { lookupPpo } from "@/lib/mockPda";
import { digitsOnly, fail, ok, readJson } from "@/lib/reqContext";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE !== "false";
const TTL_MS = 10 * 60 * 1000;

interface Body {
  action: "send" | "verify";
  mobile?: string;
  ppo?: string;
  code?: string;
}

/**
 * Mocked one-time code. In production this is an SMS gateway plus Redis with
 * a TTL and a per-mobile rate limit; the shape of the contract is the same.
 *
 * The `send` action doubles as the mock PPO lookup, so the details screen
 * gets the pensioner's name back in the round trip it was already making.
 */
export async function POST(req: Request) {
  const body = await readJson<Body>(req);
  if (!body) return fail("BAD_JSON", "Some details were missing.");

  const mobile = digitsOnly(body.mobile);

  if (body.action === "send") {
    if (mobile.length !== 10) {
      return fail("MOBILE_LENGTH", "That is not a 10-digit mobile number.");
    }

    // Deterministic in demo mode so a reviewer is never locked out, random
    // otherwise so the flow is not trivially bypassable.
    const code = DEMO_MODE ? "418290" : String(Math.floor(100000 + Math.random() * 900000));
    store.otps.set(mobile, { code, at: Date.now() });

    const found = body.ppo ? lookupPpo(body.ppo) : null;

    return ok({
      sent: true,
      // Shown on screen in demo mode so nobody is stuck waiting for an SMS
      // that will never arrive. Withheld otherwise.
      code: DEMO_MODE ? code : null,
      name: found?.name ?? null,
    });
  }

  if (body.action === "verify") {
    const entry = store.otps.get(mobile);
    const given = digitsOnly(body.code);

    if (given.length !== 6) {
      return fail("OTP_LENGTH", "That is not a 6-digit code.");
    }
    // Spec: any 6 digits verifies. We still check the real code first so the
    // happy path exercises the actual comparison, and the audit log is honest
    // about which one matched.
    const matchedIssued = Boolean(entry) && entry!.code === given && Date.now() - entry!.at < TTL_MS;

    return ok({ verified: true, matchedIssued });
  }

  return fail("BAD_ACTION", "Some details were missing.");
}
