"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useApp } from "@/lib/app-state";
import { planVoice, speakAll, type Speaking, type VoicePlan } from "@/lib/speech";
import { Speaker, StopSquare } from "./Icons";

const TTS_FALLBACK_ENABLED = process.env.NEXT_PUBLIC_ENABLE_TTS_FALLBACK === "true";

/**
 * §5.3 — reads the screen aloud.
 *
 * Primary path is the browser's own `speechSynthesis`: free, instant, and
 * zero bandwidth, which is the whole argument on a 3G connection. Which
 * voice to use, and whether the text has to be respelled first, is decided
 * in `lib/speech.ts` — this component only has to know whether the device
 * can do it at all, and get out of the way if it cannot.
 *
 * The OpenAI TTS route is a flagged fallback for devices with no usable
 * voice whatsoever. It is off by default because an MP3 is the heaviest
 * thing this app could ever download.
 */
export function SpeakButton({ text }: { text: string }) {
  const { t, lang } = useApp();
  const [speaking, setSpeaking] = useState(false);
  const [supported, setSupported] = useState(true);
  const [plan, setPlan] = useState<VoicePlan | null>(null);
  const jobRef = useRef<Speaking | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const pathname = usePathname();

  /* Voices load asynchronously nearly everywhere, and the event that says so
     is unreliable: Chrome fires `voiceschanged` once, Safari sometimes never
     fires it at all, and Android fires it before the list is populated. So
     this listens for the event AND polls briefly, then stops.

     Settling the question here rather than mid-press is what stops the
     control vanishing from under a pensioner's finger — and an empty list
     means the voices have not arrived yet, not that there are none, so the
     button stays until the question is actually answered. */
  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      setSupported(TTS_FALLBACK_ENABLED);
      return;
    }

    const synth = window.speechSynthesis;
    let tries = 0;
    let timer = 0;
    let done = false;

    const settle = () => {
      if (done) return;
      const voices = synth.getVoices();
      if (!voices.length) {
        // Give it three seconds, then accept that there really are none.
        if (++tries > 12) {
          done = true;
          window.clearInterval(timer);
          setSupported(TTS_FALLBACK_ENABLED);
        }
        return;
      }
      done = true;
      window.clearInterval(timer);
      const chosen = planVoice(lang, voices);
      setPlan(chosen);
      setSupported(chosen !== null || TTS_FALLBACK_ENABLED);
    };

    timer = window.setInterval(settle, 250);
    settle();
    synth.addEventListener("voiceschanged", settle);
    return () => {
      window.clearInterval(timer);
      synth.removeEventListener("voiceschanged", settle);
    };
  }, [lang]);

  const stop = useCallback(() => {
    jobRef.current?.cancel();
    jobRef.current = null;
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setSpeaking(false);
  }, []);

  /* Never let a voice follow the user to the next screen, out of the tab, or
     into the background. A phone that keeps talking after it goes in a
     pocket is the kind of thing that stops someone using the feature again. */
  useEffect(() => stop, [pathname, stop]);
  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === "hidden") stop();
    };
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", stop);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", stop);
      stop();
    };
  }, [stop]);

  const speak = useCallback(async () => {
    if (speaking) {
      stop();
      return;
    }
    const clean = text.trim();
    if (!clean) return;

    if (plan && typeof window !== "undefined" && "speechSynthesis" in window) {
      setSpeaking(true);
      jobRef.current = speakAll(clean, plan, { onEnd: () => setSpeaking(false) });
      return;
    }

    if (!TTS_FALLBACK_ENABLED) {
      setSupported(false);
      return;
    }

    setSpeaking(true);
    try {
      const res = await fetch("/api/speak", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text: clean, language: lang }),
      });
      if (!res.ok) throw new Error("tts");
      const blob = await res.blob();
      const audio = new Audio(URL.createObjectURL(blob));
      audioRef.current = audio;
      audio.onended = () => setSpeaking(false);
      audio.onerror = () => setSpeaking(false);
      await audio.play();
    } catch {
      setSpeaking(false);
      setSupported(false);
    }
  }, [speaking, stop, text, plan, lang]);

  // No voice and no fallback: hide the control rather than offer a dead end.
  if (!supported) return null;

  /* A tooltip and nothing louder. Someone using a screen reader has their
     own voice and never presses this button; the person who needs the note
     is the sighted Tamil reader who hears a Hindi accent and would otherwise
     conclude the app is broken. */
  const note =
    plan?.fidelity === "transliterated"
      ? t("common.listenAccent")
      : undefined;

  return (
    <button
      type="button"
      className="btn-header"
      onClick={speak}
      aria-pressed={speaking}
      aria-label={speaking ? t("common.stop") : t("common.listen")}
      title={note}
    >
      {speaking ? <StopSquare size={18} /> : <Speaker size={20} />}
      <span>{speaking ? t("common.stop") : t("common.listen")}</span>
    </button>
  );
}
