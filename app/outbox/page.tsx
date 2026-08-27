"use client";

import { useEffect, useState } from "react";
import { useApp } from "@/lib/app-state";
import { apiFetch } from "@/lib/api";
import { ScreenShell } from "@/components/ScreenShell";
import { Bell, Message } from "@/components/Icons";
import type { SmsMessage } from "@/lib/types";

interface OutboxResponse {
  messages: SmsMessage[];
  reminders: { id: string; mobile: string; at: string; ppo: string }[];
}

/**
 * /outbox — the mock SMS outbox.
 *
 * Linked only from /about. Nothing here ever leaves the server; the point is
 * that the notification design is reviewable rather than asserted, and that
 * "we send an SMS" is visibly a claim about a mock, not about reality.
 */
export default function OutboxScreen() {
  const { t } = useApp();
  const [data, setData] = useState<OutboxResponse | null>(null);

  useEffect(() => {
    void (async () => {
      const res = await apiFetch<OutboxResponse>("/api/outbox", { method: "GET" });
      if (res.ok) setData({ messages: res.data.messages, reminders: res.data.reminders });
    })();
  }, []);

  const messages = data?.messages ?? [];
  const reminders = data?.reminders ?? [];

  return (
    <ScreenShell step={null} back="/about" title={t("outbox.title")} guide={t("outbox.guide")}>
      {messages.length === 0 && (
        <p className="note note-info">
          <Message size={22} />
          <span>{t("outbox.empty")}</span>
        </p>
      )}

      <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
        {messages.map((m) => (
          <li key={m.id} className="panel" style={{ marginBottom: 16 }}>
            <p className="review-key">
              {t("outbox.to")} <span className="tabular">{m.to}</span> ·{" "}
              <span className="tabular">
                {new Date(m.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
            </p>
            <p style={{ fontSize: 18, margin: "6px 0 0", lineHeight: 1.5 }} lang={m.lang}>
              {m.body}
            </p>
          </li>
        ))}
      </ul>

      {reminders.length > 0 && (
        <>
          <h2 className="section-title">
            <Bell size={20} /> {t("accepted.remind")}
          </h2>
          <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
            {reminders.map((r) => (
              <li key={r.id} className="panel" style={{ marginBottom: 12 }}>
                <p className="review-val tabular" style={{ fontSize: 18 }}>
                  {r.ppo} · {r.mobile}
                </p>
                <p className="helper" style={{ marginTop: 2 }}>
                  {new Date(r.at).toISOString().slice(0, 10)}
                </p>
              </li>
            ))}
          </ul>
        </>
      )}
    </ScreenShell>
  );
}
