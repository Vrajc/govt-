"use client";

import { speakAll, type Speaking, type VoicePlan } from "./speech";
import type { Lang } from "./types";

/**
 * Say something in the best voice this reader can actually be given.
 *
 * Both places that speak — the Listen button on every screen, and the voice
 * helper's answer — want the same preference, and having it in one place is
 * the only way they stay in step:
 *
 *   1. The network voice, which speaks all eleven of these languages
 *      properly. About a second the first time and instant afterwards,
 *      because it is cached per sentence and language on the server, and
 *      the thing being read is nearly always a fixed screen.
 *   2. Otherwise whatever the device can manage for itself: a real voice
 *      for the language if it has one, and if not, the reader's words
 *      respelled into Devanagari for the Hindi voice. That last is an
 *      accent, and an accent is a long way better than silence.
 *
 * It goes to the network first even for English, and that is deliberate
 * rather than an oversight. This is an app full of Indian place names, PPO
 * numbers and words like Talati and panchayat, and a US or British voice —
 * which is what a laptop ships — reads "Gandhinagar" and "Bhavishya" as
 * something nobody in Gandhinagar would recognise. An Indian English voice
 * gets them right, and for a reader whose second language this is, that is
 * the difference between following along and losing the thread.
 */
export const TTS_FALLBACK_ENABLED =
  process.env.NEXT_PUBLIC_ENABLE_TTS_FALLBACK === "true";

export interface Spoken {
  cancel: () => void;
}

export async function speakBest(
  text: string,
  plan: VoicePlan | null,
  lang: Lang,
  onEnd: () => void,
): Promise<Spoken | null> {
  const clean = text.trim();
  if (!clean) return null;

  const canLocal =
    plan !== null && typeof window !== "undefined" && "speechSynthesis" in window;

  const local = (): Speaking | null =>
    canLocal ? speakAll(clean, plan!, { onEnd }) : null;

  if (TTS_FALLBACK_ENABLED) {
    try {
      const res = await fetch("/api/speak", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text: clean, language: lang }),
      });
      if (res.ok) {
        const audio = new Audio(URL.createObjectURL(await res.blob()));
        audio.onended = onEnd;
        audio.onerror = onEnd;
        await audio.play();
        return {
          cancel: () => {
            audio.pause();
            audio.src = "";
          },
        };
      }
    } catch {
      /* No key, no quota, or no network. The device's own voice is next. */
    }
  }

  const fallback = local();
  if (!fallback) onEnd();
  return fallback;
}
