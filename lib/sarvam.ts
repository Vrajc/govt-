import "server-only";
import type { Lang } from "./types";
import { voicePrompt, parseVoiceReply, type VoiceReply } from "./gemini";

/**
 * Sarvam — the provider that was built for exactly this problem.
 *
 * Everything else in this app treats the eleven Indian languages as a
 * problem to be worked around: a Hindi voice reading respelled Gujarati, a
 * general-purpose model prompted very carefully to answer in Odia. Sarvam's
 * models are trained on these languages first, and it shows in the numbers
 * measured on 2026-09-07:
 *
 *   · all eleven speak, including Odia, which Gemini's speech models do not
 *     cover and which no browser here can synthesise;
 *   · about 1.2 seconds a sentence, against six to ten for Gemini;
 *   · 130–240KB of WAV, already wrapped, against 150–345KB of raw PCM.
 *
 * So it goes first on both paths, with the existing providers left in place
 * behind it. Nothing here throws: every function returns null and the
 * caller falls back, because a pensioner pressing Listen must never be
 * shown an error from a text-to-speech vendor.
 */

const TTS_HOST = "https://api.sarvam.ai/text-to-speech";
const CHAT_HOST = "https://api.sarvam.ai/v1/chat/completions";

const TTS_MODEL = "bulbul:v3";
const CHAT_MODEL = "sarvam-105b-conversations";

/**
 * One voice for all eleven, chosen because it is the one confirmed to
 * speak every one of them. A speaker that works in nine languages and
 * silently fails in two is worse than a plainer voice that works.
 */
const SPEAKER = "shubh";

/**
 * Sarvam's own language tags. Almost the BCP-47 the rest of the app uses,
 * with one trap: Odia is `od-IN` here, not the `or` of ISO 639-1 that
 * `lib/i18n/languages.ts` uses. Getting that wrong is a 400 for the one
 * language that has the fewest alternatives.
 */
const TAG: Record<Lang, string> = {
  en: "en-IN",
  hi: "hi-IN",
  gu: "gu-IN",
  bn: "bn-IN",
  mr: "mr-IN",
  ta: "ta-IN",
  te: "te-IN",
  kn: "kn-IN",
  ml: "ml-IN",
  pa: "pa-IN",
  or: "od-IN",
};

/* Well inside the platform limits set in vercel.json; measured worst case
   was 1.5s, so anything past this is a fault rather than slowness. */
const TTS_TIMEOUT_MS = 12_000;
const CHAT_TIMEOUT_MS = 12_000;

export function hasSarvamKey(): boolean {
  const key = process.env.SARVAM_API_KEY?.trim();
  return Boolean(key) && key!.length > 12 && !key!.includes("...");
}

/* ------------------------------------------------------------------ *
 * Speaking
 * ------------------------------------------------------------------ */

/**
 * Module memory. The same fifty screens are read aloud over and over, so
 * this turns a per-press call into a per-screen one. A serverless instance
 * takes it with it when it goes, which is fine: the worst case is one more
 * second-and-a-bit.
 */
const CACHE_MAX = 160;
const cache = new Map<string, ArrayBuffer>();

function remember(key: string, wav: ArrayBuffer): ArrayBuffer {
  if (cache.size >= CACHE_MAX) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
  cache.set(key, wav);
  return wav;
}

interface TtsResponse {
  audios?: string[];
}

export async function speakSarvam(text: string, lang: Lang): Promise<ArrayBuffer | null> {
  const key = process.env.SARVAM_API_KEY?.trim();
  if (!hasSarvamKey() || !key) return null;

  /* Past a couple of sentences the wait before the first word is longer
     than the reading, and every screen here is shorter than that anyway. */
  const clean = text.trim().slice(0, 1500);
  if (!clean) return null;

  const cacheKey = `${lang}:${clean}`;
  const hit = cache.get(cacheKey);
  if (hit) return hit;

  const control = new AbortController();
  const timer = setTimeout(() => control.abort(), TTS_TIMEOUT_MS);
  try {
    const res = await fetch(TTS_HOST, {
      method: "POST",
      signal: control.signal,
      headers: { "api-subscription-key": key, "content-type": "application/json" },
      body: JSON.stringify({
        text: clean,
        target_language_code: TAG[lang],
        model: TTS_MODEL,
        speaker: SPEAKER,
      }),
      cache: "no-store",
    });
    if (!res.ok) return null;

    const body = (await res.json()) as TtsResponse;
    const b64 = body.audios?.[0];
    if (!b64) return null;

    const wav = Buffer.from(b64, "base64");
    /* It answers with a finished WAV, header and all — unlike the raw PCM
       that has to be wrapped by hand elsewhere. Check the header rather
       than trust it, because a body that is not audio would otherwise be
       handed to an <audio> element to fail silently. */
    if (wav.length < 2000 || wav.subarray(0, 4).toString("ascii") !== "RIFF") return null;

    return remember(
      cacheKey,
      wav.buffer.slice(wav.byteOffset, wav.byteOffset + wav.byteLength) as ArrayBuffer,
    );
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/* ------------------------------------------------------------------ *
 * Answering
 * ------------------------------------------------------------------ */

interface ChatResponse {
  choices?: { message?: { content?: string } }[];
}

/**
 * The voice helper's answer, from a model that speaks these languages
 * natively rather than being asked nicely to.
 *
 * It shares the prompt and the reply parser with the Gemini path, so the
 * two providers are held to exactly the same contract: one short sentence,
 * a few steps, and a destination chosen from a fixed menu. Anything else
 * is rejected here and the next provider — or the dictionary — answers.
 */
export async function askSarvam(
  said: string,
  lang: Lang,
  menu: string,
  where: string,
): Promise<VoiceReply | null> {
  const key = process.env.SARVAM_API_KEY?.trim();
  if (!hasSarvamKey() || !key) return null;

  const control = new AbortController();
  const timer = setTimeout(() => control.abort(), CHAT_TIMEOUT_MS);
  try {
    const res = await fetch(CHAT_HOST, {
      method: "POST",
      signal: control.signal,
      headers: { "api-subscription-key": key, "content-type": "application/json" },
      body: JSON.stringify({
        model: CHAT_MODEL,
        messages: [
          { role: "system", content: voicePrompt(lang, menu, where) },
          { role: "user", content: said.slice(0, 500) },
        ],
        temperature: 0.2,
        max_tokens: 1200,
      }),
      cache: "no-store",
    });
    if (!res.ok) return null;

    const body = (await res.json()) as ChatResponse;
    const text = body.choices?.[0]?.message?.content;
    if (!text) return null;

    /* The same parser the Gemini path uses. It already copes with a model
       that wraps its JSON in a code fence or a sentence of preamble, which
       a chat completion is rather more likely to do than a call with a
       response schema attached. */
    return parseVoiceReply(text);
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
