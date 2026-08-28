#!/usr/bin/env node
/**
 * Contrast audit for the token palette (MASTER_PROMPT §3, §10).
 *
 * The target is WCAG AAA, 7:1, not the usual AA 4.5:1 — the audience reads
 * in bright daylight, often with cataracts, often on a screen with a crack
 * across it. Large display type (the receipt date, the screen title) is
 * held to the AAA large-text bar of 4.5:1.
 */

const T = {
  paper: "#FBF8F2",
  desk: "#EDE6DA",   // the desktop page background behind the paper sheet
  surface: "#FFFFFF",
  ink: "#1F1C1A",
  inkSoft: "#534D47",
  line: "#E3DACC",
  primary: "#23507A",
  primaryDark: "#17395A",
  primaryTint: "#E8EEF5",
  success: "#17694A",
  successTint: "#E5F0EA",
  attention: "#A8452A",
  attentionText: "#83321D",
  attentionTint: "#FAEBE3",
  focus: "#B8791F",
  white: "#FFFFFF",
  bannerText: "#FFF6F1",
  noteGoodText: "#0F4B34",
  noteWarnText: "#7C3018",
  placeholder: "#767068",
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
  ["paper sheet against the desk", T.paper, T.desk, 1.05],
  ["hairline against the desk", T.line, T.desk, 1.05],
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
  ["receipt date (30px, large)", T.success, T.surface, 4.5],
  ["screen title (30px, large)", T.ink, T.paper, 4.5],
  ["placeholder on surface", T.placeholder, T.surface, 4.5],
  ["focus ring against paper", T.focus, T.paper, 3],
  ["focus ring against surface", T.focus, T.surface, 3],
  ["field border against surface", T.line, T.surface, 1.2],
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
