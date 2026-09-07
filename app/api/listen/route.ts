import { transcribeSarvam } from "@/lib/sarvam";
import { fail, langOf, ok } from "@/lib/reqContext";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * What somebody said, in their own language.
 *
 * The browser has a recogniser and for ten of these eleven languages it is
 * not to be relied on. Android's coverage varies between builds and there is
 * no way to ask it what it has: a phone that transcribes English perfectly
 * opens the microphone for Gujarati and returns nothing at all, with no
 * error to explain it. Odia it does not do under any tag.
 *
 * So the audio comes here instead. Nothing is kept: the recording is held
 * only as long as the request, is never written down, and the words that
 * come back go straight to the caller. The panel already tells the reader
 * as much, and it has to stay true.
 */
export async function POST(req: Request) {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return fail("BAD_AUDIO", "We could not read that recording.", 400);
  }

  const file = form.get("audio");
  if (!(file instanceof Blob)) {
    return fail("NO_AUDIO", "There was nothing to listen to.", 400);
  }
  /* A phone will happily record for as long as it is asked to. This is one
     question, and past a minute of it something has gone wrong rather than
     somebody having a great deal to say. */
  if (file.size > 6_000_000) {
    return fail("TOO_LONG", "That was too long. Say it in one short sentence.", 413);
  }

  const lang = langOf(form.get("language"));
  const text = await transcribeSarvam(file, lang);

  /* Heard nothing is not an error — it is the normal outcome of a person
     who pressed the button and then hesitated. The caller says so gently
     and offers the box to type in; a 500 here would be a lie. */
  return ok({ text: text ?? "" });
}
