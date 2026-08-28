"use client";

import Link from "next/link";
import { useApp } from "@/lib/app-state";
import { BigLink } from "@/components/BigButton";
import {
  Book,
  Check,
  Chevron,
  Clock,
  Info,
  People,
  Person,
  Search,
} from "@/components/Icons";
import { servicesIn } from "@/lib/services/catalogue";
import type { Category } from "@/lib/services/types";

/**
 * The landing page.
 *
 * Somebody arriving from a message link has no idea what this is. The hub at
 * /start assumes they already do — it asks them to pick a door before it has
 * said what building they are in. This page answers that first: what it
 * covers, why it exists, how it works, and where the honesty line falls,
 * before anyone commits to a journey.
 *
 * It renders in whatever language has been chosen. On a first visit the
 * LanguageGate sits on top of it until that choice is made, so nothing here
 * is ever read in a language the visitor did not pick.
 */
export default function LandingScreen() {
  const { t, d } = useApp();
  const L = d.landing as Record<string, string>;
  const HUB = d.hub as Record<string, string>;
  const SVC = d.svc as Record<string, string>;

  const doors: { c: Category; icon: React.ReactNode; title: string; sub: string }[] = [
    { c: "start", icon: <Person size={26} />, title: HUB.catStart, sub: HUB.catStartSub },
    { c: "have", icon: <Clock size={26} />, title: HUB.catHave, sub: HUB.catHaveSub },
    { c: "family", icon: <People size={26} />, title: HUB.catFamily, sub: HUB.catFamilySub },
  ];

  const steps = [
    { t: L.how1Title, b: L.how1 },
    { t: L.how2Title, b: L.how2 },
    { t: L.how3Title, b: L.how3 },
    { t: L.how4Title, b: L.how4 },
  ];

  const built = [L.built1, L.built2, L.built3, L.built4];

  return (
    <div className="sheet sheet-wide">
      <main className="shell-main" id="main">
        {/* ---------------- hero ---------------- */}
        <section className="hero">
          <h1 className="hero-title">{L.heroTitle}</h1>
          <p className="hero-sub">{L.heroSub}</p>

          <div className="hero-cta">
            <BigLink href="/start" icon={<Chevron size={22} />}>
              {L.ctaStart}
            </BigLink>
            <BigLink href="/find" variant="secondary" icon={<Search size={22} />}>
              {L.ctaFind}
            </BigLink>
          </div>

          <p className="hero-track">
            <Link href="/start">{L.ctaTrack}</Link>
          </p>
        </section>

        {/* ---------------- what you can do ---------------- */}
        <section className="lp-section">
          <h2 className="lp-h2">{L.doTitle}</h2>
          <p className="lp-lede">{L.doSub}</p>

          <div className="grid-cards">
            {doors.map((door) => (
              <Link key={door.c} href={`/start/${door.c}`} className="card">
                <span className="card-icon">{door.icon}</span>
                <span className="card-title">{door.title}</span>
                <span className="card-sub">{door.sub}</span>
                <ul className="card-peek">
                  {servicesIn(door.c).map((s) => (
                    <li key={s.id}>{SVC[`${s.id}Name`]}</li>
                  ))}
                </ul>
              </Link>
            ))}
          </div>
        </section>

        {/* ---------------- why ---------------- */}
        <section className="lp-section">
          <h2 className="lp-h2">{L.whyTitle}</h2>
          {/* The first line is the one that should stop someone scrolling. */}
          <p className="lp-standfirst">{L.why1}</p>
          <p className="body">{L.why2}</p>
          <p className="body">{L.why3}</p>
        </section>

        {/* ---------------- how it works ---------------- */}
        <section className="lp-section">
          <h2 className="lp-h2">{L.howTitle}</h2>
          {/* Numbered because it genuinely is a sequence. */}
          <ol className="lp-steps">
            {steps.map((s, i) => (
              <li key={s.t}>
                <span className="lp-step-n" aria-hidden="true">
                  {i + 1}
                </span>
                <span>
                  <span className="lp-step-t">{s.t}</span>
                  <span className="lp-step-b">{s.b}</span>
                </span>
              </li>
            ))}
          </ol>
        </section>

        {/* ---------------- made for ---------------- */}
        <section className="lp-section">
          <h2 className="lp-h2">{L.builtTitle}</h2>
          <ul className="lp-ticks">
            {built.map((b) => (
              <li key={b}>
                <Check size={20} />
                <span>{b}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* ---------------- honesty, before they start ---------------- */}
        <section className="lp-section">
          <div className="panel panel-warn lp-honest">
            <h2 className="lp-h3">
              <Info size={22} />
              {L.honestTitle}
            </h2>
            <p className="body" style={{ color: "var(--ink)" }}>
              {L.honestBody}
            </p>
            <Link href="/about" className="review-edit">
              <Book size={18} />
              <span style={{ marginLeft: 8 }}>{L.honestLink}</span>
            </Link>
          </div>
        </section>

        <div className="action-dock">
          <BigLink href="/start" icon={<Chevron size={22} />}>
            {L.ctaStart}
          </BigLink>
        </div>

        <p className="helpline">
          {t("common.needHelp")}{" "}
          <a href={`tel:${t("common.helpNumber").replace(/\s/g, "")}`}>
            {t("common.helpNumber")}
          </a>
        </p>
      </main>

      <footer className="shell-foot">
        <p className="micro">
          <Link href="/about" style={{ color: "var(--primary-dark)", fontWeight: 600 }}>
            {t("common.aboutLink")}
          </Link>
        </p>
      </footer>
    </div>
  );
}
