import { lookFor } from "./services/docShapes";

/**
 * Looking at a photograph of a piece of paper, on the device, for free.
 *
 * The face camera already had a coach (`lib/imageQuality.ts`): three numbers
 * that correlate with the ways an elderly user's selfie fails. Paper fails
 * differently. A face is always roughly in the middle of the frame and
 * always roughly the same size; a ration card is somewhere on a table, at an
 * angle, with a thumb over one corner and the ceiling light bouncing off the
 * lamination straight into the lens.
 *
 * So this asks different questions, in the order that a person can act on:
 *
 *   Is there a paper in the picture at all?
 *   Is the whole of it in the picture?
 *   Is it big enough in the frame to read?
 *   Is there light on it, and is any of that light a reflection?
 *   Is there writing, and is the writing sharp?
 *
 * Nothing here is machine learning and nothing here leaves the phone. It is
 * arithmetic over about twenty-five thousand pixels, which a ten-year-old
 * Android does four times a second without noticing.
 */

/** Analysis resolution. The long edge; the short one follows the frame. */
const MAX_EDGE = 160;

const DARK_BELOW = 62;
const BRIGHT_ABOVE = 208;
const GLARE_AT = 248; // a pixel this bright inside a document is a reflection
const GLARE_SHARE = 0.1; // a tenth of the page lost to reflection is too much
const BLUR_BELOW = 45; // Laplacian variance over the document only
const INK_BELOW = 0.02; // less ink than this and there is nothing written
const FILL_TINY = 0.16; // below this there is no document, just a scene
const FILL_SMALL = 0.4; // below this it is too far away to read
const RATIO_SLACK = 0.5; // half again either way, before we mention the shape

export type DocVerdict =
  | "ok"
  | "dark"
  | "bright"
  | "glare"
  | "blurry"
  | "no-paper"
  | "too-far"
  | "cut-off"
  | "wrong-shape"
  | "no-text";

export interface DocQuality {
  verdict: DocVerdict;
  /** How much of the frame the document takes up, 0 to 1. */
  fill: number;
  /** Width over height of what was found. */
  ratio: number;
  /** Share of the document lost to reflection, 0 to 1. */
  glare: number;
  /** Share of the document that is ink rather than paper, 0 to 1. */
  ink: number;
  sharpness: number;
  luminance: number;
  /** How many of the four frame edges the document runs off. */
  edgesTouched: number;
}

export interface DocAnalyser {
  analyse: (source: CanvasImageSource, docId: string) => DocQuality | null;
}

/**
 * Otsu's threshold: the brightness that best splits the picture into two
 * groups. On a photograph of paper that is very nearly always "the paper"
 * and "everything else", which is the one thing this whole file needs.
 */
function otsu(histogram: Uint32Array, total: number): number {
  let sum = 0;
  for (let i = 0; i < 256; i++) sum += i * histogram[i];

  let sumB = 0;
  let wB = 0;
  let best = 0;
  let bestVariance = -1;

  for (let t = 0; t < 256; t++) {
    wB += histogram[t];
    if (wB === 0) continue;
    const wF = total - wB;
    if (wF === 0) break;
    sumB += t * histogram[t];
    const mB = sumB / wB;
    const mF = (sum - sumB) / wF;
    const between = wB * wF * (mB - mF) * (mB - mF);
    if (between > bestVariance) {
      bestVariance = between;
      best = t;
    }
  }
  return best;
}

/**
 * Creates a reusable canvas. Allocating one per frame is what makes naive
 * versions of this stutter on a five-year-old Android.
 */
export function createDocAnalyser(): DocAnalyser {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d", { willReadFrequently: true });

  return {
    analyse(source, docId) {
      if (!ctx) return null;

      const dims = sizeOf(source);
      if (!dims) return null;

      const scale = Math.min(1, MAX_EDGE / Math.max(dims.w, dims.h));
      const W = Math.max(8, Math.round(dims.w * scale));
      const H = Math.max(8, Math.round(dims.h * scale));
      if (canvas.width !== W || canvas.height !== H) {
        canvas.width = W;
        canvas.height = H;
      }

      let data: Uint8ClampedArray;
      try {
        ctx.drawImage(source, 0, 0, W, H);
        data = ctx.getImageData(0, 0, W, H).data;
      } catch {
        // Not ready, or tainted. No verdict this frame.
        return null;
      }

      /* ---- luma plane and histogram ---- */
      const luma = new Float32Array(W * H);
      const histogram = new Uint32Array(256);
      let sum = 0;
      for (let i = 0, p = 0; i < data.length; i += 4, p++) {
        // Rec. 601 — cheap, and good enough to tell paper from table.
        const y = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        luma[p] = y;
        histogram[Math.min(255, Math.max(0, Math.round(y)))]++;
        sum += y;
      }
      const mean = sum / luma.length;

      /* ---- where the paper is ----
         A row belongs to the document if a good share of it is brighter than
         the split. Deciding by row and by column rather than pixel by pixel
         is what makes this survive a patterned tablecloth: a few bright
         threads never add up to a fifth of a row. */
      const threshold = otsu(histogram, luma.length);
      const rowHits = new Uint32Array(H);
      const colHits = new Uint32Array(W);
      for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
          if (luma[y * W + x] > threshold) {
            rowHits[y]++;
            colHits[x]++;
          }
        }
      }
      const y0 = firstAbove(rowHits, W * 0.2);
      const y1 = lastAbove(rowHits, W * 0.2);
      const x0 = firstAbove(colHits, H * 0.2);
      const x1 = lastAbove(colHits, H * 0.2);

      const found = y1 > y0 && x1 > x0;
      const boxW = found ? x1 - x0 + 1 : 0;
      const boxH = found ? y1 - y0 + 1 : 0;
      const fill = found ? (boxW * boxH) / (W * H) : 0;
      const ratio = boxH > 0 ? boxW / boxH : 0;

      /* One pixel of slack: a document photographed properly nearly touches
         an edge, and one edge is fine. Three is a document that runs off. */
      let edgesTouched = 0;
      if (found) {
        if (x0 <= 1) edgesTouched++;
        if (y0 <= 1) edgesTouched++;
        if (x1 >= W - 2) edgesTouched++;
        if (y1 >= H - 2) edgesTouched++;
      }

      /* ---- inside the document ---- */
      let paperSum = 0;
      let paperN = 0;
      let glareN = 0;
      for (let y = y0; y <= y1 && found; y++) {
        for (let x = x0; x <= x1; x++) {
          const v = luma[y * W + x];
          paperSum += v;
          paperN++;
          if (v >= GLARE_AT) glareN++;
        }
      }
      const paperMean = paperN > 0 ? paperSum / paperN : mean;

      /* Ink is anything meaningfully darker than the page it sits on. A
         fixed threshold would call a grey photocopy blank and a white page
         with a shadow across it solid text. */
      const inkAt = paperMean - 28;
      let inkN = 0;
      let lapSum = 0;
      let lapSqSum = 0;
      let lapN = 0;
      for (let y = Math.max(y0, 1); y <= Math.min(y1, H - 2) && found; y++) {
        for (let x = Math.max(x0, 1); x <= Math.min(x1, W - 2); x++) {
          const i = y * W + x;
          if (luma[i] < inkAt) inkN++;
          const lap = 4 * luma[i] - luma[i - 1] - luma[i + 1] - luma[i - W] - luma[i + W];
          lapSum += lap;
          lapSqSum += lap * lap;
          lapN++;
        }
      }
      const ink = paperN > 0 ? inkN / paperN : 0;
      const lapMean = lapN > 0 ? lapSum / lapN : 0;
      const sharpness = lapN > 0 ? lapSqSum / lapN - lapMean * lapMean : 0;
      const glare = paperN > 0 ? glareN / paperN : 0;

      /* ---- verdict, most actionable problem first ----
         The order is the order a person can fix things in. Telling somebody
         their card is at the wrong angle when the room is dark wastes the
         one instruction they were going to act on. */
      const want = lookFor(docId).ratio;
      let verdict: DocVerdict = "ok";

      if (mean < DARK_BELOW) verdict = "dark";
      else if (glare > GLARE_SHARE) verdict = "glare";
      else if (mean > BRIGHT_ABOVE) verdict = "bright";
      else if (!found || fill < FILL_TINY) verdict = "no-paper";
      else if (edgesTouched >= 3) verdict = "cut-off";
      else if (fill < FILL_SMALL) verdict = "too-far";
      else if (sharpness < BLUR_BELOW) verdict = "blurry";
      else if (ink < INK_BELOW) verdict = "no-text";
      else if (offBy(ratio, want) > RATIO_SLACK) verdict = "wrong-shape";

      return {
        verdict,
        fill: round2(fill),
        ratio: round2(ratio),
        glare: round2(glare),
        ink: round2(ink),
        sharpness: Math.round(sharpness),
        luminance: Math.round(mean),
        edgesTouched,
      };
    },
  };
}

/**
 * How far one proportion is from another, as a fraction, in whichever
 * direction. A card held sideways is not wrong — a photograph is a
 * photograph — so both orientations count as a match.
 */
function offBy(got: number, want: number): number {
  if (got <= 0 || want <= 0) return 0;
  const direct = Math.abs(got - want) / want;
  const turned = Math.abs(got - 1 / want) * want;
  return Math.min(direct, turned);
}

function firstAbove(counts: Uint32Array, floor: number): number {
  for (let i = 0; i < counts.length; i++) if (counts[i] >= floor) return i;
  return 0;
}

function lastAbove(counts: Uint32Array, floor: number): number {
  for (let i = counts.length - 1; i >= 0; i--) if (counts[i] >= floor) return i;
  return -1;
}

function round2(v: number): number {
  return Math.round(v * 100) / 100;
}

function sizeOf(s: CanvasImageSource): { w: number; h: number } | null {
  if (typeof HTMLVideoElement !== "undefined" && s instanceof HTMLVideoElement) {
    return s.videoWidth ? { w: s.videoWidth, h: s.videoHeight } : null;
  }
  if (typeof HTMLImageElement !== "undefined" && s instanceof HTMLImageElement) {
    return s.naturalWidth ? { w: s.naturalWidth, h: s.naturalHeight } : null;
  }
  if (typeof HTMLCanvasElement !== "undefined" && s instanceof HTMLCanvasElement) {
    return { w: s.width, h: s.height };
  }
  return null;
}

/** Which coaching line to show. Keys into the `docshot` dictionary. */
export function docCoachKey(q: DocQuality | null): string {
  if (!q) return "docshot.starting";
  return `docshot.${camel(q.verdict)}`;
}

function camel(v: string): string {
  return v.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
}

/**
 * Whether a photograph is good enough to send.
 *
 * Deliberately generous. Everything except "there is no paper here" is a
 * warning the person can overrule, because a photograph this code dislikes
 * and a clerk can read is still a photograph that works — and one more trip
 * to the office costs a day's wages.
 */
export function isUsable(q: DocQuality | null): boolean {
  return q === null || q.verdict !== "no-paper";
}
