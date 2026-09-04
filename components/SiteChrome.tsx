"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useApp } from "@/lib/app-state";
import { LANGUAGES } from "@/lib/i18n/util";
import { Globe } from "./Icons";

/**
 * The chrome an Indian government service actually wears.
 *
 * Three strips, in the order a citizen's eye meets them:
 *
 *   1. the prototype banner, dark and unmissable, because everything under
 *      it is pretending to be a service that does not exist;
 *   2. a utility bar — text size, contrast, language — which is the row
 *      every real portal carries and the row this audience needs most;
 *   3. the name, and the nav.
 *
 * There was an ornamental rule above all three. Drawn as a tiled vine it
 * stretched to the viewport and read as a smear rather than as carving,
 * and a decoration that only works at one width is not decoration.
 *
 * What is deliberately absent: the State Emblem, the words "Government of
 * India", the tricolour as a device. The brief bans all three and it is
 * right to. Wearing the furniture of a government site is a design
 * decision; wearing its identity is a lie, and this one is aimed at people
 * who would have no way to tell the difference.
 */

/* Two things the audience actually needs and no site gives them: bigger
   text than the designer chose, and more contrast than the designer
   chose. Held on <html> so every token below reacts at once. */
const SIZES = ["sm", "md", "lg"] as const;
type Size = (typeof SIZES)[number];

export function SiteChrome() {
  return (
    <>
      <PrototypeBar />
      <UtilityBar />
      <Masthead />
    </>
  );
}

function PrototypeBar() {
  const { t } = useApp();
  return (
    <div className="proto-bar">
      <span className="proto-tag">PROTOTYPE</span>
      <span className="proto-words">{t("common.protoBanner")}</span>
    </div>
  );
}

function UtilityBar() {
  const { d, lang, chooseLang } = useApp();
  const pathname = usePathname();
  const NAV = d.nav as Record<string, string>;

  const [size, setSize] = useState<Size>("md");
  const [hc, setHc] = useState(false);

  /* Restored before paint would be better, but a flash of the default size
     is a far smaller problem than a setting that forgets itself. */
  useEffect(() => {
    const s = localStorage.getItem("ps_size") as Size | null;
    const c = localStorage.getItem("ps_hc") === "1";
    if (s && SIZES.includes(s)) setSize(s);
    setHc(c);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.size = size;
    try {
      localStorage.setItem("ps_size", size);
    } catch {
      /* private mode; the setting simply does not persist */
    }
  }, [size]);

  useEffect(() => {
    document.documentElement.dataset.contrast = hc ? "high" : "normal";
    try {
      localStorage.setItem("ps_hc", hc ? "1" : "0");
    } catch {
      /* as above */
    }
  }, [hc]);

  return (
    <div className="util-bar">
      <div className="util-inner">
        <span className="util-label">{NAV.textSize}</span>
        <div className="util-sizes" role="group" aria-label={NAV.textSize}>
          {SIZES.map((s, i) => (
            <button
              key={s}
              type="button"
              className={`util-size${size === s ? " is-on" : ""}`}
              aria-pressed={size === s}
              onClick={() => setSize(s)}
              style={{ fontSize: `${12 + i * 3}px` }}
            >
              A{s === "sm" ? "−" : s === "lg" ? "+" : ""}
            </button>
          ))}
        </div>

        <button
          type="button"
          className={`util-toggle${hc ? " is-on" : ""}`}
          aria-pressed={hc}
          onClick={() => setHc((v) => !v)}
        >
          {NAV.contrast}
        </button>

        <label className="util-lang">
          <Globe size={16} />
          <span className="sr-only">{NAV.language}</span>
          <select
            value={lang}
            onChange={(e) => chooseLang(e.target.value as typeof lang, pathname)}
          >
            {LANGUAGES.map((l) => (
              <option key={l.code} value={l.code}>
                {l.native}
              </option>
            ))}
          </select>
        </label>
      </div>
    </div>
  );
}

function Masthead() {
  const { d, t } = useApp();
  const pathname = usePathname();
  const NAV = d.nav as Record<string, string>;

  const links = [
    { href: "/start", label: NAV.home },
    { href: "/find", label: d.hub ? (d.hub as Record<string, string>).notSure : "" },
    { href: "/help", label: NAV.help },
    { href: "/about", label: NAV.about },
    { href: "/outbox", label: NAV.outbox },
  ].filter((l) => l.label);

  const isOn = (href: string) =>
    href === "/start" ? pathname === "/start" : pathname.startsWith(href);

  return (
    <header className="masthead-bar">
      <div className="masthead-inner">
        <Link href="/" className="masthead-brand">
          <span className="brand-mark" aria-hidden="true">
            <svg viewBox="0 0 40 40" width="38" height="38">
              <circle cx="20" cy="20" r="18" fill="var(--primary-tint)" stroke="var(--primary)" strokeWidth="2" />
              <path d="M12 24 l6 6 12 -16" fill="none" stroke="var(--success)" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          <span className="brand-words">
            <span className="brand-name">{t("common.appName")}</span>
            <span className="brand-tag">{t("common.tagline")}</span>
          </span>
        </Link>

        <a className="masthead-help" href={`tel:${t("common.helpNumber").replace(/\s/g, "")}`}>
          <span className="help-label">{t("common.needHelp")}</span>
          <span className="help-number">{t("common.helpNumber")}</span>
        </a>
      </div>

      <nav className="masthead-nav" aria-label={NAV.menu}>
        <div className="masthead-nav-inner">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="masthead-link"
              aria-current={isOn(l.href) ? "page" : undefined}
            >
              {l.label}
            </Link>
          ))}
        </div>
      </nav>
    </header>
  );
}

/** The wide footer a portal carries: numbers, services, and the honesty. */
export function SiteFooter() {
  const { d, t } = useApp();
  const NAV = d.nav as Record<string, string>;
  const HELP = d.help as Record<string, string>;
  const HUB = d.hub as Record<string, string>;

  return (
    <footer className="site-foot">
      <div className="foot-cols">
        <section className="foot-col">
          <h2 className="foot-h">{NAV.footHelplines}</h2>
          <ul className="foot-lines">
            <li>
              <a href={`tel:${t("common.helpNumber").replace(/\s/g, "")}`}>
                <span className="foot-num">{t("common.helpNumber")}</span>
                <span className="foot-num-l">{HELP.callSub}</span>
              </a>
            </li>
          </ul>
        </section>

        <section className="foot-col">
          <h2 className="foot-h">{NAV.footServices}</h2>
          <ul className="foot-links">
            <li><Link href="/start">{HUB.title}</Link></li>
            <li><Link href="/find">{HUB.notSure}</Link></li>
            <li><Link href="/start">{HUB.track}</Link></li>
            <li><Link href="/help">{HELP.centres}</Link></li>
          </ul>
        </section>

        <section className="foot-col">
          <h2 className="foot-h">{NAV.footAbout}</h2>
          <ul className="foot-links">
            <li><Link href="/about">{NAV.about}</Link></li>
            <li><Link href="/outbox">{NAV.outbox}</Link></li>
            <li><Link href="/help">{HELP.steps}</Link></li>
          </ul>
        </section>
      </div>

      <div className="foot-bottom">
        <p>{(d.about as Record<string, string>).notAffiliated}</p>
      </div>
    </footer>
  );
}
