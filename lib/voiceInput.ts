"use client";

import { SPEECH_TAGS, type Lang } from "./i18n/languages";

/**
 * Listening, as opposed to speaking.
 *
 * `lib/speech.ts` is the other half of this: it reads a screen out to
 * somebody who cannot read it. This one takes a sentence in, which is the
 * harder direction — the browser API for it has been prefixed and
 * unstandardised for a decade, is missing from Firefox entirely, and on
 * Chrome quietly ships the audio to Google's servers to be transcribed.
 *
 * Three consequences shape everything below:
 *
 *   1. It may simply not exist, and that has to be a supported outcome
 *      rather than a broken button. Every screen that uses this also
 *      offers a box to type in, so a phone with no recogniser loses the
 *      microphone and nothing else.
 *   2. The events lie. `onend` fires without `onresult` when nothing was
 *      heard; `onerror` fires after `onend` on some builds and before it
 *      on others. So this wrapper settles exactly once and reports one
 *      outcome.
 *   3. It stops on its own after a few seconds of quiet, which is right
 *      for a sentence and wrong for a pause mid-thought. An old person
 *      finding their words takes longer than the default patience, so the
 *      caller gets an explicit stop and a generous ceiling instead.
 */

/* The DOM lib does not type this API, and the two globals are not the same
   object on every browser. Only the parts actually used are declared. */
interface RecognitionAlternative {
  transcript: string;
}
interface RecognitionResult {
  0: RecognitionAlternative;
  isFinal: boolean;
  length: number;
}
interface RecognitionEvent {
  resultIndex: number;
  results: { length: number; [i: number]: RecognitionResult };
}
interface RecognitionErrorEvent {
  error: string;
}
interface Recognition {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((e: RecognitionEvent) => void) | null;
  onerror: ((e: RecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
}
type RecognitionCtor = new () => Recognition;

function ctor(): RecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: RecognitionCtor;
    webkitSpeechRecognition?: RecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function canListen(): boolean {
  return ctor() !== null;
}

/** Why the listening stopped, in the only three ways the caller cares. */
export type ListenFailure =
  /** The phone would not hand over the microphone. */
  | "blocked"
  /** It listened and heard nothing it could turn into words. */
  | "silence"
  /** Anything else: no network for the recogniser, a browser bug, a stall. */
  | "unavailable";

export interface Listening {
  /** Stop and keep whatever was heard so far. */
  stop: () => void;
  /** Stop and throw it away. */
  cancel: () => void;
}

export interface ListenOptions {
  lang: Lang;
  /** Words as they arrive, so the screen can show them being heard. */
  onPartial?: (text: string) => void;
  onFinal: (text: string) => void;
  onFailure: (why: ListenFailure) => void;
}

/** Long enough for somebody to find their words; short enough to end. */
const CEILING_MS = 20_000;

export function listen({ lang, onPartial, onFinal, onFailure }: ListenOptions): Listening {
  const Ctor = ctor();
  if (!Ctor) {
    onFailure("unavailable");
    return { stop: () => {}, cancel: () => {} };
  }

  const rec = new Ctor();
  rec.lang = SPEECH_TAGS[lang];
  /* Not continuous: this is one question, not dictation, and a recogniser
     left running is a microphone left open. */
  rec.continuous = false;
  rec.interimResults = true;
  rec.maxAlternatives = 1;

  let heard = "";
  let settled = false;
  let cancelled = false;

  const timer = window.setTimeout(() => {
    try {
      rec.stop();
    } catch {
      /* already stopped; onend will settle it */
    }
  }, CEILING_MS);

  const settle = (fn: () => void) => {
    if (settled) return;
    settled = true;
    window.clearTimeout(timer);
    if (!cancelled) fn();
  };

  rec.onresult = (e) => {
    let interim = "";
    let final = "";
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const r = e.results[i];
      const text = r[0]?.transcript ?? "";
      if (r.isFinal) final += text;
      else interim += text;
    }
    if (final) heard = `${heard} ${final}`.trim();
    if (onPartial) onPartial(`${heard} ${interim}`.trim());
  };

  rec.onerror = (e) => {
    /* "no-speech" and "aborted" are not faults — the first is somebody who
       did not speak, the second is our own stop() on a build that reports
       it as an error. Neither should show a red message. */
    if (e.error === "aborted") return settle(() => {});
    if (e.error === "no-speech") return settle(() => onFailure("silence"));
    if (e.error === "not-allowed" || e.error === "service-not-allowed") {
      return settle(() => onFailure("blocked"));
    }
    settle(() => onFailure("unavailable"));
  };

  rec.onend = () => {
    const text = heard.trim();
    settle(() => (text ? onFinal(text) : onFailure("silence")));
  };

  try {
    rec.start();
  } catch {
    settle(() => onFailure("unavailable"));
  }

  return {
    stop: () => {
      try {
        rec.stop();
      } catch {
        settle(() => onFailure("unavailable"));
      }
    },
    cancel: () => {
      cancelled = true;
      window.clearTimeout(timer);
      try {
        rec.abort();
      } catch {
        /* nothing to abort */
      }
    },
  };
}
