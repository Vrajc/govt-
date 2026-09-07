"use client";

import Link from "next/link";
import { useApp } from "@/lib/app-state";
import { ScreenShell } from "@/components/ScreenShell";
import { Chevron, Clock, People, Person, Search } from "@/components/Icons";
import { NumberBadge } from "@/components/NumberBadge";
import { NumberBox } from "@/components/NumberBox";
import { servicesIn } from "@/lib/services/catalogue";
import { numberOfService } from "@/lib/numbers";
import type { Category } from "@/lib/services/types";

/**
 * The hub: three doors, with what is behind each one written on it.
 *
 * Two earlier versions of this screen sat at the opposite ends of the same
 * argument. The first listed all fourteen scheme names at once, which is a
 * wall. The second hid every one of them behind "see all 7", which is a
 * door with no sign — the count tells you how much is inside and nothing
 * about whether any of it is yours, so the only way to find out is to open
 * all three.
 *
 * This is the middle. Each card names its services, so the words are on the
 * screen where somebody can recognise their own situation in them; the
 * grouping keeps them in threes and fives rather than fourteen; and the
 * card still opens on a page with the money, the rules and the papers for
 * each one, because a name is not enough to choose by.
 *
 * The two shortcut rows above this are gone. They duplicated the first item
 * of two of the doors, which is a second place to press for the same thing,
 * and the services they named are now visible in the cards anyway.
 */
export default function StartScreen() {
  const { t, d, resetApp } = useApp();

  const HUB = d.hub as Record<string, string>;
  const SVC = d.svc as Record<string, string>;

  const doors: { c: Category; icon: React.ReactNode; title: string; sub: string }[] = [
    { c: "start", icon: <Person size={26} />, title: HUB.catStart, sub: HUB.catStartSub },
    { c: "have", icon: <Clock size={26} />, title: HUB.catHave, sub: HUB.catHaveSub },
    { c: "family", icon: <People size={26} />, title: HUB.catFamily, sub: HUB.catFamilySub },
  ];

  return (
    <ScreenShell
      step={null}
      back="/"
      wide
      crumbs={[{ label: t("nav.home") }]}
      title={t("hub.title")}
      guide={t("hub.guide")}
      /* The number goes after the name, so the Listen button reads out the
         one part of this screen somebody can write on the back of an
         envelope and carry to a helpline. */
      speakExtra={doors
        .map((door) =>
          [
            door.title,
            ...servicesIn(door.c).map(
              (s) => `${SVC[`${s.id}Name`]}. ${t("num.of", { n: numberOfService(s.id) })}`,
            ),
          ].join(". "),
        )
        .join(". ")}
    >
      <div className="grid-cards">
        {doors.map((door) => {
          const services = servicesIn(door.c);
          return (
            <section key={door.c} className="card hub-door" aria-labelledby={`door-${door.c}`}>
              <span className="card-icon">{door.icon}</span>
              <h2 className="card-title" id={`door-${door.c}`}>
                {door.title}
              </h2>
              <p className="card-sub">{door.sub}</p>

              {/* Starting a journey clears whatever draft was in progress, so
                  two services never bleed into each other. */}
              <ul className="hub-door-list">
                {services.map((s) => (
                  <li key={s.id}>
                    <Link
                      href={`/service/${s.id}`}
                      className="hub-door-item"
                      onClick={() => resetApp()}
                    >
                      <NumberBadge n={numberOfService(s.id)} />
                      <span className="hub-door-words">
                        <span className="hub-door-name">{SVC[`${s.id}Name`]}</span>
                        <span className="hub-door-who">{SVC[`${s.id}Who`]}</span>
                      </span>
                      <Chevron size={16} />
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>

      <Link href="/find" className="card hub-unsure">
        <span className="card-title">
          <Search size={26} />
          {t("hub.notSure")}
        </span>
        <span className="card-sub">{t("hub.notSureSub")}</span>
      </Link>

      {/* Low on the page on purpose. Most people arrive here with a
          situation and no number, and the doors above are for them; this is
          for the one who arrives having already been told "nine", and for
          whom every other row on this screen is something to scroll past. */}
      <NumberBox className="num-box-card" />

      <p className="hub-track-link">
        <Link href="/track">{t("hub.track")}</Link>
      </p>
    </ScreenShell>
  );
}
