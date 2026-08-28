import type { Lang } from "@/lib/types";
import { LANGS } from "@/lib/types";

/**
 * Language helpers with no dictionary imports.
 *
 * This separation is a performance decision, not a tidiness one. Anything a
 * client component imports from `lib/i18n/index.ts` drags all three
 * dictionaries into the browser bundle — so a pensioner in Ahmedabad
 * downloads Devanagari strings they will never read, on a connection that
 * can barely afford the ones they will. Client code imports from here; the
 * server sends down the one dictionary that was actually chosen.
 */

export { LANGS };
export const DEFAULT_LANG: Lang = "en";

export function isLang(v: unknown): v is Lang {
  return typeof v === "string" && (LANGS as string[]).includes(v);
}

/**
 * Fills {placeholders}. Deliberately dumb — the dictionaries are ours, so
 * there is nothing to escape and no plural rules to get wrong. A missing
 * value leaves the placeholder visible rather than printing "undefined",
 * which makes the gap obvious in review instead of in front of a pensioner.
 */
export function fill(
  template: string,
  vars?: Record<string, string | number>,
): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (whole, key: string) =>
    key in vars ? String(vars[key]) : whole,
  );
}

/** The language names, in their own script, for screen 1. */
export const LANG_NAMES: Record<Lang, string> = {
  en: "English",
  hi: "हिन्दी",
  gu: "ગુજરાતી",
};

/** BCP-47 tags for speechSynthesis and <html lang>. */
export const SPEECH_TAGS: Record<Lang, string> = {
  en: "en-IN",
  hi: "hi-IN",
  gu: "gu-IN",
};
