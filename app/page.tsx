import { cookies } from "next/headers";
import { LANG_COOKIE } from "@/lib/constants";
import { dictFor, isLang, LANGUAGES } from "@/lib/i18n";
import type { Lang } from "@/lib/types";
import { LandingScreen, type ScriptLine } from "@/components/LandingScreen";

/**
 * The landing page, as a server component.
 *
 * Everything below the fold is text, so it renders on the server and the
 * browser downloads none of it. The one section that could not work any
 * other way is the script showcase: it prints the tagline in all eleven
 * languages at once, and `lib/i18n/index.ts` is server-only precisely so
 * that a visitor never downloads eleven dictionaries to read one.
 *
 * Resolving them here gets both halves of that: the reader sees every
 * script, and the client bundle still carries exactly one language. The
 * alternative — copying eleven taglines into a list next to the registry —
 * is the restated value that drifts, which this codebase has now been bitten
 * by twice in one week.
 */
export default async function LandingPage() {
  const jar = await cookies();
  const raw = jar.get(LANG_COOKIE)?.value;
  const lang: Lang = isLang(raw) ? raw : "en";

  /* Read out of each language's own dictionary rather than from a table
     kept beside it, so a reworded tagline reaches this page for free. */
  const scripts: ScriptLine[] = LANGUAGES.map((meta) => ({
    code: meta.code,
    english: meta.english,
    where: meta.where,
    tagline: (dictFor(meta.code).common as Record<string, string>).tagline,
  }));

  return <LandingScreen lang={lang} scripts={scripts} />;
}
