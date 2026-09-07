import "server-only";
import type { Lang } from "./types";
import { langMeta } from "./i18n/languages";
import { liveKeys, noteKeyResult } from "./geminiKeys";

/**
 * Reading a sentence aloud in a real voice, for the languages where the
 * device cannot.
 *
 * `speechSynthesis` is the default path and stays the default path: it is
 * free, instant, works with no network, and on a device that ships a voice
 * for the reader's language it sounds like a person. This module is for the
 * other case — a Gujarati or Odia or Malayalam reader on a device that has
 * only ever heard of Hindi, who would otherwise get their own words read
 * back in a Hindi accent, or not at all.
 *
 * Gemini's speech models will say all of them properly. What they will not
 * do is say them quickly or cheaply: measured here, a two-sentence line
 * takes five to seven seconds to come back and arrives as roughly 270KB of
 * raw PCM, and the free tier runs out after a handful of requests. So:
 *
 *   · it is asked for only where the local voice would be wrong, never as
 *     the first choice;
 *   · every answer is kept, because the thing being read aloud is almost
 *     always a fixed screen — the same sentence, in the same language, is
 *     asked for by every reader who presses the button on that screen;
 *   · a refusal is cheap and quiet, and the caller falls back to the local
 *     voice rather than showing an error to somebody who pressed Listen.
 */

/** 24kHz, 16-bit, mono — what the speech models return. */
const SAMPLE_RATE = 24_000;

/* Comfortably inside the 60s ceiling set for this route in vercel.json,
   and well past the 9.9s a Tamil sentence measured. If a platform kills the
   request first the client simply falls back to the device's own voice. */
const TIMEOUT_MS = 15_000;

/**
 * Newest first. The 2.5 preview is the one that has been there longest and
 * is still the most widely enabled on a free project; the 3.1 model answers
 * faster where it is available.
 */
const MODELS = ["gemini-3.1-flash-tts-preview", "gemini-2.5-flash-preview-tts"] as const;

const HOST = "https://generativelanguage.googleapis.com/v1beta/models";

/**
 * A warm, unhurried voice. Of the prebuilt set these are the two that do not
 * sound like an announcement, which matters when the listener is 78 and the
 * sentence is about their pension stopping.
 */
const VOICE = "Kore";

/* ------------------------------------------------------------------ *
 * Cache
 * ------------------------------------------------------------------ */

/**
 * Module memory, not a cache anybody may depend on — a serverless instance
 * takes this with it when it goes. It exists because the same fifty screens
 * are read aloud over and over, so in practice it turns a per-press API
 * call into a per-screen one.
 */
const CACHE_MAX = 120;
const cache = new Map<string, ArrayBuffer>();

function remember(key: string, wav: ArrayBuffer): ArrayBuffer {
  if (cache.size >= CACHE_MAX) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
  cache.set(key, wav);
  return wav;
}

/* ------------------------------------------------------------------ *
 * PCM → WAV
 * ------------------------------------------------------------------ */

/**
 * The models hand back headerless PCM, which no `<audio>` element will play.
 * A RIFF header is 44 bytes and turns it into a file every browser knows.
 *
 * Sending WAV rather than re-encoding to MP3 is deliberate: an encoder is a
 * dependency and a CPU cost, and the audio is cached anyway, so the saving
 * would apply once per screen rather than once per listener.
 */
function wavFromPcm(pcm: Buffer, sampleRate = SAMPLE_RATE): ArrayBuffer {
  const header = Buffer.alloc(44);
  const channels = 1;
  const bitsPerSample = 16;
  const byteRate = (sampleRate * channels * bitsPerSample) / 8;

  header.write("RIFF", 0);
  header.writeUInt32LE(36 + pcm.length, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16); // PCM chunk size
  header.writeUInt16LE(1, 20); // format: PCM
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE((channels * bitsPerSample) / 8, 32); // block align
  header.writeUInt16LE(bitsPerSample, 34);
  header.write("data", 36);
  header.writeUInt32LE(pcm.length, 40);

  const out = Buffer.concat([header, pcm]);
  return out.buffer.slice(out.byteOffset, out.byteOffset + out.byteLength) as ArrayBuffer;
}

/** The rate the model actually returned, when it bothers to say. */
function rateFromMime(mime: string | undefined): number {
  const m = /rate=(\d+)/i.exec(mime ?? "");
  return m ? Number(m[1]) : SAMPLE_RATE;
}

/* ------------------------------------------------------------------ *
 * Speaking
 * ------------------------------------------------------------------ */

/**
 * One line, spoken. Returns null for every failure, and the caller falls
 * back to whatever the device can do for itself.
 */
export async function speakCloud(text: string, lang: Lang): Promise<ArrayBuffer | null> {
  /* Long passages are neither affordable nor kind: past a couple of
     sentences the wait before the first word is longer than the reading. */
  const clean = text.trim().slice(0, 600);
  if (!clean) return null;

  const cacheKey = `${lang}:${clean}`;
  const hit = cache.get(cacheKey);
  if (hit) return hit;

  /* The speech models have the smallest free allowance of anything here —
     four sentences and it is gone for the day — so the pool matters more on
     this path than anywhere else. */
  const keys = liveKeys();
  if (!keys.length) return null;

  const meta = langMeta(lang);
  /* Naming the language matters: given an Indic script with no instruction
     the model will sometimes read it in an English accent, letter by
     letter. Naming the listener matters too — it is the difference between
     a newsreader and somebody explaining something to their grandmother. */
  const prompt =
    `Read this aloud in ${meta.english}, slowly and warmly, as if speaking ` +
    `to an elderly person who is anxious about their pension. ` +
    `Read only the words themselves, add nothing:\n\n${clean}`;

  for (const key of keys) {
    let spent = false;

    for (const model of MODELS) {
      const control = new AbortController();
      const timer = setTimeout(() => control.abort(), TIMEOUT_MS);
      try {
        const res = await fetch(`${HOST}/${model}:generateContent`, {
          method: "POST",
          signal: control.signal,
          headers: { "content-type": "application/json", "x-goog-api-key": key },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              responseModalities: ["AUDIO"],
              speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: VOICE } } },
            },
          }),
        });
        noteKeyResult(key, res.status);

        /* Out of quota or refused outright: this key has nothing more to
           give today under any model. The next key in the pool might. */
        if (res.status === 401 || res.status === 403 || res.status === 429) {
          spent = true;
          break;
        }
        if (!res.ok) continue; // 404 on a retired model: try the next name

        const body = (await res.json()) as {
          candidates?: {
            content?: { parts?: { inlineData?: { data?: string; mimeType?: string } }[] };
          }[];
        };
        const part = body.candidates?.[0]?.content?.parts?.find((p) => p.inlineData?.data);
        const b64 = part?.inlineData?.data;
        if (!b64) continue;

        const pcm = Buffer.from(b64, "base64");
        if (pcm.length < 2000) continue; // a fraction of a second: not speech
        return remember(cacheKey, wavFromPcm(pcm, rateFromMime(part?.inlineData?.mimeType)));
      } catch {
        /* Timeout or transport. Try the next model. */
      } finally {
        clearTimeout(timer);
      }
    }

    /* Reachable, and it simply did not produce speech. Another key would do
       the same, so stop rather than spending the pool. */
    if (!spent) return null;
  }

  return null;
}
