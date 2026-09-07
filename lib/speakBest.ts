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

/**
 * The one <audio> element this app ever plays through, unlocked in advance.
 *
 * A phone will not let a page make a sound unless a person asked it to, and
 * "asked it to" means the play() call happens while the press is still
 * counted as user activation. Fetching the audio first spends that: the
 * request takes about a second, play() is then refused, and the catch below
 * falls through to the device's own voice — so the reader presses Listen,
 * waits, and hears exactly the robotic reading the network voice existed to
 * replace. Nothing errors, which is why it looks like the feature simply
 * does not work on a phone.
 *
 * The fix is the same one every audio player on the web uses: play a moment
 * of silence through the element during the press, which unlocks it, and
 * then keep using that same element. It is unlocked once and stays unlocked.
 */
let unlocked: HTMLAudioElement | null = null;

/**
 * Bumped by `stopAudio`. A sentence that was still being fetched when
 * somebody asked for silence must not arrive a second later and start
 * talking — which is precisely what happens when the panel's introduction
 * is in flight and the microphone is pressed underneath it.
 */
let epoch = 0;

/**
 * Stop anything this module is saying, now, whether it has started or not.
 *
 * Cancelling the returned handle is not enough on its own: the handle only
 * exists once the audio has arrived, so a press during the fetch has
 * nothing to cancel and gets talked over a moment later.
 */
export function stopAudio(): void {
  epoch++;
  if (!unlocked) return;
  try {
    unlocked.pause();
    unlocked.removeAttribute("src");
    unlocked.load();
  } catch {
    /* Already torn down. */
  }
}

/** A tenth of a second of silence — enough to unlock, too short to hear. */
const SILENCE =
  "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAgD4AAAB9AAACABAAZGF0YQAAAAA=";

/**
 * Call this synchronously inside the press, before anything is awaited.
 * Safe to call repeatedly; it only does the work once.
 */
export function primeAudio(): void {
  if (typeof window === "undefined" || unlocked) return;
  try {
    const audio = new Audio(SILENCE);
    audio.volume = 0;
    void audio.play().catch(() => {
      /* Refused even now — a browser that will not play at all. The device
         voice still works and speakBest falls back to it. */
    });
    unlocked = audio;
  } catch {
    /* No Audio constructor. Nothing here can help; the fallback will. */
  }
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
    const mine = epoch;
    try {
      const res = await fetch("/api/speak", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text: clean, language: lang }),
      });
      /* Silence was asked for while this was in the air. Say nothing. */
      if (epoch !== mine) return null;

      if (res.ok) {
        /* Reuse the element unlocked during the press. A fresh one would be
           refused, because by now the activation the press granted is long
           spent on the fetch above. */
        const audio = unlocked ?? new Audio();
        const url = URL.createObjectURL(await res.blob());
        audio.onended = onEnd;
        audio.onerror = onEnd;
        audio.volume = 1;
        audio.src = url;
        await audio.play();
        return {
          cancel: () => {
            audio.pause();
            audio.removeAttribute("src");
            audio.load();
            URL.revokeObjectURL(url);
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
