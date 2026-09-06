"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useApp } from "@/lib/app-state";
import { apiFetch } from "@/lib/api";
import {
  planVoice,
  primeSpeech,
  speakAll,
  whenVoicesReady,
  type Speaking,
  type VoicePlan,
} from "@/lib/speech";
import { canListen, listen, type ListenFailure, type Listening } from "@/lib/voiceInput";
import { Mic, Speaker, StopSquare } from "./Icons";

/**
 * Ask out loud.
 *
 * The Listen button reads a screen to somebody who cannot read it. This is
 * the other direction, and it is the one that matters more: a person who
 * cannot read cannot find the screen worth listening to. They know what
 * they want — "my pension has not come", "my husband died last month" —
 * and every government site ever built asks them to already know the name
 * of the scheme, which is the one thing they do not.
 *
 * So: they say it, and the answer comes back as one spoken sentence, two
 * to five steps, and a button that goes there. The whole thing is one
 * round trip and no reading.
 *
 * Three things it deliberately does not do:
 *
 *   • It does not sit on the microphone. Recognition is a single question,
 *     started by a press, stopped when the sentence ends or twenty-five
 *     seconds pass, whichever comes first.
 *   • It does not require a microphone at all. Firefox has no recogniser,
 *     several Android WebViews have none, and a shared phone may have the
 *     permission switched off — so the box to type in is always there,
 *     never a degraded fallback shown after a failure.
 *   • It does not pretend. When the model cannot be reached the server
 *     answers out of the dictionary, and what comes back is a real path
 *     through the app rather than an apology. When something really did go
 *     wrong it says which thing, because "this phone cannot listen" told to
 *     somebody whose phone is listening perfectly well is worse than saying
 *     nothing.
 */

type Phase = "idle" | "listening" | "thinking" | "answered" | "trouble";

interface Destination {
  href: string;
  label: string;
}

interface Answer {
  say: string;
  steps: string[];
  goto: Destination | null;
}

export function VoiceAssistant() {
  const { t, lang } = useApp();
  const [open, setOpen] = useState(false);

  /* Mounted only while open, so a panel that nobody has asked for costs no
     state, no timers, and no microphone. */
  return (
    <>
      <button
        type="button"
        className="voice-launch"
        onClick={() => {
          /* Everything this panel says arrives after a network round trip,
             and Safari will not speak after one unless the page has already
             spoken inside a real press. This is that press. */
          primeSpeech();
          setOpen(true);
        }}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <Mic size={26} />
        <span>{t("voice.open")}</span>
      </button>
      {open && <VoicePanel onClose={() => setOpen(false)} key={lang} />}
    </>
  );
}

function VoicePanel({ onClose }: { onClose: () => void }) {
  const { t, lang } = useApp();
  const router = useRouter();
  const pathname = usePathname();

  const [phase, setPhase] = useState<Phase>("idle");
  const [said, setSaid] = useState("");
  const [typed, setTyped] = useState("");
  const [answer, setAnswer] = useState<Answer | null>(null);
  const [trouble, setTrouble] = useState("");
  const [speaking, setSpeaking] = useState(false);
  const [micUsable, setMicUsable] = useState(false);

  const [plan, setPlan] = useState<VoicePlan | null>(null);
  /** Settled separately from `plan`, because null means two things until it is. */
  const [voiceless, setVoiceless] = useState(false);

  const job = useRef<Speaking | null>(null);
  const session = useRef<Listening | null>(null);
  const panel = useRef<HTMLDivElement>(null);
  /** The newest words off the microphone, readable without waiting for React. */
  const catching = useRef("");

  /* ---------------- the voice this phone will answer in ---------------- */
  useEffect(
    () =>
      whenVoicesReady((voices) => {
        const chosen = planVoice(lang, voices);
        setPlan(chosen);
        /* No voice for this language on this device is a real answer, and
           the panel says so rather than going quiet and looking broken.
           Every word it would have spoken is on the screen either way. */
        setVoiceless(chosen === null);
      }),
    [lang]
  );

  /* ---------------- whether this phone can listen at all ---------------- */
  useEffect(() => {
    const usable = canListen();
    setMicUsable(usable);
    if (!usable) return;

    /* A permission that was refused once stays refused, silently, and the
       phone gives no sign of it until the button has been pressed and has
       apparently done nothing. Where the browser will tell us, say so first. */
    let watched: PermissionStatus | null = null;
    let alive = true;
    const perms = navigator.permissions;
    if (perms?.query) {
      perms
        .query({ name: "microphone" as PermissionName })
        .then((status) => {
          if (!alive) return;
          watched = status;
          const check = () => setTrouble(status.state === "denied" ? t("voice.micBlocked") : "");
          check();
          status.onchange = check;
        })
        .catch(() => {
          /* Firefox does not know this permission name. Nothing is lost: the
             failure path below still reports a refusal accurately. */
        });
    }
    return () => {
      alive = false;
      if (watched) watched.onchange = null;
    };
  }, [t]);

  /* ---------------- speaking ---------------- */
  const hush = useCallback(() => {
    job.current?.cancel();
    job.current = null;
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setSpeaking(false);
  }, []);

  const say = useCallback(
    (text: string) => {
      const clean = text.trim();
      // No voice on this phone for this language at all: the panel still
      // shows every word, and the note above says why it is quiet.
      if (!clean || !plan) return;
      hush();
      setSpeaking(true);
      job.current = speakAll(clean, plan, { onEnd: () => setSpeaking(false) });
    },
    [hush, plan]
  );

  /* The panel introduces itself. Somebody who opened a voice helper is
     quite likely unable to read the sentence explaining how to use it, and
     the press that opened this counts as the gesture browsers require
     before a page is allowed to make a sound. */
  const introduced = useRef(false);
  useEffect(() => {
    /* Waits for the voice rather than firing on a timer. Android populates
       its voice list well after the panel is on screen, and an introduction
       that speaks only on a fast laptop is no introduction. */
    if (!plan || introduced.current) return;
    introduced.current = true;
    const id = window.setTimeout(() => say(t("voice.intro")), 250);
    return () => window.clearTimeout(id);
  }, [plan, say, t]);

  /* ---------------- closing ---------------- */
  const close = useCallback(() => {
    session.current?.cancel();
    session.current = null;
    hush();
    onClose();
  }, [hush, onClose]);

  useEffect(() => {
    panel.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [close]);

  /* Never let a voice follow somebody into their pocket or onto the next
     screen — the same rule the Listen button keeps. */
  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === "hidden") {
        session.current?.cancel();
        hush();
      }
    };
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", hush);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", hush);
      session.current?.cancel();
      hush();
    };
  }, [hush]);

  /* ---------------- asking ---------------- */
  const ask = useCallback(
    async (text: string) => {
      const question = text.trim();
      if (!question) return;
      hush();
      setSaid(question);
      setAnswer(null);
      setTrouble("");
      setPhase("thinking");

      const res = await apiFetch<Answer & { source: string }>("/api/assistant", {
        method: "POST",
        body: JSON.stringify({ text: question, language: lang, path: pathname }),
        // Longer than the model's own ceiling, so a slow network is the only
        // thing that can trip this rather than the model itself.
        timeoutMs: 15_000,
      });

      if (!res.ok) {
        setPhase("trouble");
        setTrouble(t("voice.offline"));
        say(t("voice.offline"));
        return;
      }

      const got: Answer = { say: res.data.say, steps: res.data.steps, goto: res.data.goto };
      setAnswer(got);
      setPhase("answered");
      // Read out as one passage: the sentence, then the steps in order.
      // No numbers — half the voices on the market pronounce "1." as "one
      // full stop", and the numbers are on the screen for whoever can see.
      say([got.say, ...got.steps].join(" "));
    },
    [hush, lang, pathname, say, t]
  );

  /* ---------------- listening ---------------- */
  /**
   * Which thing went wrong, said as the thing that went wrong.
   *
   * Every one of these used to be "this phone cannot listen", which is the
   * one sentence that is both wrong and unactionable when the microphone is
   * working and the permission is granted.
   */
  const troubleFor = useCallback(
    (why: ListenFailure): string => {
      switch (why) {
        case "blocked":
          return t("voice.micBlocked");
        case "silence":
          return t("voice.nothingHeard");
        case "busy":
          return t("voice.micBusy");
        case "network":
          return t("voice.micNetwork");
        case "language":
          return t("voice.micLang");
        default:
          return t("voice.noMic");
      }
    },
    [t]
  );

  const startListening = useCallback(() => {
    primeSpeech();
    hush();
    setSaid("");
    catching.current = "";
    setAnswer(null);
    setTrouble("");
    setPhase("listening");

    session.current = listen({
      lang,
      onPartial: (text) => {
        catching.current = text;
        setSaid(text);
      },
      onFinal: (text) => {
        session.current = null;
        void ask(text);
      },
      onFailure: (why: ListenFailure) => {
        session.current = null;
        setPhase("trouble");
        const message = troubleFor(why);
        setTrouble(message);
        /* Anything caught before it went wrong belongs to the person who
           said it. It goes into the box, one press from being asked, rather
           than being thrown away with the failure. */
        const caught = catching.current.trim();
        if (caught) setTyped((prev) => prev || caught);
        say(message);
      },
    });
  }, [ask, hush, lang, say, troubleFor]);

  const stopListening = useCallback(() => {
    session.current?.stop();
    session.current = null;
  }, []);

  const goThere = useCallback(
    (href: string) => {
      hush();
      session.current?.cancel();
      router.push(href);
      onClose();
    },
    [hush, onClose, router]
  );

  const reset = useCallback(() => {
    hush();
    setPhase("idle");
    setSaid("");
    setTyped("");
    catching.current = "";
    setAnswer(null);
    setTrouble("");
  }, [hush]);

  const micLabel =
    phase === "listening" ? t("voice.listening") : phase === "thinking" ? t("voice.thinking") : t("voice.press");

  return (
    <div className="voice-scrim" onMouseDown={(e) => e.target === e.currentTarget && close()}>
      <div
        className="voice-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="voice-title"
        tabIndex={-1}
        ref={panel}
      >
        <div className="voice-head">
          <h2 className="voice-title" id="voice-title">
            {t("voice.title")}
          </h2>
          <button type="button" className="voice-close" onClick={close}>
            {t("nav.close")}
          </button>
        </div>

        <p className="voice-intro">{t("voice.intro")}</p>

        {voiceless && <p className="voice-note">{t("voice.noVoice")}</p>}

        {/* The one control that matters, sized for a thumb that shakes. */}
        <div className="voice-mic-row">
          <button
            type="button"
            className={`voice-mic${phase === "listening" ? " is-live" : ""}`}
            onClick={phase === "listening" ? stopListening : startListening}
            disabled={!micUsable || phase === "thinking"}
            aria-label={micLabel}
          >
            <Mic size={44} />
          </button>
          <p className="voice-mic-label" aria-live="polite">
            {micUsable ? micLabel : t("voice.noMic")}
          </p>
        </div>

        {said && (
          <p className="voice-said">
            <span className="voice-said-l">{t("voice.youSaid")}</span>
            <span className="voice-said-w">{said}</span>
          </p>
        )}

        {phase === "thinking" && <p className="voice-wait">{t("voice.thinking")}</p>}

        {trouble && <p className="voice-trouble">{trouble}</p>}

        {answer && (
          <div className="voice-answer">
            <p className="voice-say">{answer.say}</p>
            <h3 className="voice-steps-h">{t("voice.steps")}</h3>
            <ol className="voice-steps">
              {answer.steps.map((step, i) => (
                <li key={i}>
                  <span className="voice-step-n" aria-hidden="true">
                    {i + 1}
                  </span>
                  <span className="voice-step-w">{step}</span>
                </li>
              ))}
            </ol>

            <div className="voice-acts">
              {answer.goto && (
                <button
                  type="button"
                  className="voice-go"
                  onClick={() => goThere(answer.goto!.href)}
                >
                  {t("voice.goThere", { page: answer.goto.label })}
                </button>
              )}
              {/* Hidden rather than dead when there is no voice to replay with. */}
              {!voiceless && (
                <button
                  type="button"
                  className="voice-minor"
                  onClick={() =>
                    speaking ? hush() : say([answer.say, ...answer.steps].join(" "))
                  }
                >
                  {speaking ? <StopSquare size={18} /> : <Speaker size={18} />}
                  <span>{speaking ? t("common.stop") : t("voice.replay")}</span>
                </button>
              )}
              <button type="button" className="voice-minor" onClick={reset}>
                {t("voice.again")}
              </button>
            </div>
          </div>
        )}

        {/* Always present, never a punishment for a phone that cannot
            listen: on a laptop with no microphone this is the whole
            feature, and in a noisy queue outside a bank it is better. */}
        <form
          className="voice-type"
          onSubmit={(e) => {
            e.preventDefault();
            void ask(typed);
          }}
        >
          <label className="voice-type-l" htmlFor="voice-type-in">
            {t("voice.typeInstead")}
          </label>
          <div className="voice-type-row">
            <input
              id="voice-type-in"
              className="voice-type-in"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              placeholder={t("voice.typePlaceholder")}
              autoComplete="off"
              enterKeyHint="send"
            />
            <button type="submit" className="voice-type-go" disabled={!typed.trim()}>
              {t("voice.ask")}
            </button>
          </div>
        </form>

        <p className="voice-privacy">{t("voice.privacy")}</p>
      </div>
    </div>
  );
}
