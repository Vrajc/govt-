"use client";

import type { Lang } from "./i18n/languages";
import { SPEECH_TAGS } from "./i18n/languages";

/**
 * Listening, as opposed to speaking.
 *
 * `lib/speech.ts` is the other half of this: it reads a screen out to
 * somebody who cannot read it. This one takes a sentence in, which is the
 * harder direction — the browser API for it has been prefixed and
 * unstandardised for a decade, is missing from Firefox entirely, and on
 * Chrome quietly ships the audio to Google's servers to be transcribed.
 *
 * Four things learned the hard way, each of which is a rule below:
 *
 *   1. It may simply not exist, and that has to be a supported outcome
 *      rather than a broken button. Every screen that uses this also
 *      offers a box to type in, so a phone with no recogniser loses the
 *      microphone and nothing else.
 *   2. **A word that was heard is a word that was heard.** The recogniser
 *      marks a result "final" when it is finished with it, and it is
 *      routinely never finished — the user presses stop mid-sentence, the
 *      network drops, the twenty-second ceiling arrives. Keeping only the
 *      final results throws the sentence away *after showing it on the
 *      screen*, which is the worst of both: the person watched their own
 *      words appear and was then told nothing was heard.
 *   3. It gives up far too early. Chrome ends the session after a few
 *      seconds of quiet, and somebody in their eighties finding their
 *      words takes longer than that. So a session that ends with nothing
 *      is restarted rather than reported.
 *   4. The events lie. `onend` fires without `onresult`; `onerror` fires
 *      after `onend` on some builds and before it on others; `stop()`
 *      sometimes never produces either. So this settles exactly once, from
 *      whichever of them arrives, and has a backstop for when none does.
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

/**
 * The tag the recogniser wants, which is not always the tag the voice wants.
 *
 * Google's transcriber names Punjabi by its script — `pa-Guru-IN` — and
 * rejects the plain `pa-IN` that `speechSynthesis` is perfectly happy with.
 * A rejected tag is not a soft failure: it comes back as
 * `language-not-supported` and, before this map existed, was reported to a
 * Punjabi speaker as "this phone cannot listen", which is a lie about their
 * phone.
 *
 * Odia has no entry because Google's recogniser has no Odia. That is a real
 * gap and it is reported as one, in copy that points at the box to type in,
 * rather than being disguised as a broken microphone.
 */
const HEARD_AS: Partial<Record<Lang, string>> = {
  pa: "pa-Guru-IN",
};

function recognitionTag(lang: Lang): string {
  return HEARD_AS[lang] ?? SPEECH_TAGS[lang];
}

/**
 * Whether this browser could listen at all.
 *
 * The secure-context test matters more than it looks: recognition is refused
 * outright on plain http, so a phone opening the laptop's dev server over
 * the house wifi has a microphone, has granted permission, and still cannot
 * be listened to. Better to never offer the button than to offer one that
 * fails for a reason nobody can act on.
 */
export function canListen(): boolean {
  if (ctor() === null) return false;
  return window.isSecureContext !== false;
}

/**
 * What this device will actually do, asked rather than assumed.
 *
 * The Permissions API alone is not enough. It answers "prompt" on a laptop
 * with no microphone plugged in at all, which is how somebody ends up
 * pressing a live-looking button that can never work; and on a desktop
 * where the site was blocked once, months ago, it answers "denied" with no
 * hint that the fix is two clicks away in the address bar.
 *
 * So: ask for the device list, and — only when the permission is not
 * already granted — actually ask for the microphone. Requesting it is the
 * one call that cannot be wrong, because it is the same call recognition
 * itself will make. The track is stopped again immediately; this is a
 * question, not a recording.
 */
export type MicVerdict =
  /** Recognition can be started right now. */
  | "ready"
  /** The browser has no recogniser — Firefox, most WebViews. */
  | "unsupported"
  /** Plain http. Recognition is refused outright and nothing can fix it here. */
  | "insecure"
  /** There is no microphone attached at all. */
  | "nodevice"
  /**
   * The page itself is forbidden the microphone by its own
   * Permissions-Policy header, whatever the reader has allowed.
   *
   * This is our bug, never theirs, and it is worth its own answer: the app
   * shipped `microphone=()` — an empty allowlist — for months, so every
   * reader who pressed the button was told to go and change a browser
   * setting that was already correct. Telling somebody to fix something
   * they cannot fix is worse than saying nothing.
   */
  | "policy"
  /** There is one, and this site is not allowed to use it. */
  | "blocked";

export async function checkMic(): Promise<MicVerdict> {
  if (ctor() === null) return "unsupported";
  if (window.isSecureContext === false) return "insecure";

  /* Asked before the microphone is, because a policy refusal and a reader
     refusal look identical from getUserMedia and need opposite advice. */
  const policy = (document as unknown as {
    featurePolicy?: { allowsFeature?: (f: string) => boolean };
    permissionsPolicy?: { allowsFeature?: (f: string) => boolean };
  });
  const allows = policy.permissionsPolicy?.allowsFeature ?? policy.featurePolicy?.allowsFeature;
  if (allows && allows.call(policy.permissionsPolicy ?? policy.featurePolicy, "microphone") === false) {
    return "policy";
  }

  const media = navigator.mediaDevices;
  /* An old WebView with a recogniser but no mediaDevices: nothing here can
     be checked, so let the recogniser speak for itself rather than refusing
     on its behalf. */
  if (!media?.getUserMedia) return "ready";

  try {
    const devices = await media.enumerateDevices();
    /* Before permission is granted the labels are blank but the entries are
       there, so counting them is meaningful even on a first visit. An empty
       list on a browser that does report devices means no microphone. */
    if (devices.length > 0 && !devices.some((d) => d.kind === "audioinput")) {
      return "nodevice";
    }
  } catch {
    /* Device enumeration is a nicety. The real test is below. */
  }

  /* Already granted: do not touch the microphone, just say so. Acquiring
     and releasing it here has been seen to make the recogniser that starts
     a moment later miss its first syllable. */
  try {
    const status = await navigator.permissions?.query({
      name: "microphone" as PermissionName,
    });
    if (status?.state === "granted") return "ready";
  } catch {
    /* Firefox does not know the name. Fall through and ask properly. */
  }

  try {
    const stream = await media.getUserMedia({ audio: true });
    for (const track of stream.getTracks()) track.stop();
    return "ready";
  } catch (err) {
    const name = (err as { name?: string })?.name ?? "";
    if (name === "NotFoundError" || name === "OverconstrainedError") return "nodevice";
    return "blocked";
  }
}

/** Why the listening stopped, in the ways the caller can say something about. */
export type ListenFailure =
  /** The phone would not hand over the microphone. */
  | "blocked"
  /** It listened and heard nothing it could turn into words. */
  | "silence"
  /** There is a microphone but something else has it. */
  | "busy"
  /** The recogniser lives on the network and the network was not there. */
  | "network"
  /** This browser cannot transcribe this language. Odia, today. */
  | "language"
  /** Anything else: a browser bug, a stall, a state we did not predict. */
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
  /**
   * The microphone has closed and the words are being worked out.
   *
   * Only the recording path has anything to report here, and it matters
   * there because the gap is seconds long: the recogniser used to answer
   * the moment it was stopped, so nothing needed saying. Without this the
   * panel goes on claiming to be listening while it uploads, the button
   * does nothing because the session is already finished, and a person who
   * has done exactly as they were told watches a screen that appears to
   * have died.
   */
  onWorking?: () => void;
  onFinal: (text: string) => void;
  onFailure: (why: ListenFailure) => void;
}

/** Long enough for somebody to find their words; short enough to end. */
const CEILING_MS = 25_000;

/** How many times a session that heard nothing is quietly started again. */
const RESTARTS = 3;

/** If `stop()` produces neither an end nor an error, settle anyway. */
const STOP_GRACE_MS = 1_200;

/* ==================================================================
 * Recording, for the ten languages the browser cannot be trusted with
 * ================================================================== */

/** Long enough to say a sentence; short enough that a forgotten press ends. */
const RECORD_CEILING_MS = 20_000;

/**
 * Quiet, after speech, for this long means they have finished.
 *
 * The recogniser this replaced stopped by itself when somebody stopped
 * talking, and that is what a person expects from a microphone button. Made
 * to press a second time, they press once, wait, and conclude it is broken
 * — which is exactly what happened. Long enough to survive the pause in the
 * middle of a sentence, short enough not to feel abandoned.
 */
const SILENCE_MS = 1_800;

/** How often the loudness is sampled. Cheap: one small array, no allocation. */
const SILENCE_TICK_MS = 150;

/**
 * How often the words so far are asked for, while somebody is still talking.
 *
 * The recogniser this replaced showed each word as it was said, and that is
 * not decoration: watching the words appear is how a person knows the phone
 * is hearing them. Take it away and they stop mid-sentence to check, or
 * repeat themselves, or give up. Recording alone cannot do it — there is
 * nothing to show until the recording ends.
 *
 * So the audio so far is sent every couple of seconds and the words come
 * back for the screen. Each one is the whole recording from the beginning
 * rather than the newest slice, because a MediaRecorder chunk after the
 * first has no header and will not decode on its own. That costs a request
 * per two seconds of speech, which is the price of the sentence appearing
 * as it is spoken.
 */
const PARTIAL_MS = 2_000;

/**
 * Above the noise floor. A quiet room reads 1-3 on this scale and speech
 * reads well above 10, so this sits between them with room on both sides —
 * a threshold too low never stops, and one too high cuts somebody off.
 */
const SPEECH_LEVEL = 7;

/**
 * Whether this device can record at all. Every phone can; a few old
 * WebViews cannot, and they still have the box to type in.
 */
export function canRecord(): boolean {
  return (
    typeof window !== "undefined" &&
    window.isSecureContext !== false &&
    typeof MediaRecorder !== "undefined" &&
    Boolean(navigator.mediaDevices?.getUserMedia)
  );
}

/**
 * Record what is said and have it transcribed on the server.
 *
 * This is the path that works in all eleven languages, and it exists
 * because the browser's own recogniser does not. Its coverage of these
 * languages varies between Android builds with no way to ask in advance —
 * a phone that transcribes English perfectly will open the microphone for
 * Gujarati and hand back nothing at all, silently. That is not a failure
 * anything here can detect and route around; it just looks like a person
 * who said nothing.
 *
 * The shape is deliberately the same as `listen` so the panel can hold
 * either: press to start, press again to send. Nothing is played while the
 * microphone is open — see the note in the panel about what that costs.
 */
export function record({
  lang,
  onPartial,
  onWorking,
  onFinal,
  onFailure,
}: ListenOptions): Listening {
  let recorder: MediaRecorder | null = null;
  let stream: MediaStream | null = null;
  const chunks: Blob[] = [];
  let settled = false;
  let cancelled = false;
  /** Set the moment the turn is ending, so no late partial lands after it. */
  let closing = false;
  let ceiling = 0;
  let watching = 0;
  let audio: AudioContext | null = null;

  const release = () => {
    window.clearTimeout(ceiling);
    window.clearInterval(watching);
    try {
      void audio?.close();
    } catch {
      /* already closed */
    }
    audio = null;
    for (const track of stream?.getTracks() ?? []) track.stop();
    stream = null;
  };

  const settle = (fn: () => void) => {
    if (settled) return;
    settled = true;
    release();
    if (!cancelled) fn();
  };

  /** Everything recorded so far, as one file the decoder will accept. */
  const soFar = (): Blob =>
    new Blob(chunks, { type: recorder?.mimeType || "audio/webm" });

  const transcribe = async (blob: Blob): Promise<string | null> => {
    const form = new FormData();
    form.append("audio", blob, "said");
    form.append("language", lang);
    const res = await fetch("/api/listen", { method: "POST", body: form });
    if (!res.ok) throw new Error(String(res.status));
    const body = (await res.json()) as { text?: string };
    return (body.text ?? "").trim() || null;
  };

  /* One partial in the air at a time. They are worth having but not worth
     queueing: a backlog would still be arriving after the answer. */
  let partialInFlight = false;

  const showSoFar = async () => {
    if (!onPartial || partialInFlight || settled || closing) return;
    const blob = soFar();
    if (blob.size < 1200) return;
    partialInFlight = true;
    try {
      const text = await transcribe(blob);
      if (text && !settled && !closing) onPartial(text);
    } catch {
      /* A partial that does not arrive costs nothing: the next one, or the
         final, carries the same words. */
    } finally {
      partialInFlight = false;
    }
  };

  const send = async () => {
    onWorking?.();
    const blob = soFar();
    /* Under a second of audio is somebody who pressed twice, not somebody
       who spoke. Saying "nothing was heard" is the honest answer and costs
       no round trip. */
    if (blob.size < 1200) return settle(() => onFailure("silence"));

    try {
      const text = await transcribe(blob);
      if (!text) return settle(() => onFailure("silence"));
      settle(() => onFinal(text));
    } catch {
      settle(() => onFailure("network"));
    }
  };

  void (async () => {
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err) {
      const name = (err as { name?: string })?.name ?? "";
      return settle(() =>
        onFailure(name === "NotFoundError" ? "unavailable" : "blocked"),
      );
    }
    if (cancelled) return release();

    try {
      recorder = new MediaRecorder(stream);
    } catch {
      return settle(() => onFailure("unavailable"));
    }
    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) chunks.push(e.data);
      /* Every slice is a chance to put the words on screen. Not once the
         turn is ending — the final transcription is already on its way and
         a late partial would overwrite it with less. */
      if (!closing) void showSoFar();
    };
    recorder.onstop = () => {
      if (cancelled) return release();
      void send();
    };
    recorder.onerror = () => settle(() => onFailure("unavailable"));
    /* A slice every couple of seconds, so there is something to transcribe
       before the person has finished speaking. */
    recorder.start(PARTIAL_MS);

    const endRecording = () => {
      closing = true;
      try {
        if (recorder && recorder.state === "recording") recorder.stop();
      } catch {
        settle(() => onFailure("silence"));
      }
    };

    ceiling = window.setTimeout(endRecording, RECORD_CEILING_MS);

    /* Listen to the level to know when they have finished, so the button
       does not have to be pressed twice. If any of this is unavailable the
       recording simply runs to the ceiling or to a second press, which is
       the behaviour without it. */
    try {
      const Ctx =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (Ctx) {
        audio = new Ctx();
        void audio.resume?.();
        const source = audio.createMediaStreamSource(stream);
        const meter = audio.createAnalyser();
        meter.fftSize = 512;
        source.connect(meter);
        const frame = new Uint8Array(meter.fftSize);
        let spoke = false;
        let quietFrom = 0;

        watching = window.setInterval(() => {
          meter.getByteTimeDomainData(frame);
          let peak = 0;
          for (let i = 0; i < frame.length; i++) {
            const d = Math.abs(frame[i] - 128);
            if (d > peak) peak = d;
          }
          if (peak > SPEECH_LEVEL) {
            spoke = true;
            quietFrom = 0;
            return;
          }
          /* Quiet before they have said anything is somebody thinking, not
             somebody finished. Only silence after speech ends the turn. */
          if (!spoke) return;
          const now = Date.now();
          if (!quietFrom) quietFrom = now;
          else if (now - quietFrom >= SILENCE_MS) {
            window.clearInterval(watching);
            endRecording();
          }
        }, SILENCE_TICK_MS);
      }
    } catch {
      /* No meter: the ceiling and the second press still end it. */
    }
  })();

  return {
    stop: () => {
      closing = true;
      window.clearTimeout(ceiling);
      window.clearInterval(watching);
      try {
        if (recorder && recorder.state === "recording") recorder.stop();
        else if (!settled) settle(() => onFailure("silence"));
      } catch {
        settle(() => onFailure("silence"));
      }
    },
    cancel: () => {
      cancelled = true;
      settled = true;
      closing = true;
      try {
        if (recorder && recorder.state === "recording") recorder.stop();
      } catch {
        /* nothing to stop */
      }
      release();
    },
  };
}

export function listen({ lang, onPartial, onFinal, onFailure }: ListenOptions): Listening {
  const Ctor = ctor();
  if (!Ctor) {
    onFailure("unavailable");
    return { stop: () => {}, cancel: () => {} };
  }

  const rec = new Ctor();
  rec.lang = recognitionTag(lang);
  /* Not continuous: this is one question, not dictation, and a recogniser
     left running is a microphone left open. */
  rec.continuous = false;
  rec.interimResults = true;
  rec.maxAlternatives = 1;

  /** Results the recogniser committed to. */
  let heard = "";
  /** Everything on screen, committed or not — see rule 2 above. */
  let partial = "";
  let settled = false;
  let cancelled = false;
  /** Set once nothing should be restarted: a stop, a ceiling, a real fault. */
  let closing = false;
  let restarts = 0;
  let fault: ListenFailure | null = null;
  let grace = 0;

  const startedAt = Date.now();

  const ceiling = window.setTimeout(() => {
    closing = true;
    try {
      rec.stop();
    } catch {
      /* already stopped; onend settles it */
    }
  }, CEILING_MS);

  const settle = (fn: () => void) => {
    if (settled) return;
    settled = true;
    window.clearTimeout(ceiling);
    window.clearTimeout(grace);
    if (!cancelled) fn();
  };

  /* Whichever of the two is longer is the fuller sentence: `partial` is
     always `heard` plus whatever is still being decided, so a longer one
     means more words rather than different ones. */
  const best = (): string => {
    const done = heard.trim();
    const live = partial.trim();
    return live.length > done.length ? live : done;
  };

  const finish = () => {
    const text = best();
    /* Words first, always. If something was heard, it does not matter that
       the network dropped or the ceiling arrived on the way to saying so. */
    if (text) return settle(() => onFinal(text));
    settle(() => onFailure(fault ?? "silence"));
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
    partial = `${heard} ${interim}`.trim();
    if (onPartial) onPartial(partial);
  };

  rec.onerror = (e) => {
    switch (e.error) {
      /* Neither of these is a fault. "aborted" is our own stop on a build
         that reports it as an error, and "no-speech" is somebody who has not
         started talking yet — which is the normal state of a person who has
         just been asked a question. Both fall through to `onend`, which
         restarts or reports as the situation deserves. */
      case "aborted":
      case "no-speech":
        return;
      case "not-allowed":
      case "service-not-allowed":
        fault = "blocked";
        break;
      case "audio-capture":
        fault = "busy";
        break;
      case "network":
        fault = "network";
        break;
      case "language-not-supported":
      case "bad-grammar":
        fault = "language";
        break;
      default:
        fault = "unavailable";
    }
    closing = true;
    /* Do not settle here. `onend` follows on every build, and settling from
       the error first is exactly how a sentence that was heard gets reported
       as a failure. */
  };

  rec.onend = () => {
    if (settled || cancelled) return;
    if (best()) return finish();
    if (fault) return finish();

    /* Nothing heard, nothing wrong: the recogniser simply ran out of
       patience before the person did. Start it again. */
    if (!closing && restarts < RESTARTS && Date.now() - startedAt < CEILING_MS) {
      restarts++;
      try {
        rec.start();
        return;
      } catch {
        /* cannot be restarted — report what we have, which is nothing */
      }
    }
    finish();
  };

  try {
    rec.start();
  } catch {
    /* Almost always `InvalidStateError` from a recogniser that is already
       running — a double press, or a previous session that never ended.
       Aborting and retrying once is the difference between a working button
       and a button that says the phone cannot listen. */
    try {
      rec.abort();
      rec.start();
    } catch {
      settle(() => onFailure("unavailable"));
    }
  }

  return {
    stop: () => {
      closing = true;
      try {
        rec.stop();
      } catch {
        return finish();
      }
      /* Some builds never fire `onend` after an explicit stop. Rather than
         leave the panel spinning on a sentence it already has, settle on
         our own after a moment. */
      grace = window.setTimeout(finish, STOP_GRACE_MS);
    },
    cancel: () => {
      cancelled = true;
      closing = true;
      settled = true;
      window.clearTimeout(ceiling);
      window.clearTimeout(grace);
      try {
        rec.abort();
      } catch {
        /* nothing to abort */
      }
    },
  };
}
