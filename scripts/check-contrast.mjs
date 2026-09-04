#!/usr/bin/env node
/**
 * Contrast audit for the token palette (MASTER_PROMPT §3, §10).
 *
 * The target is WCAG AAA, 7:1, not the usual AA 4.5:1 — the audience reads
 * in bright daylight, often with cataracts, often on a screen with a crack
 * across it. Large display type (the receipt date, the screen title) is
 * held to the AAA large-text bar of 4.5:1.
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

/**
 * The palette is read out of globals.css, never restated here.
 *
 * It used to be a copy of the token block. That copy passed cleanly on the
 * day the ground changed from cream to tan, reporting ratios for colours
 * the site no longer used — an audit that cannot fail is worse than no
 * audit, because it is trusted. Every value below now comes from the one
 * place the browser reads it from too.
 */
const cssPath = join(dirname(fileURLToPath(import.meta.url)), "..", "app", "globals.css");
const css = readFileSync(cssPath, "utf8");
/* The first :root block is the light palette; later ones are overrides. */
const rootBlock = css.slice(css.indexOf(":root"), css.indexOf("}", css.indexOf(":root")));

function token(name, fallback) {
  const m = new RegExp(`--${name}\\s*:\\s*(#[0-9A-Fa-f]{6})`).exec(rootBlock);
  if (m) return m[1];
  if (fallback) return fallback;
  console.error(`  Missing token --${name} in globals.css`);
  process.exit(1);
}

const T = {
  paper: token("paper"),
  surface: token("surface"),
  ink: token("ink"),
  inkSoft: token("ink-soft"),
  line: token("line"),
  lineStrong: token("line-strong"),
  primary: token("primary"),
  primaryDark: token("primary-dark"),
  primaryTint: token("primary-tint"),
  success: token("success"),
  successTint: token("success-tint"),
  attention: token("attention"),
  attentionText: token("attention-text"),
  attentionTint: token("attention-tint"),
  focus: token("focus"),
  white: "#FFFFFF",
  bannerText: "#FFF6F1",
  noteGoodText: token("note-good"),
  noteWarnText: token("note-warn"),
  placeholder: token("placeholder"),
};

function srgb(c) {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
}
function luminance(hex) {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return 0.2126 * srgb(r) + 0.7152 * srgb(g) + 0.0722 * srgb(b);
}
function ratio(a, b) {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/** [description, foreground, background, required ratio] */
const PAIRS = [
  ["body text on paper", T.ink, T.paper, 7],
  /* Two checks went with the sheet — the paper against the desk, and the
     hairline against it. The page is the paper now, edge to edge, and
     there is no second ground behind it to be told apart from. */
  ["body text on surface", T.ink, T.surface, 7],
  ["secondary text on paper", T.inkSoft, T.paper, 7],
  ["secondary text on surface", T.inkSoft, T.surface, 7],
  ["helper text on tint panel", T.inkSoft, T.primaryTint, 7],
  ["primary button label", T.white, T.primary, 7],
  ["primary button label (hover)", T.white, T.primaryDark, 7],
  ["secondary button label", T.primaryDark, T.surface, 7],
  ["secondary button label (hover)", T.primaryDark, T.primaryTint, 7],
  ["link on paper", T.primaryDark, T.paper, 7],
  ["good note text", T.noteGoodText, T.successTint, 7],
  ["warn note text", T.noteWarnText, T.attentionTint, 7],
  ["field error text on paper", T.attentionText, T.paper, 7],
  ["field error text on surface", T.attentionText, T.surface, 7],
  ["prototype banner text", T.bannerText, T.attention, 4.5],
  ["stamp ink on surface", T.success, T.surface, 4.5],
  ["receipt date (26px bold, large)", T.success, T.surface, 4.5],
  ["screen title (25px bold, large)", T.ink, T.paper, 4.5],
  ["amount chip on its tint", T.noteGoodText, T.successTint, 7],
  ["placeholder on surface", T.placeholder, T.surface, 4.5],
  ["focus ring against paper", T.focus, T.paper, 3],
  ["focus ring against surface", T.focus, T.surface, 3],
  /* 1.4.11 asks for 3:1 around anything you press or type into. The
     hairline is 1.4:1 and was drawn at 2px to compensate, which is not a
     thing the ratio cares about — hence a second, darker line for controls,
     checked here against all three grounds it is ever drawn on. */
  ["control border on surface", T.lineStrong, T.surface, 3],
  ["control border on paper", T.lineStrong, T.paper, 3],
  ["control border on tint panel", T.lineStrong, T.primaryTint, 3],
];

let failed = 0;
console.log("Contrast audit — AAA target is 7:1, large text 4.5:1\n");
for (const [label, fg, bg, need] of PAIRS) {
  const r = ratio(fg, bg);
  const ok = r >= need;
  if (!ok) failed++;
  console.log(
    `  ${ok ? "✓" : "✗"} ${r.toFixed(2).padStart(6)}:1  (needs ${String(need).padStart(4)})  ${label}`
  );
}

console.log(
  failed === 0
    ? "\nEvery pair meets its target."
    : `\n${failed} pair${failed === 1 ? "" : "s"} below target.`
);
process.exit(failed === 0 ? 0 : 1);
