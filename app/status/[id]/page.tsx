"use client";

import { use, useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/lib/app-state";
import { apiFetch } from "@/lib/api";
import { ScreenShell } from "@/components/ScreenShell";
import { BigButton } from "@/components/BigButton";
import { Alert, Check, Clock, Info } from "@/components/Icons";
import type { PublicRecord } from "@/lib/publicRecord";

const POLL_MS = 3_000;

/**
 * Screen 6 — we are checking this.
 *
 * The id is in the URL and the state is on the server, so a hard refresh, a
 * closed tab, or an SMS link opened three hours later all land on the same
 * truthful page. That is the whole reason the mock backend is a real
 * backend.
 */
export default function StatusScreen({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { t, demoMode } = useApp();
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
      <ScreenShell step={6} title={t("status.notFound")} guide={t("status.notFoundBody")}>
        <BigButton variant="secondary" onClick={() => router.push("/")}>
          {t("common.startOver")}
        </BigButton>
      </ScreenShell>
    );
  }

  const state = record?.state ?? "SUBMITTED";
  const settled = state === "ACCEPTED" || state === "NEEDS_FIX";

  return (
    <ScreenShell
      step={6}
      title={t("status.title")}
      guide={t("status.lead")}
      speakExtra={`${demoMode ? t("status.waitDemo") : t("status.wait", { mobile: record?.mobile ?? "" })} ${demoMode ? t("status.closeOk", { mobile: record?.mobile ?? "" }) : ""}`}
    >
      <ol className="timeline" aria-live="polite" aria-atomic="false">
        <li className="done">
          <span className="tl-dot done">
            <Check size={18} />
          </span>
          <span>
            <span className="tl-text">{t("status.tlReceived")}</span>
            {record && (
              <span className="tl-sub tabular">
                {new Date(record.createdAt).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            )}
          </span>
        </li>

        <li className={settled ? "done" : ""}>
          <span className={`tl-dot ${settled ? "done" : "now"}`}>
            {settled ? <Check size={18} /> : <Clock size={18} />}
          </span>
          <span>
            <span className={`tl-text ${settled ? "" : "pulsing"}`}>
              {t("status.tlChecking")}
            </span>
            <span className="tl-sub">{t("status.tlWaiting")}</span>
          </span>
        </li>

        <li className={settled ? "done" : ""}>
          <span className={`tl-dot ${settled ? "done" : ""}`}>
            {settled ? <Check size={18} /> : <Info size={18} />}
          </span>
          <span>
            <span className="tl-text">{t("status.tlResult")}</span>
            {settled && (
              <span className="tl-sub">
                {state === "ACCEPTED" ? t("status.tlDoneGood") : t("status.tlDoneFix")}
              </span>
            )}
          </span>
        </li>
      </ol>

      <div className="note note-info" style={{ marginTop: 28 }}>
        <Clock size={22} />
        <span>
          {/* The duration changes in demo mode; the promise that you can walk
              away and still hear back does not. That promise is the point. */}
          {demoMode ? (
            <>
              {t("status.waitDemo")}{" "}
              {t("status.closeOk", { mobile: record?.mobile ?? "" })}
            </>
          ) : (
            t("status.wait", { mobile: record?.mobile ?? "" })
          )}
        </span>
      </div>

      <div className="panel" style={{ marginTop: 8 }}>
        <p className="review-key">{t("status.refLabel")}</p>
        <p className="review-val tabular" style={{ fontSize: 22 }}>
          {id}
        </p>
        <p className="helper">{t("status.refHelp")}</p>
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
