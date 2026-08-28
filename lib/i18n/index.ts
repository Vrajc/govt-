import type { Lang } from "@/lib/types";
import { en, type Dict as BaseDict, type Section as BaseSection } from "./en";
import { hi } from "./hi";
import { gu } from "./gu";
import { svcEn, type SvcDict } from "./svc-en";
import { svcHi } from "./svc-hi";
import { svcGu } from "./svc-gu";
import { DEFAULT_LANG, isLang } from "./util";

/**
 * Dictionary assembly. Importing this module pulls in all three languages,
 * so it belongs to the server: `app/layout.tsx` resolves the cookie, picks
 * one dictionary and hands it to the client. Client components import the
 * helpers from `./util` instead.
 */
export * from "./util";

export type Dict = BaseDict & SvcDict;
export type Section = BaseSection | keyof SvcDict;

export const dicts: Record<Lang, Dict> = {
  en: { ...en, ...svcEn },
  hi: { ...hi, ...svcHi },
  gu: { ...gu, ...svcGu },
};

export function dictFor(lang: Lang | undefined | null): Dict {
  return dicts[lang && isLang(lang) ? lang : DEFAULT_LANG];
}
