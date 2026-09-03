import "server-only";
import OpenAI from "openai";
import type { ErrorCode, Lang } from "./types";
import { langMeta, type Script } from "./i18n/languages";
import { fallbackExplain, toAssisted, type Explanation } from "./explainFallback";

/**
 * Everything OpenAI, in one server-only module.
 *
 * Three rules hold for every function in here:
 *   1. It never runs on the client. `server-only` makes that a build error.
 *   2. It never takes longer than TIMEOUT_MS. A pensioner on 3G waiting on a
 *      model is worse than no model at all.
 *   3. It always returns something usable. Every path has a fallback and
 *      none of them throws.
 */

const MODEL = "gpt-4o-mini";
const TIMEOUT_MS = 7_000;

let client: OpenAI | null = null;

export function hasKey(): boolean {
  const key = process.env.OPENAI_API_KEY?.trim();
  // The value copied out of .env.example is `sk-...`. Treating that as a real
  // key costs every call a 7-second timeout before it falls back, which is
  // exactly the delay the fallback exists to avoid.
  return Boolean(key) && key!.startsWith("sk-") && key!.length > 24;
}

function getClient(): OpenAI | null {
  if (!hasKey()) return null;
  if (!client) {
    client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      timeout: TIMEOUT_MS,
      maxRetries: 1,
    });
  }
  return client;
}

/**
 * How to name a language to the model.
 *
 * Naming the script as well as the language is not decoration: asked for
 * "Punjabi" alone a model will happily answer in Shahmukhi, which is the
 * right script in Lahore and the wrong one in Ludhiana. The registry already
 * knows which script each language is written in here, so the prompt says
 * so out loud.
 */
const SCRIPT_NAME: Record<Script, string> = {
  latn: "Latin",
  deva: "Devanagari",
  gujr: "Gujarati",
  beng: "Bengali",
  telu: "Telugu",
  taml: "Tamil",
  knda: "Kannada",
  mlym: "Malayalam",
  guru: "Gurmukhi",
  orya: "Odia",
};

function langName(lang: Lang): string {
  const m = langMeta(lang);
  return m.script === "latn" ? m.english : `${m.english} (${SCRIPT_NAME[m.script]} script)`;
}

/** Where an explanation came from — surfaced in the /result technical details. */
export type Source = "openai" | "fallback";

/* ==================================================================
 * 5.1 — Rejection explainer
 * ================================================================== */

/**
 * Cache by code + language + mode. The same code must not cost a second
 * call — six codes times three languages times two modes is the entire
 * possible key space, so this saturates almost immediately.
 */
const explainCache = new Map<string, Explanation>();

export function explainCacheSize(): number {
  return explainCache.size;
}

const EXPLAIN_SYSTEM = (lang: Lang, assisted: boolean) =>
  [
    "You explain government pension errors to elderly Indian citizens.",
    'Reply with JSON only: {"reason": string, "action": string}.',
    "`reason` explains what went wrong in ONE short sentence.",
    "`action` says what to do next in ONE short sentence.",
    `Write in ${langName(lang)}.`,
    'Use everyday words a 78-year-old would use — no words like "biometric", "authentication", "verification", "certificate", "server".',
    "Never blame the person. Never apologise. Never add anything else.",
    assisted
      ? "You are speaking to a family member who is helping the pensioner, so refer to the pensioner in the third person."
      : "You are speaking directly to the pensioner.",
  ].join(" ");

export async function explainCode(
  code: ErrorCode,
  lang: Lang,
  assistedMode: boolean
): Promise<{ text: Explanation; source: Source }> {
  const key = `${code}|${lang}|${assistedMode ? "a" : "s"}`;
  const cached = explainCache.get(key);
  if (cached) return { text: cached, source: "openai" };

  const base = fallbackExplain(code, lang);
  const fb = assistedMode ? toAssisted(base, lang) : base;

  const api = getClient();
  if (!api) return { text: fb, source: "fallback" };

  try {
    const res = await api.chat.completions.create(
      {
        model: MODEL,
        temperature: 0.3,
        max_tokens: 150,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: EXPLAIN_SYSTEM(lang, assistedMode) },
          {
            role: "user",
            content: `The pension system returned this code: ${code}`,
          },
        ],
      },
      { timeout: TIMEOUT_MS }
    );

    const raw = res.choices[0]?.message?.content;
    if (!raw) return { text: fb, source: "fallback" };

    const parsed = JSON.parse(raw) as Partial<Explanation>;
    const reason = clean(parsed.reason);
    const action = clean(parsed.action);
    // A model that returns one sentence, an empty string, or an essay is not
    // usable copy. Fall back rather than ship something odd to a pensioner.
    if (!reason || !action || reason.length > 220 || action.length > 220) {
      return { text: fb, source: "fallback" };
    }

    const out: Explanation = { reason, action };
    explainCache.set(key, out);
    return { text: out, source: "openai" };
  } catch {
    return { text: fb, source: "fallback" };
  }
}

function clean(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const s = v.trim().replace(/\s+/g, " ");
  return s.length > 0 ? s : null;
}

/* ==================================================================
 * 5.2 layer 2 — Pre-submission photo check
 * ================================================================== */

export interface PrecheckResult {
  ok: boolean;
  issue: string | null;
}

const PRECHECK_PROMPT = (lang: Lang) =>
  [
    "Look at this photo taken for a pension life certificate.",
    'Reply with JSON only: {"ok": boolean, "issue": string|null}.',
    "`ok` is false only if the photo would clearly fail an automated face match:",
    "too dark, too blurry, face cut off, face turned away, eyes closed, or face covered.",
    `\`issue\` is one short plain sentence in ${langName(lang)} describing the single biggest problem, or null.`,
    "Do not comment on appearance, age, clothing, or background.",
    "Do not identify the person.",
  ].join(" ");

export async function precheckPhoto(
  dataUrl: string,
  lang: Lang
): Promise<{ result: PrecheckResult; source: Source }> {
  const api = getClient();
  if (!api) return { result: { ok: true, issue: null }, source: "fallback" };

  try {
    const res = await api.chat.completions.create(
      {
        model: MODEL,
        temperature: 0,
        max_tokens: 120,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: PRECHECK_PROMPT(lang) },
              // `detail: low` caps the image at ~85 tokens. The client has
              // already resized to 512px, so nothing is lost.
              { type: "image_url", image_url: { url: dataUrl, detail: "low" } },
            ],
          },
        ],
      },
      { timeout: TIMEOUT_MS }
    );

    const raw = res.choices[0]?.message?.content;
    if (!raw) return { result: { ok: true, issue: null }, source: "fallback" };

    const parsed = JSON.parse(raw) as { ok?: unknown; issue?: unknown };
    const ok = parsed.ok !== false; // anything not explicitly false passes
    const issue = ok ? null : clean(parsed.issue);
    if (!ok && !issue) return { result: { ok: true, issue: null }, source: "fallback" };

    return { result: { ok, issue }, source: "openai" };
  } catch {
    // Never block a submission because a model call failed.
    return { result: { ok: true, issue: null }, source: "fallback" };
  }
}

/* ==================================================================
 * 5.2 layer 2 — Is this the right piece of paper
 * ================================================================== */

export interface DocCheckResult {
  /** Does this look like the document that was asked for. */
  match: boolean;
  /** Is the part that matters actually readable. */
  readable: boolean;
  /** One short sentence, in the reader's language, or null when fine. */
  issue: string | null;
  /** What it looks like instead, named in the reader's language. */
  saw: string | null;
}

const DOC_PROMPT = (docName: string, focus: string, lang: Lang) =>
  [
    `Someone has photographed a document to attach to an Indian pension application. They were asked for: ${docName}.`,
    'Reply with JSON only: {"match": boolean, "readable": boolean, "issue": string|null, "saw": string|null}.',
    "`match` is false ONLY if this is clearly a different kind of document.",
    `\`readable\` is false if this part cannot be read: ${focus}`,
    `\`issue\` is one short plain sentence in ${langName(lang)} saying the single thing to fix, or null if there is nothing.`,
    `\`saw\` names what the document actually is, in ${langName(lang)}, in two or three words — only when \`match\` is false, otherwise null.`,
    "Never transcribe, repeat or return any number, name, address or date from the document.",
    "Do not identify or describe the person. Do not comment on their appearance.",
    "Judge only the photograph.",
  ].join(" ");

/**
 * Layer 2 for documents, and deliberately timid.
 *
 * A model that wrongly rejects a genuine ration card sends a 78-year-old
 * back to a village office for nothing, which is the exact harm this app
 * exists to remove. So `match: false` is reserved for a clearly different
 * kind of document, every failure path returns "fine", and the caller
 * treats the answer as a question rather than a verdict — the citizen can
 * always keep the photograph anyway.
 */
export async function precheckDocument(
  dataUrl: string,
  docName: string,
  focus: string,
  lang: Lang
): Promise<{ result: DocCheckResult; source: Source }> {
  const pass: DocCheckResult = { match: true, readable: true, issue: null, saw: null };
  const api = getClient();
  if (!api) return { result: pass, source: "fallback" };

  try {
    const res = await api.chat.completions.create(
      {
        model: MODEL,
        temperature: 0,
        max_tokens: 160,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: DOC_PROMPT(docName, focus, lang) },
              /* `detail: high` here, unlike the face check. Whether a number
                 on a passbook is legible is a question about small print,
                 and the low-detail path resizes it away. */
              { type: "image_url", image_url: { url: dataUrl, detail: "high" } },
            ],
          },
        ],
      },
      { timeout: TIMEOUT_MS }
    );

    const raw = res.choices[0]?.message?.content;
    if (!raw) return { result: pass, source: "fallback" };

    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const match = parsed.match !== false;
    const readable = parsed.readable !== false;
    const issue = clean(parsed.issue);
    const saw = match ? null : clean(parsed.saw);

    // A complaint with nothing to act on is worse than no complaint.
    if ((!match || !readable) && !issue) return { result: pass, source: "fallback" };
    if (issue && issue.length > 220) return { result: pass, source: "fallback" };

    return {
      result: { match, readable, issue: match && readable ? null : issue, saw },
      source: "openai",
    };
  } catch {
    // Never block a submission because a model call failed.
    return { result: pass, source: "fallback" };
  }
}

/* ==================================================================
 * 5.3 — Optional TTS upgrade
 * ================================================================== */
export async function speak(text: string, lang: Lang): Promise<ArrayBuffer | null> {
  const api = getClient();
  if (!api) return null;
  try {
    const res = await api.audio.speech.create({
      model: "gpt-4o-mini-tts",
      voice: "alloy",
      input: text.slice(0, 800),
      instructions: `Speak slowly and warmly in ${langName(lang)}, as if talking to an elderly person.`,
      response_format: "mp3",
    });
    return await res.arrayBuffer();
  } catch {
    return null;
  }
}
