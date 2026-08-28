"use client";

import { useState } from "react";
import { useApp } from "@/lib/app-state";
import { ScreenShell } from "@/components/ScreenShell";
import { Book, Chevron, MapPin, Phone } from "@/components/Icons";

/** Static mock list. A real one would use the device location. */
const CENTRES = [
  { name: "Common Service Centre, Naranpura", area: "Ankur Road, Ahmedabad", km: "1.2", open: "9 – 6" },
  { name: "Post Office, Vastrapur", area: "Vastrapur Lake Road, Ahmedabad", km: "2.8", open: "10 – 5" },
  { name: "Common Service Centre, Maninagar", area: "Station Road, Ahmedabad", km: "4.1", open: "9 – 7" },
  { name: "Bank of Baroda, Paldi", area: "Bhatta Cross Roads, Ahmedabad", km: "5.0", open: "10 – 4" },
  { name: "Common Service Centre, Bopal", area: "South Bopal, Ahmedabad", km: "7.6", open: "9 – 6" },
];

type Panel = null | "centres" | "steps";

/** /help — three big options, and never a dead end. */
export default function HelpScreen() {
  const { t, d } = useApp();
  const [open, setOpen] = useState<Panel>(null);

  const tel = t("common.helpNumber").replace(/\s/g, "");
  const steps = [d.help.step1, d.help.step2, d.help.step3, d.help.step4, d.help.step5];

  return (
    <ScreenShell wide step={null} back="/" title={t("help.title")} guide={t("help.guide")} hideHelpline>
      <div className="grid-cards">
      <a href={`tel:${tel}`} className="card">
        <span className="card-title">
          <Phone size={26} />
          {t("help.call")}
        </span>
        <span className="card-sub">
          {t("common.helpNumber")} · {t("help.callSub")}
        </span>
      </a>

      <button
        type="button"
        className="card"
        onClick={() => setOpen(open === "centres" ? null : "centres")}
        aria-expanded={open === "centres"}
      >
        <span className="card-title">
          <MapPin size={26} />
          {t("help.centres")}
        </span>
        <span className="card-sub">{t("help.centresSub")}</span>
      </button>

      <button
        type="button"
        className="card"
        onClick={() => setOpen(open === "steps" ? null : "steps")}
        aria-expanded={open === "steps"}
      >
        <span className="card-title">
          <Book size={26} />
          {t("help.steps")}
        </span>
        <span className="card-sub">{t("help.stepsSub")}</span>
      </button>
      </div>

      {open === "centres" && (
        <div className="panel" style={{ marginTop: 16 }}>
          <h2 className="section-title" style={{ marginTop: 0 }}>
            {t("help.centresTitle")}
          </h2>
          <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
            {CENTRES.map((c) => (
              <li
                key={c.name}
                style={{ padding: "14px 0", borderBottom: "1px solid var(--line)" }}
              >
                <p style={{ fontSize: 20, fontWeight: 600, margin: 0 }}>{c.name}</p>
                <p className="helper" style={{ margin: "2px 0 0" }}>
                  {c.area} · {c.km} {t("help.km")} · {t("help.open")} {c.open}
                </p>
              </li>
            ))}
          </ul>
          <p className="helper">{t("help.centresNote")}</p>
        </div>
      )}

      {open === "steps" && (
        <div className="panel" style={{ marginTop: 16 }}>
          <h2 className="section-title" style={{ marginTop: 0 }}>
            {t("help.stepsTitle")}
          </h2>
          <ol style={{ paddingLeft: 24, margin: 0 }}>
            {steps.map((s, i) => (
              <li key={i} style={{ marginBottom: 14, fontSize: 20 }}>
                {s}
              </li>
            ))}
          </ol>
        </div>
      )}

      <p className="helpline" style={{ marginTop: 32 }}>
        <a href={`tel:${tel}`}>
          <Chevron size={16} /> {t("common.needHelp")} {t("common.helpNumber")}
        </a>
      </p>
    </ScreenShell>
  );
}
