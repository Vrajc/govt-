"use client";

import { useId, useState } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/lib/app-state";

/**
 * The reference number, asked for where somebody is standing.
 *
 * This field used to be at the foot of the hub, came off to a screen of
 * its own, and spent a while as a bare line of link text under the doors —
 * which is the worst of the three. A link saying "check something I
 * already sent" tells somebody holding a slip of paper that the thing they
 * want exists and then asks them to go and find it, and the field it leads
 * to is one they could have filled in where they were standing.
 *
 * The objection that moved it off was sound and still is: a text field is
 * the heaviest control on any screen, and this one serves the minority who
 * have already been through the product once. So it is not competing with
 * the doors — it sits below them, beside the number box, in the row of the
 * page that belongs to people who arrived already holding something.
 *
 * /track keeps its own screen. It is where the link in the footer goes and
 * where somebody lands from a message, and there the field has the page to
 * itself.
 */
export function TrackBox({ className = "" }: { className?: string }) {
  const { t } = useApp();
  const router = useRouter();
  const id = useId();

  const [ref, setRef] = useState("");
  const [miss, setMiss] = useState("");

  function go(e: React.FormEvent) {
    e.preventDefault();
    const code = ref.trim().toUpperCase();
    if (!code) {
      setMiss(t("hub.trackEmpty"));
      return;
    }
    router.push(`/status/${code}`);
  }

  return (
    <form className={`num-box ${className}`.trim()} onSubmit={go}>
      <label className="num-box-l" htmlFor={id}>
        {t("hub.track")}
      </label>
      <p className="num-box-hint">{t("hub.trackHelp")}</p>
      <div className="num-box-row">
        <input
          id={id}
          className="num-box-in track-box-in tabular"
          value={ref}
          onChange={(e) => {
            setRef(e.target.value.toUpperCase());
            setMiss("");
          }}
          /* The reference is printed in capitals on every message that
             carries it, and a phone that helpfully lowercases the first
             letter is a mismatch nobody can see. */
          autoCapitalize="characters"
          autoComplete="off"
          spellCheck={false}
          enterKeyHint="go"
          placeholder="PS-2026-ABCD1234"
          aria-describedby={miss ? `${id}-miss` : undefined}
        />
        <button type="submit" className="num-box-go" disabled={!ref.trim()}>
          {t("hub.trackGo")}
        </button>
      </div>
      {miss && (
        <p className="num-box-miss" id={`${id}-miss`} role="alert">
          {miss}
        </p>
      )}
    </form>
  );
}
