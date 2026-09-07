"use client";

import { use, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/lib/app-state";
import { ScreenShell } from "@/components/ScreenShell";
import { NumberBox } from "@/components/NumberBox";
import { NumberList } from "@/components/NumberList";
import { destinationForNumber } from "@/lib/assistant/destinations";
import { parseNumber } from "@/lib/numbers";

/**
 * /n/9 — a number as an address.
 *
 * The badges let somebody find a number by eye and the box lets them type
 * one; this is the third way, and it is the one that leaves the phone. A
 * number in a text message, printed on a slip at the common service
 * centre, or written on the back of a hand is a link once it is a URL, and
 * costs nothing to support because the number already resolves.
 *
 * A number that does not exist is not a wrong turn. It lands on the list,
 * with the number they tried named in the sentence above it — because
 * somebody who typed 45 needs to see the 45 to work out that they heard 4
 * and then kept typing.
 */
export default function NumberScreen({ params }: { params: Promise<{ n: string }> }) {
  const { n: raw } = use(params);
  const { t, d } = useApp();
  const router = useRouter();

  const n = parseNumber(decodeURIComponent(raw));
  const dest = n === null ? null : destinationForNumber(n, d);
  const href = dest?.href ?? null;

  /* `replace`, not `push`: the number was an address, not a stop on the
     way, and Back from the service page should go where the person came
     from rather than to this page, which would bounce them forward again. */
  useEffect(() => {
    if (href) router.replace(href);
  }, [href, router]);

  if (dest && n !== null) {
    return (
      <ScreenShell step={null} back="/start" title={t("num.taking", { n })}>
        <p className="screen-guide">{dest.label}</p>
      </ScreenShell>
    );
  }

  return (
    <ScreenShell
      wide
      step={null}
      back="/start"
      crumbs={[{ label: t("nav.home"), href: "/start" }, { label: t("num.title") }]}
      title={n === null ? t("num.title") : t("num.unknown", { n })}
      guide={t("num.guide")}
    >
      <NumberBox className="num-box-card" />
      <NumberList />
    </ScreenShell>
  );
}
