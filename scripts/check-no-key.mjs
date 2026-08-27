#!/usr/bin/env node
/**
 * Build-output audit (MASTER_PROMPT §10).
 *
 * Two things must be true of every production build:
 *   1. No OpenAI key, and no trace of the OpenAI SDK, reaches the browser.
 *   2. Nothing in the client bundle even knows the API host exists.
 *
 * Run after `next build`.
 */
import { readdirSync, readFileSync, statSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const staticDir = join(root, ".next", "static");

if (!existsSync(staticDir)) {
  console.error("No .next/static — run `npm run build` first.");
  process.exit(1);
}

/** Patterns that must never appear in anything the browser downloads. */
const FORBIDDEN = [
  { label: "the literal env var name", re: /OPENAI_API_KEY/ },
  { label: "an OpenAI secret key", re: /\bsk-[A-Za-z0-9_-]{20,}/ },
  { label: "the OpenAI API host", re: /api\.openai\.com/ },
  { label: "an OpenAI SDK user-agent", re: /OpenAI\/JS/ },
];

function* walk(dir) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) yield* walk(full);
    else yield full;
  }
}

let checked = 0;
let hits = 0;

for (const file of walk(staticDir)) {
  if (!/\.(js|mjs|css|json|txt|map)$/.test(file)) continue;
  checked++;
  const text = readFileSync(file, "utf8");
  for (const { label, re } of FORBIDDEN) {
    if (re.test(text)) {
      console.log(`  ✗ ${label} found in ${file.replace(root, ".")}`);
      hits++;
    }
  }
}

console.log(`Scanned ${checked} client files in .next/static`);
console.log(
  hits === 0
    ? "  ✓ no key, no SDK, no API host in the client bundle"
    : `  ${hits} problem(s) found`
);
process.exit(hits === 0 ? 0 : 1);
