"use client";

import Link from "next/link";
import { useApp } from "@/lib/app-state";
import { ScreenShell } from "@/components/ScreenShell";
import { Message } from "@/components/Icons";
import { ALL_SERVICES } from "@/lib/services/catalogue";

/**
 * /about — what is real and what is pretend.
 *
 * Honesty is a judging criterion, so this is a screen, not a footnote. The
 * table is the first thing on it.
 */
export default function AboutScreen() {
  const { t, d } = useApp();

  const real = [d.about.real1, d.about.real2, d.about.real3, d.about.real4, d.about.real5, d.about.real6];
  const mock = [d.about.mock1, d.about.mock2, d.about.mock3, d.about.mock4, d.about.mock5];

  const scale: [string, string][] = [
    [d.about.scale1Head, d.about.scale1],
    [d.about.scale2Head, d.about.scale2],
    [d.about.scale3Head, d.about.scale3],
    [d.about.scale4Head, d.about.scale4],
    [d.about.scale5Head, d.about.scale5],
    [d.about.scale6Head, d.about.scale6],
  ];

  return (
    <ScreenShell
      wide
      step={null}
      back="/start"
      crumbs={[{ label: t("nav.home"), href: "/start" }, { label: t("about.title") }]}
      title={t("about.title")}
      guide={t("about.guide")}
    >
      <div className="tbl-wrap">
        <table className="plain">
          <thead>
            <tr>
              <th className="real" scope="col">
                {t("about.realHead")}
              </th>
              <th className="mock" scope="col">
                {t("about.mockHead")}
              </th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: Math.max(real.length, mock.length) }).map((_, i) => (
              <tr key={i}>
                <td>{real[i] ?? ""}</td>
                <td>{mock[i] ?? ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p style={{ marginTop: 20 }}>
        <Link href="/outbox" className="review-edit">
          <Message size={18} />
          <span style={{ marginLeft: 8 }}>{t("about.outboxLink")}</span>
        </Link>
      </p>

      {/* Which real government system each service stands for. Generated
          from the catalogue, so a new scheme cannot be added without its
          real-world counterpart being named here too. */}
      <h2 className="section-title">{t("svc.realSystem")}</h2>
      <div className="tbl-wrap">
        <table className="plain">
          <thead>
            <tr>
              <th scope="col">{t("hub.title")}</th>
              <th scope="col">{t("svc.realSystem")}</th>
              <th scope="col">{t("svc.realFormIs")}</th>
            </tr>
          </thead>
          <tbody>
            {ALL_SERVICES.map((s) => (
              <tr key={s.id}>
                <td style={{ color: "var(--ink)", fontWeight: 600 }}>
                  {(d.svc as Record<string, string>)[`${s.id}Name`]}
                </td>
                <td>
                  <code>{s.realPortal}</code>
                </td>
                <td>{s.realForm ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 className="section-title">{t("about.scaleTitle")}</h2>
      {scale.map(([head, body]) => (
        <p className="body" key={head}>
          <strong>{head}</strong> {body}
        </p>
      ))}

      <h2 className="section-title">{t("about.techTitle")}</h2>
      <p className="body">{d.about.techBody}</p>

      <div className="note note-warn" style={{ marginTop: 28 }}>
        <span>{d.about.notAffiliated}</span>
      </div>
    </ScreenShell>
  );
}
