import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import {
  Anek_Bangla,
  Anek_Devanagari,
  Anek_Gujarati,
  Anek_Gurmukhi,
  Anek_Kannada,
  Anek_Latin,
  Anek_Malayalam,
  Anek_Odia,
  Anek_Tamil,
  Anek_Telugu,
  IBM_Plex_Mono,
} from "next/font/google";
import "./globals.css";
import { AppProvider } from "@/lib/app-state";
import { LANG_COOKIE } from "@/lib/constants";
import { coverageReport, dictFor, isLang, langMeta } from "@/lib/i18n";
import type { Lang } from "@/lib/types";
import { SiteChrome, SiteFooter } from "@/components/SiteChrome";
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
const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "600"],
  display: "swap",
  preload: false,
  variable: "--font-mono",
});

const notoSans = Anek_Latin({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-latn",
});

/* next/font reads these calls at build time with a static parser, so every
   argument has to be a literal here — no shared options object, no spread.
   The repetition is the price of the build-time subsetting. */
const notoDeva = Anek_Devanagari({ subsets: ["devanagari"], display: "swap", preload: false, variable: "--font-deva" });
const notoGujr = Anek_Gujarati({ subsets: ["gujarati"], display: "swap", preload: false, variable: "--font-gujr" });
const notoBeng = Anek_Bangla({ subsets: ["bengali"], display: "swap", preload: false, variable: "--font-beng" });
const notoTelu = Anek_Telugu({ subsets: ["telugu"], display: "swap", preload: false, variable: "--font-telu" });
const notoTaml = Anek_Tamil({ subsets: ["tamil"], display: "swap", preload: false, variable: "--font-taml" });
const notoKnda = Anek_Kannada({ subsets: ["kannada"], display: "swap", preload: false, variable: "--font-knda" });
const notoMlym = Anek_Malayalam({ subsets: ["malayalam"], display: "swap", preload: false, variable: "--font-mlym" });
const notoGuru = Anek_Gurmukhi({ subsets: ["gurmukhi"], display: "swap", preload: false, variable: "--font-guru" });
const notoOrya = Anek_Odia({ subsets: ["oriya"], display: "swap", preload: false, variable: "--font-orya" });

const FONT_VARS = [
  notoSans,
  plexMono,
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
            <SiteChrome />
            {children}
            <SiteFooter />
          </div>
          {!chosen && <LanguageGate coverage={coverage} />}
          <DemoShortcut />
        </AppProvider>
      </body>
    </html>
  );
}
