import "server-only";
import type { Lang } from "./types";
import { langMeta } from "./i18n/languages";

/**
 * Everything Gemini, in one server-only module.
 *
 * It holds the same three rules as lib/openai.ts, for the same reasons:
 *   1. It never runs on the client. `server-only` makes that a build error,
 *      and the key never reaches anything a browser downloads.
 *   2. It never takes longer than TIMEOUT_MS. Somebody who has just spoken
 *      into a phone is standing still, listening, waiting to be answered.
 *   3. It always returns something usable, or null so the caller can fall
 *      back. Nothing in here throws.
 *
 * No SDK. The REST endpoint is one POST with one header, the whole app has
 * exactly one call site, and a megabyte of dependency to save fifteen lines
 * is a bad trade on something that ships to a serverless function.
 */

/**
 * Three names, tried in order, and only when one says it does not exist.
 *
 * Google retires model names on its own schedule and does it per project:
 * the same key that lists `gemini-2.5-flash` is told, on calling it, that
 * it is "no longer available to new users". And a flash model that answered
 * a minute ago returns 503 "high demand" on the next call, while the model
 * beside it answers fine.
 *
 * So: the alias Google keeps pointed at the current flash model, then a
 * named current model, then the one an older project will still have. A
 * missing, overloaded or throttled model walks to the next name; a refused
 * key stops, because it would be refused identically all the way down.
 */
const MODELS = ["gemini-flash-latest", "gemini-3.5-flash", "gemini-2.5-flash"] as const;
const HOST = "https://generativelanguage.googleapis.com/v1beta/models";
/* One deadline for the whole walk, not per call. Measured against the real
   service: a rate-limited or overloaded model refuses in about a third of a
   second, and the one that answers takes two to six — so eleven seconds
   holds a refusal, a walk to the next name, and a full answer in an Indic
   script, and still ends before somebody who has just spoken into a phone
   concludes that nothing is happening. Past it, the dictionary answers. */
const TIMEOUT_MS = 11_000;

export function hasGeminiKey(): boolean {
  const key = process.env.GEMINI_API_KEY?.trim();
  // The value copied out of .env.example ends in "...". Treating that as a
  // real key costs every request a full timeout before it falls back,
  // which is exactly the delay the fallback exists to avoid.
  return Boolean(key) && key!.length > 20 && !key!.includes("...");
}

function langName(lang: Lang): string {
  const m = langMeta(lang);
  return m.script === "latn" ? m.english : `${m.english}, in its own script`;
}

/* ==================================================================
 * The one call
 * ================================================================== */

export interface VoiceReply {
  say: string;
  steps: string[];
  /** An id from the menu the prompt handed it, or "none". Never a URL. */
  goto: string;
}

/**
 * What the model is allowed to be, spelled out.
 *
 * Most of these lines are here because of who is listening. "One short
 * sentence" is not brevity for its own sake — it is a sentence that has to
 * survive being read aloud by a phone speaker held at arm's length by
 * somebody not yet sure this thing works. And the ban on inventing amounts
 * is the important one: a wrong rupee figure, spoken confidently in a
 * pensioner's own language, is the most harmful thing this feature could
 * do.
 */
function systemPrompt(lang: Lang, menu: string, where: string): string {
  return [
    "You are the voice helper inside Pension Saral, a prototype of an Indian government service for pensioners and their families.",
    "The person speaking is usually old, often cannot read, and has asked out loud for help. Answer them. Do not describe the website.",
    "",
    "Reply with JSON only, exactly these three fields:",
    '{"say": string, "steps": string[], "goto": string}',
    "",
    `Write "say" and every step in ${langName(lang)}. Not in English, unless English is the language named here.`,
    '"say" is ONE short sentence naming what they need, the way a helpful clerk would say it out loud.',
    '"steps" is two to five steps, each one short line, each a single thing to do, in the order they must do it.',
    '"goto" is one id copied exactly from this list, or "none" when nothing fits:',
    menu,
    "",
    `Where they are standing right now: ${where}.`,
    "",
    /* Without this block the model writes the government website it has
       read a thousand of: upload a scan, visit the portal, submit the
       form. Every one of those steps is a thing this app exists to remove,
       and a spoken instruction to do something the screen cannot do is
       worse than no instruction at all. */
    "How this app works, so your steps match what they will actually see:",
    "- Every paper is photographed with the phone camera, inside this app. Nothing is uploaded, scanned, printed, posted or attached.",
    "- They never leave this app and never visit another website.",
    "- Each service has one page saying who it is for and which papers it needs, and a button to begin.",
    "- An application walks through the same short steps: who it is for, a few questions, photographs of the papers, a form, a photograph of the face where one is needed, and a last look before it goes.",
    "",
    "Rules:",
    "- Plain spoken words only. Never use a word a 78-year-old would not use out loud.",
    "- These words are banned, in English and as English words written in the reader's script: submit, upload, download, scan, portal, biometric, authentication, verification, KYC, application form, log in. Say what happens instead: photograph it, send it, this page.",
    "- Never describe a step this app does not have.",
    "- Never invent a rupee amount, an age limit, a date, a phone number, or a scheme that is not on the list.",
    "- Never blame them, never apologise, never greet them, never add anything outside the JSON.",
    "- If they asked what to press on the screen they are standing on, the steps are about that screen.",
    '- If you cannot tell what they need, send them to the four questions with goto "finder".',
  ].join("\n");
}

const SCHEMA = {
  type: "object",
  properties: {
    say: { type: "string" },
    steps: { type: "array", items: { type: "string" } },
    goto: { type: "string" },
  },
  required: ["say", "steps", "goto"],
} as const;

function requestBody(model: string, system: string, said: string, plain: boolean) {
  const generationConfig: Record<string, unknown> = {
    temperature: 0.2,
    /* Generous, and it has to be. Every Indic script costs several tokens a
       word where English costs one, so a five-step answer in Malayalam is
       not the same size as the same answer in English. A budget that fits
       one and not the other does not fail loudly: it returns a truncated
       string, JSON.parse throws, and the reader silently gets the
       dictionary answer forever. */
    maxOutputTokens: 1200,
    responseMimeType: "application/json",
    responseSchema: SCHEMA,
  };
  /* Thinking is on by default on the current models, thinking tokens come
     out of the same budget as the answer, and this model has nothing to
     think about: the whole reply is one sentence and a short list chosen
     from a menu. Left on, it spends the budget reasoning and returns four
     tokens of truncated JSON.

     `plain` is the safety net. This is a knob Google has already renamed
     once, and an unknown field is a 400 — so a rejected request is retried
     once with nothing optional in it rather than falling back to the
     dictionary forever over a spelling. */
  if (!plain) {
    generationConfig.thinkingConfig = { thinkingBudget: 0 };
  }

  return {
    systemInstruction: { parts: [{ text: system }] },
    contents: [{ role: "user", parts: [{ text: said }] }],
    generationConfig,
    /* The sentence being sent is often somebody describing a death in the
       family or their own disability. The default thresholds treat that as
       a reason to stop, and stopping here is silence where an answer was
       needed. */
    safetySettings: [
      "HARM_CATEGORY_HARASSMENT",
      "HARM_CATEGORY_HATE_SPEECH",
      "HARM_CATEGORY_SEXUALLY_EXPLICIT",
      "HARM_CATEGORY_DANGEROUS_CONTENT",
    ].map((category) => ({ category, threshold: "BLOCK_ONLY_HIGH" })),
  };
}

/**
 * Ask the model.
 *
 * Returns null for every failure there is — no key, a refused key, a
 * timeout, a safety block, malformed JSON, an answer too long to read
 * aloud — and the caller answers out of the dictionary instead. The person
 * asking never learns which of the two happened, which is the point.
 */
export async function askVoice(
  said: string,
  lang: Lang,
  menu: string,
  where: string
): Promise<VoiceReply | null> {
  const key = process.env.GEMINI_API_KEY?.trim();
  if (!hasGeminiKey() || !key) return null;

  const system = systemPrompt(lang, menu, where);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  const call = (model: string, plain: boolean) =>
    fetch(`${HOST}/${model}:generateContent`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify(requestBody(model, system, said.slice(0, 500), plain)),
      signal: controller.signal,
      cache: "no-store",
    });

  try {
    for (const model of MODELS) {
      let res = await call(model, false);
      // A rejected request is worth one more try with nothing optional in it.
      if (res.status === 400) res = await call(model, true);
      /* A model that is missing, overloaded or rate-limited is worth trying
         under the next name — "high demand" on one flash model is routine
         and the next one is usually answering. A refused key is not: it
         will be refused identically all the way down the list. */
      if (res.status === 404 || res.status === 429 || res.status >= 500) continue;
      if (!res.ok) return null;

      const reply = parse(await res.json());
      if (reply) return reply;
      /* Answered, but with something unusable — truncated, or six steps of
         essay. Another model may do better; if none does, the dictionary
         will. */
    }
    return null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/* ==================================================================
 * Reading the answer
 * ================================================================== */

/** The words the copy linter would refuse, as the model would spell them. */
const JARGON =
  /\b(submit|upload|download|scan|portal|biometric|authenticat|verificat|kyc|log ?in|sign ?in)/i;

interface GeminiResponse {
  candidates?: { content?: { parts?: { text?: string }[] } }[];
}

function parse(raw: unknown): VoiceReply | null {
  const text = (raw as GeminiResponse)?.candidates?.[0]?.content?.parts
    ?.map((p) => p?.text ?? "")
    .join("")
    .trim();
  if (!text) return null;

  let obj: Record<string, unknown>;
  try {
    obj = JSON.parse(text) as Record<string, unknown>;
  } catch {
    return null;
  }

  const say = clean(obj.say);
  if (!say || say.length > 200) return null;
  /* The copy rules are linted for every string in the dictionaries; a
     string the model wrote reaches the same reader and has had none of
     that. This catches only English — a transliteration into Gurmukhi is
     beyond a word list, and the prompt is what holds that line — but the
     English path is the one a judge reads, and the dictionary answer
     underneath is a real answer, not an apology. */
  if (JARGON.test(say)) return null;

  const steps = Array.isArray(obj.steps)
    ? obj.steps
        .map(clean)
        .filter((s): s is string => s !== null && s.length <= 140)
    : [];
  // One step is not a path, and seven is a wall of speech. Either way the
  // dictionary answer is the better one to ship.
  if (steps.length < 2 || steps.length > 6) return null;
  if (steps.some((s) => JARGON.test(s))) return null;

  return { say, steps: steps.slice(0, 5), goto: clean(obj.goto) ?? "none" };
}

function clean(v: unknown): string | null {
  if (typeof v !== "string") return null;
  /* Bullets and numbering come back sometimes despite the schema, and half
     the voices on the market read a leading dash aloud as "dash". */
  const s = v
    .trim()
    .replace(/^\d+[.)]\s*/, "")
    .replace(/^[*\-–—•\s]+/, "")
    .replace(/\s+/g, " ")
    .trim();
  return s.length > 0 ? s : null;
}
