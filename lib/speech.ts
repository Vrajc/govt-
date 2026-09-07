import { LANGS, langMeta, type Lang, type Script } from "./i18n/languages";

/**
 * Making `speechSynthesis` work in eleven languages on phones that ship two.
 *
 * The button that reads the screen aloud is not a nicety here — it is the
 * whole product for someone who cannot read. So it has to survive the state
 * of Indian-language text-to-speech as it actually is: Chrome on a laptop
 * ships Hindi and nothing else Indian; a mid-range Android ships whatever
 * the manufacturer felt like; iOS ships Hindi and, since 2023, a handful of
 * others. A Malayalam reader who presses Listen and gets silence has been
 * told the app is not for them.
 *
 * Three answers, in order:
 *
 *   1. A voice for their language. Best case, and increasingly common.
 *   2. A voice for a language that shares their script — Hindi reading
 *      Marathi is a Hindi accent, not a wrong language.
 *   3. Their words, rewritten into Devanagari, read by the Hindi voice.
 *
 * The third is the interesting one. Every script in this app descends from
 * Brahmi and Unicode laid the blocks out in parallel — the same phonetic
 * order, sign for sign, a fixed distance apart. Bengali is Devanagari plus
 * 0x80, Tamil plus 0x280, Malayalam plus 0x400. Rewriting the letters gives
 * a Hindi voice the reader's own sentence, in their own words, in a Hindi
 * accent. It is a transliteration, not a translation: nothing is restated,
 * only respelled. An accent is a far smaller loss than silence.
 */

/* ==================================================================
 * Script → Devanagari
 * ================================================================== */

/** Where each block sits above Devanagari, which starts at U+0900. */
const OFFSET: Partial<Record<Script, number>> = {
  beng: 0x080,
  guru: 0x100,
  gujr: 0x180,
  orya: 0x200,
  taml: 0x280,
  telu: 0x300,
  knda: 0x380,
  mlym: 0x400,
};

/** Each block is 128 code points wide, starting at its own multiple of 0x80. */
const BLOCK_START: Partial<Record<Script, number>> = Object.fromEntries(
  Object.entries(OFFSET).map(([s, off]) => [s, 0x900 + off]),
);

/**
 * The signs the parallel layout does not line up.
 *
 * Every one of these is a letter that exists in one script and simply has no
 * twin at the same slot in Devanagari — usually because it is a ligature the
 * other script writes as two letters, or a mark that means something
 * different at that offset. Left to the arithmetic they would come out as
 * abbreviation signs and stray dots, which a voice reads as pauses or skips.
 */
const EXCEPTIONS: Partial<Record<Script, Record<string, string>>> = {
  beng: {
    "ৎ": "त्", // khanda ta — a final t, written as one letter
    "ৰ": "र", // Assamese ra
    "ৱ": "व", // Assamese wa
  },
  guru: {
    "ੰ": "ं", // tippi — a nasal, not the abbreviation sign at 0970
    "ੱ": "", // addak — handled by doubling, below
    "ੴ": "ओं", // ek onkar, the opening of the Guru Granth Sahib
  },
  orya: {
    "ୱ": "व", // wa
  },
  taml: {
    "ஃ": "ः", // aytham — the closest Devanagari has is visarga
    "ற": "र", // ṟa: 0931 exists but no Hindi voice says it
    "ன": "न", // ṉa: likewise
    "ழ": "ळ", // ḻa — the Tamil zh; ळ is the nearest a Hindi voice has
  },
  telu: {
    "ఱ": "र", // ṟa
    "ౕ": "", // length marks combine with a vowel sign and do not travel
    "ౖ": "",
  },
  knda: {
    "ಱ": "र", // ṟa
    "ೞ": "ळ", // ḻa
    "ೕ": "",
    "ೖ": "",
  },
  mlym: {
    /* Chillus: a bare consonant with no inherent vowel, written as its own
       letter. Devanagari writes the same sound as consonant plus virama. */
    "ൺ": "ण्", // ṇ
    "ൻ": "न्", // n
    "ർ": "र्", // r
    "ൽ": "ल्", // l
    "ൾ": "ळ्", // ḷ
    "ൿ": "क्", // k
    "ൎ": "", // dot reph, a purely written mark
  },
};

/**
 * Devanagari signs that exist but that no Hindi voice will say.
 *
 * The Dravidian scripts distinguish short e and short o, and Devanagari
 * gained signs for them precisely so it could write those languages down.
 * A Hindi voice has never met them and skips the whole syllable, which
 * silently drops a letter out of the middle of a word. Rounding them to
 * their long counterparts costs a vowel length and saves the word.
 */
const SPEAKABLE: Record<string, string> = {
  "ऄ": "अ", // short a
  "ऍ": "ए", // candra e
  "ऎ": "ए", // short e
  "ऑ": "ओ", // candra o
  "ऒ": "ओ", // short o
  "ॅ": "े", // candra e sign
  "ॆ": "े", // short e sign
  "ॉ": "ो", // candra o sign
  "ॊ": "ो", // short o sign
  "ऩ": "न", // ṉa
  "ऱ": "र", // ṟa
  "ऴ": "ळ", // ḻa
};

/** Digits, in every Indic block, sit at +0x66 from the block start. */
const DIGIT_OFFSET = 0x66;

/** Consonants, for the one rule that needs to know what a consonant is. */
const DEVA_CONSONANT = /[क-हक़-य़]/;

/**
 * Rewrites one Indic script into Devanagari.
 *
 * Latin text passes through untouched, which matters more than it sounds:
 * IFSC codes, PPO numbers and the word "PF" are printed in Latin letters
 * inside every one of these dictionaries, and a voice should read them as
 * what they are.
 */
export function toDevanagari(text: string, script: Script): string {
  const offset = OFFSET[script];
  if (offset === undefined) return speakable(text);

  const start = BLOCK_START[script]!;
  const end = start + 0x7f;
  const exceptions = EXCEPTIONS[script] ?? {};
  /* Gurmukhi's addak doubles the consonant that follows it, so it is the one
     sign that cannot be decided one character at a time. */
  const doublesNext = script === "guru";

  let out = "";
  let pendingDouble = false;

  for (const ch of text) {
    const code = ch.codePointAt(0)!;

    if (code < start || code > end) {
      out += ch;
      continue;
    }

    if (doublesNext && ch === "ੱ") {
      pendingDouble = true;
      continue;
    }

    const mapped = exceptions[ch];
    let piece: string;
    if (mapped !== undefined) {
      piece = mapped;
    } else if (code >= start + DIGIT_OFFSET && code <= start + DIGIT_OFFSET + 9) {
      /* Indic digits go to ASCII rather than to Devanagari digits. Every
         voice reads 1 2 3; not every voice reads १ २ ३. */
      piece = String(code - (start + DIGIT_OFFSET));
    } else {
      piece = String.fromCodePoint(code - offset);
    }

    if (pendingDouble && DEVA_CONSONANT.test(piece[0] ?? "")) {
      out += `${piece[0]}्`; // the consonant, held, then itself again
      pendingDouble = false;
    }
    out += piece;
  }

  return speakable(out);
}

/**
 * Sequences, rather than single signs, that come out unpronounceable.
 *
 * Gurmukhi builds its borrowed consonants by hanging a nukta under a plain
 * letter, and two of those land on Devanagari letters that never take one.
 * `स़` is Punjabi's sha; written that way a Hindi voice reads a
 * plain s and loses the sound. The four that Devanagari does write with a
 * nukta of its own — ख़ ग़ ज़ फ़ — are left exactly as they are, because
 * Hindi says all four.
 */
const NUKTA: [RegExp, string][] = [
  [/स़/g, "श"], // s + nukta  → sha
  [/ल़/g, "ळ"], // l + nukta  → the retroflex l
];

/** Rounds the Devanagari that no Hindi voice can pronounce to the nearest that it can. */
function speakable(text: string): string {
  let out = "";
  for (const ch of text) out += SPEAKABLE[ch] ?? ch;
  return NUKTA.reduce((acc, [re, to]) => acc.replace(re, to), out);
}

/** Which Indic block a code point falls in, for text of unknown origin. */
function scriptOfCode(code: number): Script | null {
  for (const [script, start] of Object.entries(BLOCK_START) as [Script, number][]) {
    if (code >= start && code <= start + 0x7f) return script;
  }
  return code >= 0x900 && code <= 0x97f ? "deva" : null;
}

/**
 * Devanagari, from whichever script this happens to be written in.
 *
 * The caller here is not a voice but the matcher, and the problem is the
 * same shape: two pieces of text that say the same thing in two different
 * alphabets. A phone whose recogniser has no Odia transcribes an Odia
 * speaker into Devanagari, and a Gujarati speaker on a phone set to Hindi
 * gets Devanagari too. Comparing both sides in one script costs a pass over
 * the string and stops a script mismatch reading as "we did not understand".
 */
export function toDevanagariAny(text: string): string {
  for (const ch of text) {
    const script = scriptOfCode(ch.codePointAt(0)!);
    if (script) return toDevanagari(text, script);
  }
  return text;
}

/**
 * Gujarati to Devanagari, kept under its old name.
 *
 * The whole app used to call this, and it is still the single most-used path
 * — Chrome ships a Hindi voice and no Gujarati one, so a Gujarati reader on
 * a laptop lands here every time.
 */
export function guToDevanagari(text: string): string {
  return toDevanagari(text, "gujr");
}

/* ==================================================================
 * Choosing a voice
 * ================================================================== */

export type Fidelity =
  /** A voice for this exact language. */
  | "native"
  /** A voice for another language in the same script — an accent, no more. */
  | "related"
  /** The words respelled into Devanagari for the Hindi voice. */
  | "transliterated";

export interface VoicePlan {
  /** The BCP-47 tag handed to the utterance. */
  lang: string;
  voice: SpeechSynthesisVoice | null;
  /** Rewrites the text into a script the chosen voice can actually read. */
  render: (text: string) => string;
  fidelity: Fidelity;
}

/**
 * Older Android engines and a few desktop ones report ISO 639-2 codes.
 * `hin-IND` and `hi-IN` are the same voice, and a naive comparison finds
 * neither of them.
 */
const THREE_LETTER: Record<string, string> = {
  hin: "hi",
  ben: "bn",
  guj: "gu",
  mar: "mr",
  tam: "ta",
  tel: "te",
  kan: "kn",
  mal: "ml",
  pan: "pa",
  pnb: "pa",
  ori: "or",
  ory: "or",
  eng: "en",
};

/** The two-letter language of a voice, whatever shape the engine reported it in. */
export function baseLangOf(voice: SpeechSynthesisVoice): string {
  const first = voice.lang.toLowerCase().replace(/_/g, "-").split("-")[0] ?? "";
  return THREE_LETTER[first] ?? first;
}

/**
 * Engines that sound like a machine, and engines that sound like a person.
 *
 * A device commonly offers several voices for one language and the list is
 * in no useful order, so taking the first match is a coin toss. On a Windows
 * laptop that coin decides between Chrome's Google voice and a legacy SAPI
 * one; on Linux and on cheap Android builds it decides between a real voice
 * and eSpeak, which is a formant synthesiser from the 1990s and is the
 * single biggest reason somebody presses Listen once and never again.
 *
 * None of this is a hard rule — the names are vendor strings and they
 * change — so it is scored rather than filtered. The worst case is that a
 * good voice loses to another good voice.
 */
const POOR_ENGINE = /espeak|pico|flite|compact|eloquence/i;
const RICH_ENGINE = /natural|neural|premium|enhanced|wavenet|studio|online/i;

function scoreVoice(v: SpeechSynthesisVoice, wanted: string): number {
  const tag = v.lang.toLowerCase().replace(/_/g, "-");
  const want = wanted.toLowerCase();
  const name = v.name ?? "";
  let score = 0;

  /* The region matters for these languages: a pa-IN voice reads Gurmukhi,
     a pa-PK one reads Shahmukhi and will make nothing of it. */
  if (tag === want) score += 40;
  else if (baseLangOf(v) === want.split("-")[0]) score += 20;

  if (RICH_ENGINE.test(name)) score += 30;
  if (POOR_ENGINE.test(name)) score -= 60;
  /* Chrome's Indic voices are served from Google's own engine and are far
     ahead of anything shipped with the operating system. */
  if (/google/i.test(name)) score += 18;
  if (/microsoft/i.test(name)) score += 6;
  if (v.default) score += 2;

  return score;
}

/** Which of our languages are written in a given script. */
function sameScriptLangs(script: Script): Lang[] {
  return LANGS.filter((l) => langMeta(l).script === script);
}

/**
 * Works out what this particular device can do for this language, best
 * option first. Returns null when it can do nothing at all — which is a
 * real answer, and the button hides rather than lying.
 */
export function planVoice(lang: Lang, voices: SpeechSynthesisVoice[]): VoicePlan | null {
  if (!voices.length) return null;

  const meta = langMeta(lang);
  const asIs = (s: string) => s;

  /* Every voice that could read this language, best first. */
  const findExact = (code: string) => {
    const wanted = code.toLowerCase();
    const base = wanted.split("-")[0];
    const candidates = voices.filter(
      (v) => v.lang.toLowerCase().replace(/_/g, "-") === wanted || baseLangOf(v) === base,
    );
    if (!candidates.length) return null;
    return candidates.reduce((best, v) =>
      scoreVoice(v, wanted) > scoreVoice(best, wanted) ? v : best,
    );
  };

  /* 1 — a voice for the language itself. */
  const own = findExact(meta.speech);
  if (own) return { lang: meta.speech, voice: own, render: asIs, fidelity: "native" };

  /* 2 — a voice for a language that uses the same script. Hindi reading
     Marathi, or Marathi reading Hindi: the letters are the letters, and the
     result is an accent rather than a mistake. No rewriting needed. */
  for (const other of sameScriptLangs(meta.script)) {
    if (other === lang) continue;
    const cousin = findExact(langMeta(other).speech);
    if (cousin) {
      return {
        lang: langMeta(other).speech,
        voice: cousin,
        render: asIs,
        fidelity: "related",
      };
    }
  }

  /* 3 — respell into Devanagari and let the Hindi voice read it. This is the
     path that carries Tamil, Telugu, Kannada, Malayalam, Bengali, Odia,
     Punjabi and Gujarati on a device that has only ever heard of Hindi. */
  if (meta.script !== "latn" && meta.script !== "deva") {
    const hindi = findExact("hi-IN");
    if (hindi) {
      return {
        lang: "hi-IN",
        voice: hindi,
        render: (s) => toDevanagari(s, meta.script),
        fidelity: "transliterated",
      };
    }
  }

  /* English is the one language we will trust an unlabelled default voice
     with. A device with no Indian voice at all would otherwise read an
     Indic script aloud in an English one, which is worse than silence. */
  if (meta.script === "latn") {
    return { lang: meta.speech, voice: null, render: asIs, fidelity: "native" };
  }

  return null;
}

/* ==================================================================
 * Saying it
 * ================================================================== */

/**
 * One utterance per sentence, roughly.
 *
 * Chrome silently truncates a long utterance at somewhere around 200
 * characters and Android drops it entirely, which is how a screen that reads
 * fine in testing stops halfway through in the field. Splitting on sentence
 * ends also gives the listener a real pause where the writing had one.
 *
 * The danda (।) is a full stop in every one of these scripts and has to be
 * counted as one; so does the Latin one, because acronyms and numbers are
 * written in Latin inside Indic sentences.
 */
export function chunk(text: string, max = 170): string[] {
  const sentences = text
    .split(/(?<=[.?।॥:;])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);

  const out: string[] = [];
  let held = "";

  const push = () => {
    if (held) out.push(held);
    held = "";
  };

  for (const sentence of sentences) {
    if (sentence.length > max) {
      /* A single sentence longer than the cap — break it on commas, and on
         plain spaces if it has none. Better a wrong pause than a lost half. */
      push();
      let rest = sentence;
      while (rest.length > max) {
        const window = rest.slice(0, max);
        const at = Math.max(window.lastIndexOf(", "), window.lastIndexOf(" "));
        const cut = at > max * 0.5 ? at : max;
        out.push(rest.slice(0, cut).trim());
        rest = rest.slice(cut).trim();
      }
      if (rest) out.push(rest);
      continue;
    }

    if (held.length + sentence.length + 1 > max) push();
    held = held ? `${held} ${sentence}` : sentence;
  }
  push();

  return out;
}

/**
 * Chrome stops speaking after about fifteen seconds unless something
 * touches the queue. This is the documented workaround and it has been the
 * documented workaround for a decade: pause and immediately resume, which
 * resets the timer without a gap the listener can hear.
 */
const HEARTBEAT_MS = 10_000;

export interface Speaking {
  cancel: () => void;
}

/**
 * Reads a whole screen aloud, in order, and calls back when it is done or
 * when it fails. Returns a handle that stops it.
 */
export function speakAll(
  text: string,
  plan: VoicePlan,
  opts: { rate?: number; onEnd: () => void },
): Speaking {
  const synth = window.speechSynthesis;
  const parts = chunk(plan.render(text));
  let cancelled = false;

  const heartbeat = window.setInterval(() => {
    if (synth.speaking && !synth.paused) {
      synth.pause();
      synth.resume();
    }
  }, HEARTBEAT_MS);

  let settled = false;
  const finish = () => {
    if (settled) return;
    settled = true;
    window.clearInterval(heartbeat);
    if (!cancelled) opts.onEnd();
  };

  /* An error partway through abandons the rest. The alternative is a screen
     that keeps its Stop button while nothing is speaking, which leaves the
     listener pressing a control that does nothing. */
  const abandon = () => {
    synth.cancel();
    finish();
  };

  synth.cancel();
  /* The heartbeat above pauses and resumes to keep Chrome talking. A
     cancel that lands between those two leaves the queue paused, and a
     paused queue accepts `speak()` without complaint and never says a
     word — which is most of what "the voice sometimes just does not
     work" turns out to be. One resume costs nothing. */
  synth.resume();

  parts.forEach((part, i) => {
    const u = new SpeechSynthesisUtterance(part);
    u.lang = plan.lang;
    if (plan.voice) u.voice = plan.voice;
    u.rate = opts.rate ?? 0.88; // slower than default, deliberately
    u.pitch = 1;
    u.onerror = abandon;
    if (i === parts.length - 1) u.onend = finish;
    synth.speak(u);
  });

  if (parts.length === 0) finish();

  return {
    cancel: () => {
      cancelled = true;
      window.clearInterval(heartbeat);
      synth.cancel();
    },
  };
}

/**
 * The voice list, once it exists.
 *
 * `getVoices()` is empty on the first call nearly everywhere, and the event
 * that says otherwise is not dependable: Chrome fires `voiceschanged` once,
 * Safari sometimes never fires it, Android fires it before the list is
 * populated. So this listens *and* polls, settles exactly once, and gives
 * up after three seconds with an empty list — which is an answer too.
 *
 * Returns its own cleanup, so a caller is one line: an effect that hands in
 * a callback and hands back what this returns.
 */
export function whenVoicesReady(
  run: (voices: SpeechSynthesisVoice[]) => void,
): () => void {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    run([]);
    return () => {};
  }

  const synth = window.speechSynthesis;
  let tries = 0;
  let done = false;
  let timer = 0;

  const settle = () => {
    if (done) return;
    const voices = synth.getVoices();
    if (!voices.length && ++tries <= 12) return;
    done = true;
    window.clearInterval(timer);
    synth.removeEventListener("voiceschanged", settle);
    run(voices);
  };

  timer = window.setInterval(settle, 250);
  synth.addEventListener("voiceschanged", settle);
  settle();

  return () => {
    done = true;
    window.clearInterval(timer);
    synth.removeEventListener("voiceschanged", settle);
  };
}

/**
 * Wakes the speech engine up inside a press.
 *
 * Safari on iOS will not speak unless the first utterance of the page came
 * out of a real user gesture, and "came out of" is strict: a sentence spoken
 * after an `await` has lost the gesture and is silently dropped. Every
 * interesting thing the voice helper says arrives after a network round
 * trip, so without this the answer is read aloud on a laptop and never on an
 * iPhone.
 *
 * One silent utterance, spoken from the press that opens the panel, is
 * enough to unlock the engine for the rest of the session.
 */
export function primeSpeech(): void {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  try {
    const synth = window.speechSynthesis;
    synth.resume();
    const wake = new SpeechSynthesisUtterance(" ");
    wake.volume = 0;
    synth.speak(wake);
  } catch {
    /* An engine that refuses to be woken will refuse to speak either way. */
  }
}
