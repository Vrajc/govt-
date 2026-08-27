import { speak } from "@/lib/openai";
import { fail, langOf, readJson } from "@/lib/reqContext";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Body {
  text?: string;
  language?: string;
}

/**
 * §5.3, optional. The default voice path is `speechSynthesis`, which is free,
 * instant and costs no bandwidth — this route only exists for the case where
 * a device has no installed voice for Hindi or Gujarati at all.
 *
 * Gated client-side behind NEXT_PUBLIC_ENABLE_TTS_FALLBACK because an MP3 is
 * the single largest thing this app could ever send down a 3G connection.
 */
export async function POST(req: Request) {
  const body = await readJson<Body>(req);
  const text = typeof body?.text === "string" ? body.text.trim() : "";
  if (!text) return fail("NO_TEXT", "There was nothing to read out.", 400);

  const audio = await speak(text, langOf(body?.language));
  if (!audio) {
    return fail("TTS_UNAVAILABLE", "Reading out loud is not available right now.", 503);
  }

  return new Response(audio, {
    headers: {
      "content-type": "audio/mpeg",
      "cache-control": "no-store",
    },
  });
}
