"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useApp } from "@/lib/app-state";
import { LANG_NAMES } from "@/lib/i18n/util";
import { LANGS, type Lang } from "@/lib/types";
import { Chevron } from "./Icons";

/**
 * The language choice, asked before anything else, on the first visit only.
 *
 * The brief said screen 1 must be the language chooser and nothing may
 * appear in a language the visitor has not picked. A landing page that
 * explains the product is worth having — but not at the cost of showing a
 * 78-year-old a wall of English first. So the page underneath renders in
 * whatever language is chosen, and until one is, this sits on top of it.
 *
 * It is deliberately not dismissible. Three large buttons is not a burden,
 * and every other route out of here would land somebody on a page they
 * cannot read.
 */
export function LanguageGate() {
  const { chooseLang } = useApp();
  const pathname = usePathname();
  const first = useRef<HTMLButtonElement | null>(null);
  const panel = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    first.current?.focus();

    // The page behind must not scroll while a choice is pending.
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    /* Keep Tab inside the dialog. Three buttons is a short loop, so this is
       a wrap-around rather than a full focus-trap library. */
    function onKey(e: KeyboardEvent) {
      if (e.key !== "Tab" || !panel.current) return;
      const items = Array.from(
        panel.current.querySelectorAll<HTMLButtonElement>("button")
      );
      if (items.length === 0) return;
      const firstItem = items[0];
      const lastItem = items[items.length - 1];
      if (e.shiftKey && document.activeElement === firstItem) {
        e.preventDefault();
        lastItem.focus();
      } else if (!e.shiftKey && document.activeElement === lastItem) {
        e.preventDefault();
        firstItem.focus();
      }
    }

    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  return (
    <div className="gate" role="dialog" aria-modal="true" aria-labelledby="gate-title">
      <div className="gate-panel" ref={panel}>
        <p className="gate-brand">
          Pension Saral
          <span aria-hidden="true"> · </span>
          <span lang="hi">पेंशन सरल</span>
          <span aria-hidden="true"> · </span>
          <span lang="gu">પેન્શન સરળ</span>
        </p>

        {/* Trilingual, because the reader has not told us anything yet. */}
        <h1 className="gate-title" id="gate-title">
          <span>Choose your language</span>
          <span lang="hi">अपनी भाषा चुनिए</span>
          <span lang="gu">તમારી ભાષા પસંદ કરો</span>
        </h1>

        <div className="gate-options">
          {LANGS.map((l: Lang, i) => (
            <button
              key={l}
              ref={i === 0 ? first : undefined}
              type="button"
              lang={l}
              className="gate-option"
              onClick={() => chooseLang(l, pathname)}
            >
              <span>{LANG_NAMES[l]}</span>
              <Chevron size={22} />
            </button>
          ))}
        </div>

        <p className="gate-note">
          <span>You can change it later, at the top of any page.</span>
          <span lang="hi">बाद में किसी भी पन्ने पर ऊपर से बदल सकते हैं.</span>
          <span lang="gu">પછીથી કોઈ પણ પાના પર ઉપરથી બદલી શકો છો.</span>
        </p>
      </div>
    </div>
  );
}
