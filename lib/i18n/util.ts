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

/**
 * Lays the assisted wording over the base dictionary.
 *
 * Assisted mode is not a different set of screens. It is the same screens
 * spoken about a third person, and the whole difference lives in the
 * strings — so rather than have fifty call sites each stop to ask which
 * mode they are in, every assisted variant is authored as `<key>Assisted`
 * beside the key it stands in for, and this covers the base with it once.
 *
 * Two properties follow, and both matter more than the tidiness:
 *
 * A string is flipped only where somebody has written the twin. There is
 * no rule that rewrites "you" into "they", because half the "you" on these
 * screens is the son holding the phone and must stay — "hold the phone
 * still" is not addressed to his mother.
 *
 * And a language that has not translated its twin yet keeps its own base
 * string: the wrong pronoun in the reader's own script, which is a far
 * smaller failure than the right pronoun in English.
 */
export function assistedDict<T>(dict: T, assisted: boolean): T {
  if (!assisted) return dict;
  const src = dict as unknown as Record<string, Record<string, string>>;
  const out: Record<string, Record<string, string>> = {};
  for (const section of Object.keys(src)) {
    const table = src[section];
    let covered: Record<string, string> | null = null;
    for (const key of Object.keys(table)) {
      if (!key.endsWith("Assisted")) continue;
      const base = key.slice(0, -"Assisted".length);
      /* `who.assisted` is a label in its own right, not a twin: it names
         the choice on the first screen and has no base key to cover. */
      if (!base || !(base in table)) continue;
      covered ??= { ...table };
      covered[base] = table[key];
    }
    out[section] = covered ?? table;
  }
  return out as unknown as T;
}
