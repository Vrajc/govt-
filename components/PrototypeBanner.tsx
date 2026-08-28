"use client";

import { useApp } from "@/lib/app-state";
import { Alert } from "./Icons";

/**
 * Persistent, unmissable, and deliberately impossible to dismiss. It is the
 * first element on every screen and it never scrolls away.
 *
 * `text` comes from the server so the very first paint is already in the
 * right language; after hydration the context takes over.
 */
export function PrototypeBanner({ text }: { text: string }) {
  const { d } = useApp();
  return (
    <div className="proto-banner" role="note">
      <Alert size={16} />
      <span>{d.common.protoBanner || text}</span>
    </div>
  );
}
