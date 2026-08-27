"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useApp, type DemoSpeed } from "@/lib/app-state";
import { apiFetch } from "@/lib/api";
import { ScreenShell } from "@/components/ScreenShell";
import { BigButton } from "@/components/BigButton";
import { Check, Refresh, Sliders } from "@/components/Icons";
import { DEMO_PENSIONER } from "@/lib/mockPda";
import { ERROR_CODES, type ErrorCode } from "@/lib/types";

/**
 * /demo — presenter controls. Ctrl + Shift + D from anywhere.
 *
 * Deliberately in English only: it is a tool for whoever is holding the
 * camera, not part of the citizen journey, and translating it would imply
 * a pensioner might one day see it.
 */
export default function DemoScreen() {
  const { demo, setDemo, patch, resetApp, lang } = useApp();
  const router = useRouter();
  const [note, setNote] = useState<string | null>(null);

  function prefill() {
    patch({
      name: DEMO_PENSIONER.name,
      ppo: DEMO_PENSIONER.ppo,
      aadhaar: DEMO_PENSIONER.aadhaar,
      mobile: DEMO_PENSIONER.mobile,
      otpVerified: false,
      fixingId: null,
      lang,
    });
    setNote("Filled in. Ramanbhai Patel, PPO-2024-000123. Go to Details and press Send code.");
  }

  async function resetAll() {
    resetApp();
    await apiFetch("/api/outbox", { method: "DELETE" });
    setNote("Cleared. Every record, message and reminder is gone.");
  }

  return (
    <ScreenShell
      step={null}
      back="/"
      title="Presenter controls"
      guide="Not part of the journey. Press Ctrl + Shift + D from any screen to get back here."
      hideHelpline
      action={
        <BigButton variant="secondary" onClick={() => router.push("/")} icon={<Check size={22} />}>
          Back to the journey
        </BigButton>
      }
    >
      {note && (
        <p className="note note-good" role="status">
          <Check size={22} />
          <span>{note}</span>
        </p>
      )}

      <Group title="Force the next result">
        <Choice
          name="outcome"
          value="auto"
          current={demo.outcome}
          onPick={() => setDemo({ outcome: "auto" })}
          label="Decide honestly"
          sub="Flagged photo leans to needs-fixing, otherwise 70% accept"
        />
        <Choice
          name="outcome"
          value="ACCEPTED"
          current={demo.outcome}
          onPick={() => setDemo({ outcome: "ACCEPTED" })}
          label="Always accept"
        />
        <Choice
          name="outcome"
          value="NEEDS_FIX"
          current={demo.outcome}
          onPick={() => setDemo({ outcome: "NEEDS_FIX" })}
          label="Always needs fixing"
        />
      </Group>

      {demo.outcome === "NEEDS_FIX" && (
        <Group title="Which code comes back">
          <label className="field-label" htmlFor="code-pick">
            Code
          </label>
          <select
            id="code-pick"
            className="field-input"
            value={demo.code}
            onChange={(e) => setDemo({ code: e.target.value as ErrorCode })}
          >
            {ERROR_CODES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </Group>
      )}

      <Group title="Speed of the pretend pension office">
        {(
          [
            ["instant", "Instant", "No wait at all"],
            ["demo", "8 seconds", "The default for a recorded demo"],
            ["real", "2 minutes", "What the copy actually promises"],
          ] as [DemoSpeed, string, string][]
        ).map(([value, label, sub]) => (
          <Choice
            key={value}
            name="speed"
            value={value}
            current={demo.speed}
            onPick={() => setDemo({ speed: value })}
            label={label}
            sub={sub}
          />
        ))}
      </Group>

      <Group title="Network">
        <label
          className="checklist-item"
          style={{ cursor: "pointer", gap: 14, alignItems: "flex-start" }}
        >
          <input
            type="checkbox"
            checked={demo.slow3g}
            onChange={(e) => setDemo({ slow3g: e.target.checked })}
            style={{ width: 28, height: 28, marginTop: 4, accentColor: "var(--primary)" }}
          />
          <span>
            <span style={{ fontSize: 20, fontWeight: 600, display: "block" }}>
              Pretend the network is slow
            </span>
            <span className="helper">Adds about 1.6 seconds to every request, both ways</span>
          </span>
        </label>
      </Group>

      <Group title="Shortcuts">
        <BigButton variant="secondary" onClick={prefill} icon={<Sliders size={22} />}>
          Fill the form with the demo pensioner
        </BigButton>
        <BigButton variant="quiet" onClick={resetAll} icon={<Refresh size={22} />}>
          Clear everything and start again
        </BigButton>
      </Group>

      <div className="panel" style={{ marginTop: 24 }}>
        <p className="review-key">Current settings</p>
        <p className="mono" style={{ fontSize: 15, display: "block", padding: "8px 10px" }}>
          outcome={demo.outcome} · code={demo.code} · speed={demo.speed} · slow3g=
          {String(demo.slow3g)}
        </p>
        <p className="helper">
          These ride along as request headers, so the mock pension office honours them
          server-side rather than the UI faking a result.
        </p>
      </div>
    </ScreenShell>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset style={{ border: "none", padding: 0, margin: "0 0 28px" }}>
      <legend className="section-title" style={{ marginTop: 0, padding: 0 }}>
        {title}
      </legend>
      {children}
    </fieldset>
  );
}

function Choice({
  name,
  value,
  current,
  onPick,
  label,
  sub,
}: {
  name: string;
  value: string;
  current: string;
  onPick: () => void;
  label: string;
  sub?: string;
}) {
  const active = current === value;
  return (
    <label
      className="card"
      style={{
        display: "flex",
        gap: 14,
        alignItems: "flex-start",
        borderColor: active ? "var(--primary)" : "var(--line)",
        background: active ? "var(--primary-tint)" : "var(--surface)",
      }}
    >
      <input
        type="radio"
        name={name}
        value={value}
        checked={active}
        onChange={onPick}
        style={{ width: 26, height: 26, marginTop: 2, accentColor: "var(--primary)" }}
      />
      <span>
        <span style={{ fontSize: 20, fontWeight: 600, display: "block" }}>{label}</span>
        {sub && <span className="helper">{sub}</span>}
      </span>
    </label>
  );
}
