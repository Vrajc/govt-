import { explainCode, hasKey } from "@/lib/openai";
import { fail, langOf, ok, readJson } from "@/lib/reqContext";
import { isErrorCode } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Body {
  code?: string;
  language?: string;
  assistedMode?: boolean;
}

/**
 * §5.1 — turn an opaque code into two sentences a 78-year-old understands.
 *
 * This route cannot fail from the caller's point of view: an unknown code is
 * a 400, and everything else returns an explanation, from the model if it
 * answered in time and from the hardcoded table if it did not.
 */
export async function POST(req: Request) {
  const body = await readJson<Body>(req);
  if (!body || !isErrorCode(body.code)) {
    return fail("UNKNOWN_CODE", "We do not have an explanation for that.", 400);
  }

  const { text, source } = await explainCode(
    body.code,
    langOf(body.language),
    body.assistedMode === true
  );

  return ok({
    reason: text.reason,
    action: text.action,
    /* Surfaced in the collapsed "Technical details" so a judge can see
       exactly which path produced the sentence they are reading. */
    source,
    keyPresent: hasKey(),
  });
}
