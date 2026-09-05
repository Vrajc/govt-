"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useApp } from "@/lib/app-state";
import { ScreenShell } from "@/components/ScreenShell";
import { Chevron, Clock, People, Person, Search } from "@/components/Icons";
import { servicesIn } from "@/lib/services/catalogue";
import type { Category } from "@/lib/services/types";

/**
 * The hub, reduced to one decision.
 *
 * The version before this listed all fourteen service names on the landing
 * screen of the journey — three cards, each with a peek list under it. The
 * reasoning was sound (naming what is inside saves a click, and teaches
 * the words) and the result was still wrong: fourteen unfamiliar scheme
 * names, arriving at once, is the wall this product exists to remove. A
 * 78-year-old reading a wall does not pick from it; they call someone.
 *
 * So the drill-down already in the routing does the teaching instead —
 * /start/have is a five-item list, which is a list a person can read — and
 * this screen carries three things and nothing else:
 *
 *   · the two services most people actually arrive for, as their own rows,
 *     so the common case is one tap and not three;
 *   · the three doors, each stating how many things are behind it, so the
 *     size of the choice is visible before you commit to it;
 *   · the finder, for anyone who cannot place themselves in the three.
 *
 * The track-a-reference field moved to its own screen. It was competing
 * with the primary decision while serving the minority who already have a
 * receipt number, and a text field is the heaviest thing on a page.
 */
export default function StartScreen() {
  const { t, d, resetApp } = useApp();
  const router = useRouter();

  const HUB = d.hub as Record<string, string>;
  const SVC = d.svc as Record<string, string>;

  function openCategory(c: Category) {
    // Starting a new journey clears whatever draft was in progress, so two
    // services never bleed into each other.
    resetApp();
    router.push(`/start/${c}`);
  }

  const doors: { c: Category; icon: React.ReactNode; title: string; sub: string }[] = [
    { c: "start", icon: <Person size={26} />, title: HUB.catStart, sub: HUB.catStartSub },
    { c: "have", icon: <Clock size={26} />, title: HUB.catHave, sub: HUB.catHaveSub },
    { c: "family", icon: <People size={26} />, title: HUB.catFamily, sub: HUB.catFamilySub },
  ];

  /* The two shortcuts are taken from the catalogue rather than named by id,
     so reordering the catalogue moves them and nothing here goes stale.
     "have" opens on proving you are alive — the one thing every pensioner
     must do annually — and "start" on the old-age pension. */
  const common = [servicesIn("have")[0], servicesIn("start")[0]].filter(Boolean);

  return (
    <ScreenShell
      step={null}
      back="/"
      wide
      crumbs={[{ label: t("nav.home") }]}
      title={t("hub.title")}
      guide={t("hub.guide")}
      speakExtra={doors.map((c) => c.title).join(". ")}
    >
      {common.length > 0 && (
        <section className="hub-common">
          <h2 className="hub-eyebrow">{HUB.commonHead}</h2>
          <div className="hub-common-rows">
            {common.map((s) => (
              <Link key={s.id} href={`/service/${s.id}`} className="hub-row" onClick={() => resetApp()}>
                <span className="hub-row-words">
                  <span className="hub-row-t">{SVC[`${s.id}Name`]}</span>
                  <span className="hub-row-b">{SVC[`${s.id}Who`]}</span>
                </span>
                <Chevron size={18} />
              </Link>
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="hub-eyebrow">{HUB.chooseHead}</h2>
        <div role="group" aria-label={t("hub.title")} className="grid-cards">
          {doors.map((door) => {
            const n = servicesIn(door.c).length;
            return (
              <button key={door.c} type="button" className="card" onClick={() => openCategory(door.c)}>
                <span className="card-icon">{door.icon}</span>
                <span className="card-count">{HUB.countOf.replace("{n}", String(n))}</span>
                <span className="card-title">{door.title}</span>
                <span className="card-sub">{door.sub}</span>
                <span className="card-go">
                  {HUB.seeThem.replace("{n}", String(n))} <Chevron size={15} />
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <Link href="/find" className="card hub-unsure">
        <span className="card-title">
          <Search size={26} />
          {t("hub.notSure")}
        </span>
        <span className="card-sub">{t("hub.notSureSub")}</span>
      </Link>

      <p className="hub-track-link">
        <Link href="/track">{t("hub.track")}</Link>
      </p>
    </ScreenShell>
  );
}
