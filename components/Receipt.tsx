"use client";

import { forwardRef } from "react";
import { useApp } from "@/lib/app-state";
import { InkStamp } from "./CameraArt";
import type { PublicRecord } from "@/lib/publicRecord";

/** Completed years, for the sentence that explains the age slab. */
function ageOn(dob: string | undefined, now = new Date()): number {
  const born = new Date(dob ?? "");
  if (Number.isNaN(born.getTime())) return 0;
  let years = now.getUTCFullYear() - born.getUTCFullYear();
  const beforeBirthday =
    now.getUTCMonth() < born.getUTCMonth() ||
    (now.getUTCMonth() === born.getUTCMonth() && now.getUTCDate() < born.getUTCDate());
  if (beforeBirthday) years -= 1;
  return Math.max(0, years);
}

/**
 * The signature element, now for six kinds of outcome rather than one.
 *
 * The shape stays the same in every case: a stamped passbook page with a
 * name, a couple of small rows, one very large number or date, and a
 * circular ink stamp sitting slightly crooked. What changes is which number
 * is the large one — because that is the number the person came for.
 *
 * A pension approval is a monthly amount. A bank change is a date. An
 * arrears claim is a lump sum. Getting that hierarchy right per service is
 * the difference between a receipt and a form.
 */
export const Receipt = forwardRef<HTMLDivElement, { record: PublicRecord }>(
  function Receipt({ record }, ref) {
    const { t, d, lang } = useApp();
    const SVC = d.svc as Record<string, string>;

    const locale = lang === "hi" ? "hi-IN" : lang === "gu" ? "gu-IN" : "en-IN";
    const fmt = (iso: string, withTime = false) => {
      try {
        return new Intl.DateTimeFormat(locale, {
          day: "numeric",
          month: "long",
          year: "numeric",
          ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
          ...(withTime ? {} : { timeZone: "UTC" }),
        }).format(new Date(iso));
      } catch {
        return iso.slice(0, 10);
      }
    };

    const money = (n: number) => {
      try {
        return new Intl.NumberFormat(locale, {
          style: "currency",
          currency: "INR",
          maximumFractionDigits: 0,
        }).format(n);
      } catch {
        return `₹${n}`;
      }
    };

    const o = record.outcome;

    /* ---- the one big thing, and its label ---- */
    let bigLabel = t("accepted.safeUntil");
    let bigValue = "—";
    const rows: [string, string][] = [];

    if (o?.kind === "lifecert") {
      bigLabel = t("accepted.safeUntil");
      bigValue = o.validUntil ? fmt(o.validUntil) : "—";
    } else if (o?.kind === "sanction") {
      bigLabel = t("outcome.sanctionAmount");
      bigValue = money(o.monthly ?? 0);
      if (o.orderNo) rows.push([t("outcome.sanctionOrder"), o.orderNo]);
      if (o.firstPaymentDate) rows.push([t("outcome.sanctionFirst"), fmt(o.firstPaymentDate)]);
    } else if (o?.kind === "change") {
      bigLabel = t("outcome.changeEffective");
      bigValue = o.effectiveFrom ? fmt(o.effectiveFrom) : "—";
    } else if (o?.kind === "increase") {
      bigLabel = t("outcome.increaseNow");
      bigValue = money(o.newMonthly ?? 0);
      /* Naming the rate and the reason is what turns a large arrears figure
         from a suspicious number into a claim someone can repeat at a bank
         counter: "forty per cent, because I am ninety-one". */
      if (o.ratePercent) {
        rows.push([
          t("outcome.increaseRate"),
          t("outcome.increaseRateValue", {
            pct: o.ratePercent,
            age: ageOn(record.values.dob),
          }),
        ]);
      }
      if (o.arrears) rows.push([t("outcome.increaseArrears"), money(o.arrears)]);
      if (o.owedFrom) rows.push([t("outcome.increaseFrom"), fmt(o.owedFrom)]);
    } else if (o?.kind === "grievance") {
      bigLabel = t("outcome.grievanceDocket");
      bigValue = o.docket ?? "—";
      if (o.answerBy) rows.push([t("outcome.sanctionFirst"), fmt(o.answerBy)]);
    }

    const ppo = record.values.ppo ?? record.values.deceasedPpo;

    return (
      <div className="receipt" ref={ref}>
        <p className="receipt-head">{SVC[`${record.serviceId}Name`] ?? t("accepted.receiptHead")}</p>

        <p className="receipt-name">{record.name || "—"}</p>
        {ppo && (
          <p className="receipt-meta">
            {t("accepted.receiptPpo")}: {ppo}
          </p>
        )}
        <p className="receipt-meta">
          {t("accepted.receiptRef")}: {record.id}
        </p>
        <p className="receipt-meta">
          {t("accepted.receiptOn")}: {fmt(record.createdAt, true)}
        </p>

        <hr className="receipt-rule" />

        {rows.map(([k, v]) => (
          <p className="receipt-meta" key={k}>
            {k}: <strong style={{ color: "var(--ink)" }}>{v}</strong>
          </p>
        ))}

        <p className="receipt-safe-label" style={{ marginTop: rows.length ? 14 : 0 }}>
          {bigLabel}
        </p>
        <p className="receipt-date">{bigValue}</p>

        <div className="receipt-stamp-wrap">
          <InkStamp
            top={t("accepted.stampTop")}
            middle={t("accepted.stampMiddle")}
            bottom={t("accepted.stampBottom")}
          />
        </div>

        {/* Honesty travels with the artefact: if someone photographs this
            and sends it on, the disclosure goes with it. */}
        <p className="micro" style={{ marginTop: 4, position: "relative" }}>
          {t("common.protoBanner")}
        </p>
      </div>
    );
  }
);
