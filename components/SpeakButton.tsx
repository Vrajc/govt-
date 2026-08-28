"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useApp } from "@/lib/app-state";
import { guToDevanagari } from "@/lib/speech";
import { Speaker, StopSquare } from "./Icons";

const TTS_FALLBACK_ENABLED = process.env.NEXT_PUBLIC_ENABLE_TTS_FALLBACK === "true";

/** How this device can read the current language aloud, if it can at all. */
interface VoicePlan {
  /** The BCP-47 tag handed to the utterance. */
  lang: string;
  voice: SpeechSynthesisVoice | null;
  /** Rewrites the text into a script the chosen voice can actually read. */
  render: (text: string) => string;
}

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

  /**
   * Works out what this particular device can do, in order of preference.
   * Returns null when it can do nothing at all.
   */
  const plan = useCallback((): VoicePlan | null => {
    const voices = window.speechSynthesis.getVoices();
    if (!voices.length) return null;

    const find = (tag: string) => {
      const want = tag.toLowerCase();
      // Android reports gu_IN where the spec says gu-IN.
      const norm = (v: SpeechSynthesisVoice) => v.lang.toLowerCase().replace("_", "-");
      return (
        voices.find((v) => norm(v) === want) ??
        voices.find((v) => norm(v).startsWith(`${want.split("-")[0]}-`)) ??
        null
      );
    };

    const own = find(speechTag);
    if (own) return { lang: speechTag, voice: own, render: (s) => s };

    /* Chrome ships a Hindi voice and no Gujarati one, so a Gujarati reader on
       a laptop lands here every time. Gujarati and Devanagari are the same
       alphabet drawn twice: swap the letters and the Hindi voice says the
       Gujarati words correctly, in a Hindi accent. Accent beats silence. */
    if (lang === "gu") {
      const hindi = find("hi-IN");
      if (hindi) return { lang: "hi-IN", voice: hindi, render: guToDevanagari };
    }

    /* English is the one language we will trust an unlabelled default voice
       with. A device with no Hindi or Gujarati voice would otherwise read an
       Indic script aloud in an English one, which is worse than silence. */
    if (speechTag.startsWith("en")) return { lang: speechTag, voice: null, render: (s) => s };

    return null;
  }, [speechTag, lang]);

  /* Voices load asynchronously on most browsers; touching the list early is
     what makes the first press actually speak instead of going silent. It is
     also how we decide whether to offer the button at all — an empty list
     means the voices have not arrived yet, not that there are none, so we
     keep the button and settle the question once they do. Deciding here
     rather than mid-press is what stops the control vanishing under a
     pensioner's finger. */
  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      setSupported(TTS_FALLBACK_ENABLED);
      return;
    }
    const check = () => {
      if (!window.speechSynthesis.getVoices().length) return;
      setSupported(plan() !== null || TTS_FALLBACK_ENABLED);
    };
    check();
    window.speechSynthesis.addEventListener("voiceschanged", check);
    return () => window.speechSynthesis.removeEventListener("voiceschanged", check);
  }, [plan]);

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

  const speak = useCallback(async () => {
    if (speaking) {
      stop();
      return;
    }
    const clean = text.trim();
    if (!clean) return;

    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      const chosen = plan();
      if (chosen) {
        window.speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(chosen.render(clean));
        u.lang = chosen.lang;
        if (chosen.voice) u.voice = chosen.voice;
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
  }, [speaking, stop, text, plan, lang]);

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
