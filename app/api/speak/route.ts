import { speakCloud } from "@/lib/tts";
import { speakSarvam } from "@/lib/sarvam";
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

  const lang = langOf(body?.language);

  /* Sarvam, then Gemini. Sarvam is the only one that speaks all eleven —
     Odia included, which nothing else here can — and answers in about a
     second where Gemini takes six to ten. Gemini stays behind it for a
     deployment that has that key and not this one. Below both, the device's
     own voice, which needs no key and no network. */
  const native = await speakSarvam(text, lang);
  if (native) {
    return new Response(native, {
      headers: {
        "content-type": "audio/wav",
        /* Safe to keep: the text is a fixed screen string and the reply is
           identical for every reader of that screen in that language. */
        "cache-control": "public, max-age=86400",
      },
    });
  }

  const wav = await speakCloud(text, lang);
  if (wav) {
    return new Response(wav, {
      headers: {
        "content-type": "audio/wav",
        /* Safe to keep: the text is a fixed screen string, and the reply is
           identical for every reader of that screen in that language. */
        "cache-control": "public, max-age=86400",
      },
    });
  }

  return fail("TTS_UNAVAILABLE", "Reading out loud is not available right now.", 503);
}
