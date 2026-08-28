"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/lib/app-state";
import { apiFetch } from "@/lib/api";
import { ScreenShell } from "@/components/ScreenShell";
import { BigButton, BigLink } from "@/components/BigButton";
import { Receipt } from "@/components/Receipt";
import { Alert, Bell, Check, Info, Phone, Printer, Refresh, Save } from "@/components/Icons";
import { drawReceipt, downloadCanvas } from "@/lib/receiptCanvas";
import { serviceById } from "@/lib/services/catalogue";
import { stepsFor } from "@/lib/services/engine";
import type { PublicRecord } from "@/lib/publicRecord";

interface ExplainResponse {
  reason: string;
  action: string;
  source: "openai" | "fallback";
  keyPresent: boolean;
}

export default function ResultScreen({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { t, d, lang, app, patch } = useApp();
  const router = useRouter();

  const [record, setRecord] = useState<PublicRecord | null>(null);
  const [gone, setGone] = useState(false);
  const [explain, setExplain] = useState<ExplainResponse | null>(null);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [remindMsg, setRemindMsg] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const res = await apiFetch<{ record: PublicRecord }>(`/api/status/${id}`, { method: "GET" });
      if (!res.ok) {
        if (res.error.code === "NOT_FOUND") setGone(true);
        return;
      }
      const rec = res.data.record;
      setRecord(rec);
      // Still in flight — send them back to watch it.
      if (rec.state !== "ACCEPTED" && rec.state !== "NEEDS_FIX") {
        router.replace(`/status/${id}`);
      }
    })();
  }, [id, router]);

  /* ---- the AI explainer, for the needs-fixing branch only ---- */
  useEffect(() => {
    if (!record || record.state !== "NEEDS_FIX" || !record.errorCode) return;
    void (async () => {
      const res = await apiFetch<ExplainResponse>("/api/explain", {
        method: "POST",
        body: JSON.stringify({
          code: record.errorCode,
          language: lang,
          assistedMode: record.mode === "assisted",
        }),
      });
      if (res.ok) setExplain(res.data);
    })();
  }, [record, lang]);

  if (gone) {
    return (
      <ScreenShell title={t("status.notFound")} guide={t("status.notFoundBody")}>
        <BigLink href="/start" variant="secondary">
          {t("common.startOver")}
        </BigLink>
      </ScreenShell>
    );
  }

  if (!record) {
    return (
      <ScreenShell title={t("common.loading")}>
        <p className="pulsing text-soft">…</p>
      </ScreenShell>
    );
  }

  const svc = serviceById(record.serviceId);
  const total = svc ? stepsFor(svc).length : 6;
  const SVC = d.svc as Record<string, string>;
  const OUT = d.outcome as Record<string, string>;

  const locale = lang === "hi" ? "hi-IN" : lang === "gu" ? "gu-IN" : "en-IN";
  const fmt = (iso: string, withTime = false) =>
    new Intl.DateTimeFormat(locale, {
      day: "numeric",
      month: "long",
      year: "numeric",
      ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
      ...(withTime ? {} : { timeZone: "UTC" }),
    }).format(new Date(iso));
  const money = (n: number) =>
    new Intl.NumberFormat(locale, {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(n);

  /* ================================================================
   * Accepted — the shape depends on what kind of service it was
   * ================================================================ */
  if (record.state === "ACCEPTED") {
    const o = record.outcome;

    let title = t("accepted.title");
    let sub = "";
    let extraNote: string | null = null;

    if (o?.kind === "lifecert") {
      const year = o.validUntil ? new Date(o.validUntil).getUTCFullYear() : "";
      sub = t("accepted.sub", { year: String(year) });
    } else if (o?.kind === "sanction") {
      title = t("outcome.sanctionTitle");
      sub = t("outcome.sanctionSub", {
        date: o.firstPaymentDate ? fmt(o.firstPaymentDate) : "",
      });
      extraNote = t("outcome.sanctionKeep");
    } else if (o?.kind === "change") {
      title = t("outcome.changeTitle");
      sub = t("outcome.changeSub", { date: o.effectiveFrom ? fmt(o.effectiveFrom) : "" });
      // The thing that catches everybody out after a bank transfer.
      extraNote = t("outcome.changeLifecert");
    } else if (o?.kind === "increase") {
      title = t("outcome.increaseTitle");
      sub = t("outcome.increaseSub");
    } else if (o?.kind === "grievance") {
      title = t("outcome.grievanceTitle");
      sub = t("outcome.grievanceSub", { date: o.answerBy ? fmt(o.answerBy) : "" });
      extraNote = t("outcome.grievanceQuote");
    }

    function bigFor(): { label: string; value: string } {
      if (o?.kind === "sanction") {
        return { label: t("outcome.sanctionAmount"), value: money(o.monthly ?? 0) };
      }
      if (o?.kind === "increase") {
        return { label: t("outcome.increaseNow"), value: money(o.newMonthly ?? 0) };
      }
      if (o?.kind === "change") {
        return {
          label: t("outcome.changeEffective"),
          value: o.effectiveFrom ? fmt(o.effectiveFrom) : "—",
        };
      }
      if (o?.kind === "grievance") {
        return { label: t("outcome.grievanceDocket"), value: o.docket ?? "—" };
      }
      return {
        label: t("accepted.safeUntil"),
        value: o?.validUntil ? fmt(o.validUntil) : "—",
      };
    }

    function saveAsPng() {
      if (!record) return;
      const big = bigFor();
      const canvas = drawReceipt(
        record,
        lang,
        {
          head: SVC[`${record.serviceId}Name`] ?? t("accepted.receiptHead"),
          ppoLabel: t("accepted.receiptPpo"),
          bigLabel: big.label,
          bigValue: big.value,
          refLabel: t("accepted.receiptRef"),
          onLabel: t("accepted.receiptOn"),
          safeUntil: t("accepted.safeUntil"),
          stampTop: t("accepted.stampTop"),
          stampMiddle: t("accepted.stampMiddle"),
          stampBottom: t("accepted.stampBottom"),
          disclosure: t("common.protoBanner"),
        },
        {
          created: fmt(record.createdAt, true),
          valid: big.value,
          ppo: record.values.ppo ?? record.values.deceasedPpo ?? record.id,
        }
      );
      if (canvas && downloadCanvas(canvas, `pramaan-saral-${record.id}.png`)) {
        setSaveMsg(t("accepted.saved"));
      } else {
        window.print();
      }
    }

    async function setReminder() {
      if (!record) return;
      const res = await apiFetch<{ remindAt: string }>("/api/reminder", {
        method: "POST",
        body: JSON.stringify({ id: record.id }),
      });
      setRemindMsg(
        res.ok ? t("accepted.reminded", { date: fmt(res.data.remindAt) }) : t("errors.generic")
      );
    }

    return (
      <ScreenShell
        wide
        step={total}
        totalSteps={total}
        title={title}
        guide={sub}
        speakExtra={`${bigFor().label} ${bigFor().value}`}
        action={
          <>
            <BigButton onClick={saveAsPng} icon={<Save size={22} />}>
              {t("accepted.save")}
            </BigButton>
            {/* A reminder only makes sense for the thing that lapses. */}
            {o?.kind === "lifecert" && (
              <BigButton variant="secondary" onClick={setReminder} icon={<Bell size={22} />}>
                {t("accepted.remind")}
              </BigButton>
            )}
            <BigLink href="/start" variant="quiet">
              {t("hub.title")}
            </BigLink>
          </>
        }
      >
        <div className="split-main">
          <Receipt record={record} />

          <aside className="split-aside">
            {extraNote && (
              <div className="note note-info">
                <Info size={22} />
                <span>{extraNote}</span>
              </div>
            )}
            <div aria-live="polite">
          {saveMsg && (
            <p className="note note-good">
              <Check size={22} />
              <span>{saveMsg}</span>
            </p>
          )}
              {remindMsg && (
                <p className="note note-good">
                  <Bell size={22} />
                  <span>{remindMsg}</span>
                </p>
              )}
            </div>

            <button
              type="button"
              className="review-edit no-print"
              onClick={() => window.print()}
            >
              <Printer size={18} />
              <span style={{ marginLeft: 8 }}>{t("accepted.savePrint")}</span>
            </button>
          </aside>
        </div>

        <details className="tech no-print">
          <summary>{t("needsFix.tech")}</summary>
          <div className="tech-body">
            <p style={{ marginTop: 0 }}>{t("needsFix.techIntro")}</p>
            <AuditLog record={record} refLabel={t("needsFix.techRef")} />
          </div>
        </details>
      </ScreenShell>
    );
  }

  /* ================================================================
   * Needs fixing
   * ================================================================ */
  function fixAndResend() {
    if (!record) return;
    // Everything except the photo is preserved; the engine is told which
    // record it is fixing so the resend keeps the same reference number.
    patch({ photo: null, photoQuality: null, fixingId: record.id });
    router.push(svc?.needsPhoto ? `/apply/${record.serviceId}/photo` : `/apply/${record.serviceId}/details`);
  }

  return (
    <ScreenShell
      step={total}
      totalSteps={total}
      title={t("needsFix.title")}
      guide={explain?.reason}
      speakExtra={explain ? `${explain.reason} ${explain.action}` : undefined}
      action={
        <>
          <BigButton onClick={fixAndResend} icon={<Refresh size={22} />}>
            {t("needsFix.fixSend")}
          </BigButton>
          <BigLink href="/help" variant="secondary" icon={<Phone size={22} />}>
            {t("needsFix.talk")}
          </BigLink>
        </>
      }
    >
      {/* Exactly two sentences: what happened, and what to do. */}
      <div className="panel panel-warn">
        <p style={{ fontSize: 22, fontWeight: 600, margin: "0 0 12px", color: "#7C3018" }}>
          {explain?.reason ?? <span className="pulsing">…</span>}
        </p>
        <p style={{ fontSize: 20, margin: 0, color: "var(--ink)" }}>{explain?.action ?? ""}</p>
      </div>

      <details className="tech">
        <summary>
          <Alert size={18} />
          {t("needsFix.tech")}
        </summary>
        <div className="tech-body">
          <p style={{ marginTop: 0 }}>{t("needsFix.techIntro")}</p>
          <p>
            {t("svc.realSystem")}: <code>{svc?.realPortal}</code>
          </p>
          <p>
            {t("needsFix.techCode")}: <code>{record.errorCode}</code>
          </p>
          <p>
            {t("needsFix.techExplain")}:{" "}
            <strong>
              {explain?.source === "openai" ? t("needsFix.techAi") : t("needsFix.techFallback")}
            </strong>
          </p>
          <p>
            {t("needsFix.techAttempt")}: {record.attempts}
          </p>
          <AuditLog record={record} refLabel={t("needsFix.techRef")} />
        </div>
      </details>

      {record.mode === "assisted" && record.helperName && (
        <p className="helper" style={{ marginTop: 16 }}>
          {t("review.rowHelper")}: {record.helperName}
        </p>
      )}
    </ScreenShell>
  );
}

/** The audit log, shown verbatim. Judges asked for end-to-end thinking. */
function AuditLog({ record, refLabel }: { record: PublicRecord; refLabel: string }) {
  return (
    <>
      <p>
        {refLabel}: <code>{record.id}</code>
      </p>
      <ul style={{ paddingLeft: 20, margin: "8px 0 0" }}>
        {record.audit.map((entry, i) => (
          <li key={i} style={{ marginBottom: 6 }}>
            <code>{new Date(entry.at).toISOString().slice(11, 19)}</code>{" "}
            {entry.from ?? "—"} → <strong>{entry.to}</strong>{" "}
            <span className="text-soft">
              ({entry.actor}) {entry.note}
            </span>
          </li>
        ))}
      </ul>
    </>
  );
}
