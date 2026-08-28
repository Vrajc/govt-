import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import { Noto_Sans, Noto_Sans_Devanagari, Noto_Sans_Gujarati } from "next/font/google";
import "./globals.css";
import { AppProvider } from "@/lib/app-state";
import { LANG_COOKIE } from "@/lib/constants";
import { isLang } from "@/lib/i18n";
import { dictFor } from "@/lib/i18n";
import type { Lang } from "@/lib/types";
import { PrototypeBanner } from "@/components/PrototypeBanner";
import { SiteHeader } from "@/components/SiteHeader";
import { DemoShortcut } from "@/components/DemoShortcut";

/**
 * Three faces, one family. Noto is the only pairing with correct, legible
 * coverage of Latin, Devanagari and Gujarati at the weights we need — mixing
 * families across scripts is what makes multilingual government sites look
 * like three different websites stapled together.
 */
const notoSans = Noto_Sans({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  display: "swap",
  variable: "--font-noto-sans",
});

const notoDeva = Noto_Sans_Devanagari({
  subsets: ["devanagari"],
  weight: ["400", "600", "700"],
  display: "swap",
  variable: "--font-noto-deva",
});

const notoGuj = Noto_Sans_Gujarati({
  subsets: ["gujarati"],
  weight: ["400", "600", "700"],
  display: "swap",
  variable: "--font-noto-guj",
});

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
  const d = dictFor(lang);

  return (
    <html
      lang={lang}
      className={`lang-${lang} ${notoSans.variable} ${notoDeva.variable} ${notoGuj.variable}`}
    >
      <body>
        <AppProvider initialLang={lang} dict={d}>
          <a href="#main" className="sr-only">
            {d.nav.skip}
          </a>
          <div className="app-frame">
            <PrototypeBanner text={d.common.protoBanner} />
            <SiteHeader />
            {children}
          </div>
          <DemoShortcut />
        </AppProvider>
      </body>
    </html>
  );
}
