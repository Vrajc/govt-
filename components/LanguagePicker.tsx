"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useApp } from "@/lib/app-state";
import { LANGUAGES } from "@/lib/i18n/util";
import { Chevron, Globe } from "./Icons";

/**
 * The language control, as a real menu instead of a native <select>.
 *
 * The select was the single worst control in the product for the audience
 * it is aimed at. It rendered eleven bare native names in the OS font at
 * the OS size, in a popup this stylesheet cannot reach — so the one screen
 * element that has to be legible to someone who reads no English was the
 * one element the design had no say over. It also gave no clue which
 * language you were about to get: "ଓଡ଼ିଆ" alone does not help a Hindi
 * reader hunting for हिन्दी.
 *
 * This shows, per row: the native name at 15px, then the English name and
 * where it is spoken, so a row can be found by any of the three. The
 * current one carries a check rather than a highlight, because a
 * background-tinted row in a list of eleven is not visible enough.
 */
export function LanguagePicker() {
  const { lang, chooseLang, d } = useApp();
  const pathname = usePathname();
  const NAV = d.nav as Record<string, string>;

  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    function away(e: MouseEvent) {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    }
    function esc(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", away);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", away);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  const current = LANGUAGES.find((l) => l.code === lang);

  return (
    <div className="langpick" ref={box}>
      <button
        type="button"
        className="langpick-btn"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <Globe size={16} />
        <span className="sr-only">{NAV.language}</span>
        <span className="langpick-cur">{current ? current.native : lang}</span>
        <Chevron size={12} down />
      </button>

      {open && (
        <div className="langpick-menu" role="listbox" aria-label={NAV.language}>
          <p className="langpick-head">{NAV.language}</p>
          {LANGUAGES.map((l) => (
            <button
              key={l.code}
              type="button"
              role="option"
              aria-selected={l.code === lang}
              className={`langpick-row${l.code === lang ? " is-on" : ""}`}
              lang={l.code}
              onClick={() => {
                setOpen(false);
                chooseLang(l.code, pathname);
              }}
            >
              <span className="langpick-native">{l.native}</span>
              <span className="langpick-meta" lang="en">
                {l.english} · {l.where}
              </span>
              {l.code === lang && <span className="langpick-tick" aria-hidden="true">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
