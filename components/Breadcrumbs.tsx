"use client";

import Link from "next/link";
import { useApp } from "@/lib/app-state";
import { Chevron } from "./Icons";

export interface Crumb {
  label: string;
  /** Omit on the last crumb — you are already there. */
  href?: string;
}

/**
 * Breadcrumbs.
 *
 * The single most useful thing a deep government site can show: not just
 * how to go back one step, but where "back" leads and what is above it.
 * A person four screens into a widow pension application should be able to
 * see the whole path and jump to any part of it.
 */
export function Breadcrumbs({ crumbs }: { crumbs: Crumb[] }) {
  const { d } = useApp();
  if (crumbs.length === 0) return null;

  return (
    <nav className="crumbs" aria-label={(d.nav as Record<string, string>).breadcrumb}>
      <ol>
        {crumbs.map((c, i) => {
          const last = i === crumbs.length - 1;
          return (
            <li key={`${c.label}-${i}`}>
              {c.href && !last ? (
                <Link href={c.href}>{c.label}</Link>
              ) : (
                <span aria-current={last ? "page" : undefined}>{c.label}</span>
              )}
              {!last && <Chevron size={14} className="crumb-sep" />}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
