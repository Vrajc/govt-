import { hasKey, precheckPhoto } from "@/lib/openai";
import { fail, langOf, ok, readJson } from "@/lib/reqContext";
import type { PhotoQuality } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** A 512px JPEG at q0.7 is ~40 KB; 400 KB is generous headroom, not a target. */
const MAX_CHARS = 400_000;

interface Body {
  photo?: string;
  language?: string;
  /** Layer 1's verdict, so we can fall back to it silently. */
  quality?: PhotoQuality | null;
}

export async function POST(req: Request) {
  const body = await readJson<Body>(req);
  const photo = body?.photo;

  if (typeof photo !== "string" || !photo.startsWith("data:image/")) {
    return fail("NO_PHOTO", "There was no photo to look at.", 400);
  }
  if (photo.length > MAX_CHARS) {
    return fail("PHOTO_TOO_BIG", "That photo is too large to check.", 413);
  }

  const lang = langOf(body?.language);
  const { result, source } = await precheckPhoto(photo, lang);

  // Layer 1 already ran on the device. If the model could not be reached,
  // its verdict stands in silently — no spinner, no apology, no blocking.
  if (source === "fallback") {
    const q = body?.quality ?? null;
    const flagged = q !== null && q.verdict !== "ok";
    return ok({
      ok_photo: !flagged,
      issue: null,
      /* Layer 1 cannot write a sentence, only a verdict. The client maps
         it to the same coaching line the camera was already showing. */
      localVerdict: q?.verdict ?? null,
      source,
      keyPresent: hasKey(),
    });
  }

  return ok({
    ok_photo: result.ok,
    issue: result.issue,
    localVerdict: body?.quality?.verdict ?? null,
    source,
    keyPresent: hasKey(),
  });
}
