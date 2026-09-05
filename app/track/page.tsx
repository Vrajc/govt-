"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useApp } from "@/lib/app-state";
import { ScreenShell } from "@/components/ScreenShell";
import { BigButton } from "@/components/BigButton";
import { Field } from "@/components/Field";
import { Chevron } from "@/components/Icons";

/**
 * Checking something already sent.
 *
 * This was a section at the foot of the hub, under the three doors. It came
 * off for two reasons. A text field is the heaviest control on any screen —
 * it asks for a keyboard, an exact string and a spelling — and it was sitting
 * on the one screen whose whole job is to make a single choice look easy. And
 * it served the minority: everyone here already has a reference number, which
 * means they have already been through the product once and know their way.
 *
 * So it is a link from the hub and a screen of its own, where the field is
 * the only thing being asked for and can have the page to itself.
 */
export default function TrackScreen() {
  const { t } = useApp();
  const router = useRouter();
  const [ref, setRef] = useState("");
  const [refErr, setRefErr] = useState<string | null>(null);

  function track() {
    const id = ref.trim().toUpperCase();
    if (!id) {
      setRefErr(t("hub.trackEmpty"));
      return;
    }
    router.push(`/status/${id}`);
  }

  return (
    <ScreenShell
      step={null}
      back="/start"
      crumbs={[{ label: t("nav.home"), href: "/start" }, { label: t("hub.track") }]}
      title={t("hub.track")}
      guide={t("hub.trackSub")}
    >
      <Field
        label={t("hub.trackLabel")}
        help={t("hub.trackHelp")}
        error={refErr}
        value={ref}
        className="tabular"
        autoCapitalize="characters"
        spellCheck={false}
        placeholder="PS-2026-ABCD1234"
        onChange={(e) => {
          setRef(e.target.value.toUpperCase());
          setRefErr(null);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") track();
        }}
      />
      <BigButton onClick={track} icon={<Chevron size={22} />}>
        {t("hub.trackGo")}
      </BigButton>
    </ScreenShell>
  );
}
