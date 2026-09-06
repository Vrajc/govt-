import type { Dict } from "@/lib/i18n";
import { fill } from "@/lib/i18n/util";
import { CATALOGUE } from "@/lib/services/catalogue";
import { toDevanagariAny } from "@/lib/speech";
import { pageDestination, serviceDestination, type Destination } from "./destinations";

/**
 * The answer when there is no model — no key, no network, or a model that
 * took too long.
 *
 * It is built entirely out of strings the app already has translated,
 * which is the only reason it can answer in eleven languages without a
 * word of new copy per language. The match is done against the service
 * names and descriptions *in the reader's own language*, so a Kannada
 * speaker saying "ವಿಧವಾ ಪಿಂಚಣಿ" is matched on the Kannada dictionary and
 * never has to route through English.
 *
 * When nothing matches it says so and offers the four questions, which is
 * the honest answer and also the right one — the finder exists precisely
 * for people who cannot name what they need.
 */

export interface Answer {
  say: string;
  steps: string[];
  goto: Destination | null;
}

/** Words too short to carry meaning in any of the eleven scripts. */
const MIN_TOKEN = 3;

/**
 * One script for both sides of the comparison.
 *
 * The words arriving here have been through a speech recogniser, and the
 * recogniser does not necessarily write in the alphabet the reader chose.
 * Google has no Odia transcriber at all; a phone set up in Hindi can hand
 * back Devanagari for a Gujarati sentence. The dictionary is in the
 * reader's script and the sentence may not be, and a match that compares
 * them letter for letter reads that mismatch as "we did not understand
 * you" — which is the one thing this fallback exists not to say.
 *
 * Every one of these scripts is Devanagari at a fixed offset, so putting
 * both sides in Devanagari costs one pass over the string and makes the
 * question of which alphabet the words arrived in stop mattering.
 */
function normalise(text: string): string {
  return toDevanagariAny(text.toLowerCase());
}

function tokens(text: string): string[] {
  return normalise(text)
    // Punctuation and digits out; every Indic script keeps its letters and
    // its combining marks, which \p{L} and \p{M} between them cover.
    .replace(/[^\p{L}\p{M}\s]/gu, " ")
    .split(/\s+/)
    .filter((w) => w.length >= MIN_TOKEN);
}

/**
 * Every service's text, lowercased, in the reader's language.
 *
 * Built once per language and kept against the dictionary object itself,
 * which `dictFor` caches — so this is eleven small maps at most, and a
 * WeakMap means a language nobody asks for again is collectable.
 */
const INDEXES = new WeakMap<Dict, Map<string, Fields>>();

interface Fields {
  name: string;
  short: string;
  who: string;
  all: string;
}

function indexOf(d: Dict): Map<string, Fields> {
  const cached = INDEXES.get(d);
  if (cached) return cached;

  const svc = d.svc as Record<string, string>;
  const index = new Map<string, Fields>();
  for (const id of Object.keys(CATALOGUE)) {
    const name = normalise(svc[`${id}Name`] ?? "");
    const short = normalise(svc[`${id}Short`] ?? "");
    const who = normalise(svc[`${id}Who`] ?? "");
    index.set(id, { name, short, who, all: `${name} ${short} ${who}` });
  }
  INDEXES.set(d, index);
  return index;
}

/**
 * A word that describes more than this many of the fourteen describes none
 * of them.
 *
 * This is the whole difference between a matcher that works and one that
 * embarrasses you. "Pension" is in all fourteen. So is "month", near
 * enough — and without this, "my husband died last month" scored highest
 * on *Free grain every month*, which is a wrong, confident answer read
 * aloud to a widow. Every language gets this for free: the count is taken
 * over that language's own strings, so the words it throws away are the
 * words that are common in it.
 */
const TOO_COMMON = 4;

/**
 * Substring rather than equality, because every one of these languages
 * inflects: ಪಿಂಚಣಿಗೆ is ಪಿಂಚಣಿ with a case ending, and a match that insists
 * on the bare stem finds nothing a person actually says out loud.
 */
function hits(said: string[], field: string, weight: number): number {
  let total = 0;
  for (const word of said) {
    if (field.includes(word)) total += weight;
  }
  return total;
}

export function matchService(text: string, d: Dict): string | null {
  const index = indexOf(d);
  const said = [...new Set(tokens(text))].filter((word) => {
    let seen = 0;
    for (const f of index.values()) if (f.all.includes(word)) seen++;
    return seen > 0 && seen <= TOO_COMMON;
  });
  if (!said.length) return null;

  let best: string | null = null;
  let bestScore = 0;
  let runnerUp = 0;

  for (const [id, f] of index) {
    const total = hits(said, f.name, 3) + hits(said, f.short, 2) + hits(said, f.who, 1);
    if (total > bestScore) {
      runnerUp = bestScore;
      bestScore = total;
      best = id;
    } else if (total > runnerUp) {
      runnerUp = total;
    }
  }

  // One weak overlap is a coincidence, and a tie is a question rather than
  // an answer — "my husband died" fits the family pension and the family
  // benefit equally, and they are for different households. Both cases go
  // to the four questions, which exist for exactly this.
  if (bestScore < 3 || bestScore === runnerUp) return null;
  return best;
}

type T = (path: string, vars?: Record<string, string | number>) => string;

/**
 * The `t` of app-state, for a server that has no React context. Same
 * "section.key" paths, same {name} interpolation, so a string moved
 * between the two reads identically.
 */
export function tFor(d: Dict): T {
  return (path, vars) => {
    const [section, key] = path.split(".");
    const table = (d as unknown as Record<string, Record<string, string>>)[section];
    const raw = table?.[key];
    return raw === undefined ? path : fill(raw, vars);
  };
}

export function fallbackAnswer(text: string, d: Dict, t: T): Answer {
  const id = matchService(text, d);

  if (!id) {
    return {
      say: t("voice.fallbackNone"),
      steps: [t("voice.stepFinder"), t("voice.stepWho")],
      goto: pageDestination("finder", d),
    };
  }

  const goto = serviceDestination(id, d);
  const service = goto?.label ?? "";
  const needsPhoto = CATALOGUE[id as keyof typeof CATALOGUE]?.needsPhoto;

  return {
    say: t("voice.fallbackSay", { service }),
    steps: [
      t("voice.stepOpen", { service }),
      t("voice.stepWho"),
      t("voice.stepPapers"),
      ...(needsPhoto ? [t("voice.stepFace")] : []),
      t("voice.stepSend"),
    ],
    goto,
  };
}
