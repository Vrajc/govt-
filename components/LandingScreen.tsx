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
import { Stories } from "@/components/Stories";
import { servicesIn } from "@/lib/services/catalogue";
import type { Category } from "@/lib/services/types";
import type { Lang } from "@/lib/types";

export interface ScriptLine {
  code: Lang;
  english: string;
  where: string;
  tagline: string;
}

/**
 * The landing page.
 *
 * Somebody arriving from a message link has no idea what this is. The hub at
 * /start assumes they already do — it asks them to pick a door before it has
 * said what building they are in. This page answers that first, in the order
 * a stranger meets the questions: what it is, who it is for, what is broken,
 * what you can do here, how it works, where your file goes, who it reaches,
 * and where the honesty line falls.
 *
 * Set as a ledger rather than a stack of cards: an ochre margin rule down
 * the left of every section, figures in ruled rows, and depth spent on
 * exactly two things — the hero plate and the carousel. Everything else is
 * hairlines and space, which is what keeps a page with nine sections on it
 * from reading as nine competing boxes.
 */
export function LandingScreen({ scripts }: { lang: Lang; scripts: ScriptLine[] }) {
  const { t, d } = useApp();
  const L = d.landing as Record<string, string>;
  const HUB = d.hub as Record<string, string>;
  const SVC = d.svc as Record<string, string>;
  const ST = d.stages as Record<string, string>;

  const doors: { c: Category; icon: React.ReactNode; title: string; sub: string }[] = [
    { c: "start", icon: <Person size={22} />, title: HUB.catStart, sub: HUB.catStartSub },
    { c: "have", icon: <Clock size={22} />, title: HUB.catHave, sub: HUB.catHaveSub },
    { c: "family", icon: <People size={22} />, title: HUB.catFamily, sub: HUB.catFamilySub },
  ];

  const steps = [
    { t: L.how1Title, b: L.how1 },
    { t: L.how2Title, b: L.how2 },
    { t: L.how3Title, b: L.how3 },
    { t: L.how4Title, b: L.how4 },
  ];

  /* The real approval chain for a state pension, named with the same
     strings the tracker itself uses — so the promise on the landing page
     and the screen it describes can never drift apart. */
  const chain = [
    { t: ST.villageCheck, a: ST.actorVillage },
    { t: ST.gramSabha, a: ST.actorVillage },
    { t: ST.blockCheck, a: ST.actorBlock },
    { t: ST.districtSanction, a: ST.actorDistrict },
  ];

  return (
    <div className="sheet sheet-wide">
      <main className="shell-main" id="main">
        {/* ---------------- hero ---------------- */}
        <section className="hero hero-grid">
          <div className="hero-words">
            <h1 className="hero-title">{L.heroTitle}</h1>
            <p className="hero-sub">{L.heroSub}</p>

            <div className="hero-cta">
              <BigLink href="/start" icon={<Chevron size={20} />}>
                {L.ctaStart}
              </BigLink>
              <BigLink href="/find" variant="secondary" icon={<Search size={20} />}>
                {L.ctaFind}
              </BigLink>
            </div>

            <p className="hero-track">
              <Link href="/start">{L.ctaTrack}</Link>
            </p>
          </div>

          {/* The three figures carry the hero rather than an illustration:
              they are the argument, and they are all true. */}
          <aside className="hero-figures" aria-label={L.whyTitle}>
            {[
              [L.stat1n, L.stat1],
              [L.stat2n, L.stat2],
              [L.stat3n, L.stat3],
            ].map(([n, label]) => (
              <div className="figure-row" key={label}>
                <span className="figure-n">{n}</span>
                <span className="figure-l">{label}</span>
              </div>
            ))}
          </aside>
        </section>

        {/* ---------------- who this is for ---------------- */}
        <Stories />

        {/* ---------------- why ---------------- */}
        <section className="lp-section ledger">
          <p className="eyebrow">{L.whyTitle}</p>
          <h2 className="lp-h2">{L.why1}</h2>
          <p className="body lp-body">{L.why2}</p>
          <p className="body lp-body">{L.why3}</p>
        </section>

        {/* ---------------- what you can do ---------------- */}
        <section className="lp-section ledger">
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

        {/* ---------------- how it works ---------------- */}
        <section className="lp-section ledger">
          <h2 className="lp-h2">{L.howTitle}</h2>
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

        {/* ---------------- where your file is ---------------- */}
        <section className="lp-section ledger">
          <p className="eyebrow">{ST.waitingHere}</p>
          <h2 className="lp-h2">{L.chainTitle}</h2>
          <p className="lp-lede">{L.chainLede}</p>

          <ol className="chain">
            {chain.map((stop, i) => (
              <li key={stop.t} className={`chain-stop${i === 1 ? " is-here" : ""}`}>
                <span className="chain-i">
                  {i === 1 ? ST.waitingHere : `${i + 1}`}
                </span>
                <span className="chain-t">{stop.t}</span>
                <span className="chain-a">{stop.a}</span>
              </li>
            ))}
          </ol>
        </section>

        {/* ---------------- eleven scripts ---------------- */}
        <section className="lp-section ledger">
          <p className="eyebrow">{t("common.appName")}</p>
          <h2 className="lp-h2">{L.scriptsTitle}</h2>
          <p className="lp-lede">{L.scriptsLede}</p>

          <ul className="scripts">
            {scripts.map((s) => (
              <li className="script" key={s.code} lang={s.code}>
                <span className="script-lang" lang="en">
                  {s.english}
                </span>
                <span className="script-line">{s.tagline}</span>
                <span className="script-where" lang="en">
                  {s.where}
                </span>
              </li>
            ))}
          </ul>
        </section>

        {/* ---------------- made for ---------------- */}
        <section className="lp-section ledger">
          <p className="eyebrow">{L.builtTitle}</p>
          <ul className="lp-ticks">
            {[L.built1, L.built2, L.built3, L.built4].map((b) => (
              <li key={b}>
                <Check size={18} />
                <span>{b}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* ---------------- honesty, before they start ---------------- */}
        <section className="lp-section">
          <div className="panel panel-warn lp-honest">
            <h2 className="lp-h3">
              <Info size={20} />
              {L.honestTitle}
            </h2>
            <p className="body" style={{ color: "var(--ink)" }}>
              {L.honestBody}
            </p>
            <Link href="/about" className="review-edit">
              <Book size={16} />
              <span style={{ marginLeft: 8 }}>{L.honestLink}</span>
            </Link>
          </div>
        </section>

        <div className="action-dock">
          <BigLink href="/start" icon={<Chevron size={20} />}>
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
