"use client";

import { use } from "react";
import Link from "next/link";
import { useApp } from "@/lib/app-state";
import { ScreenShell } from "@/components/ScreenShell";
import { BigLink } from "@/components/BigButton";
import { Chevron, Search } from "@/components/Icons";
import { servicesIn } from "@/lib/services/catalogue";
import type { Category } from "@/lib/services/types";

const CATEGORIES: Category[] = ["start", "have", "family"];

function isCategory(v: string): v is Category {
  return (CATEGORIES as string[]).includes(v);
}

/** The services inside one door of the hub. */
export default function CategoryScreen({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category } = use(params);
  const { t, d } = useApp();

  if (!isCategory(category)) {
    return (
      <ScreenShell step={null} back="/start" title={t("errors.notFound")}>
        <BigLink href="/start" variant="secondary">
          {t("hub.title")}
        </BigLink>
      </ScreenShell>
    );
  }

  const services = servicesIn(category);
  const titleKey = category === "start" ? "catStart" : category === "have" ? "catHave" : "catFamily";
  const title = (d.hub as Record<string, string>)[titleKey];

  return (
    <ScreenShell
      step={null}
      wide
      back="/start"
      crumbs={[{ label: t("nav.home"), href: "/start" }, { label: title }]}
      title={title}
      guide={t("hub.guide")}
      speakExtra={services
        .map((s) => (d.svc as Record<string, string>)[`${s.id}Name`])
        .join(". ")}
    >
      <div role="list" className="grid-list">
        {services.map((s) => (
          <Link key={s.id} href={`/service/${s.id}`} className="card" role="listitem">
            <span className="card-title" style={{ justifyContent: "space-between" }}>
              <span>{(d.svc as Record<string, string>)[`${s.id}Name`]}</span>
              <Chevron size={22} />
            </span>
            <span className="card-sub">
              {(d.svc as Record<string, string>)[`${s.id}Short`]}
            </span>
            <span className="card-amount">
              {(d.svc as Record<string, string>)[`${s.id}Amount`]}
            </span>
          </Link>
        ))}
      </div>

      <Link href="/find" className="card" style={{ marginTop: 24 }}>
        <span className="card-title">
          <Search size={26} />
          {t("hub.notSure")}
        </span>
        <span className="card-sub">{t("hub.notSureSub")}</span>
      </Link>
    </ScreenShell>
  );
}
