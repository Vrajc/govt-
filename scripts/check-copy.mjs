#!/usr/bin/env node
/**
 * Copy-rule linter for the three dictionaries (MASTER_PROMPT §9).
 *
 * The banned-word list is not stylistic fussiness: every word on it is a
 * word that has actually stopped an elderly user in a government form. This
 * runs in CI-shaped fashion (`npm run check:copy`) so a well-meaning edit
 * cannot quietly reintroduce "verification failed".
 *
 * It also checks that hi.ts and gu.ts have exactly the key set of en.ts —
 * TypeScript catches missing keys, but not a key left as English filler.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

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
  const src = readFileSync(join(root, "lib/i18n", file), "utf8");
  const out = [];
  const re = /^\s{2,}([A-Za-z0-9_]+):\s*\n?\s*"((?:[^"\\]|\\.)*)"/gm;
  let m;
  while ((m = re.exec(src)) !== null) out.push({ key: m[1], value: m[2] });
  return out;
}

// Both halves of each dictionary: the original journey and the catalogue.
const en = [...readDict("en.ts"), ...readDict("svc-en.ts")];
const hi = [...readDict("hi.ts"), ...readDict("svc-hi.ts")];
const gu = [...readDict("gu.ts"), ...readDict("svc-gu.ts")];

let failures = 0;
const warn = (msg) => {
  console.log(`  ✗ ${msg}`);
  failures++;
};

console.log(`Checking ${en.length} English strings, ${hi.length} Hindi, ${gu.length} Gujarati\n`);

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
for (const [name, dict] of [
  ["hi", hi],
  ["gu", gu],
]) {
  for (const { key, value } of dict) {
    for (const word of BANNED) {
      if (new RegExp(`\\b${word}`, "i").test(value.toLowerCase())) {
        warn(`${name}.${key} contains "${word}"`);
      }
    }
  }
}
if (failures === 0) console.log("  ✓ none found");

/* ---------------- 2. punctuation and emoji ---------------- */
const before2 = failures;
console.log("\n2. No exclamation marks, no emoji in body copy");
for (const [name, dict] of [
  ["en", en],
  ["hi", hi],
  ["gu", gu],
]) {
  for (const { key, value } of dict) {
    if (value.includes("!")) warn(`${name}.${key} has an exclamation mark`);
    if (EMOJI.test(value)) warn(`${name}.${key} has an emoji`);
  }
}
if (failures === before2) console.log("  ✓ clean");

/* ---------------- 3. translation completeness ---------------- */
const before3 = failures;
console.log("\n3. Every English key is translated, and not left as English");
const enMap = new Map(en.map((e) => [e.key, e.value]));

for (const [name, dict] of [
  ["hi", hi],
  ["gu", gu],
]) {
  const map = new Map(dict.map((e) => [e.key, e.value]));
  for (const [key, value] of enMap) {
    if (!map.has(key)) {
      warn(`${name} is missing "${key}"`);
      continue;
    }
    const translated = map.get(key);
    // Some values are legitimately identical across languages: the helpline
    // number, the BCP-47 tag, the PPO placeholder, the trilingual taglines.
    const identicalIsFine =
      /^[\d\s+-]+$/.test(value) ||
      /^[a-z]{2}(-[A-Z]{2})?$/.test(value) ||
      key === "ppoPlaceholder" ||
      key.startsWith("tagline") ||
      key === "htmlLang";
    if (translated === value && !identicalIsFine && value.length > 3) {
      warn(`${name}.${key} is still the English string: "${value.slice(0, 60)}"`);
    }
  }
}
if (failures === before3) console.log("  ✓ complete");

/* ---------------- 4. sentence case on buttons ---------------- */
const before4 = failures;
console.log("\n4. Sentence case (no Title Case On Buttons)");
for (const { key, value } of en) {
  // The receipt stamp is a rubber stamp. Rubber stamps are all-caps.
  if (key.startsWith("stamp")) continue;
  const words = value
    .split(" ")
    .filter((w) => /^[A-Za-z]+$/.test(w))
    // PF, PPO, IFSC, UAN, BPL are acronyms, not capitalised words. Counting
    // them as Title Case flags perfectly good sentences like "The PF office".
    .filter((w) => !/^[A-Z]{2,5}$/.test(w));
  if (words.length < 3) continue;
  const capped = words.filter((w) => /^[A-Z]/.test(w)).length;
  if (capped >= words.length - 1 && words.length >= 3) {
    warn(`en.${key} looks like Title Case: "${value.slice(0, 60)}"`);
  }
}
if (failures === before4) console.log("  ✓ clean");

console.log(
  failures === 0
    ? "\nAll copy rules pass."
    : `\n${failures} problem${failures === 1 ? "" : "s"} found.`
);
process.exit(failures === 0 ? 0 : 1);
