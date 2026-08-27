import type { PhotoQuality } from "./types";

/**
 * Layer 1 of the pre-check (MASTER_PROMPT §5.2): pure client-side canvas
 * analysis. No network, no API cost, runs on every preview frame.
 *
 * This is what turns the camera from a silent box into something that
 * coaches you. It is deliberately crude — it is not face detection, it is
 * three numbers that correlate well with the ways elderly users' photos
 * actually fail.
 */

/** Analysis resolution. Small on purpose: this runs ~4x a second on a cheap phone. */
const W = 96;
const H = 128;

const DARK_BELOW = 60;
const BRIGHT_ABOVE = 200;
const BLUR_BELOW = 55; // Laplacian variance on the 0-255 luma plane
const FACE_VARIANCE_BELOW = 120; // a flat centre means nothing is in the oval

export interface Analyser {
  analyse: (source: CanvasImageSource) => PhotoQuality | null;
}

/**
 * Creates a reusable hidden canvas. Allocating one per frame is what makes
 * naive implementations of this stutter on a five-year-old Android.
 */
export function createAnalyser(): Analyser {
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });

  return {
    analyse(source) {
      if (!ctx) return null;
      try {
        ctx.drawImage(source, 0, 0, W, H);
      } catch {
        // The video element is not ready yet, or is tainted. Either way,
        // no verdict this frame.
        return null;
      }

      let data: Uint8ClampedArray;
      try {
        data = ctx.getImageData(0, 0, W, H).data;
      } catch {
        return null;
      }

      // ---- luma plane ----
      const luma = new Float32Array(W * H);
      let sum = 0;
      for (let i = 0, p = 0; i < data.length; i += 4, p++) {
        // Rec. 601 luma — cheap and good enough for an exposure check.
        const y = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        luma[p] = y;
        sum += y;
      }
      const mean = sum / luma.length;

      // ---- Laplacian variance (sharpness) ----
      let lapSum = 0;
      let lapSqSum = 0;
      let lapN = 0;
      for (let y = 1; y < H - 1; y++) {
        for (let x = 1; x < W - 1; x++) {
          const i = y * W + x;
          const lap =
            4 * luma[i] - luma[i - 1] - luma[i + 1] - luma[i - W] - luma[i + W];
          lapSum += lap;
          lapSqSum += lap * lap;
          lapN++;
        }
      }
      const lapMean = lapSum / lapN;
      const sharpness = lapSqSum / lapN - lapMean * lapMean;

      // ---- centre-region variance (is anything plausibly in the oval) ----
      const x0 = Math.floor(W * 0.28);
      const x1 = Math.floor(W * 0.72);
      const y0 = Math.floor(H * 0.18);
      const y1 = Math.floor(H * 0.72);
      let cSum = 0;
      let cSqSum = 0;
      let cN = 0;
      for (let y = y0; y < y1; y++) {
        for (let x = x0; x < x1; x++) {
          const v = luma[y * W + x];
          cSum += v;
          cSqSum += v * v;
          cN++;
        }
      }
      const cMean = cSum / cN;
      const centreVariance = cSqSum / cN - cMean * cMean;

      // ---- verdict, most actionable problem first ----
      let verdict: PhotoQuality["verdict"] = "ok";
      if (mean < DARK_BELOW) verdict = "dark";
      else if (mean > BRIGHT_ABOVE) verdict = "bright";
      else if (sharpness < BLUR_BELOW) verdict = "blurry";
      else if (centreVariance < FACE_VARIANCE_BELOW) verdict = "no-face";

      return {
        luminance: Math.round(mean),
        sharpness: Math.round(sharpness),
        centreVariance: Math.round(centreVariance),
        verdict,
      };
    },
  };
}

/** Which coaching line to show for a verdict. Keys into the photo dictionary. */
export function coachKey(q: PhotoQuality | null): string {
  if (!q) return "photo.coachStarting";
  switch (q.verdict) {
    case "dark":
      return "photo.coachDark";
    case "bright":
      return "photo.coachBright";
    case "blurry":
      return "photo.coachBlurry";
    case "no-face":
      return "photo.coachNoFace";
    default:
      return "photo.coachGood";
  }
}

/**
 * Draw a frame to a JPEG data URL, capped at 512px on the long edge at
 * quality 0.7. Respecting the bandwidth is the whole point — this is what
 * gets uploaded on a 3G connection.
 */
export function toJpegDataUrl(source: CanvasImageSource, maxEdge = 512, quality = 0.7): string | null {
  const dims = sourceSize(source);
  if (!dims) return null;

  const scale = Math.min(1, maxEdge / Math.max(dims.w, dims.h));
  const w = Math.max(1, Math.round(dims.w * scale));
  const h = Math.max(1, Math.round(dims.h * scale));

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.drawImage(source, 0, 0, w, h);
  try {
    return canvas.toDataURL("image/jpeg", quality);
  } catch {
    return null;
  }
}

function sourceSize(s: CanvasImageSource): { w: number; h: number } | null {
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

/** Analyse a still (a gallery upload) rather than a live frame. */
export function analyseImage(img: HTMLImageElement): PhotoQuality | null {
  return createAnalyser().analyse(img);
}
