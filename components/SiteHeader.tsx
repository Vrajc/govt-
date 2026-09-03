"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useApp } from "@/lib/app-state";
import { LANGUAGES } from "@/lib/i18n/util";
import type { Lang } from "@/lib/types";
import { Book, Home, Info, Globe } from "./Icons";

/**
 * The site header.
 *
 * Until this existed the only way out of any screen was one Back button,
 * which is fine for a phone app and wrong for a government website. Someone
 * halfway through a widow pension application needs to be able to reach the
 * help page, check what is real, or start over — without using the browser
 * chrome, which a lot of this audience does not think to use.
 *
 * Three links and a language switch. Not a mega-menu: every item here is a
 * place a citizen actually needs, and nothing else earns the space.
 */
export function SiteHeader({
  coverage,
}: {
  coverage?: Partial<Record<Lang, number>>;
}) {
  const { d, lang, chooseLang } = useApp();
  const pathname = usePathname();
  const NAV = d.nav as Record<string, string>;

  // The language chooser is the whole page; a nav bar on top of it would
  // just be noise.
  if (pathname === "/") return null;

  const links = [
    { href: "/start", label: NAV.home, icon: <Home size={20} /> },
    { href: "/help", label: NAV.help, icon: <Book size={20} /> },
    { href: "/about", label: NAV.about, icon: <Info size={20} /> },
  ];

  const isOn = (href: string) =>
    href === "/start" ? pathname === "/start" : pathname.startsWith(href);

  return (
    <header className="site-header">
      <div className="site-header-inner">
        <Link href="/start" className="site-brand">
          {d.common.appName}
        </Link>

        <nav className="site-nav" aria-label={NAV.menu}>
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="site-nav-link"
              aria-current={isOn(l.href) ? "page" : undefined}
            >
              {l.icon}
              <span>{l.label}</span>
            </Link>
          ))}

        </nav>

        {/* Outside the nav, not inside it: it is a control, not a
            destination, and on a phone it pairs with the brand on the
            first row so the three real links keep a row of their own.

            A native <select> and not a custom menu. At eleven languages a
            hand-rolled dropdown becomes a scrolling popover that has to be
            keyboard-trapped, sized and positioned; the platform one is
            already all of that, opens as a full-screen wheel on Android, and
            reads correctly to every screen reader without any help.

            Changing language reloads, because the server sends only the
            chosen dictionary. One reload beats shipping ten scripts. */}
        <label className="lang-switch">
          <Globe size={20} />
          <span className="sr-only">{NAV.language}</span>
          <select
            value={lang}
            aria-label={NAV.language}
            onChange={(e) => chooseLang(e.target.value as Lang, pathname)}
          >
            {LANGUAGES.map((l) => {
              const done = coverage?.[l.code] ?? 1;
              return (
                <option key={l.code} value={l.code} lang={l.code}>
                  {l.native}
                  {/* The English name is what makes the list scannable for
                      someone who does not read the script they are looking
                      at — which is exactly the person who is switching. */}
                  {` — ${l.english}`}
                  {done < 0.98 ? ` (${Math.round(done * 100)}%)` : ""}
                </option>
              );
            })}
          </select>
        </label>
      </div>
    </header>
  );
}
