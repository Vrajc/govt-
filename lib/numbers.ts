import type { ServiceId } from "@/lib/services/types";

/**
 * The number beside every service, and the small handful of pages worth
 * reaching the same way.
 *
 * The whole point of this file is the sentence somebody can now say out
 * loud to somebody else: "yours is number two." A name in a script the
 * listener cannot read, spelled down a bad phone line, is not a thing one
 * pensioner can pass to another. Two is.
 *
 * So the numbers are here as a written-out literal rather than derived
 * from the catalogue's order, and that is deliberate. A number that comes
 * from `Object.keys(CATALOGUE).indexOf(id)` moves the day somebody
 * reorders the catalogue for an unrelated reason — and by then the number
 * is on a piece of paper in somebody's folder, and in what a helpline
 * worker has learnt to say. Adding a service means adding a line at the
 * end; it must never mean renumbering the ones above it.
 *
 * Zero is help, because every phone menu in this country has already
 * taught this audience that zero is where the person is. That convention
 * cost nothing to honour and it is the one number somebody reaches for
 * when they are lost, which is when they can least afford to learn a new
 * rule.
 *
 * The type is `Record<ServiceId, number>`, so a service added to the
 * catalogue without a number here is a compile error rather than a card
 * that quietly has no number on it.
 */

/** 1–14, in the order the hub prints them: the three doors, top to bottom. */
const SERVICE_NUMBER: Record<ServiceId, number> = {
  // ---- starting a pension ----
  oldage: 1,
  widow: 2,
  disability: 3,
  epfpension: 4,
  govtretire: 5,
  apy: 6,
  annapurna: 7,
  // ---- already getting one ----
  lifecert: 8,
  changebank: 9,
  age80: 10,
  restorecommuted: 11,
  notarrived: 12,
  // ---- after a death in the family ----
  familypension: 13,
  nfbs: 14,
};

/**
 * The pages that are also somewhere to be sent.
 *
 * /about and /outbox are deliberately absent. A number is a thing you give
 * somebody who wants to *do* something, and the list stops being learnable
 * the moment it fills up with pages nobody is ever told to go to.
 */
const PAGE_NUMBER: Record<string, number> = {
  help: 0,
  finder: 15,
  track: 16,
};

/** `svc:oldage` — the same id space the voice assistant resolves against. */
const SVC_PREFIX = "svc:";

export interface Numbered {
  n: number;
  /** A destination id, for `resolveDestination`. */
  id: string;
}

/**
 * Every numbered thing, in the order it is printed and read out.
 *
 * Zero first: the list is shown to somebody who is looking for a way out,
 * and the way out belongs at the top of it.
 */
export const NUMBERED: readonly Numbered[] = [
  ...Object.entries(PAGE_NUMBER).map(([id, n]) => ({ n, id })),
  ...Object.entries(SERVICE_NUMBER).map(([id, n]) => ({ n, id: `${SVC_PREFIX}${id}` })),
].sort((a, b) => a.n - b.n);

const BY_NUMBER = new Map<number, string>(NUMBERED.map(({ n, id }) => [n, id]));

/** The number for a destination id, or null for one that has none. */
export function numberOf(id: string): number | null {
  if (id.startsWith(SVC_PREFIX)) {
    const svc = id.slice(SVC_PREFIX.length) as ServiceId;
    return SERVICE_NUMBER[svc] ?? null;
  }
  return PAGE_NUMBER[id] ?? null;
}

/** The destination id somebody meant when they said a number. */
export function idForNumber(n: number): string | null {
  return BY_NUMBER.get(n) ?? null;
}

export function isNumber(n: number): boolean {
  return BY_NUMBER.has(n);
}

/** The largest number in use, for the "1 to 16" the box tells people. */
export const HIGHEST = NUMBERED[NUMBERED.length - 1].n;

/**
 * Where each script keeps its zero.
 *
 * A Gujarati keyboard types ૭, not 7, and a recogniser handed a spoken
 * number in Odia writes ୭. Both mean the same door. Ten blocks of nine
 * lines of arithmetic is the entire cost of not caring which alphabet the
 * digits arrived in — and refusing ૭ would be refusing the number in the
 * script of the person we printed it for.
 */
const ZEROS = [
  0x0966, // Devanagari — Hindi, Marathi
  0x09e6, // Bengali
  0x0a66, // Gurmukhi — Punjabi
  0x0ae6, // Gujarati
  0x0b66, // Odia
  0x0be6, // Tamil
  0x0c66, // Telugu
  0x0ce6, // Kannada
  0x0d66, // Malayalam
];

/** Any script's digits, rewritten as the ones a `Number()` understands. */
export function toAsciiDigits(text: string): string {
  let out = "";
  for (const ch of text) {
    const cp = ch.codePointAt(0) ?? 0;
    const zero = ZEROS.find((z) => cp >= z && cp <= z + 9);
    out += zero === undefined ? ch : String(cp - zero);
  }
  return out;
}

/**
 * What somebody typed into the number box, as a number.
 *
 * Lenient on purpose: it throws away everything that is not a digit, so
 * "no. 7", "7." and a stray space all arrive as 7. Whether 7 is a number
 * this app has is `idForNumber`'s question, not this one's — the box has
 * to be able to tell "you typed nothing" apart from "there is no 77".
 */
export function parseNumber(raw: string): number | null {
  const digits = toAsciiDigits(raw).replace(/\D+/g, "");
  if (!digits || digits.length > 2) return null;
  return Number(digits);
}

/**
 * A sentence that is nothing but a number.
 *
 * Strict, and strict for one reason: "I am 65 years old" contains a number
 * and is not a request to go anywhere. Only an utterance with no words in
 * it at all is treated as somebody dialling.
 */
export function onlyANumber(raw: string): number | null {
  const bare = toAsciiDigits(raw).replace(/[\s.,-]+/g, "");
  return /^\d{1,2}$/.test(bare) ? Number(bare) : null;
}

/**
 * The number for a service. Never null: the record above is keyed by
 * `ServiceId`, so a service that reaches here has one by construction.
 */
export function numberOfService(id: ServiceId): number {
  return SERVICE_NUMBER[id];
}
