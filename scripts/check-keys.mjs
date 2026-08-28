#!/usr/bin/env node
/**
 * Every dictionary key the catalogue asks for, checked against English.
 *
 * The copy linter compares Hindi and Gujarati against English, so it cannot
 * see a key that is missing from all three — which is exactly what happens
 * when a service is added to the catalogue and its copy is not. Those show
 * up in the browser as the raw key path ("svc.annapurnaName"), which is the
 * kind of thing that reaches a demo.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(join(root, p), "utf8");

const cat = read("lib/services/catalogue.ts");
const shared = read("lib/services/shared.ts");
const finder = read("lib/services/finder.ts");
const en = read("lib/i18n/svc-en.ts") + read("lib/i18n/en.ts");

const has = (key) => new RegExp(`^\\s*${key}:`, "m").test(en);

const missing = [];
const want = (key, why) => {
  if (!has(key)) missing.push(`${key.padEnd(28)} ${why}`);
};

/* ---- one set of strings per service ---- */
const services = [...cat.matchAll(/^  (\w+): \{\n\s*id: "\1"/gm)].map((m) => m[1]);
for (const id of services) {
  for (const suffix of ["Name", "Short", "Who", "Amount", "What"]) {
    want(`${id}${suffix}`, `service ${id}`);
  }
}

/* ---- authority keys ---- */
for (const m of cat.matchAll(/authorityKey: "(\w+)"/g)) want(m[1], "authority");

/* ---- eligibility questions and their failure messages ---- */
for (const m of cat.matchAll(/\bid: "(\w+)", type: "(yesno|age|choice)"/g)) {
  const q = m[1][0].toUpperCase() + m[1].slice(1);
  want(`q${q}`, `eligibility question ${m[1]}`);
}
for (const m of cat.matchAll(/failKey: "(\w+)"/g)) want(m[1], "eligibility failure");

/* ---- documents, fields, stages, groups ---- */
for (const m of shared.matchAll(/^  (\w+): d\("(\w+)"/gm)) {
  want(m[2], "document");
  want(`${m[2]}Hint`, "document hint");
}
for (const m of shared.matchAll(/^  (\w+): (?:f|you|home|pension|bank|newbank|household|husband|disability|work|deceased|apy|complaint)\("(\w+)"/gm)) {
  want(m[2], "field label");
}
for (const m of shared.matchAll(/^  (\w+): s\("(\w+)"/gm)) want(m[2], "stage");
for (const m of shared.matchAll(/const \w+ = g\("(\w+)"\)/g)) want(m[1], "field group");
for (const m of shared.matchAll(/labelKey: "(\w+)"/g)) want(m[1], "option label");

/* ---- finder tree ---- */
for (const m of finder.matchAll(/(?:questionKey|labelKey|subKey|messageKey): "(\w+)"/g)) {
  want(m[1], "finder");
}

/* ---- outcome kinds each need their own copy ---- */
const kinds = new Set([...cat.matchAll(/outcome: "(\w+)"/g)].map((m) => m[1]));
const OUTCOME_KEYS = {
  lifecert: ["safeUntil"],
  sanction: ["sanctionTitle", "sanctionSub", "sanctionAmount", "sanctionOrder"],
  change: ["changeTitle", "changeSub", "changeEffective"],
  increase: ["increaseTitle", "increaseSub", "increaseNow", "increaseArrears"],
  grant: ["grantTitle", "grantSub", "grantOneTime", "grantEveryMonth", "grantFrom"],
  grievance: ["grievanceTitle", "grievanceSub", "grievanceDocket"],
};
for (const k of kinds) for (const key of OUTCOME_KEYS[k] ?? []) want(key, `outcome "${k}"`);

console.log(`${services.length} services in the catalogue: ${services.join(", ")}\n`);
if (missing.length === 0) {
  console.log("Every key the catalogue asks for exists in English.");
  process.exit(0);
}
console.log(`${missing.length} key(s) missing from lib/i18n:`);
for (const m of [...new Set(missing)].sort()) console.log(`  ✗ ${m}`);
process.exit(1);
