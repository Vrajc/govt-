import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import {
  Noto_Sans,
  Noto_Sans_Bengali,
  Noto_Sans_Devanagari,
  Noto_Sans_Gujarati,
  Noto_Sans_Gurmukhi,
  Noto_Sans_Kannada,
  Noto_Sans_Malayalam,
  Noto_Sans_Oriya,
  Noto_Sans_Tamil,
  Noto_Sans_Telugu,
} from "next/font/google";
import "./globals.css";
import { AppProvider } from "@/lib/app-state";
import { LANG_COOKIE } from "@/lib/constants";
import { coverageReport, dictFor, isLang, langMeta } from "@/lib/i18n";
import type { Lang } from "@/lib/types";
import { PrototypeBanner } from "@/components/PrototypeBanner";
import { SiteHeader } from "@/components/SiteHeader";
import { LanguageGate } from "@/components/LanguageGate";
import { DemoShortcut } from "@/components/DemoShortcut";

/**
 * One family, ten scripts. Noto is the only face with correct, legible
 * coverage of every script this app speaks at the weights we need — mixing
 * families across scripts is what makes multilingual government sites look
 * like ten different websites stapled together.
 *
 * Only the Latin face is preloaded. The other nine are declared here so the
 * stylesheet knows about them, but a preload hint for all ten would put
 * roughly half a megabyte of fonts on the critical path of a 3G connection
 * for a reader who will use exactly one. `display: swap` covers the gap with
 * the system's own Indic face, which every Android phone ships.
 */
const notoSans = Noto_Sans({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  display: "swap",
  variable: "--font-latn",
});

/* next/font reads these calls at build time with a static parser, so every
   argument has to be a literal here — no shared options object, no spread.
   The repetition is the price of the build-time subsetting. */
const notoDeva = Noto_Sans_Devanagari({ subsets: ["devanagari"], weight: ["400", "600", "700"], display: "swap", preload: false, variable: "--font-deva" });
const notoGujr = Noto_Sans_Gujarati({ subsets: ["gujarati"], weight: ["400", "600", "700"], display: "swap", preload: false, variable: "--font-gujr" });
const notoBeng = Noto_Sans_Bengali({ subsets: ["bengali"], weight: ["400", "600", "700"], display: "swap", preload: false, variable: "--font-beng" });
const notoTelu = Noto_Sans_Telugu({ subsets: ["telugu"], weight: ["400", "600", "700"], display: "swap", preload: false, variable: "--font-telu" });
const notoTaml = Noto_Sans_Tamil({ subsets: ["tamil"], weight: ["400", "600", "700"], display: "swap", preload: false, variable: "--font-taml" });
const notoKnda = Noto_Sans_Kannada({ subsets: ["kannada"], weight: ["400", "600", "700"], display: "swap", preload: false, variable: "--font-knda" });
const notoMlym = Noto_Sans_Malayalam({ subsets: ["malayalam"], weight: ["400", "600", "700"], display: "swap", preload: false, variable: "--font-mlym" });
const notoGuru = Noto_Sans_Gurmukhi({ subsets: ["gurmukhi"], weight: ["400", "600", "700"], display: "swap", preload: false, variable: "--font-guru" });
const notoOrya = Noto_Sans_Oriya({ subsets: ["oriya"], weight: ["400", "600", "700"], display: "swap", preload: false, variable: "--font-orya" });

const FONT_VARS = [
  notoSans,
  notoDeva,
  notoGujr,
  notoBeng,
  notoTelu,
  notoTaml,
  notoKnda,
  notoMlym,
  notoGuru,
  notoOrya,
]
  .map((f) => f.variable)
  .join(" ");

export const metadata: Metadata = {
  title: "Pension Saral — prove you are here, keep your pension",
  description:
    "A student prototype of a simpler citizen journey for India's Digital Life Certificate. Not an official government service.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Never cap zoom — 200% is a requirement, not an edge case.
  maximumScale: 5,
  themeColor: "#FBF8F2",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  /* The chosen language lives in a cookie as well as sessionStorage, purely
     so the server can render the right script on the very first paint. A
     pensioner should never see a flash of English before their language
     appears. */
  const jar = await cookies();
  const raw = jar.get(LANG_COOKIE)?.value;
  const lang: Lang = isLang(raw) ? raw : "en";
  /* No cookie means nobody has chosen yet, so the gate goes up over
     whatever page they landed on — including a deep link from a message. */
  const chosen = isLang(raw);
  const meta = langMeta(lang);
  const d = dictFor(lang);
  /* Eleven numbers, measured against English at render time rather than
     hand-maintained in a list that would drift the day after it was written. */
  const coverage = coverageReport();

  return (
    <html
      lang={lang}
      dir={meta.dir}
      className={`lang-${lang} script-${meta.script} ${FONT_VARS}`}
    >
      <body>
        <AppProvider initialLang={lang} dict={d}>
          <a href="#main" className="sr-only">
            {d.nav.skip}
          </a>
          <div className="app-frame">
            {/* One sticky block, not two. The header used to pin itself
                at the banner's one-line height, which is not its height on a
                phone, where the sentence wraps. */}
            <div className="topbars">
              <PrototypeBanner text={d.common.protoBanner} />
              <SiteHeader coverage={coverage} />
            </div>
            {children}
          </div>
          {!chosen && <LanguageGate coverage={coverage} />}
          <DemoShortcut />
        </AppProvider>
      </body>
    </html>
  );
}
