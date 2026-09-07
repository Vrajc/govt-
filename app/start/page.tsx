"use client";

import Link from "next/link";
import { useApp } from "@/lib/app-state";
import { ScreenShell } from "@/components/ScreenShell";
import { Chevron, Clock, People, Person, Search } from "@/components/Icons";
import { NumberBadge } from "@/components/NumberBadge";
import { NumberBox } from "@/components/NumberBox";
import { TrackBox } from "@/components/TrackBox";
import { servicesIn } from "@/lib/services/catalogue";
import { numberOfService } from "@/lib/numbers";
import type { Category } from "@/lib/services/types";

/**
 * The hub: three doors, with what is behind each one written on it — and
 * one way in through each.
 *
 * Three versions of this screen have now argued the same point from
 * different ends. The first listed all fourteen scheme names as fourteen
 * links, which is a wall. The second hid every one of them behind "see all
 * 7", which is a door with no sign: the count tells you how much is inside
 * and nothing about whether any of it is yours, so the only way to find
 * out is to open all three. The third put the names back and made each one
 * its own link, which fixed the sign and broke the door — fourteen targets
 * on the screen that exists to reduce the choice to three, and every one
 * of them a chance to land on the wrong scheme page from a name skimmed
 * too fast.
 *
 * This is the two halves together. The names are on the card, so somebody
 * can recognise their own situation in the words before committing to
 * anything; they are not links, so the card is one target and the decision
 * on this screen stays the decision the screen is for. The list inside is
 * where the choosing happens, and that list has the money, the rules and
 * the papers on it — which a name alone never had.
 *
 * The numbers are here for the same reason they are everywhere else: this
 * is the screen somebody is looking at when a helpline worker says "nine".
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

              {/* Names, not links. They are here to be recognised, and the
                  press that acts on the recognition is the one below. */}
              <ul className="hub-door-list">
                {services.map((s) => (
                  <li key={s.id} className="hub-door-point">
                    <NumberBadge n={numberOfService(s.id)} />
                    <span className="hub-door-name">{SVC[`${s.id}Name`]}</span>
                  </li>
                ))}
              </ul>

              {/* The one link, stretched over the whole card by the rule in
                  globals.css — so the card is a single target for a thumb,
                  while a screen reader is given one short link with a name
                  that says which door it opens rather than nine lines of
                  scheme names read as the name of a link.

                  Starting a journey clears whatever draft was in progress,
                  so two services never bleed into each other. */}
              <Link
                href={`/start/${door.c}`}
                className="card-go hub-door-go"
                aria-label={`${door.title} — ${HUB.seeThem.replace("{n}", String(services.length))}`}
                onClick={() => resetApp()}
              >
                {HUB.seeThem.replace("{n}", String(services.length))}
                <Chevron size={15} />
              </Link>
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

      {/* The row for people who arrive already holding something.

          Low on the page on purpose, and paired on purpose. Most people
          come to this screen with a situation and no identifier at all, and
          the doors above are for them. These two are for the ones who have
          been given something to type: a number from the helpline, or a
          reference from a thing they already sent. Neither is competing
          with the decision above, and next to each other they read as one
          idea — "if you already know something, start here" — rather than
          as two odd controls at the bottom of a page.

          The reference used to be a bare line of link text here, which told
          somebody holding a slip of paper that the thing they wanted
          existed and then sent them somewhere else to type it. */}
      <div className="hub-shortcuts">
        <NumberBox className="num-box-card" />
        <TrackBox className="num-box-card" />
      </div>
    </ScreenShell>
  );
}
