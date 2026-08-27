"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useApp } from "@/lib/app-state";
import { apiFetch } from "@/lib/api";
import { ScreenShell } from "@/components/ScreenShell";
import { BigButton } from "@/components/BigButton";
import { Field } from "@/components/Field";
import { Alert, ArrowRight, Check, Info, Send } from "@/components/Icons";

interface OtpSendResponse {
  sent: boolean;
  code: string | null;
  name: string | null;
}

/** `XXXX XXXX XXXX` while typing, digits only underneath. */
function formatAadhaar(digits: string): string {
  return digits.slice(0, 12).replace(/(\d{4})(?=\d)/g, "$1 ").trim();
}

/**
 * Screen 3 — three fields, then a code, all on one screen.
 *
 * The OTP appears in place rather than on its own route: navigating away and
 * back is where elderly users lose the thread, and it costs a page load on a
 * connection that can barely afford one.
 */
export default function DetailsScreen() {
  const { t, d, app, patch, lang, demoMode } = useApp();
  const router = useRouter();

  const assisted = app.mode === "assisted";

  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [demoOtp, setDemoOtp] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [foundName, setFoundName] = useState<string | null>(null);
  const [needsName, setNeedsName] = useState(false);

  const [err, setErr] = useState<Record<string, string | null>>({});
  const [banner, setBanner] = useState<string | null>(null);

  const aadhaarDigits = app.aadhaar;
  const mobileDigits = app.mobile;

  function setError(field: string, message: string | null) {
    setErr((e) => ({ ...e, [field]: message }));
  }

  function validateBeforeSend(): boolean {
    let good = true;
    if (!app.ppo.trim()) {
      setError("ppo", t("details.errPpo"));
      good = false;
    } else setError("ppo", null);

    if (aadhaarDigits.length === 0) {
      setError("aadhaar", t("details.errAadhaarEmpty"));
      good = false;
    } else if (aadhaarDigits.length !== 12) {
      setError("aadhaar", t("details.errAadhaar", { n: aadhaarDigits.length }));
      good = false;
    } else setError("aadhaar", null);

    if (mobileDigits.length === 0) {
      setError("mobile", t("details.errMobileEmpty"));
      good = false;
    } else if (mobileDigits.length !== 10) {
      setError("mobile", t("details.errMobile", { n: mobileDigits.length }));
      good = false;
    } else setError("mobile", null);

    return good;
  }

  async function sendCode() {
    if (!validateBeforeSend()) return;
    setBusy(true);
    setBanner(null);

    const res = await apiFetch<OtpSendResponse>("/api/otp", {
      method: "POST",
      body: JSON.stringify({ action: "send", mobile: mobileDigits, ppo: app.ppo }),
    });

    setBusy(false);
    if (!res.ok) {
      setBanner(t("errors.network"));
      return;
    }

    setOtpSent(true);
    setDemoOtp(res.data.code);
    if (res.data.name) {
      setFoundName(res.data.name);
      patch({ name: res.data.name });
      setNeedsName(false);
    } else {
      setFoundName(null);
      setNeedsName(true);
    }
  }

  async function verify() {
    const digits = otpCode.replace(/\D/g, "");
    if (digits.length !== 6) {
      setError("otp", t("details.errOtp", { n: digits.length }));
      return;
    }
    setError("otp", null);

    if (needsName && !app.name.trim()) {
      setError("name", t("details.errName"));
      return;
    }
    setError("name", null);

    setBusy(true);
    const res = await apiFetch<{ verified: boolean }>("/api/otp", {
      method: "POST",
      body: JSON.stringify({ action: "verify", mobile: mobileDigits, code: digits }),
    });
    setBusy(false);

    if (!res.ok) {
      setError("otp", res.error.code === "NETWORK" ? t("errors.network") : t("details.errOtpWrong"));
      return;
    }

    patch({ otpVerified: true });
    router.push("/photo");
  }

  return (
    <ScreenShell
      step={3}
      back="/who"
      title={assisted ? t("details.titleAssisted") : t("details.title")}
      guide={assisted ? t("details.guideAssisted") : t("details.guide")}
      speakExtra={`${d.details.ppoLabel}. ${d.details.aadhaarLabel}. ${d.details.mobileLabel}.`}
      action={
        otpSent ? (
          <BigButton onClick={verify} disabled={busy} icon={<Check size={22} />}>
            {busy ? t("details.otpChecking") : t("details.otpCheck")}
          </BigButton>
        ) : (
          <BigButton onClick={sendCode} disabled={busy} icon={<Send size={22} />}>
            {busy ? t("details.sending") : t("details.sendCode")}
          </BigButton>
        )
      }
    >
      {banner && (
        <div className="note note-warn" role="alert">
          <Alert size={22} />
          <span>{banner}</span>
        </div>
      )}

      <Field
        label={t("details.ppoLabel")}
        help={t("details.ppoHelp")}
        error={err.ppo}
        value={app.ppo}
        placeholder={t("details.ppoPlaceholder")}
        autoComplete="off"
        autoCapitalize="characters"
        spellCheck={false}
        onChange={(e) => patch({ ppo: e.target.value.toUpperCase() })}
      />

      <Field
        label={t("details.aadhaarLabel")}
        help={t("details.aadhaarHelp")}
        error={err.aadhaar}
        className="tabular"
        value={formatAadhaar(aadhaarDigits)}
        inputMode="numeric"
        autoComplete="off"
        maxLength={14}
        placeholder="0000 0000 0000"
        onChange={(e) => patch({ aadhaar: e.target.value.replace(/\D/g, "").slice(0, 12) })}
      />

      <Field
        label={t("details.mobileLabel")}
        help={assisted ? t("details.mobileHelpAssisted") : t("details.mobileHelp")}
        error={err.mobile}
        className="tabular"
        value={mobileDigits}
        inputMode="numeric"
        autoComplete="tel-national"
        maxLength={10}
        placeholder="00000 00000"
        onChange={(e) => patch({ mobile: e.target.value.replace(/\D/g, "").slice(0, 10) })}
      />

      {/* ---- everything below appears in place, without navigating ---- */}
      {otpSent && (
        <div style={{ borderTop: "1px solid var(--line)", paddingTop: 24 }}>
          {foundName && (
            <div className="note note-good">
              <Check size={22} />
              <span>{t("details.foundName", { name: foundName })}</span>
            </div>
          )}

          {needsName && (
            <>
              <div className="note note-info">
                <Info size={22} />
                <span>{t("details.notFound")}</span>
              </div>
              <Field
                label={t("details.nameLabel")}
                help={t("details.nameHelp")}
                error={err.name}
                value={app.name}
                autoComplete="name"
                onChange={(e) => patch({ name: e.target.value })}
              />
            </>
          )}

          <Field
            label={t("details.otpLabel")}
            help={t("details.otpHelp", { mobile: mobileDigits })}
            error={err.otp}
            className="tabular"
            value={otpCode}
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            placeholder="000000"
            onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
          />

          {demoMode && demoOtp && (
            <div className="note note-info">
              <Info size={22} />
              <span>{t("details.otpDemo", { code: demoOtp })}</span>
            </div>
          )}

          <button
            type="button"
            className="review-edit"
            onClick={sendCode}
            disabled={busy}
            style={{ marginTop: 4 }}
          >
            {t("details.otpResend")}
          </button>
        </div>
      )}

      {!otpSent && (
        <p className="helper" style={{ marginTop: -8, display: "flex", gap: 8 }}>
          <ArrowRight size={18} />
          <span lang={lang}>{t("details.mobileHelp")}</span>
        </p>
      )}
    </ScreenShell>
  );
}
