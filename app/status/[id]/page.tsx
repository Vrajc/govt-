"use client";

import { use, useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/lib/app-state";
import { apiFetch } from "@/lib/api";
import { ScreenShell } from "@/components/ScreenShell";
import { BigButton, BigLink } from "@/components/BigButton";
import { Alert, Check, Clock, Info } from "@/components/Icons";
import { serviceById } from "@/lib/services/catalogue";
import { stepsFor } from "@/lib/services/engine";
import type { PublicRecord } from "@/lib/publicRecord";

const POLL_MS = 3_000;

/**
 * We are checking this.
 *
 * The id is in the URL and the state is on the server, so a hard refresh, a
 * closed tab, or a link opened three hours later all land on the same
 * truthful page.
 *
 * And it is not one opaque wait: the timeline walks the service's real
 * approval chain, naming who is holding the file right now. A citizen who
 * can see that their application is sitting at the Taluka office knows who
 * to ring. That is the silence this whole app exists to end.
 */
export default function StatusScreen({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { t, d, demoMode } = useApp();
  const router = useRouter();

  const [record, setRecord] = useState<PublicRecord | null>(null);
  const [gone, setGone] = useState(false);
  const [announced, setAnnounced] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const poll = useCallback(async () => {
    const res = await apiFetch<{ record: PublicRecord }>(`/api/status/${id}`, { method: "GET" });
    if (!res.ok) {
      // A network blip must not wipe a status we already have.
      if (res.error.code === "NOT_FOUND") setGone(true);
      return null;
    }
    setRecord(res.data.record);
    return res.data.record;
  }, [id]);

  useEffect(() => {
    let stopped = false;

    async function loop() {
      const rec = await poll();
      if (stopped) return;

      if (rec && (rec.state === "ACCEPTED" || rec.state === "NEEDS_FIX")) {
        setAnnounced(t("status.announceDone"));
        // A beat, so the timeline visibly completes before the screen changes.
        timer.current = setTimeout(() => router.replace(`/result/${id}`), 900);
        return;
      }

      setAnnounced(t("status.announceChecking"));
      timer.current = setTimeout(loop, POLL_MS);
    }

    void loop();
    return () => {
      stopped = true;
      if (timer.current) clearTimeout(timer.current);
    };
  }, [poll, router, id, t]);

  if (gone) {
    return (
      <ScreenShell
        back="/start"
        crumbs={[{ label: t("nav.home"), href: "/start" }]}
        title={t("status.notFound")}
        guide={t("status.notFoundBody")}
      >
        <BigLink href="/start" variant="secondary">
          {t("common.startOver")}
        </BigLink>
      </ScreenShell>
    );
  }

  const STAGES = d.stages as Record<string, string>;
  const SVC = d.svc as Record<string, string>;

  const svc = record ? serviceById(record.serviceId) : null;
  const total = svc ? stepsFor(svc).length : 6;
  const stages = record?.stages ?? [];
  const at = record?.stageIndex ?? 0;
  const settled = record?.state === "ACCEPTED" || record?.state === "NEEDS_FIX";

  const waitLine = demoMode
    ? `${t("status.waitDemo")} ${t("status.closeOk", { mobile: record?.mobile ?? "" })}`
    : svc && svc.typicalDays > 1
      ? `${t("svc.daysAbout", { n: svc.typicalDays })}. ${t("status.closeOk", { mobile: record?.mobile ?? "" })}`
      : t("status.wait", { mobile: record?.mobile ?? "" });

  return (
    <ScreenShell
      wide
      step={total}
      totalSteps={total}
      back="/start"
      crumbs={[
        { label: t("nav.home"), href: "/start" },
        ...(record ? [{ label: SVC[`${record.serviceId}Name`], href: `/service/${record.serviceId}` }] : []),
        { label: t("status.title") },
      ]}
      title={t("status.title")}
      guide={record ? SVC[`${record.serviceId}Name`] : t("status.lead")}
      speakExtra={waitLine}
    >
      <div className="split-main">
        <div>
      <p className="body" style={{ color: "var(--ink)", fontWeight: 500 }}>
        {t("status.lead")}
      </p>

      <ol className="timeline" aria-live="polite" aria-atomic="false">
        {stages.map((stage, i) => {
          const done = i < at || (settled && record?.state === "ACCEPTED");
          const now = !settled && i === at;
          return (
            <li key={stage.id} className={done ? "done" : ""}>
              <span className={`tl-dot ${done ? "done" : now ? "now" : ""}`}>
                {done ? <Check size={18} /> : now ? <Clock size={18} /> : <Info size={18} />}
              </span>
              <span>
                <span className={`tl-text ${now ? "pulsing" : ""}`}>{STAGES[stage.id]}</span>
                <span className="tl-sub">
                  {STAGES[`actor${cap(stage.actor)}`] ?? STAGES.actorSystem}
                  {now ? ` · ${STAGES.waitingHere}` : ""}
                </span>
              </span>
            </li>
          );
        })}
      </ol>

        </div>

        <aside className="split-aside">
          <div className="note note-info">
            <Clock size={22} />
            <span>{waitLine}</span>
          </div>

          <div className="panel">
            <p className="review-key">{t("status.refLabel")}</p>
            <p className="review-val tabular" style={{ fontSize: "var(--fs-lg)" }}>
              {id}
            </p>
            <p className="helper">{t("status.refHelp")}</p>
          </div>
        </aside>
      </div>

      {/* Announced to screen readers without moving anything on screen. */}
      <p className="sr-only" role="status" aria-live="polite">
        {announced}
      </p>

      {record && record.attempts > 1 && (
        <p className="helper" style={{ marginTop: 16, display: "flex", gap: 8 }}>
          <Alert size={18} />
          <span>
            {t("needsFix.techAttempt")} {record.attempts}
          </span>
        </p>
      )}
    </ScreenShell>
  );
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
