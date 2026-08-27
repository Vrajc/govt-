"use client";

import { forwardRef } from "react";
import { useApp } from "@/lib/app-state";
import { InkStamp } from "./CameraArt";
import type { PublicRecord } from "@/lib/publicRecord";

/**
 * The signature element. A stamped passbook page: the name, the PPO number,
 * one very large date, and a circular ink stamp sitting slightly crooked.
 *
 * This is the one thing a pensioner actually wants out of the whole journey
 * — proof they can show their son — so all of the visual boldness in the
 * app is spent here and nowhere else.
 */
export const Receipt = forwardRef<HTMLDivElement, { record: PublicRecord }>(
  function Receipt({ record }, ref) {
    const { t, lang } = useApp();

    const locale = lang === "hi" ? "hi-IN" : lang === "gu" ? "gu-IN" : "en-IN";
    const fmt = (iso: string, withTime = false) => {
      try {
        return new Intl.DateTimeFormat(locale, {
          day: "numeric",
          month: "long",
          year: "numeric",
          ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
          timeZone: withTime ? undefined : "UTC",
        }).format(new Date(iso));
      } catch {
        return iso.slice(0, 10);
      }
    };

    return (
      <div className="receipt" ref={ref}>
        <p className="receipt-head">{t("accepted.receiptHead")}</p>

        <p className="receipt-name">{record.name}</p>
        <p className="receipt-meta">
          {t("accepted.receiptPpo")}: {record.ppo}
        </p>
        <p className="receipt-meta">
          {t("accepted.receiptRef")}: {record.id}
        </p>
        <p className="receipt-meta">
          {t("accepted.receiptOn")}: {fmt(record.createdAt, true)}
        </p>

        <hr className="receipt-rule" />

        <p className="receipt-safe-label">{t("accepted.safeUntil")}</p>
        <p className="receipt-date">
          {record.validUntil ? fmt(record.validUntil) : "—"}
        </p>

        <div className="receipt-stamp-wrap">
          <InkStamp
            top={t("accepted.stampTop")}
            middle={t("accepted.stampMiddle")}
            bottom={t("accepted.stampBottom")}
          />
        </div>

        {/* Honesty travels with the artefact: if someone photographs this
            receipt and sends it on, the disclosure goes with it. */}
        <p className="micro" style={{ marginTop: 4, position: "relative" }}>
          {t("common.protoBanner")}
        </p>
      </div>
    );
  }
);
