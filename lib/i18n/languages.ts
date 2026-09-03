/**
 * The language registry.
 *
 * One row per language, and everything else in the product reads from here:
 * the chooser, the header switcher, the font stack, `<html lang>`, the voice,
 * the dictionary loader and the copy linter. Adding a language is a row plus
 * a dictionary file — never a search for the places that hard-coded three.
 *
 * This file imports nothing. It is the one i18n module a client component can
 * always pull in without dragging a dictionary into the browser bundle.
 */

export type Lang =
  | "en"
  | "hi"
  | "gu"
  | "bn"
  | "mr"
  | "te"
  | "ta"
  | "kn"
  | "ml"
  | "pa"
  | "or";

/**
 * The writing system, which is a different question from the language.
 * Marathi and Hindi share Devanagari, so they share a font and a voice; Tamil
 * and Telugu share neither with anything.
 */
export type Script =
  | "latn"
  | "deva"
  | "gujr"
  | "beng"
  | "telu"
  | "taml"
  | "knda"
  | "mlym"
  | "guru"
  | "orya";

export interface LangMeta {
  code: Lang;
  /** The name of the language, written in that language. Never translated. */
  native: string;
  /** The same name in English, for the second line of the chooser. */
  english: string;
  script: Script;
  /** BCP-47, for `<html lang>` and `speechSynthesis`. */
  speech: string;
  dir: "ltr" | "rtl";
  /**
   * Where it is the state language, in English. The chooser shows it because
   * a lot of readers recognise their state faster than their script — and a
   * son setting the phone up for his mother scans this column, not the words.
   */
  where: string;
  /**
   * Where to look when a key has not been translated yet. English is the
   * floor for everyone and is appended automatically, so this holds only the
   * better answer in between: a Marathi reader meets a missing string in
   * Hindi, which they can very likely read, rather than in English.
   */
  fallback?: Lang[];
}

/**
 * Ordered as the chooser shows them.
 *
 * English and Hindi lead because between them they reach almost everyone who
 * can read at all. Gujarati is third because the pilot is in Gujarat. The
 * rest follow by number of speakers. This is a product decision, not a
 * ranking of languages, and the whole list fits on one screen anyway.
 */
export const LANGUAGES: LangMeta[] = [
  { code: "en", native: "English", english: "English", script: "latn", speech: "en-IN", dir: "ltr", where: "All India" },
  { code: "hi", native: "हिन्दी", english: "Hindi", script: "deva", speech: "hi-IN", dir: "ltr", where: "North India" },
  { code: "gu", native: "ગુજરાતી", english: "Gujarati", script: "gujr", speech: "gu-IN", dir: "ltr", where: "Gujarat" },
  { code: "bn", native: "বাংলা", english: "Bengali", script: "beng", speech: "bn-IN", dir: "ltr", where: "West Bengal, Tripura" },
  { code: "mr", native: "मराठी", english: "Marathi", script: "deva", speech: "mr-IN", dir: "ltr", where: "Maharashtra", fallback: ["hi"] },
  { code: "te", native: "తెలుగు", english: "Telugu", script: "telu", speech: "te-IN", dir: "ltr", where: "Andhra Pradesh, Telangana" },
  { code: "ta", native: "தமிழ்", english: "Tamil", script: "taml", speech: "ta-IN", dir: "ltr", where: "Tamil Nadu, Puducherry" },
  { code: "kn", native: "ಕನ್ನಡ", english: "Kannada", script: "knda", speech: "kn-IN", dir: "ltr", where: "Karnataka" },
  { code: "ml", native: "മലയാളം", english: "Malayalam", script: "mlym", speech: "ml-IN", dir: "ltr", where: "Kerala" },
  { code: "pa", native: "ਪੰਜਾਬੀ", english: "Punjabi", script: "guru", speech: "pa-IN", dir: "ltr", where: "Punjab", fallback: ["hi"] },
  { code: "or", native: "ଓଡ଼ିଆ", english: "Odia", script: "orya", speech: "or-IN", dir: "ltr", where: "Odisha" },
];

export const LANGS: Lang[] = LANGUAGES.map((l) => l.code);

export const DEFAULT_LANG: Lang = "en";

const BY_CODE = new Map<Lang, LangMeta>(LANGUAGES.map((l) => [l.code, l]));

export function isLang(v: unknown): v is Lang {
  return typeof v === "string" && BY_CODE.has(v as Lang);
}

export function langMeta(lang: Lang): LangMeta {
  return BY_CODE.get(lang) ?? BY_CODE.get(DEFAULT_LANG)!;
}

/**
 * The order to search for a string: the language itself, then its stated
 * fallbacks, then English. English is never left off — it is the only
 * dictionary the build guarantees is complete.
 */
export function fallbackChain(lang: Lang): Lang[] {
  const chain: Lang[] = [lang, ...(langMeta(lang).fallback ?? [])];
  if (!chain.includes(DEFAULT_LANG)) chain.push(DEFAULT_LANG);
  return chain;
}

/* ------------------------------------------------------------------ *
 * Views the rest of the app asks for by name
 * ------------------------------------------------------------------ */

/** The language names, in their own script, for the chooser. */
export const LANG_NAMES: Record<Lang, string> = Object.fromEntries(
  LANGUAGES.map((l) => [l.code, l.native]),
) as Record<Lang, string>;

/** BCP-47 tags for `speechSynthesis` and `<html lang>`. */
export const SPEECH_TAGS: Record<Lang, string> = Object.fromEntries(
  LANGUAGES.map((l) => [l.code, l.speech]),
) as Record<Lang, string>;

/** The `lang-xx` class names, so a stale one can be removed without a list. */
export const LANG_CLASSES: string[] = LANGUAGES.map((l) => `lang-${l.code}`);

/** The script classes, which is what the font stacks actually key off. */
export const SCRIPT_CLASSES: string[] = [
  ...new Set(LANGUAGES.map((l) => `script-${l.script}`)),
];
