"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useApp } from "@/lib/app-state";
import { Speaker, StopSquare } from "./Icons";

const TTS_FALLBACK_ENABLED = process.env.NEXT_PUBLIC_ENABLE_TTS_FALLBACK === "true";

/**
 * §5.3 — reads the screen aloud.
 *
 * Primary path is the browser's own `speechSynthesis`: free, instant, and
 * zero bandwidth, which is the whole argument on a 3G connection. The OpenAI
 * TTS route is a flagged fallback for devices with no installed voice for
 * Hindi or Gujarati at all — it is off by default because an MP3 is the
 * heaviest thing this app could ever download.
 */
export function SpeakButton({ text }: { text: string }) {
  const { t, speechTag, lang } = useApp();
  const [speaking, setSpeaking] = useState(false);
  const [supported, setSupported] = useState(true);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const pathname = usePathname();

  /* Voices load asynchronously on most browsers; touching the list early
     is what makes the first press actually speak instead of going silent. */
  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      setSupported(TTS_FALLBACK_ENABLED);
      return;
    }
    const warm = () => window.speechSynthesis.getVoices();
    warm();
    window.speechSynthesis.addEventListener("voiceschanged", warm);
    return () => window.speechSynthesis.removeEventListener("voiceschanged", warm);
  }, []);

  const stop = useCallback(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setSpeaking(false);
  }, []);

  /* Never let a voice follow the user to the next screen. */
  useEffect(() => stop, [pathname, stop]);
  useEffect(() => stop, [stop]);

  const pickVoice = useCallback((): SpeechSynthesisVoice | null => {
    const voices = window.speechSynthesis.getVoices();
    if (!voices.length) return null;
    const exact = voices.find((v) => v.lang.toLowerCase() === speechTag.toLowerCase());
    if (exact) return exact;
    const prefix = speechTag.split("-")[0].toLowerCase();
    const sameLang = voices.find((v) => v.lang.toLowerCase().startsWith(prefix));
    return sameLang ?? null;
  }, [speechTag]);

  const speak = useCallback(async () => {
    if (speaking) {
      stop();
      return;
    }
    const clean = text.trim();
    if (!clean) return;

    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      const voice = pickVoice();
      // A device with no Hindi or Gujarati voice would otherwise read
      // Devanagari aloud in an English voice, which is worse than silence.
      const usable = voice !== null || speechTag.startsWith("en");

      if (usable) {
        window.speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(clean);
        u.lang = speechTag;
        if (voice) u.voice = voice;
        u.rate = 0.88; // slower than default, deliberately
        u.pitch = 1;
        u.onend = () => setSpeaking(false);
        u.onerror = () => setSpeaking(false);
        setSpeaking(true);
        window.speechSynthesis.speak(u);
        return;
      }
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
  }, [speaking, stop, text, pickVoice, speechTag, lang]);

  // No voice and no fallback: hide the control rather than offer a dead end.
  if (!supported) return null;

  return (
    <button
      type="button"
      className="btn-header"
      onClick={speak}
      aria-pressed={speaking}
      aria-label={speaking ? t("common.stop") : t("common.listen")}
    >
      {speaking ? <StopSquare size={18} /> : <Speaker size={20} />}
      <span>{speaking ? t("common.stop") : t("common.listen")}</span>
    </button>
  );
}
