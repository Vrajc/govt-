"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/lib/app-state";
import { ScreenShell } from "@/components/ScreenShell";
import { BigButton, BigLink } from "@/components/BigButton";
import { Check, Chevron, Clock, Info } from "@/components/Icons";
import { serviceById } from "@/lib/services/catalogue";
import { dlcWindow } from "@/lib/dlcWindow";
import { localeOf } from "@/lib/i18n/util";

/**
 * The service page. Everything a person needs to decide whether to start,
 * before they start: who it is for, how much, who decides, how long, and
 * what to have ready.
 *
 * It also names the real government system and the real form. Nobody should
 * be able to mistake this for the thing itself, and anyone who wants the
 * official route should be able to leave here and go and find it.
 */
export default function ServiceScreen({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { t, d, lang, patch, resetApp } = useApp();
  const router = useRouter();

  const svc = serviceById(id);
  if (!svc) {
    return (
      <ScreenShell step={null} back="/start" title={t("errors.notFound")}>
        <BigLink href="/start" variant="secondary">
          {t("hub.title")}
        </BigLink>
      </ScreenShell>
    );
  }

  const SVC = d.svc as Record<string, string>;
  const DOCS = d.docs as Record<string, string>;
  const STAGES = d.stages as Record<string, string>;

  const name = SVC[`${svc.id}Name`];
  const first = svc.eligibility.length > 0 ? "eligibility" : svc.documents.length > 0 ? "documents" : "details";

  /* Shown for the life certificate only. Dated from the ordinary window; the
     note itself carries the sentence about the 80+ head start, because we do
     not know the reader's age on this screen. */
  const dlc = dlcWindow();
  const windowDate = (dt: Date) =>
    new Intl.DateTimeFormat(localeOf(lang), {
      day: "numeric",
      month: "long",
      timeZone: "UTC",
    }).format(dt);

  function begin() {
    resetApp();
    patch({ serviceId: svc!.id });
    router.push(`/apply/${svc!.id}/who`);
  }

  return (
    <ScreenShell
      wide
      step={null}
      back={`/start/${svc.category}`}
      crumbs={[
        { label: t("nav.home"), href: "/start" },
        {
          label: (d.hub as Record<string, string>)[
            svc.category === "start" ? "catStart" : svc.category === "have" ? "catHave" : "catFamily"
          ],
          href: `/start/${svc.category}`,
        },
        { label: name },
      ]}
      title={name}
      guide={SVC[`${svc.id}Short`]}
      speakExtra={`${SVC[`${svc.id}Who`]}. ${SVC[`${svc.id}What`]}`}
      action={
        <>
          <BigButton onClick={begin} icon={<Chevron size={22} />}>
            {t("svc.startThis")}
          </BigButton>
          <BigLink href="/start" variant="secondary">
            {t("svc.notRight")}
          </BigLink>
        </>
      }
    >
      {/* On a phone this is one column, in this order. On a desktop the
          facts move alongside and stay put while the rest scrolls. */}
      <div className="split-main">
        <div>
          <p className="body" style={{ color: "var(--ink)" }}>
            {SVC[`${svc.id}What`]}
          </p>

          {svc.documents.length > 0 && (
            <>
              <h2 className="section-title">{t("svc.whatYouNeed")}</h2>
              <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
            {svc.documents.map((doc) => (
              <li
                key={doc.id}
                style={{
                  display: "flex",
                  gap: 12,
                  alignItems: "flex-start",
                  padding: "12px 0",
                  borderBottom: "1px solid var(--line)",
                }}
              >
                <Check size={22} className="text-soft" />
                <span>
                  <span style={{ fontSize: "var(--fs-md)", fontWeight: 600, display: "block" }}>
                    {DOCS[doc.id]}
                    {!doc.required && (
                      <span className="helper" style={{ display: "inline", marginLeft: 8 }}>
                        · {t("apply.docsOptional")}
                      </span>
                    )}
                  </span>
                  <span className="helper">{DOCS[`${doc.id}Hint`]}</span>
                </span>
              </li>
            ))}
          </ul>
        </>
      )}

          <h2 className="section-title">{t("svc.steps")}</h2>
          <ol className="timeline">
            {svc.stages.map((stage, i) => (
              <li key={stage.id}>
                <span className="tl-dot">
                  <span style={{ fontSize: 13, fontWeight: 700 }}>{i + 1}</span>
                </span>
                <span>
                  <span className="tl-text">{STAGES[stage.id]}</span>
                  <span className="tl-sub">
                    {STAGES[`actor${cap(stage.actor)}`] ?? STAGES.actorSystem}
                  </span>
                </span>
              </li>
            ))}
          </ol>
        </div>

        <aside className="split-aside">
          <div className="panel" style={{ padding: "4px 20px" }}>
            <Row k={t("svc.whoFor")} v={SVC[`${svc.id}Who`]} />
            <Row k={t("svc.howMuch")} v={SVC[`${svc.id}Amount`]} />
            <Row k={t("svc.whoDecides")} v={SVC[svc.authorityKey]} />
            <Row
              k={t("svc.howLong")}
              v={
                svc.typicalDays <= 1
                  ? t("svc.dayOne")
                  : t("svc.daysAbout", { n: svc.typicalDays })
              }
            />
          </div>
        </aside>
      </div>

      {/* The life certificate is the one service with a deadline, and missing
          it is the commonest way a pension stops. It belongs here, before the
          journey — not in the receipt at the end, which is where every real
          portal mentions it. */}
      {svc.id === "lifecert" && (
        <div
          className={`note ${dlc.state === "open" ? "note-good" : "note-warn"}`}
          style={{ marginTop: 28 }}
        >
          <Clock size={22} />
          <span>
            {dlc.state === "open"
              ? t("svc.dlcWindowOpen", { date: windowDate(dlc.closesOn), n: dlc.days })
              : dlc.state === "opensSoon"
                ? t("svc.dlcWindowSoon", { date: windowDate(dlc.opensOn), n: dlc.days })
                : t("svc.dlcWindowClosed", { date: windowDate(dlc.opensOn) })}{" "}
            {t("svc.dlcWindowEarly")}
          </span>
        </div>
      )}

      {/* Honesty, on every service page and not only on /about. */}
      <div className="note note-info" style={{ marginTop: 28 }}>
        <Info size={22} />
        <span>
          {t("svc.realSystem")} <strong>{svc.realPortal}</strong>
          {svc.realForm ? (
            <>
              {" · "}
              {t("svc.realFormIs")} <strong>{svc.realForm}</strong>
            </>
          ) : null}
          .
        </span>
      </div>

      <p className="helper" style={{ display: "flex", gap: 8, marginTop: 16 }}>
        <Clock size={18} />
        <span>{first === "eligibility" ? t("elig.guide") : t("apply.detailsGuide")}</span>
      </p>
    </ScreenShell>
  );
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="review-row">
      <div>
        <p className="review-key">{k}</p>
        <p className="review-val" style={{ fontWeight: 500 }}>
          {v}
        </p>
      </div>
    </div>
  );
}
