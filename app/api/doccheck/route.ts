import { dictFor } from "@/lib/i18n";
import { hasKey, precheckDocument } from "@/lib/openai";
import { fail, langOf, ok, readJson } from "@/lib/reqContext";
import { lookFor } from "@/lib/services/docShapes";
import type { DocVerdict } from "@/lib/docCheck";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** A 900px JPEG at q0.72 is ~120 KB; 900 KB is headroom, not a target. */
const MAX_CHARS = 900_000;

interface Body {
  photo?: string;
  docId?: string;
  language?: string;
  /** Layer 1's verdict, so we can stand behind it when the model is absent. */
  verdict?: DocVerdict | null;
}

/**
 * The second look at a photographed document.
 *
 * Layer 1 ran on the phone and answered the questions arithmetic can answer:
 * is it lit, is it sharp, is the whole of it in the frame. This answers the
 * one it cannot — whether the paper in the picture is the paper that was
 * asked for. Photographing the ration card when the form wanted the bank
 * passbook is the single most common way one of these applications comes
 * back six weeks later.
 *
 * With no API key configured the route still answers, and answers usefully:
 * it hands back layer 1's verdict and says where it came from. Nothing here
 * ever blocks a submission.
 */
export async function POST(req: Request) {
  const body = await readJson<Body>(req);
  const photo = body?.photo;
  const docId = typeof body?.docId === "string" ? body.docId : "";

  if (typeof photo !== "string" || !photo.startsWith("data:image/")) {
    return fail("NO_PHOTO", "There was no photo to look at.", 400);
  }
  if (photo.length > MAX_CHARS) {
    return fail("PHOTO_TOO_BIG", "That photo is too large to check.", 413);
  }
  if (!docId) {
    return fail("NO_DOC", "There was no paper named to check it against.", 400);
  }

  const lang = langOf(body?.language);

  /* The model is told what to look for in English — that is the language the
     document has a name in, and naming an Indian government form in a
     language the model half-knows is how you get a confident wrong answer.
     What it replies in is the reader's language, which is a separate
     instruction inside the prompt. */
  const enDocs = dictFor("en").docs as Record<string, string>;
  const docName = enDocs[docId] ?? docId;
  const focus = FOCUS_IN_ENGLISH[lookFor(docId).focus];

  const { result, source } = await precheckDocument(photo, docName, focus, lang);

  return ok({
    match: result.match,
    readable: result.readable,
    issue: result.issue,
    saw: result.saw,
    localVerdict: body?.verdict ?? null,
    source,
    keyPresent: hasKey(),
  });
}

/** What "the part that matters" means, for the prompt only. */
const FOCUS_IN_ENGLISH: Record<string, string> = {
  number: "the long printed number",
  account: "the account number and the IFSC code",
  seal: "the round office stamp and the signature",
  name: "the name of the person",
  face: "the face",
  whole: "all four corners of the page",
};
