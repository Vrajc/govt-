"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useApp } from "@/lib/app-state";
import { apiFetch } from "@/lib/api";
import { ScreenShell } from "@/components/ScreenShell";
import { BigButton } from "@/components/BigButton";
import { Field } from "@/components/Field";
import { Alert, Check, Info, Refresh, Send } from "@/components/Icons";
import { coachKey } from "@/lib/imageQuality";
import type { PublicRecord } from "@/lib/publicRecord";

interface PrecheckResponse {
  ok_photo: boolean;
  issue: string | null;
  localVerdict: string | null;
  source: "openai" | "fallback";
}

type Precheck =
  | { status: "idle" }
  | { status: "running" }
  | { status: "good" }
  | { status: "flagged"; message: string };

/**
 * Screen 5 — check and send.
 *
 * Shows exactly what is going, nothing more, with an Edit link on every row
 * that preserves the rest. The pre-check result is one line above the button
 * and never blocks: "Send anyway" is always there, because a model that is
 * wrong about a photo must not be able to stop a pension.
 */
export default function ReviewScreen() {
  const { t, app, patch, lang, ready } = useApp();
  const router = useRouter();
  const assisted = app.mode === "assisted";

  const [pre, setPre] = useState<Precheck>({ status: "idle" });
  const [sending, setSending] = useState(false);
  const [netErr, setNetErr] = useState<string | null>(null);
  const [helperErr, setHelperErr] = useState<string | null>(null);
  const ranFor = useRef<string | null>(null);

  const missing = ready && (!app.photo || !app.ppo || !app.name || app.aadhaar.length !== 12);

  /* ---- Layer 2 of the pre-check: one vision call, on arrival ---- */
  useEffect(() => {
    if (!ready || !app.photo) return;
    // One call per photo, not one per render.
    if (ranFor.current === app.photo) return;
    ranFor.current = app.photo;

    let cancelled = false;
    setPre({ status: "running" });

    void (async () => {
      const res = await apiFetch<PrecheckResponse>("/api/precheck", {
        method: "POST",
        timeoutMs: 12_000,
        body: JSON.stringify({ photo: app.photo, language: lang, quality: app.photoQuality }),
      });
      if (cancelled) return;

      if (!res.ok) {
        // A failed check is not a failed photo. Say nothing and let them send.
        setPre({ status: "good" });
        return;
      }

      if (res.data.ok_photo) {
        setPre({ status: "good" });
        return;
      }

      // Prefer the model's sentence; fall back to the coaching line that
      // layer 1 was already showing at the camera.
      const message =
        res.data.issue ??
        t(coachKey(app.photoQuality)) ??
        t("photo.coachDark");
      setPre({ status: "flagged", message });
    })();

    return () => {
      cancelled = true;
    };
  }, [ready, app.photo, app.photoQuality, lang, t]);

  async function send() {
    if (assisted && !app.helperName.trim()) {
      setHelperErr(t("details.errName"));
      return;
    }
    setHelperErr(null);
    setNetErr(null);
    setSending(true);

    const flagged = pre.status === "flagged";

    /* Resubmitting an existing record keeps the same reference number and
       the same audit trail. A new one gets a fresh record. Both reuse the
       client-generated requestId, so a retry after a dropped connection
       cannot create a second pension record. */
    const res = app.fixingId
      ? await apiFetch<{ record: PublicRecord }>(`/api/resubmit/${app.fixingId}`, {
          method: "POST",
          body: JSON.stringify({ requestId: app.requestId, precheckFlagged: flagged }),
        })
      : await apiFetch<{ record: PublicRecord }>("/api/submit", {
          method: "POST",
          body: JSON.stringify({
            requestId: app.requestId,
            lang,
            mode: app.mode,
            name: app.name,
            helperName: app.helperName,
            ppo: app.ppo,
            aadhaar: app.aadhaar,
            mobile: app.mobile,
            precheckFlagged: flagged,
          }),
        });

    setSending(false);

    if (!res.ok) {
      setNetErr(res.error.code === "NETWORK" || res.error.code === "TIMEOUT" ? null : res.error.message);
      if (res.error.code === "NETWORK" || res.error.code === "TIMEOUT") setNetErr("__network__");
      return;
    }

    patch({ fixingId: null });
    router.push(`/status/${res.data.record.id}`);
  }

  if (ready && missing) {
    return (
      <ScreenShell step={5} back="/photo" title={t("review.missingTitle")} guide={t("review.missingBody")}>
        <BigButton onClick={() => router.push("/details")} variant="secondary">
          {t("review.goBack")}
        </BigButton>
      </ScreenShell>
    );
  }

  const maskedAadhaar = `XXXX XXXX ${app.aadhaar.slice(-4) || "----"}`;

  return (
    <ScreenShell
      step={5}
      back="/photo"
      title={t("review.title")}
      guide={t("review.guide")}
      speakExtra={pre.status === "flagged" ? pre.message : t("review.good")}
      action={
        pre.status === "flagged" ? (
          <div className="btn-row">
            <BigButton
              variant="secondary"
              onClick={() => router.push("/photo")}
              icon={<Refresh size={22} />}
            >
              {t("photo.retake")}
            </BigButton>
            <BigButton onClick={send} disabled={sending} icon={<Send size={22} />}>
              {sending ? t("review.sendingNow") : t("review.sendAnyway")}
            </BigButton>
          </div>
        ) : (
          <BigButton onClick={send} disabled={sending} icon={<Send size={22} />}>
            {sending ? t("review.sendingNow") : t("review.send")}
          </BigButton>
        )
      }
    >
      {netErr === "__network__" && (
        <div className="note note-warn" role="alert">
          <Alert size={22} />
          <span>
            <strong style={{ display: "block", marginBottom: 4 }}>{t("review.netTitle")}</strong>
            {t("review.netBody")}
          </span>
        </div>
      )}
      {netErr && netErr !== "__network__" && (
        <div className="note note-warn" role="alert">
          <Alert size={22} />
          <span>{netErr}</span>
        </div>
      )}

      <div className="panel" style={{ padding: "4px 20px" }}>
        <div className="review-row">
          <div>
            <p className="review-key">{t("review.rowPhoto")}</p>
            {app.photo && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={app.photo}
                alt={t("photo.photoAlt")}
                width={84}
                height={112}
                style={{
                  width: 84,
                  height: 112,
                  objectFit: "cover",
                  borderRadius: 10,
                  border: "2px solid var(--line)",
                  marginTop: 6,
                }}
              />
            )}
          </div>
          <Link href="/photo" className="review-edit">
            {t("common.edit")}
          </Link>
        </div>

        <Row label={t("review.rowName")} value={app.name} href="/details" edit={t("common.edit")} />
        <Row label={t("review.rowPpo")} value={app.ppo} href="/details" edit={t("common.edit")} />
        <Row
          label={t("review.rowAadhaar")}
          value={maskedAadhaar}
          href="/details"
          edit={t("common.edit")}
        />
        <Row label={t("review.rowMobile")} value={app.mobile} href="/details" edit={t("common.edit")} />
        {assisted && app.helperName.trim() && (
          <Row label={t("review.rowHelper")} value={app.helperName} />
        )}
      </div>

      {assisted && (
        <div style={{ marginTop: 24 }}>
          <Field
            label={t("review.helperLabel")}
            help={t("review.helperHelp")}
            error={helperErr}
            value={app.helperName}
            autoComplete="name"
            onChange={(e) => patch({ helperName: e.target.value })}
          />
        </div>
      )}

      {/* ---- one line of pre-check result, above the button ---- */}
      <div style={{ marginTop: 24 }} aria-live="polite">
        {pre.status === "running" && (
          <p className="note note-info pulsing" style={{ marginBottom: 0 }}>
            <Info size={22} />
            <span>{t("review.checking")}</span>
          </p>
        )}
        {pre.status === "good" && (
          <p className="note note-good" style={{ marginBottom: 0 }}>
            <Check size={22} />
            <span>{t("review.good")}</span>
          </p>
        )}
        {pre.status === "flagged" && (
          <p className="note note-warn" style={{ marginBottom: 0 }}>
            <Alert size={22} />
            <span>{pre.message}</span>
          </p>
        )}
      </div>
    </ScreenShell>
  );
}

function Row({
  label,
  value,
  href,
  edit,
}: {
  label: string;
  value: string;
  href?: string;
  edit?: string;
}) {
  return (
    <div className="review-row">
      <div>
        <p className="review-key">{label}</p>
        <p className="review-val">{value || "—"}</p>
      </div>
      {href && edit && (
        <Link href={href} className="review-edit">
          {edit}
        </Link>
      )}
    </div>
  );
}
