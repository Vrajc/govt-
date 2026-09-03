import type { Lang } from "@/lib/types";
import { en, type Dict as BaseDict, type Section as BaseSection } from "./en";
import { hi } from "./hi";
import { gu } from "./gu";
import { svcEn, type SvcDict } from "./svc-en";
import { svcHi } from "./svc-hi";
import { svcGu } from "./svc-gu";
import { DEFAULT_LANG, LANGS, fallbackChain, isLang } from "./languages";

/**
 * Dictionary assembly.
 *
 * Importing this module pulls in every language, so it belongs to the
 * server: `app/layout.tsx` resolves the cookie, picks one dictionary and
 * hands it to the client. Client components import the helpers from
 * `./util` instead, and never see a script they cannot read.
 *
 * The imports stay static rather than dynamic even at eleven languages. The
 * cost is a larger server bundle, which nobody downloads; the alternative
 * is an async `dictFor`, and the mock pension office calls it from the
 * middle of synchronous outcome code. Server memory is the cheaper of the
 * two prices by a wide margin.
 */
export * from "./util";

export type Dict = BaseDict & SvcDict;
export type Section = BaseSection | keyof SvcDict;

/**
 * What a language file is allowed to be while it is still being translated.
 *
 * Every key resolves at runtime — anything absent falls through to Hindi or
 * English below — so a language can ship the moment its first screen is
 * translated instead of waiting for its eight hundredth string. What the
 * type must not allow is a *wrong* key: a typo would silently keep the
 * English string forever, and nobody would ever see the bug.
 */
export type PartialDict = { [S in keyof Dict]?: Partial<Dict[S]> };

/* ------------------------------------------------------------------ *
 * The raw files, before any merging
 * ------------------------------------------------------------------ */
const RAW: Partial<Record<Lang, PartialDict>> = {
  en: { ...en, ...svcEn },
  hi: { ...hi, ...svcHi },
  gu: { ...gu, ...svcGu },
};

/**
 * Lays one dictionary over another, section by section.
 *
 * Two levels deep is the whole shape of these files, so this is a merge and
 * not a recursion. A half-translated `docs` section keeps the lines it has
 * and borrows the rest, which is the behaviour that lets a language go live
 * early: a Tamil reader sees Tamil everywhere it exists and English in the
 * gaps, rather than the raw key path that a missing string used to print.
 */
function layer(base: PartialDict, over: PartialDict): PartialDict {
  const out: Record<string, Record<string, string>> = {};
  const sections = new Set([...Object.keys(base), ...Object.keys(over)]);
  for (const s of sections) {
    const b = (base as Record<string, Record<string, string>>)[s];
    const o = (over as Record<string, Record<string, string>>)[s];
    out[s] = { ...(b ?? {}), ...(o ?? {}) };
  }
  return out as PartialDict;
}

/**
 * Built once per language and kept. The merge is cheap, but it happens on
 * every request otherwise, and the result never changes.
 */
const merged = new Map<Lang, Dict>();

function build(lang: Lang): Dict {
  /* Furthest fallback first, so the language itself is laid on last and
     wins. English is always at the far end of the chain. */
  const chain = fallbackChain(lang).reverse();
  let acc: PartialDict = {};
  for (const step of chain) acc = layer(acc, RAW[step] ?? {});
  return acc as Dict;
}

export function dictFor(lang: Lang | undefined | null): Dict {
  const code = lang && isLang(lang) ? lang : DEFAULT_LANG;
  let d = merged.get(code);
  if (!d) {
    d = build(code);
    merged.set(code, d);
  }
  return d;
}

/** Every dictionary, merged. Used by the language-coverage report. */
export const dicts: Record<Lang, Dict> = Object.fromEntries(
  LANGS.map((l) => [l, dictFor(l)]),
) as Record<Lang, Dict>;

/**
 * How much of a language is actually its own, as a fraction of English.
 *
 * Shown in the chooser as a quiet line under the languages that are still
 * being translated — telling someone up front that they will meet some
 * English is far better than letting them discover it on the form.
 */
export function coverageOf(lang: Lang): number {
  const base = RAW.en ?? {};
  const own = RAW[lang] ?? {};
  let total = 0;
  let have = 0;
  for (const [section, entries] of Object.entries(base)) {
    for (const key of Object.keys(entries as Record<string, string>)) {
      total++;
      if ((own as Record<string, Record<string, string>>)[section]?.[key]) have++;
    }
  }
  return total === 0 ? 1 : have / total;
}

/**
 * Coverage for every language at once, computed on the server and handed to
 * the chooser. The chooser is a client component and must never import a
 * dictionary; a record of eleven numbers crosses the boundary instead.
 */
export function coverageReport(): Record<Lang, number> {
  return Object.fromEntries(LANGS.map((l) => [l, coverageOf(l)])) as Record<Lang, number>;
}
