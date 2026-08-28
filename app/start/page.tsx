"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useApp } from "@/lib/app-state";
import { ScreenShell } from "@/components/ScreenShell";
import { BigButton } from "@/components/BigButton";
import { Field } from "@/components/Field";
import { Chevron, Clock, People, Person, Search } from "@/components/Icons";
import { servicesIn } from "@/lib/services/catalogue";
import type { Category } from "@/lib/services/types";

/**
 * The hub. Three doors, matching the three things that actually happen to a
 * pension: you do not have one, you have one, or the person who had one has
 * died. Everything in the catalogue hangs off one of those.
 */
export default function StartScreen() {
  const { t, d, resetApp } = useApp();
  const router = useRouter();
  const [ref, setRef] = useState("");
  const [refErr, setRefErr] = useState<string | null>(null);

  function openCategory(c: Category) {
    // Starting a new journey clears whatever draft was in progress, so two
    // services never bleed into each other.
    resetApp();
    router.push(`/start/${c}`);
  }

  function track() {
    const id = ref.trim().toUpperCase();
    if (!id) {
      setRefErr(t("hub.trackEmpty"));
      return;
    }
    router.push(`/status/${id}`);
  }

  const cards: { c: Category; icon: React.ReactNode; title: string; sub: string }[] = [
    { c: "start", icon: <Person size={26} />, title: d.hub.catStart, sub: d.hub.catStartSub },
    { c: "have", icon: <Clock size={26} />, title: d.hub.catHave, sub: d.hub.catHaveSub },
    { c: "family", icon: <People size={26} />, title: d.hub.catFamily, sub: d.hub.catFamilySub },
  ];

  return (
    <ScreenShell
      step={null}
      back="/"
      title={t("hub.title")}
      guide={t("hub.guide")}
      speakExtra={cards.map((c) => c.title).join(". ")}
    >
      <div role="group" aria-label={t("hub.title")}>
        {cards.map((card) => (
          <button
            key={card.c}
            type="button"
            className="card"
            onClick={() => openCategory(card.c)}
          >
            <span className="card-title">
              {card.icon}
              {card.title}
            </span>
            <span className="card-sub">
              {card.sub} · {servicesIn(card.c).length}
            </span>
          </button>
        ))}
      </div>

      <Link href="/find" className="card" style={{ marginTop: 24 }}>
        <span className="card-title">
          <Search size={26} />
          {t("hub.notSure")}
        </span>
        <span className="card-sub">{t("hub.notSureSub")}</span>
      </Link>

      <section style={{ marginTop: 32, borderTop: "1px solid var(--line)", paddingTop: 24 }}>
        <h2 className="section-title" style={{ marginTop: 0 }}>
          {t("hub.track")}
        </h2>
        <p className="helper" style={{ marginBottom: 16 }}>
          {t("hub.trackSub")}
        </p>
        <Field
          label={t("hub.trackLabel")}
          help={t("hub.trackHelp")}
          error={refErr}
          value={ref}
          className="tabular"
          autoCapitalize="characters"
          spellCheck={false}
          placeholder="DLC-2026-ABCD1234"
          onChange={(e) => {
            setRef(e.target.value.toUpperCase());
            setRefErr(null);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") track();
          }}
        />
        <BigButton variant="secondary" onClick={track} icon={<Chevron size={22} />}>
          {t("hub.trackGo")}
        </BigButton>
      </section>
    </ScreenShell>
  );
}
