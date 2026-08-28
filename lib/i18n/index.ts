import type { Lang } from "@/lib/types";
import { LANGS } from "@/lib/types";
import { en, type Dict as BaseDict, type Section as BaseSection } from "./en";
import { hi } from "./hi";
import { gu } from "./gu";
import { svcEn, type SvcDict } from "./svc-en";
import { svcHi } from "./svc-hi";
import { svcGu } from "./svc-gu";

export { LANGS };

/**
 * The dictionary is assembled from two halves: the original journey's strings
 * (en.ts) and the service catalogue's (svc-en.ts). Both halves are typed off
 * their English source, so a key missing from Hindi or Gujarati is a compile
 * error rather than a blank line in front of a pensioner.
 */
export type Dict = BaseDict & SvcDict;
export type Section = BaseSection | keyof SvcDict;

export const dicts: Record<Lang, Dict> = {
  en: { ...en, ...svcEn },
  hi: { ...hi, ...svcHi },
  gu: { ...gu, ...svcGu },
};

export const DEFAULT_LANG: Lang = "en";

export function isLang(v: unknown): v is Lang {
  return typeof v === "string" && (LANGS as string[]).includes(v);
}

export function dictFor(lang: Lang | undefined | null): Dict {
  return dicts[lang && isLang(lang) ? lang : DEFAULT_LANG];
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
  en: en.meta.name,
  hi: hi.meta.name,
  gu: gu.meta.name,
};

/** BCP-47 tags for speechSynthesis and <html lang>. */
export const SPEECH_TAGS: Record<Lang, string> = {
  en: en.meta.speech,
  hi: hi.meta.speech,
  gu: gu.meta.speech,
};
