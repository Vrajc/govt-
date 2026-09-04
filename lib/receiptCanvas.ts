import type { Lang } from "./types";
import type { PublicRecord } from "./publicRecord";

/**
 * "Save this" — draws the receipt onto a canvas and hands back a PNG.
 *
 * Drawn by hand rather than screenshotted from the DOM: html2canvas and
 * friends are ~200 KB, which is more than the entire rest of this app, and
 * they render Indic scripts badly. Canvas `fillText` reads the same font
 * stack the page already loaded, so every script comes out right.
 */

export interface ReceiptStrings {
  head: string;
  ppoLabel: string;
  bigLabel: string;
  bigValue: string;
  refLabel: string;
  onLabel: string;
  safeUntil: string;
  stampTop: string;
  stampMiddle: string;
  stampBottom: string;
  disclosure: string;
}

const W = 900;
const H = 1180;
const PAD = 64;

const INK = "#1F1C1A";
const SOFT = "#56504A";
const LINE = "#E3DACC";
const RULE = "#F1EADD";
const GREEN = "#17694A";

/* Only reached if the custom property is missing — a canvas drawn before the
   stylesheet applied, or a browser that will not compute it. Named families
   rather than the next/font hashes, which are not knowable from here. */
const FALLBACK: Record<string, string> = {
  deva: '"Noto Sans Devanagari", "Nirmala UI"',
  gujr: '"Noto Sans Gujarati", "Nirmala UI"',
  beng: '"Noto Sans Bengali", "Nirmala UI", "Vrinda"',
  telu: '"Noto Sans Telugu", "Nirmala UI", "Gautami"',
  taml: '"Noto Sans Tamil", "Nirmala UI", "Latha"',
  knda: '"Noto Sans Kannada", "Nirmala UI", "Tunga"',
  mlym: '"Noto Sans Malayalam", "Nirmala UI", "Kartika"',
  guru: '"Noto Sans Gurmukhi", "Nirmala UI", "Raavi"',
  orya: '"Noto Sans Oriya", "Nirmala UI", "Kalinga"',
  latn: '"Noto Sans"',
};

/**
 * The stack the page is already using, read off the document rather than
 * restated here.
 *
 * This used to be a two-line map of Hindi and Gujarati, which was correct
 * when there were three languages and silently wrong at eleven: every other
 * Indic language fell through to Noto Sans, which has no Tamil or Odia in
 * it, and the receipt — the one thing a pensioner saves to show their son —
 * came out as empty boxes. `--font-ui` is set per script on `<html>` and
 * resolves to the face that was already downloaded for this language, so
 * reading it is both correct today and incapable of drifting tomorrow.
 */
function fontStack(lang: Lang): string {
  if (typeof document !== "undefined") {
    const ui = getComputedStyle(document.documentElement)
      .getPropertyValue("--font-ui")
      .trim();
    if (ui) return ui;
  }
  const cls = typeof document !== "undefined" ? document.documentElement.className : "";
  const script = /script-(\w+)/.exec(cls)?.[1] ?? (lang === "en" ? "latn" : "deva");
  return `${FALLBACK[script] ?? FALLBACK.latn}, system-ui, sans-serif`;
}

export function drawReceipt(
  record: PublicRecord,
  lang: Lang,
  s: ReceiptStrings,
  dates: { created: string; valid: string; ppo: string }
): HTMLCanvasElement | null {
  const canvas = document.createElement("canvas");
  // 2x for a screen that will be pinch-zoomed and possibly printed.
  const scale = 2;
  canvas.width = W * scale;
  canvas.height = H * scale;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.scale(scale, scale);

  const face = fontStack(lang);
  const set = (weight: number, size: number) => {
    ctx.font = `${weight} ${size}px ${face}`;
  };

  /* ---- paper ---- */
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, W, H);

  // passbook ruling
  ctx.strokeStyle = RULE;
  ctx.lineWidth = 1;
  for (let y = 150; y < H - 60; y += 52) {
    ctx.beginPath();
    ctx.moveTo(PAD - 24, y);
    ctx.lineTo(W - PAD + 24, y);
    ctx.stroke();
  }

  // double border
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3;
  ctx.strokeRect(18, 18, W - 36, H - 36);
  ctx.strokeStyle = LINE;
  ctx.lineWidth = 1.5;
  ctx.strokeRect(32, 32, W - 64, H - 64);

  let y = 118;

  /* ---- header ---- */
  ctx.fillStyle = SOFT;
  set(700, 22);
  ctx.fillText(s.head.toUpperCase(), PAD, y);
  y += 74;

  /* ---- name ---- */
  ctx.fillStyle = INK;
  set(700, 46);
  y = wrap(ctx, record.name, PAD, y, W - PAD * 2, 56);
  y += 22;

  /* ---- meta ---- */
  ctx.fillStyle = SOFT;
  set(400, 26);
  for (const line of [
    `${s.ppoLabel}: ${dates.ppo}`,
    `${s.refLabel}: ${record.id}`,
    `${s.onLabel}: ${dates.created}`,
  ]) {
    ctx.fillText(line, PAD, y);
    y += 42;
  }

  /* ---- rule ---- */
  y += 24;
  ctx.strokeStyle = LINE;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(PAD, y);
  ctx.lineTo(W - PAD, y);
  ctx.stroke();
  y += 62;

  /* ---- the one big number ---- */
  ctx.fillStyle = SOFT;
  set(400, 26);
  ctx.fillText(s.bigLabel || s.safeUntil, PAD, y);
  y += 60;

  ctx.fillStyle = GREEN;
  set(700, 54);
  y = wrap(ctx, s.bigValue || dates.valid, PAD, y, W - PAD * 2, 64);

  /* ---- stamp ---- */
  drawStamp(ctx, W - 230, H - 300, 130, face, s);

  /* ---- disclosure, always travels with the artefact ---- */
  ctx.fillStyle = SOFT;
  set(400, 20);
  wrap(ctx, s.disclosure, PAD, H - 76, W - PAD * 2 - 40, 28);

  return canvas;
}

function wrap(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number
): number {
  const words = text.split(" ");
  let line = "";
  let cursor = y;
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, x, cursor);
      cursor += lineHeight;
      line = word;
    } else {
      line = test;
    }
  }
  if (line) {
    ctx.fillText(line, x, cursor);
    cursor += lineHeight;
  }
  return cursor;
}

function drawStamp(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  face: string,
  s: ReceiptStrings
) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate((-9 * Math.PI) / 180); // the crooked press of a real stamp
  ctx.globalAlpha = 0.88;
  ctx.strokeStyle = GREEN;
  ctx.fillStyle = GREEN;

  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.stroke();

  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 0, r - 15, 0, Math.PI * 2);
  ctx.stroke();

  arcText(ctx, s.stampTop, r - 34, -Math.PI / 2, 26, face, 700, false);
  arcText(ctx, s.stampBottom, r - 34, Math.PI / 2, 20, face, 600, true);

  ctx.textAlign = "center";
  ctx.font = `700 22px ${face}`;
  ctx.fillText(s.stampMiddle, 0, 0);

  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-r * 0.42, 22);
  ctx.lineTo(r * 0.42, 22);
  ctx.stroke();

  ctx.restore();
}

/** Lays a string around a circle, one glyph at a time. */
function arcText(
  ctx: CanvasRenderingContext2D,
  text: string,
  radius: number,
  centreAngle: number,
  size: number,
  face: string,
  weight: number,
  inverted: boolean
) {
  ctx.save();
  ctx.font = `${weight} ${size}px ${face}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  const chars = [...text];
  const widths = chars.map((c) => ctx.measureText(c).width + 2);
  const total = widths.reduce((a, b) => a + b, 0);
  const totalAngle = total / radius;

  let angle = centreAngle + (inverted ? totalAngle / 2 : -totalAngle / 2);

  for (let i = 0; i < chars.length; i++) {
    const step = widths[i] / radius;
    const at = angle + (inverted ? -step / 2 : step / 2);

    ctx.save();
    ctx.rotate(at);
    ctx.translate(0, inverted ? radius : -radius);
    if (inverted) ctx.rotate(Math.PI);
    ctx.fillText(chars[i], 0, 0);
    ctx.restore();

    angle += inverted ? -step : step;
  }
  ctx.restore();
}

/** Triggers the browser download. */
export function downloadCanvas(canvas: HTMLCanvasElement, filename: string): boolean {
  try {
    const url = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    return true;
  } catch {
    return false;
  }
}
