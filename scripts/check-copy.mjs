#!/usr/bin/env node
/**
 * Copy-rule linter for every dictionary (MASTER_PROMPT §9).
 *
 * The banned-word list is not stylistic fussiness: every word on it is a
 * word that has actually stopped an elderly user in a government form. This
 * runs in CI-shaped fashion (`npm run check:copy`) so a well-meaning edit
 * cannot quietly reintroduce "verification failed".
 *
 * Since the dictionaries gained a fallback chain, a *missing* key is no
 * longer a bug — it resolves to Hindi or English and the reader gets a
 * sentence. Three things are still bugs, and this checks all three:
 *
 *   1. a key that exists in a language but not in English — a typo, which
 *      would silently keep the English string forever;
 *   2. a value copied from English and left there — the fallback would have
 *      done that anyway, and the copy now looks translated when it is not;
 *   3. any gap at all in a language the demo is given in.
 *
 * Everything else is reported as coverage, not as a failure, so a language
 * can ship its first hundred strings without failing the build.
 */
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

/** The languages the product is actually demonstrated in. These must be whole. */
const MUST_BE_COMPLETE = new Set(["en", "hi", "gu"]);

const BANNED = [
  "biometric",
  "authentication",
  "authenticate",
  "verification",
  "invalid",
  "rejected",
  "portal",
  "kyc",
];

/**
 * Words banned as jargon but legitimate in other senses, so they are matched
 * only as whole words and only in English copy.
 */
const BANNED_EN_ONLY = ["submit", "error", "failed", "certificate"];

/** Allowed despite the list, with the reason. */
const ALLOWED = new Map([
  // "Digital Life Certificate" never appears in the UI; this is the /about
  // technical note naming the real system, which judges need to see.
  ["pension life certificate", "names the real government artefact on /about"],
  // The ban on "certificate" exists so we never say "your certificate was
  // rejected". It must not stop us naming the physical paper a citizen has
  // to walk to an office and collect, by the name printed on it.
  ["death certificate", "the name on the paper in the widow's folder"],
  ["disability certificate", "the name on the paper from the hospital"],
]);

const EMOJI = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/u;

/** Pull every `key: "value"` pair out of a dictionary file. */
function readDict(file) {
  const path = join(root, "lib/i18n", file);
  if (!existsSync(path)) return null;
  const src = readFileSync(path, "utf8");
  const out = [];
  const re = /^\s{2,}([A-Za-z0-9_]+):\s*\n?\s*"((?:[^"\\]|\\.)*)"/gm;
  let m;
  while ((m = re.exec(src)) !== null) out.push({ key: m[1], value: m[2] });
  return out;
}

/** The language list, read out of the registry rather than repeated here. */
const registry = readFileSync(join(root, "lib/i18n/languages.ts"), "utf8");
const codes = [...registry.matchAll(/\{ code: "(\w+)", native: "([^"]+)", english: "([^"]+)"/g)].map(
  (m) => ({ code: m[1], native: m[2], english: m[3] }),
);

/** Both halves of each dictionary: the original journey and the catalogue. */
function load(code) {
  const base = readDict(`${code}.ts`);
  const svc = readDict(`svc-${code}.ts`);
  if (base === null && svc === null) return null;
  return [...(base ?? []), ...(svc ?? [])];
}

const en = load("en");
const enMap = new Map(en.map((e) => [e.key, e.value]));

const present = [];
const absent = [];
for (const l of codes) {
  if (l.code === "en") continue;
  const dict = load(l.code);
  if (dict === null) absent.push(l);
  else present.push({ ...l, dict, map: new Map(dict.map((e) => [e.key, e.value])) });
}

let failures = 0;
const warn = (msg) => {
  console.log(`  ✗ ${msg}`);
  failures++;
};

console.log(
  `${en.length} English strings; ${present.length} other language${present.length === 1 ? "" : "s"} on disk\n`,
);

/* ---------------- 1. banned words ---------------- */
console.log("1. Banned words");
for (const { key, value } of en) {
  const low = value.toLowerCase();
  if ([...ALLOWED.keys()].some((a) => low.includes(a))) continue;

  for (const word of [...BANNED, ...BANNED_EN_ONLY]) {
    if (new RegExp(`\\b${word}`, "i").test(low)) {
      warn(`en.${key} contains "${word}": ${value.slice(0, 90)}`);
    }
  }
}
for (const { code, dict } of present) {
  for (const { key, value } of dict) {
    for (const word of BANNED) {
      if (new RegExp(`\\b${word}`, "i").test(value.toLowerCase())) {
        warn(`${code}.${key} contains "${word}"`);
      }
    }
  }
}
if (failures === 0) console.log("  ✓ none found");

/* ---------------- 2. punctuation and emoji ---------------- */
const before2 = failures;
console.log("\n2. No exclamation marks, no emoji in body copy");
for (const { code, dict } of [{ code: "en", dict: en }, ...present]) {
  for (const { key, value } of dict) {
    if (value.includes("!")) warn(`${code}.${key} has an exclamation mark`);
    if (EMOJI.test(value)) warn(`${code}.${key} has an emoji`);
  }
}
if (failures === before2) console.log("  ✓ clean");

/* ---------------- 3. keys that do not exist in English ---------------- */
const before3 = failures;
console.log("\n3. No key that English does not have");
for (const { code, dict } of present) {
  for (const { key } of dict) {
    if (!enMap.has(key)) warn(`${code}.${key} is not a key in English — typo, or dead copy`);
  }
}
if (failures === before3) console.log("  ✓ clean");

/* ---------------- 4. nothing left sitting in English ---------------- */
const before4 = failures;
console.log("\n4. Nothing translated into English");
/* Some values are legitimately identical across languages: the helpline
   number, a BCP-47 tag, the PPO placeholder, the trilingual taglines. */
const identicalIsFine = (key, value) =>
  /^[\d\s+-]+$/.test(value) ||
  /^[a-z]{2}(-[A-Z]{2})?$/.test(value) ||
  key === "ppoPlaceholder" ||
  key.startsWith("tagline") ||
  key === "htmlLang" ||
  value.length <= 3;

for (const { code, map } of present) {
  for (const [key, value] of enMap) {
    const mine = map.get(key);
    if (mine === undefined) continue; // a gap is the fallback's job, not a fault
    if (mine === value && !identicalIsFine(key, value)) {
      warn(`${code}.${key} is still the English string: "${value.slice(0, 60)}"`);
    }
  }
}
if (failures === before4) console.log("  ✓ clean");

/* ---------------- 5. sentence case on buttons ---------------- */
const before5 = failures;
console.log("\n5. Sentence case (no Title Case On Buttons)");
for (const { key, value } of en) {
  // The receipt stamp is a rubber stamp. Rubber stamps are all-caps.
  if (key.startsWith("stamp")) continue;
  /* Check each sentence on its own. "Find your pension. Claim it. Keep it."
     is three sentences in correct sentence case, and counting capitals
     across the whole string reads it as Title Case. */
  for (const sentence of value.split(/(?<=[.?!])\s+/)) {
    const words = sentence
      .split(" ")
      .filter((w) => /^[A-Za-z]+$/.test(w))
      // PF, PPO, IFSC, UAN, BPL are acronyms, not capitalised words.
      .filter((w) => !/^[A-Z]{2,5}$/.test(w))
      // The first word of a sentence is supposed to be capitalised.
      .slice(1);
    if (words.length < 3) continue;
    const capped = words.filter((w) => /^[A-Z]/.test(w)).length;
    if (capped >= words.length - 1) {
      warn(`en.${key} looks like Title Case: "${sentence.slice(0, 60)}"`);
      break;
    }
  }
}
if (failures === before5) console.log("  ✓ clean");

/* ---------------- 6. coverage ---------------- */
console.log("\n6. Coverage against English");
const bar = (pct) => "█".repeat(Math.round(pct / 5)).padEnd(20, "·");
for (const l of codes) {
  if (l.code === "en") {
    console.log(`  ${l.code.padEnd(3)} ${bar(100)} 100%  ${l.english}`);
    continue;
  }
  const row = present.find((p) => p.code === l.code);
  if (!row) {
    console.log(`  ${l.code.padEnd(3)} ${bar(0)}   0%  ${l.english} — not written yet, falls back`);
    continue;
  }
  const have = [...enMap.keys()].filter((k) => row.map.has(k)).length;
  const pct = Math.round((have / enMap.size) * 100);
  const note = MUST_BE_COMPLETE.has(l.code) && pct < 100 ? "  ✗ must be complete" : "";
  console.log(`  ${l.code.padEnd(3)} ${bar(pct)} ${String(pct).padStart(3)}%  ${l.english}${note}`);
  if (MUST_BE_COMPLETE.has(l.code) && pct < 100) {
    for (const [key] of enMap) {
      if (!row.map.has(key)) warn(`${l.code} is missing "${key}"`);
    }
  }
}
for (const l of absent) {
  if (MUST_BE_COMPLETE.has(l.code)) warn(`${l.code} has no dictionary file at all`);
}

console.log(
  failures === 0
    ? "\nAll copy rules pass."
    : `\n${failures} problem${failures === 1 ? "" : "s"} found.`,
);
process.exit(failures === 0 ? 0 : 1);
