"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

/**
 * Ctrl + Shift + D from anywhere opens the presenter controls.
 *
 * Reachable but never visible: there is no link to /demo from any screen in
 * the journey, so a pensioner cannot wander into it and a presenter never
 * has to hunt for it mid-recording.
 */
export function DemoShortcut() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!e.ctrlKey || !e.shiftKey) return;
      if (e.key.toLowerCase() !== "d") return;
      e.preventDefault();
      router.push(pathname === "/demo" ? "/" : "/demo");
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router, pathname]);

  return null;
}
