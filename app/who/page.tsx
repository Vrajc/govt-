"use client";

import { useRouter } from "next/navigation";
import { useApp } from "@/lib/app-state";
import { ScreenShell } from "@/components/ScreenShell";
import { Info, People, Person } from "@/components/Icons";
import type { Mode } from "@/lib/types";

/**
 * Screen 2 — who is this for?
 *
 * Assisted mode changes who the copy addresses and adds one field on review.
 * It hides nothing and changes nothing about what is sent. The point is to
 * stop making a son pretend to be his father.
 */
export default function WhoScreen() {
  const { t, patch } = useApp();
  const router = useRouter();

  function choose(mode: Mode) {
    patch({ mode });
    router.push("/details");
  }

  return (
    <ScreenShell
      step={2}
      back="/"
      title={t("who.title")}
      guide={t("who.guide")}
      speakExtra={`${t("who.self")}. ${t("who.assisted")}. ${t("who.note")}`}
    >
      <div role="group" aria-label={t("who.title")}>
        <button type="button" className="card" onClick={() => choose("self")}>
          <span className="card-title">
            <Person size={26} />
            {t("who.self")}
          </span>
          <span className="card-sub">{t("who.selfSub")}</span>
        </button>

        <button type="button" className="card" onClick={() => choose("assisted")}>
          <span className="card-title">
            <People size={26} />
            {t("who.assisted")}
          </span>
          <span className="card-sub">{t("who.assistedSub")}</span>
        </button>
      </div>

      <div className="note note-info" style={{ marginTop: 24 }}>
        <Info size={22} />
        <span>{t("who.note")}</span>
      </div>
    </ScreenShell>
  );
}
