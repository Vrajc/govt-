"use client";

import { use, useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/lib/app-state";
import { apiFetch } from "@/lib/api";
import { ScreenShell } from "@/components/ScreenShell";
import { BigButton, BigLink } from "@/components/BigButton";
import { Field } from "@/components/Field";
import { PhotoCapture } from "@/components/PhotoCapture";
import {
  Alert,
  ArtEyeLevel,
  ArtGlasses,
  ArtWindow,
  Camera,
  Check,
  Chevron,
  Info,
  People,
  Person,
  Refresh,
  Send,
} from "@/components/Icons";
import { serviceById } from "@/lib/services/catalogue";
import {
  evaluateEligibility,
  formatAadhaar,
  inputPropsFor,
  isStep,
  needsOtp,
  nextStep,
  normalise,
  prevStep,
  stepIndex,
  stepsFor,
  validateAll,
  validateField,
  visibleFields,
  type Step,
} from "@/lib/services/engine";
import { coachKey } from "@/lib/imageQuality";
import type { PublicRecord } from "@/lib/publicRecord";
import type { FieldDef, ServiceDef } from "@/lib/services/types";
import type { Mode } from "@/lib/types";

/**
 * One engine, eleven services.
 *
 * The step order, the questions, the documents and the fields all come from
 * the service definition. Nothing in this file knows what a widow pension is.
 */
export default function ApplyScreen({
  params,
}: {
  params: Promise<{ service: string; step: string }>;
}) {
  const { service, step } = use(params);
  const app = useApp();
  const router = useRouter();

  const svc = serviceById(service);

  if (!svc || !isStep(step)) {
    return (
      <ScreenShell step={null} back="/start" title={app.t("errors.notFound")}>
        <BigLink href="/start" variant="secondary">
          {app.t("hub.title")}
        </BigLink>
      </ScreenShell>
    );
  }

  const steps = stepsFor(svc);
  if (!steps.includes(step)) {
    router.replace(`/apply/${svc.id}/${steps[0]}`);
    return null;
  }

  return <Engine svc={svc} step={step} key={`${svc.id}-${step}`} />;
}

/* ================================================================== */

function Engine({ svc, step }: { svc: ServiceDef; step: Step }) {
  const { t, d, app, patch, lang, demoMode } = useApp();
  const router = useRouter();

  const steps = stepsFor(svc);
  const idx = stepIndex(svc, step);
  const back = prevStep(svc, step);
  const backHref = back ? `/apply/${svc.id}/${back}` : `/service/${svc.id}`;

  const go = useCallback(() => {
    const n = nextStep(svc, step);
    router.push(n ? `/apply/${svc.id}/${n}` : `/service/${svc.id}`);
  }, [svc, step, router]);

  /* Keep the draft pinned to this service, so a half-filled widow pension
     never leaks into an old-age pension. */
  useEffect(() => {
    if (app.serviceId !== svc.id) patch({ serviceId: svc.id });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [svc.id]);

  const SVC = d.svc as Record<string, string>;

  /* Names for each step, so a bead means something to a screen reader and
     a completed one can say where going back would take you. */
  const stepName = (st: Step): string =>
    st === "who"
      ? t("who.title")
      : st === "eligibility"
        ? t("elig.title")
        : st === "documents"
          ? t("apply.docsTitle")
          : st === "details"
            ? t("apply.detailsTitle")
            : st === "photo"
              ? t("photo.title")
              : t("review.title");

  /* Steps whose content is a grid or a two-column form get the wider
     sheet on a desktop. "who", "eligibility" and "photo" ask one thing at
     a time and stay narrow at every size. */
  const shell: Shell = {
    step: idx + 1,
    totalSteps: steps.length,
    back: backHref,
    wide: step === "documents" || step === "details",
    crumbs: [
      { label: t("nav.home"), href: "/start" },
      { label: SVC[`${svc.id}Name`], href: `/service/${svc.id}` },
      { label: stepName(step) },
    ],
    stepLabelFor: (n: number) => stepName(steps[n - 1]),
    /* Only completed beads are offered, so nobody skips a question and
       lands on review with nothing filled in. */
    onGoToStep: (n: number) => router.push(`/apply/${svc.id}/${steps[n - 1]}`),
  };


  /* ================================================================
   * 1 — who is this for
   * ================================================================ */
  if (step === "who") {
    function choose(mode: Mode) {
      patch({ mode });
      go();
    }
    return (
      <ScreenShell
        {...shell}
        title={t("who.title")}
        guide={SVC[`${svc.id}Name`]}
        speakExtra={`${t("who.self")}. ${t("who.assisted")}. ${t("who.note")}`}
      >
        <div role="group" aria-label={t("who.title")} className="grid-list">
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

  /* ================================================================
   * 2 — eligibility
   * ================================================================ */
  if (step === "eligibility") {
    return <EligibilityStep svc={svc} shell={shell} onNext={go} />;
  }

  /* ================================================================
   * 3 — documents
   * ================================================================ */
  if (step === "documents") {
    return <DocumentsStep svc={svc} shell={shell} onNext={go} />;
  }

  /* ================================================================
   * 4 — details
   * ================================================================ */
  if (step === "details") {
    return <DetailsStep svc={svc} shell={shell} onNext={go} />;
  }

  /* ================================================================
   * 5 — the face photo
   * ================================================================ */
  if (step === "photo") {
    return <PhotoStep svc={svc} shell={shell} onNext={go} />;
  }

  /* ================================================================
   * 6 — review and send
   * ================================================================ */
  return <ReviewStep svc={svc} shell={shell} />;
}

type Shell = {
  step: number;
  totalSteps: number;
  back: string;
  wide: boolean;
  crumbs: { label: string; href?: string }[];
  stepLabelFor: (n: number) => string;
  onGoToStep: (n: number) => void;
};

/* ==================================================================
 * Eligibility
 * ================================================================== */
function EligibilityStep({
  svc,
  shell,
  onNext,
}: {
  svc: ServiceDef;
  shell: Shell;
  onNext: () => void;
}) {
  const { t, d, app, patch } = useApp();
  const ELIG = d.elig as Record<string, string>;
  const FIELDS = d.fields as Record<string, string>;
  const SVC = d.svc as Record<string, string>;

  const answers = app.eligibility;
  const result = evaluateEligibility(svc, answers);
  const [touched, setTouched] = useState(false);

  function answer(id: string, value: string) {
    patch({ eligibility: { ...answers, [id]: value } });
  }

  /* ---- disqualified: say why, and point somewhere real ---- */
  if (result.failed) {
    const q = result.failed;
    return (
      <ScreenShell
        {...shell}
        title={t("elig.failTitle")}
        guide={t("elig.failGuide")}
        speakExtra={ELIG[q.failKey]}
        action={
          <>
            {q.suggest && (
              <BigLink href={`/service/${q.suggest}`} icon={<Chevron size={22} />}>
                {t("elig.tryOther")}
              </BigLink>
            )}
            <BigLink href="/start" variant="secondary">
              {t("elig.goHome")}
            </BigLink>
            {/* Never a hard block: a rule can be wrong about a real person. */}
            <BigButton variant="quiet" onClick={onNext}>
              {t("elig.carryOn")}
            </BigButton>
          </>
        }
      >
        <div className="note note-warn">
          <Alert size={22} />
          <span style={{ fontSize: 20 }}>{ELIG[q.failKey]}</span>
        </div>

        {q.suggest && (
          <div className="panel panel-good">
            <p className="review-key">{t("elig.tryOther")}</p>
            <p style={{ fontSize: 22, fontWeight: 700, margin: "2px 0 6px" }}>
              {SVC[`${q.suggest}Name`]}
            </p>
            <p className="helper" style={{ fontSize: 18 }}>
              {SVC[`${q.suggest}Short`]}
            </p>
          </div>
        )}

        <p className="helper" style={{ marginTop: 20 }}>
          {t("elig.carryOnNote")}
        </p>
      </ScreenShell>
    );
  }

  const allAnswered = result.complete;

  return (
    <ScreenShell
      {...shell}
      title={t("elig.title")}
      guide={t("elig.guide")}
      speakExtra={svc.eligibility.map((q) => ELIG[`q${cap(q.id)}`] ?? "").join(". ")}
      action={
        <BigButton
          onClick={() => (allAnswered ? onNext() : setTouched(true))}
          disabled={!allAnswered}
          icon={<Chevron size={22} />}
        >
          {t("apply.nextStep")}
        </BigButton>
      }
    >
      {allAnswered && (
        <div className="note note-good">
          <Check size={22} />
          <span>{t("elig.passTitle")}</span>
        </div>
      )}

      {svc.eligibility.map((q) => {
        const label = ELIG[`q${cap(q.id)}`] ?? q.id;
        const help = ELIG[`q${cap(q.id)}Help`] || undefined;
        const value = answers[q.id] ?? "";

        if (q.type === "age") {
          return (
            <Field
              key={q.id}
              label={label}
              help={help}
              error={touched && !value ? t("apply.errRequired") : null}
              value={value}
              inputMode="numeric"
              maxLength={3}
              className="tabular"
              onChange={(e) => answer(q.id, e.target.value.replace(/\D/g, "").slice(0, 3))}
            />
          );
        }

        const options =
          q.type === "yesno"
            ? [
                { value: "yes", labelKey: "yes" },
                { value: "no", labelKey: "no" },
              ]
            : (q.options ?? []);

        return (
          <fieldset key={q.id} style={{ border: "none", padding: 0, margin: "0 0 28px" }}>
            <legend className="field-label" style={{ padding: 0 }}>
              {label}
            </legend>
            {help && <p className="helper" style={{ marginBottom: 10 }}>{help}</p>}
            <div className={q.type === "yesno" ? "btn-row" : "grid-list"}>
              {options.map((o) => {
                const on = value === o.value;
                const text =
                  q.type === "yesno"
                    ? o.value === "yes"
                      ? t("common.yes")
                      : t("common.no")
                    : (FIELDS[o.labelKey] ?? o.labelKey);
                return (
                  <button
                    key={o.value}
                    type="button"
                    className={`btn ${on ? "btn-primary" : "btn-secondary"}`}
                    aria-pressed={on}
                    onClick={() => answer(q.id, o.value)}
                  >
                    {on && <Check size={20} />}
                    <span>{text}</span>
                  </button>
                );
              })}
            </div>
          </fieldset>
        );
      })}
    </ScreenShell>
  );
}

/* ==================================================================
 * Documents — photograph the paper, do not scan it
 * ================================================================== */
function DocumentsStep({
  svc,
  shell,
  onNext,
}: {
  svc: ServiceDef;
  shell: Shell;
  onNext: () => void;
}) {
  const { t, d, app, patch } = useApp();
  const DOCS = d.docs as Record<string, string>;
  const [capturing, setCapturing] = useState<string | null>(null);

  const required = svc.documents.filter((x) => x.required);
  const doneCount = svc.documents.filter((x) => app.docs[x.id]).length;
  const requiredDone = required.every((x) => app.docs[x.id]);

  if (capturing) {
    const doc = svc.documents.find((x) => x.id === capturing);
    return (
      <ScreenShell
        {...shell}
        back={`/apply/${svc.id}/documents`}
        title={DOCS[capturing] ?? capturing}
        guide={DOCS[`${capturing}Hint`]}
      >
        <PhotoCapture
          purpose="document"
          title={DOCS[capturing] ?? capturing}
          onDone={(url) => {
            patch({ docs: { ...app.docs, [capturing]: url } });
            setCapturing(null);
          }}
          onCancel={() => setCapturing(null)}
        />
        {doc && !doc.required && (
          <p className="helper" style={{ marginTop: 16 }}>
            {t("apply.docsOptional")}
          </p>
        )}
      </ScreenShell>
    );
  }

  return (
    <ScreenShell
      {...shell}
      title={t("apply.docsTitle")}
      guide={t("apply.docsGuide")}
      speakExtra={svc.documents.map((x) => DOCS[x.id]).join(". ")}
      action={
        <>
          <BigButton onClick={onNext} icon={<Chevron size={22} />}>
            {requiredDone ? t("apply.nextStep") : t("apply.docsCarryOn")}
          </BigButton>
          {!requiredDone && (
            <p className="helper" style={{ textAlign: "center", marginTop: 12 }}>
              {t("apply.docsLater")}
            </p>
          )}
        </>
      }
    >
      <p className="note note-info">
        <Info size={22} />
        <span>{t("apply.docsCount", { done: doneCount, total: svc.documents.length })}</span>
      </p>

      <div className="grid-list">
        {svc.documents.map((doc) => {
          const shot = app.docs[doc.id];
          return (
            <div className="panel doc-row" key={doc.id}>
              <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
                {shot ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={shot}
                    alt={t("apply.photoOf", { name: DOCS[doc.id] })}
                    style={{
                      width: 56,
                      height: 56,
                      objectFit: "cover",
                      borderRadius: 8,
                      border: "2px solid var(--success)",
                      flexShrink: 0,
                    }}
                  />
                ) : (
                  <span
                    style={{
                      width: 56,
                      height: 56,
                      borderRadius: 8,
                      border: "2px dashed var(--line)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                      color: "var(--ink-soft)",
                    }}
                  >
                    <Camera size={22} />
                  </span>
                )}
                <span>
                  <p className="review-val" style={{ fontSize: 19 }}>
                    {DOCS[doc.id]}
                  </p>
                  <p className="helper" style={{ margin: 0 }}>
                    {shot
                      ? t("apply.docsDone")
                      : doc.required
                        ? t("apply.docsNeeded")
                        : t("apply.docsOptional")}
                    {" · "}
                    {DOCS[`${doc.id}Hint`]}
                  </p>
                </span>
              </div>
              <button
                type="button"
                className="review-edit"
                onClick={() => setCapturing(doc.id)}
              >
                {shot ? t("apply.docsRetake") : t("apply.docsTake")}
              </button>
            </div>
          );
        })}
      </div>
    </ScreenShell>
  );
}

/* ==================================================================
 * Details — the form, plus the one-time code in place
 * ================================================================== */
function DetailsStep({
  svc,
  shell,
  onNext,
}: {
  svc: ServiceDef;
  shell: Shell;
  onNext: () => void;
}) {
  const { t, d, app, patch, lang, demoMode } = useApp();
  const FIELDS = d.fields as Record<string, string>;

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [demoOtp, setDemoOtp] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);

  const wantsOtp = needsOtp(svc);
  const fields = visibleFields(svc, app.values);
  const assisted = app.mode === "assisted";

  /* Keep the catalogue's field order, but collect consecutive fields that
     share a heading. Order stays the service's business, not this file's. */
  const groups: { key: string; items: FieldDef[] }[] = [];
  for (const f of fields) {
    const key = f.group ?? "";
    const last = groups[groups.length - 1];
    if (last && last.key === key) last.items.push(f);
    else groups.push({ key, items: [f] });
  }

  /* Assisted mode has its own wording for the headings that name a person. */
  const GROUPS = d.groups as Record<string, string>;
  const groupLabel = (key: string) =>
    (assisted ? GROUPS[`${key}Assisted`] : undefined) ?? GROUPS[key] ?? "";

  function setValue(f: FieldDef, raw: string) {
    patch({ values: { ...app.values, [f.id]: normalise(f, raw) } });
    if (errors[f.id]) setErrors((e) => ({ ...e, [f.id]: "" }));
  }

  function validate(): boolean {
    const errs = validateAll(svc, app.values, t);
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function sendCode() {
    if (!validate()) return;
    setBusy(true);
    setBanner(null);
    const res = await apiFetch<{ code: string | null; name: string | null }>("/api/otp", {
      method: "POST",
      body: JSON.stringify({
        action: "send",
        mobile: app.values.mobile,
        ppo: app.values.ppo ?? app.values.deceasedPpo,
      }),
    });
    setBusy(false);
    if (!res.ok) {
      setBanner(t("errors.network"));
      return;
    }
    setOtpSent(true);
    setDemoOtp(res.data.code);
    // The mocked PPO lookup fills the name in, if we know it and it is blank.
    if (res.data.name && !app.values.fullName) {
      patch({ values: { ...app.values, fullName: res.data.name } });
    }
  }

  async function verifyAndGo() {
    if (!validate()) return;

    if (!wantsOtp) {
      onNext();
      return;
    }

    const digits = otpCode.replace(/\D/g, "");
    if (digits.length !== 6) {
      setErrors((e) => ({ ...e, otp: t("apply.errDigits", { n: digits.length, want: 6 }) }));
      return;
    }
    setBusy(true);
    const res = await apiFetch<{ verified: boolean }>("/api/otp", {
      method: "POST",
      body: JSON.stringify({ action: "verify", mobile: app.values.mobile, code: digits }),
    });
    setBusy(false);
    if (!res.ok) {
      setErrors((e) => ({ ...e, otp: t("details.errOtpWrong") }));
      return;
    }
    patch({ otpVerified: true });
    onNext();
  }

  return (
    <ScreenShell
      {...shell}
      title={assisted ? t("apply.detailsAssisted") : t("apply.detailsTitle")}
      guide={t("apply.detailsGuide")}
      speakExtra={fields.map((f) => FIELDS[f.labelKey ?? f.id]).join(". ")}
      action={
        !wantsOtp ? (
          <BigButton onClick={verifyAndGo} icon={<Chevron size={22} />}>
            {t("apply.nextStep")}
          </BigButton>
        ) : otpSent ? (
          <BigButton onClick={verifyAndGo} disabled={busy} icon={<Check size={22} />}>
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

      {/* Grouped under quiet headings. Thirteen fields in a row is a wall;
          the same thirteen under four headings is four small asks. */}
      {groups.map(({ key, items }) => (
        <section key={key} className="form-group">
          {key && <h2 className="form-group-title">{groupLabel(key)}</h2>}
          <div className="fields-grid">
      {items.map((f) => {
        const label = FIELDS[f.labelKey ?? f.id] ?? f.id;
        const help = FIELDS[`${f.helpKey ?? f.id}Help`] || undefined;
        const value = app.values[f.id] ?? "";
        const err = errors[f.id] || null;

        if (f.type === "choice") {
          return (
            <fieldset
              key={f.id}
              className="field-wide"
              style={{ border: "none", padding: 0, margin: "0 0 28px" }}
            >
              <legend className="field-label" style={{ padding: 0 }}>
                {label}
              </legend>
              {help && <p className="helper" style={{ marginBottom: 10 }}>{help}</p>}
              <div>
                {(f.options ?? []).map((o) => {
                  const on = value === o.value;
                  return (
                    <button
                      key={o.value}
                      type="button"
                      className={`btn ${on ? "btn-primary" : "btn-secondary"}`}
                      aria-pressed={on}
                      onClick={() => setValue(f, o.value)}
                    >
                      {on && <Check size={20} />}
                      <span>{FIELDS[o.labelKey] ?? o.labelKey}</span>
                    </button>
                  );
                })}
              </div>
              {err && (
                <p className="field-error" role="alert">
                  <Alert size={20} />
                  <span>{err}</span>
                </p>
              )}
            </fieldset>
          );
        }

        return (
          <Field
            key={f.id}
            /* A name or an address needs the whole row; a date does not. */
            wrapClassName={
              ["name", "address"].includes(f.type) ? "field-wide" : undefined
            }
            label={label}
            help={help}
            error={err}
            value={f.type === "aadhaar" ? formatAadhaar(value) : value}
            className={
              ["aadhaar", "mobile", "digits", "account", "money", "uan"].includes(f.type)
                ? "tabular"
                : ""
            }
            {...inputPropsFor(f)}
            onChange={(e) => setValue(f, e.target.value)}
          />
        );
      })}

          </div>
        </section>
      ))}

      {/* The code appears in place. Navigating away and back is where an
          elderly user loses the thread, and it costs a page load on a
          connection that can barely afford one. */}
      {wantsOtp && otpSent && (
        <div style={{ borderTop: "1px solid var(--line)", paddingTop: 24 }}>
          <Field
            label={t("details.otpLabel")}
            help={t("details.otpHelp", { mobile: app.values.mobile ?? "" })}
            error={errors.otp || null}
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
          <button type="button" className="review-edit" onClick={sendCode} disabled={busy}>
            {t("details.otpResend")}
          </button>
        </div>
      )}
    </ScreenShell>
  );
}

/* ==================================================================
 * The face photo
 * ================================================================== */
function PhotoStep({
  svc,
  shell,
  onNext,
}: {
  svc: ServiceDef;
  shell: Shell;
  onNext: () => void;
}) {
  const { t, app, patch } = useApp();
  const [ready, setReady] = useState(false);
  const assisted = app.mode === "assisted";

  if (!ready) {
    const items = [
      { art: <ArtWindow />, text: assisted ? t("photo.check1Assisted") : t("photo.check1") },
      { art: <ArtGlasses />, text: assisted ? t("photo.check2Assisted") : t("photo.check2") },
      { art: <ArtEyeLevel />, text: assisted ? t("photo.check3Assisted") : t("photo.check3") },
    ];
    return (
      <ScreenShell
        {...shell}
        title={assisted ? t("photo.titleAssisted") : t("photo.title")}
        guide={t("photo.guide")}
        speakExtra={items.map((i) => i.text).join(". ")}
        action={
          <BigButton onClick={() => setReady(true)} icon={<Camera size={22} />}>
            {t("photo.ready")}
          </BigButton>
        }
      >
        {app.fixingId && (
          <div className="note note-info">
            <Info size={22} />
            <span>{t("photo.fixBanner")}</span>
          </div>
        )}
        <div className="panel">
          {items.map((item, i) => (
            <div className="checklist-item" key={i}>
              <span className="checklist-art">{item.art}</span>
              <span style={{ fontSize: 20, fontWeight: 600 }}>{item.text}</span>
            </div>
          ))}
        </div>
      </ScreenShell>
    );
  }

  return (
    <ScreenShell
      {...shell}
      title={assisted ? t("photo.titleAssisted") : t("photo.title")}
      guide={assisted ? t("photo.lookAtAssisted") : t("photo.lookAt")}
    >
      <PhotoCapture
        purpose="face"
        title={t("photo.photoAlt")}
        onDone={(url, quality) => {
          patch({ photo: url, photoQuality: quality });
          onNext();
        }}
        onCancel={() => setReady(false)}
      />
    </ScreenShell>
  );
}

/* ==================================================================
 * Review and send
 * ================================================================== */
interface PrecheckResponse {
  ok_photo: boolean;
  issue: string | null;
  localVerdict: string | null;
  source: "openai" | "fallback";
}

type Pre = { s: "idle" } | { s: "run" } | { s: "good" } | { s: "warn"; msg: string };

function ReviewStep({ svc, shell }: { svc: ServiceDef; shell: Shell }) {
  const { t, d, app, patch, lang, ready } = useApp();
  const router = useRouter();
  const FIELDS = d.fields as Record<string, string>;
  const DOCS = d.docs as Record<string, string>;

  const [pre, setPre] = useState<Pre>({ s: "idle" });
  const [sending, setSending] = useState(false);
  const [netErr, setNetErr] = useState<string | null>(null);
  const [helperErr, setHelperErr] = useState<string | null>(null);
  const ranFor = useRef<string | null>(null);

  const assisted = app.mode === "assisted";
  const fields = visibleFields(svc, app.values);
  const missing = ready && Object.keys(validateAll(svc, app.values, t)).length > 0;

  /* ---- Layer 2 of the pre-check: one vision call, on arrival ---- */
  useEffect(() => {
    if (!ready || !svc.needsPhoto || !app.photo) return;
    if (ranFor.current === app.photo) return;
    ranFor.current = app.photo;

    let cancelled = false;
    setPre({ s: "run" });

    void (async () => {
      const res = await apiFetch<PrecheckResponse>("/api/precheck", {
        method: "POST",
        timeoutMs: 12_000,
        body: JSON.stringify({ photo: app.photo, language: lang, quality: app.photoQuality }),
      });
      if (cancelled) return;
      // A failed check is not a failed photo. Say nothing and let them send.
      if (!res.ok || res.data.ok_photo) {
        setPre({ s: "good" });
        return;
      }
      setPre({ s: "warn", msg: res.data.issue ?? t(coachKey(app.photoQuality)) });
    })();

    return () => {
      cancelled = true;
    };
  }, [ready, app.photo, app.photoQuality, lang, svc.needsPhoto, t]);

  async function send() {
    if (assisted && !app.helperName.trim()) {
      setHelperErr(t("details.errName"));
      return;
    }
    setHelperErr(null);
    setNetErr(null);
    setSending(true);

    const flagged = pre.s === "warn";

    /* Resubmitting keeps the same reference number and the same audit trail.
       Both paths reuse the client-generated requestId, so a retry after a
       dropped connection cannot create a second pension record. */
    const res = app.fixingId
      ? await apiFetch<{ record: PublicRecord }>(`/api/resubmit/${app.fixingId}`, {
          method: "POST",
          body: JSON.stringify({ requestId: app.requestId, precheckFlagged: flagged }),
        })
      : await apiFetch<{ record: PublicRecord }>("/api/submit", {
          method: "POST",
          body: JSON.stringify({
            requestId: app.requestId,
            serviceId: svc.id,
            lang,
            mode: app.mode,
            helperName: app.helperName,
            values: app.values,
            docCount: Object.keys(app.docs).length,
            precheckFlagged: flagged,
          }),
        });

    setSending(false);

    if (!res.ok) {
      setNetErr(
        res.error.code === "NETWORK" || res.error.code === "TIMEOUT"
          ? "__network__"
          : res.error.message
      );
      return;
    }

    patch({ fixingId: null });
    router.push(`/status/${res.data.record.id}`);
  }

  if (ready && missing) {
    return (
      <ScreenShell {...shell} title={t("review.missingTitle")} guide={t("review.missingBody")}>
        <BigLink href={`/apply/${svc.id}/details`} variant="secondary">
          {t("review.goBack")}
        </BigLink>
      </ScreenShell>
    );
  }

  return (
    <ScreenShell
      {...shell}
      title={t("review.title")}
      guide={t("review.guide")}
      speakExtra={pre.s === "warn" ? pre.msg : t("review.good")}
      action={
        pre.s === "warn" ? (
          <div className="btn-row">
            <BigButton
              variant="secondary"
              onClick={() => router.push(`/apply/${svc.id}/photo`)}
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
        {svc.needsPhoto && app.photo && (
          <div className="review-row">
            <div>
              <p className="review-key">{t("review.rowPhoto")}</p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={app.photo}
                alt={t("photo.photoAlt")}
                style={{
                  width: 84,
                  height: 112,
                  objectFit: "cover",
                  borderRadius: 10,
                  border: "2px solid var(--line)",
                  marginTop: 6,
                }}
              />
            </div>
            <button
              type="button"
              className="review-edit"
              onClick={() => router.push(`/apply/${svc.id}/photo`)}
            >
              {t("common.edit")}
            </button>
          </div>
        )}

        {fields.map((f) => {
          const raw = app.values[f.id] ?? "";
          const shown =
            f.type === "aadhaar"
              ? `XXXX XXXX ${raw.slice(-4) || "----"}`
              : f.type === "choice"
                ? (FIELDS[f.options?.find((o) => o.value === raw)?.labelKey ?? ""] ?? raw)
                : raw;
          return (
            <div className="review-row" key={f.id}>
              <div>
                <p className="review-key">{FIELDS[f.labelKey ?? f.id]}</p>
                <p className="review-val">{shown || "—"}</p>
              </div>
              <button
                type="button"
                className="review-edit"
                onClick={() => router.push(`/apply/${svc.id}/details`)}
              >
                {t("common.edit")}
              </button>
            </div>
          );
        })}

        {svc.documents.length > 0 && (
          <div className="review-row">
            <div>
              <p className="review-key">{t("apply.reviewDocs")}</p>
              <p className="review-val">
                {Object.keys(app.docs).length > 0
                  ? svc.documents
                      .filter((x) => app.docs[x.id])
                      .map((x) => DOCS[x.id])
                      .join(", ")
                  : t("apply.reviewNoDocs")}
              </p>
            </div>
            <button
              type="button"
              className="review-edit"
              onClick={() => router.push(`/apply/${svc.id}/documents`)}
            >
              {t("common.edit")}
            </button>
          </div>
        )}

        {assisted && app.helperName.trim() && (
          <div className="review-row">
            <div>
              <p className="review-key">{t("review.rowHelper")}</p>
              <p className="review-val">{app.helperName}</p>
            </div>
          </div>
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

      {svc.needsPhoto && (
        <div style={{ marginTop: 24 }} aria-live="polite">
          {pre.s === "run" && (
            <p className="note note-info pulsing" style={{ marginBottom: 0 }}>
              <Info size={22} />
              <span>{t("review.checking")}</span>
            </p>
          )}
          {pre.s === "good" && (
            <p className="note note-good" style={{ marginBottom: 0 }}>
              <Check size={22} />
              <span>{t("review.good")}</span>
            </p>
          )}
          {pre.s === "warn" && (
            <p className="note note-warn" style={{ marginBottom: 0 }}>
              <Alert size={22} />
              <span>{pre.msg}</span>
            </p>
          )}
        </div>
      )}
    </ScreenShell>
  );
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
