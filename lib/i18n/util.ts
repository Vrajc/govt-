/**
 * Language helpers with no dictionary imports.
 *
 * This separation is a performance decision, not a tidiness one. Anything a
 * client component imports from `lib/i18n/index.ts` drags every language's
 * dictionary into the browser bundle — so a pensioner in Ahmedabad downloads
 * Devanagari, Tamil and Malayalam strings they will never read, on a
 * connection that can barely afford the ones they will. Client code imports
 * from here; the server sends down the one dictionary that was chosen.
 *
 * The facts themselves live one file further down, in `./languages`, which
 * knows nothing about dictionaries either. This module is the seam the app
 * has always imported, so it stays and forwards.
 */

export {
  DEFAULT_LANG,
  LANGS,
  LANGUAGES,
  LANG_CLASSES,
  LANG_NAMES,
  SCRIPT_CLASSES,
  SPEECH_TAGS,
  fallbackChain,
  isLang,
  langMeta,
  localeOf,
} from "./languages";

export type { Lang, LangMeta, Script } from "./languages";

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
