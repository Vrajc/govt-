"use client";

import Link from "next/link";
import { useApp } from "@/lib/app-state";
import { numberedList } from "@/lib/assistant/destinations";
import { NumberBadge } from "./NumberBadge";

/**
 * Every number, in one column.
 *
 * This is the list somebody reads down a phone line — a helpline worker,
 * a grandson in another city, the man at the common service centre with
 * six people waiting behind you. It is short on purpose, and it is built
 * from the same resolver the voice assistant answers with, so what it
 * calls number 9 and what the assistant calls number 9 cannot drift.
 */
export function NumberList({ onPick }: { onPick?: () => void }) {
  const { d } = useApp();

  return (
    <ul className="num-list">
      {numberedList(d).map(({ n, href, label }) => (
        <li key={n}>
          <Link href={href} className="num-list-item" onClick={onPick}>
            <NumberBadge n={n} />
            <span className="num-list-name">{label}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
