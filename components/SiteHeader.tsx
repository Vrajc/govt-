"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useApp } from "@/lib/app-state";
import { LANG_NAMES } from "@/lib/i18n/util";
import { LANGS, type Lang } from "@/lib/types";
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
export function SiteHeader() {
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

          {/* Changing language reloads, because the server sends only the
              chosen dictionary. One reload beats shipping three scripts. */}
          <label className="lang-switch">
            <Globe size={20} />
            <span className="sr-only">{NAV.language}</span>
            <select
              value={lang}
              aria-label={NAV.language}
              onChange={(e) => chooseLang(e.target.value as Lang, pathname)}
            >
              {LANGS.map((l) => (
                <option key={l} value={l}>
                  {LANG_NAMES[l]}
                </option>
              ))}
            </select>
          </label>
        </nav>
      </div>
    </header>
  );
}
