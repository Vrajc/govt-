import type { Dict } from "@/lib/i18n";
import { CATALOGUE, isServiceId } from "@/lib/services/catalogue";
import { NUMBERED, idForNumber, numberOf } from "@/lib/numbers";

/**
 * Where the voice assistant is allowed to send somebody.
 *
 * A model that can name a URL is a model that can invent one, and an
 * invented URL in this app is a 404 shown to a 78-year-old who has just
 * been told, out loud, that this is where they should go. So the model
 * never returns a link. It returns one id out of a list it was given, the
 * server looks the id up here, and anything it does not recognise becomes
 * "no destination" rather than a guess.
 *
 * The label is read out of the reader's own dictionary rather than written
 * by the model, so the button under the answer says what the same page
 * says everywhere else in the app — in Odia, in Tamil, in whichever of the
 * eleven the reader chose.
 */

export interface Destination {
  href: string;
  label: string;
  /**
   * The number printed beside it and read out with it — see lib/numbers.
   * Null for the pages nobody is ever told to go to by number.
   */
  n: number | null;
}

/** The fixed pages, and the one-line description the model is given. */
const PAGES: Record<string, { href: string; blurb: string; label: (d: Dict) => string }> = {
  hub: {
    href: "/start",
    blurb: "every service, grouped into three doors: starting a pension, already getting one, a death in the family",
    label: (d) => d.nav.home,
  },
  finder: {
    href: "/find",
    blurb: "four short questions that end on the one service that fits — for anyone who does not know what to ask for",
    label: (d) => d.hub.notSure,
  },
  track: {
    href: "/track",
    blurb: "look up something already sent, using the reference number that starts PS-",
    label: (d) => d.hub.track,
  },
  help: {
    href: "/help",
    blurb: "the helpline number, the nearest place with a person, and what to carry there",
    label: (d) => d.nav.help,
  },
  about: {
    href: "/about",
    blurb: "what is real in this prototype and what is pretend",
    label: (d) => d.nav.about,
  },
  outbox: {
    href: "/outbox",
    blurb: "every message this app has sent, kept in one place",
    label: (d) => d.nav.outbox,
  },
};

/** `svc:oldage` and friends. */
const SVC_PREFIX = "svc:";

/**
 * Turn whatever the model said into a real page, or into nothing.
 * `none`, an empty string and a hallucinated id all land in the same place.
 */
export function resolveDestination(raw: unknown, d: Dict): Destination | null {
  if (typeof raw !== "string") return null;
  const id = raw.trim();
  if (!id || id === "none") return null;

  const page = PAGES[id];
  if (page) return { href: page.href, label: page.label(d), n: numberOf(id) };

  if (id.startsWith(SVC_PREFIX)) {
    const svc = id.slice(SVC_PREFIX.length);
    if (!isServiceId(svc)) return null;
    return {
      href: `/service/${svc}`,
      label: (d.svc as Record<string, string>)[`${svc}Name`] ?? svc,
      n: numberOf(id),
    };
  }

  return null;
}

/** The destination for a service, without going through the model. */
export function serviceDestination(id: string, d: Dict): Destination | null {
  return resolveDestination(`${SVC_PREFIX}${id}`, d);
}

export function pageDestination(id: keyof typeof PAGES, d: Dict): Destination {
  const page = PAGES[id];
  return { href: page.href, label: page.label(d), n: numberOf(id) };
}

/**
 * The number list, resolved into pages and names in the reader's language.
 *
 * Built by walking the numbers and asking the same resolver the voice
 * assistant asks, so the list on /help and the button under a spoken
 * answer can never disagree about what number 9 is.
 */
export function numberedList(d: Dict): { n: number; href: string; label: string }[] {
  const out: { n: number; href: string; label: string }[] = [];
  for (const { n, id } of NUMBERED) {
    const dest = resolveDestination(id, d);
    if (dest) out.push({ n, href: dest.href, label: dest.label });
  }
  return out;
}

/** Where a dialled number goes, or nothing when there is no such number. */
export function destinationForNumber(n: number, d: Dict): Destination | null {
  const id = idForNumber(n);
  return id === null ? null : resolveDestination(id, d);
}

/**
 * The whole menu, written out for the model in English.
 *
 * English rather than the reader's language on purpose: the catalogue is
 * the same fourteen services whoever is asking, and an English list keeps
 * one prompt working for all eleven languages instead of eleven prompts
 * that drift apart. The model reads English and answers in Malayalam; that
 * is the one thing a model is unambiguously good at.
 */
export function destinationMenu(dEn: Dict): string {
  const svc = dEn.svc as Record<string, string>;
  const lines: string[] = [];

  for (const [id, page] of Object.entries(PAGES)) {
    lines.push(`${id} — ${page.blurb}`);
  }
  for (const id of Object.keys(CATALOGUE)) {
    const name = svc[`${id}Name`] ?? id;
    const short = svc[`${id}Short`] ?? "";
    lines.push(`${SVC_PREFIX}${id} — ${name}. ${short}`);
  }

  return lines.join("\n");
}
