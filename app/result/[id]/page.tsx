"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/lib/app-state";
import { apiFetch } from "@/lib/api";
import { ScreenShell } from "@/components/ScreenShell";
import { BigButton, BigLink } from "@/components/BigButton";
import { Receipt } from "@/components/Receipt";
import { Alert, Bell, Check, Phone, Printer, Refresh, Save } from "@/components/Icons";
import { drawReceipt, downloadCanvas } from "@/lib/receiptCanvas";
import type { PublicRecord } from "@/lib/publicRecord";

interface ExplainResponse {
  reason: string;
  action: string;
  source: "openai" | "fallback";
  keyPresent: boolean;
}

export default function ResultScreen({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { t, lang, app, patch } = useApp();
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
      <ScreenShell step={6} title={t("status.notFound")} guide={t("status.notFoundBody")}>
        <BigButton variant="secondary" onClick={() => router.push("/")}>
          {t("common.startOver")}
        </BigButton>
      </ScreenShell>
    );
  }

  if (!record) {
    return (
      <ScreenShell step={6} title={t("common.loading")}>
        <p className="pulsing text-soft">…</p>
      </ScreenShell>
    );
  }

  /* ================================================================
   * 7a — accepted
   * ================================================================ */
  if (record.state === "ACCEPTED") {
    const year = record.validUntil ? new Date(record.validUntil).getUTCFullYear() : "";

    const locale = lang === "hi" ? "hi-IN" : lang === "gu" ? "gu-IN" : "en-IN";
    const fmt = (iso: string, withTime = false) =>
      new Intl.DateTimeFormat(locale, {
        day: "numeric",
        month: "long",
        year: "numeric",
        ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
        ...(withTime ? {} : { timeZone: "UTC" }),
      }).format(new Date(iso));

    function saveAsPng() {
      if (!record) return;
      const canvas = drawReceipt(
        record,
        lang,
        {
          head: t("accepted.receiptHead"),
          ppoLabel: t("accepted.receiptPpo"),
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
          valid: record.validUntil ? fmt(record.validUntil) : "—",
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
      if (res.ok) {
        setRemindMsg(t("accepted.reminded", { date: fmt(res.data.remindAt) }));
      } else {
        setRemindMsg(t("errors.generic"));
      }
    }

    return (
      <ScreenShell
        step={6}
        title={t("accepted.title")}
        guide={t("accepted.sub", { year: String(year) })}
        speakExtra={`${t("accepted.safeUntil")} ${record.validUntil ? fmt(record.validUntil) : ""}`}
        action={
          <>
            <BigButton onClick={saveAsPng} icon={<Save size={22} />}>
              {t("accepted.save")}
            </BigButton>
            <BigButton variant="secondary" onClick={setReminder} icon={<Bell size={22} />}>
              {t("accepted.remind")}
            </BigButton>
          </>
        }
      >
        <Receipt record={record} />

        <div aria-live="polite" style={{ marginTop: 20 }}>
          {saveMsg && (
            <p className="note note-good" style={{ marginBottom: 12 }}>
              <Check size={22} />
              <span>{saveMsg}</span>
            </p>
          )}
          {remindMsg && (
            <p className="note note-good" style={{ marginBottom: 12 }}>
              <Bell size={22} />
              <span>{remindMsg}</span>
            </p>
          )}
        </div>

        <button
          type="button"
          className="review-edit no-print"
          onClick={() => window.print()}
          style={{ marginTop: 4 }}
        >
          <Printer size={18} />
          <span style={{ marginLeft: 8 }}>{t("accepted.savePrint")}</span>
        </button>

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
   * 7b — needs fixing
   * ================================================================ */
  function fixAndResend() {
    // Everything except the photo is preserved; the photo screen is told
    // which record it is fixing so the resend keeps the same reference.
    patch({ photo: null, photoQuality: null, fixingId: record!.id });
    router.push(`/photo?fix=${record!.id}`);
  }

  return (
    <ScreenShell
      step={6}
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
      <div className="panel panel-warn">
        {/* Exactly two sentences: what happened, and what to do. */}
        <p style={{ fontSize: 22, fontWeight: 600, margin: "0 0 12px", color: "#7C3018" }}>
          {explain?.reason ?? <span className="pulsing">…</span>}
        </p>
        <p style={{ fontSize: 20, margin: 0, color: "var(--ink)" }}>
          {explain?.action ?? ""}
        </p>
      </div>

      <details className="tech">
        <summary>
          <Alert size={18} />
          {t("needsFix.tech")}
        </summary>
        <div className="tech-body">
          <p style={{ marginTop: 0 }}>{t("needsFix.techIntro")}</p>
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

      {app.mode === "assisted" && app.helperName && (
        <p className="helper" style={{ marginTop: 16 }}>
          {t("review.rowHelper")}: {app.helperName}
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
