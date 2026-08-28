"use client";

import Link from "next/link";
import { useApp } from "@/lib/app-state";
import { LANG_NAMES } from "@/lib/i18n/util";
import { LANGS, type Lang } from "@/lib/types";
import { Chevron } from "@/components/Icons";

/**
 * Screen 1 — choose your language.
 *
 * Nothing here is rendered in a language the visitor has not chosen yet.
 * The product name appears in all three scripts and the tagline appears
 * three times, once per language, because a chooser that speaks only
 * English has already failed the person it exists for.
 */
export default function LanguageScreen() {
  const { chooseLang, d } = useApp();

  function choose(l: Lang) {
    // A full navigation, so the server sends only the chosen language.
    chooseLang(l, "/start");
  }

  return (
    <main className="shell-main" id="main" style={{ paddingTop: 32 }}>
      <header style={{ marginBottom: 36 }}>
        <p
          style={{
            fontSize: 26,
            fontWeight: 700,
            lineHeight: 1.35,
            margin: "0 0 14px",
            letterSpacing: "-0.01em",
          }}
        >
          Pramaan Saral
          <span style={{ color: "var(--line)", margin: "0 8px" }}>·</span>
          प्रमाण सरल
          <span style={{ color: "var(--line)", margin: "0 8px" }}>·</span>
          પ્રમાણ સરળ
        </p>

        <p className="micro" style={{ margin: 0 }}>
          {d.lang.taglineEn}
        </p>
        <p className="micro" style={{ margin: 0 }} lang="hi">
          {d.lang.taglineHi}
        </p>
        <p className="micro" style={{ margin: 0 }} lang="gu">
          {d.lang.taglineGu}
        </p>
      </header>

      <h1
        className="screen-title"
        style={{ fontSize: 24, marginBottom: 20 }}
        id="lang-heading"
      >
        Choose your language <span lang="hi">· अपनी भाषा चुनिए</span>{" "}
        <span lang="gu">· તમારી ભાષા પસંદ કરો</span>
      </h1>

      <div role="group" aria-labelledby="lang-heading">
        {LANGS.map((l: Lang) => (
          <button
            key={l}
            type="button"
            className="btn btn-secondary"
            lang={l}
            onClick={() => choose(l)}
            style={{ justifyContent: "space-between", fontSize: 26, minHeight: 76 }}
          >
            <span>{LANG_NAMES[l]}</span>
            <Chevron size={24} />
          </button>
        ))}
      </div>

      <footer className="shell-foot" style={{ marginTop: 40 }}>
        <p className="micro">
          <Link href="/about" style={{ color: "var(--primary-dark)", fontWeight: 600 }}>
            What is real here, and what is pretend
          </Link>
        </p>
        <p className="micro" style={{ marginTop: 8 }}>
          A student prototype. Not an official government service. Not affiliated with
          the Government of India, MeitY, UIDAI or Jeevan Pramaan.
        </p>
      </footer>
    </main>
  );
}
