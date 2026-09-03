"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useApp } from "@/lib/app-state";
import { LANGUAGES } from "@/lib/i18n/util";
import type { Lang } from "@/lib/types";
import { Check, Globe } from "./Icons";

/**
 * The language choice, asked before anything else, on the first visit only.
 *
 * The brief said screen 1 must be the language chooser and nothing may
 * appear in a language the visitor has not picked. A landing page that
 * explains the product is worth having — but not at the cost of showing a
 * 78-year-old a wall of English first. So the page underneath renders in
 * whatever language is chosen, and until one is, this sits on top of it.
 *
 * At eleven languages the heading can no longer be written in all of them,
 * so it is written in the two that between them reach almost every reader in
 * India, and the list carries the rest: each language names itself, in its
 * own script, which is the one line on this screen that never needs
 * translating. The English name and the state sit underneath, because a son
 * setting the phone up for his mother scans for "Kerala" faster than he
 * reads മലയാളം.
 *
 * It is deliberately not dismissible. Every other route out of here would
 * land somebody on a page they cannot read.
 */
export function LanguageGate({
  coverage,
}: {
  /** Share of the app translated, per language. Measured on the server. */
  coverage?: Partial<Record<Lang, number>>;
}) {
  const { chooseLang } = useApp();
  const pathname = usePathname();
  const first = useRef<HTMLButtonElement | null>(null);
  const panel = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    first.current?.focus();

    // The page behind must not scroll while a choice is pending.
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    /* Keep Tab inside the dialog — a wrap-around rather than a full
       focus-trap library, because the dialog is a single list of buttons. */
    function onKey(e: KeyboardEvent) {
      if (e.key !== "Tab" || !panel.current) return;
      const items = Array.from(
        panel.current.querySelectorAll<HTMLButtonElement>("button"),
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
          <Globe size={18} />
          <span>Pension Saral</span>
          <span aria-hidden="true">·</span>
          <span lang="hi">पेंशन सरल</span>
        </p>

        <h1 className="gate-title" id="gate-title">
          <span>Choose your language</span>
          <span lang="hi">अपनी भाषा चुनिए</span>
        </h1>

        <ul className="gate-options">
          {LANGUAGES.map((l, i) => {
            /* Anything under this is more English than its own language on a
               given screen, which the reader deserves to know before they
               pick it rather than three screens in. */
            const done = coverage?.[l.code] ?? 1;
            const partial = done < 0.98;
            return (
              <li key={l.code}>
                <button
                  ref={i === 0 ? first : undefined}
                  type="button"
                  lang={l.code}
                  dir={l.dir}
                  className="gate-option"
                  onClick={() => chooseLang(l.code, pathname)}
                >
                  <span className="gate-option-native">{l.native}</span>
                  <span className="gate-option-meta" lang="en" dir="ltr">
                    {l.english}
                    <span aria-hidden="true"> · </span>
                    {l.where}
                  </span>
                  {partial && (
                    <span className="gate-option-part" lang="en" dir="ltr">
                      {Math.round(done * 100)}% translated · rest in English
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>

        <p className="gate-note">
          <Check size={16} />
          <span>You can change it later, at the top of any page.</span>
          <span lang="hi">बाद में किसी भी पन्ने पर ऊपर से बदल सकते हैं.</span>
        </p>
      </div>
    </div>
  );
}
