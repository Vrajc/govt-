"use client";

import Link from "next/link";
import { useApp } from "@/lib/app-state";
import { BigLink } from "@/components/BigButton";
import { Book, Chevron, Info, Search } from "@/components/Icons";
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
 * Somebody arriving from a message link has no idea what this is, so this
 * page answers in the order a stranger meets the questions: what it is,
 * who it is for, what is broken, what you can do, how it works, where your
 * file goes, who it reaches, and where the honesty line falls.
 *
 * The first pass at this was nine sections in one rhythm — eyebrow,
 * heading, lede, content, repeat — with no borders holding them apart. It
 * read as one undifferentiated column, which is what happens when you take
 * the boxes away and put nothing in their place. Structure now comes from
 * three things instead:
 *
 *   · alternating grounds, so a section is separated by the paper changing
 *     under it rather than by a line drawn around it;
 *   · asymmetric columns — prose against a panel, a wide measure against a
 *     narrow one — so no two consecutive sections have the same shape;
 *   · one bordered object on the whole page, the approval chain, which is
 *     the thing most worth stopping at.
 */
export function LandingScreen({ scripts }: { lang: Lang; scripts: ScriptLine[] }) {
  const { d } = useApp();
  const L = d.landing as Record<string, string>;
  const HUB = d.hub as Record<string, string>;
  const SVC = d.svc as Record<string, string>;
  const ST = d.stages as Record<string, string>;
  const AB = d.about as Record<string, string>;

  const doors: { c: Category; title: string; sub: string }[] = [
    { c: "start", title: HUB.catStart, sub: HUB.catStartSub },
    { c: "have", title: HUB.catHave, sub: HUB.catHaveSub },
    { c: "family", title: HUB.catFamily, sub: HUB.catFamilySub },
  ];

  const steps = [
    { t: L.how1Title, b: L.how1 },
    { t: L.how2Title, b: L.how2 },
    { t: L.how3Title, b: L.how3 },
    { t: L.how4Title, b: L.how4 },
  ];

  /* Named with the same strings the tracker uses, so the promise here and
     the screen it describes cannot drift apart. */
  const chain = [
    { t: ST.villageCheck, a: ST.actorVillage },
    { t: ST.gramSabha, a: ST.actorVillage },
    { t: ST.blockCheck, a: ST.actorBlock },
    { t: ST.districtSanction, a: ST.actorDistrict },
  ];

  const real = [AB.real1, AB.real2, AB.real3, AB.real4, AB.real5, AB.real6];
  const mock = [AB.mock1, AB.mock2, AB.mock3, AB.mock4, AB.mock5];

  return (
    <main className="lp" id="main">
      {/* ---------------- hero ---------------- */}
      <section className="lp-hero">
        <div className="lp-w lp-hero-grid">
          <div className="lp-hero-words">
          <p className="kicker">{L.heroEyebrow}</p>
          <h1 className="lp-display">{L.heroTitle}</h1>
          <p className="lp-standfirst">{L.heroSub}</p>
          <div className="lp-actions">
            <BigLink href="/start" icon={<Chevron size={19} />}>
              {L.ctaStart}
            </BigLink>
            <BigLink href="/find" variant="secondary" icon={<Search size={19} />}>
              {L.ctaFind}
            </BigLink>
          </div>
          <p className="lp-quiet">
            <Link href="/start">{L.ctaTrack}</Link>
          </p>
          </div>

          <div className="lp-hero-art">
            <Stories compact />
          </div>
        </div>
      </section>

      {/* ---------------- the three figures, on their own ground ------- */}
      <section className="lp-band lp-band-sunk">
        <div className="lp-w">
          <ul className="figs">
            {[
              [L.stat1n, L.stat1],
              [L.stat2n, L.stat2],
              [L.stat3n, L.stat3],
            ].map(([n, label]) => (
              <li className="fig" key={label}>
                <span className="fig-n">{n}</span>
                <span className="fig-l">{label}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ---- the problem, against the panel that answers it ---- */}
      <section className="lp-band">
        <div className="lp-w lp-split">
          <div className="lp-prose">
            <p className="kicker">{L.whyTitle}</p>
            <h2 className="lp-h2">{L.why1}</h2>
            <p className="body lp-body">{L.why2}</p>
            <p className="body lp-body">{L.why3}</p>
            <p className="lp-source">{L.chainLede}</p>
          </div>

          <aside className="lp-panel">
            <p className="panel-kicker">{L.chainTitle}</p>
            <ol className="chain">
              {chain.map((stop, i) => (
                <li key={stop.t} className={`chain-stop${i === 1 ? " is-here" : ""}`}>
                  <span className="chain-t">{stop.t}</span>
                  <span className="chain-a">{i === 1 ? ST.waitingHere : stop.a}</span>
                </li>
              ))}
            </ol>
          </aside>
        </div>
      </section>

      {/* ---------------- the three doors ---------------- */}
      <section className="lp-band lp-band-sunk">
        <div className="lp-w">
          <h2 className="lp-h2 lp-h2-wide">{L.doTitle}</h2>
          <p className="lp-lede">{L.doSub}</p>

          <div className="cols3">
            {doors.map((door) => (
              <Link key={door.c} href={`/start/${door.c}`} className="col-item">
                <h3 className="col-h">{door.title}</h3>
                <p className="col-b">{door.sub}</p>
                <ul className="col-peek">
                  {servicesIn(door.c).map((s) => (
                    <li key={s.id}>{SVC[`${s.id}Name`]}</li>
                  ))}
                </ul>
                <span className="col-go">
                  {HUB.title} <Chevron size={15} />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------- how it works ---------------- */}
      <section className="lp-band">
        <div className="lp-w">
          <h2 className="lp-h2 lp-h2-wide">{L.howTitle}</h2>
          <ol className="steps4">
            {steps.map((s, i) => (
              <li key={s.t}>
                <span className="step-n">{String(i + 1).padStart(2, "0")}</span>
                <h3 className="col-h">{s.t}</h3>
                <p className="col-b">{s.b}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ---------------- eleven scripts ---------------- */}
      <section className="lp-band lp-band-sunk">
        <div className="lp-w">
          <h2 className="lp-h2 lp-h2-wide">{L.scriptsTitle}</h2>
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
        </div>
      </section>

      {/* ---------------- built for ---------------- */}
      <section className="lp-band">
        <div className="lp-w">
          <h2 className="lp-h2 lp-h2-wide">{L.builtTitle}</h2>
          <ul className="cols3 cols3-plain">
            {[L.built1, L.built2, L.built3, L.built4].map((b) => (
              <li className="col-item" key={b}>
                <p className="col-b">{b}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ---------------- honesty ---------------- */}
      <section className="lp-band">
        <div className="lp-w lp-split lp-split-even">
          <div>
            <p className="kicker">{AB.realHead}</p>
            <ul className="honest honest-real">
              {real.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
          </div>
          <div>
            <p className="kicker kicker-warn">{AB.mockHead}</p>
            <ul className="honest honest-mock">
              {mock.map((m) => (
                <li key={m}>{m}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ---------------- close ---------------- */}
      <section className="lp-band lp-close">
        <div className="lp-w">
          <div className="lp-note">
            <Info size={19} />
            <div>
              <h2 className="lp-h3">{L.honestTitle}</h2>
              <p className="body" style={{ color: "var(--ink)" }}>
                {L.honestBody}
              </p>
              <Link href="/about" className="lp-inline-link">
                <Book size={15} />
                <span>{L.honestLink}</span>
              </Link>
            </div>
          </div>

          <div className="lp-final">
            <BigLink href="/start" icon={<Chevron size={19} />}>
              {L.ctaStart}
            </BigLink>
          </div>
        </div>
      </section>
    </main>
  );
}
