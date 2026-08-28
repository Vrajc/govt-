"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useApp } from "@/lib/app-state";
import { BigButton } from "./BigButton";
import { FaceOval } from "./CameraArt";
import { Alert, Camera, Check, Info, Refresh, Upload } from "./Icons";
import { coachKey, createAnalyser, toJpegDataUrl } from "@/lib/imageQuality";
import type { PhotoQuality } from "@/lib/types";

/**
 * One camera for two jobs.
 *
 * `face` is the identity photo: an oval guide and a live coaching line
 * driven by on-device canvas analysis.
 *
 * `document` is a photo of a piece of paper — a ration card, a death
 * certificate. Same camera, no oval, and the coaching only warns about the
 * two things that actually make a document unreadable: too dark, or shaken.
 * Photographing the paper is the whole simplification here; "scan and upload
 * a PDF" is where these journeys die.
 */
export function PhotoCapture({
  purpose,
  title,
  onDone,
  onCancel,
}: {
  purpose: "face" | "document";
  title: string;
  onDone: (dataUrl: string, quality: PhotoQuality | null) => void;
  onCancel: () => void;
}) {
  const { t } = useApp();

  const [quality, setQuality] = useState<PhotoQuality | null>(null);
  const [shot, setShot] = useState<string | null>(null);
  const [camError, setCamError] = useState(false);
  const [started, setStarted] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const stopCamera = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  useEffect(() => stopCamera, [stopCamera]);

  const openCamera = useCallback(async () => {
    setCamError(false);
    setStarted(true);

    if (!navigator.mediaDevices?.getUserMedia) {
      setCamError(true);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          // Selfie camera for a face; the back camera is sharper for paper.
          facingMode: purpose === "face" ? "user" : "environment",
          width: { ideal: 960 },
          height: { ideal: 1280 },
        },
        audio: false,
      });
      streamRef.current = stream;

      const video = videoRef.current;
      if (!video) {
        stream.getTracks().forEach((tr) => tr.stop());
        return;
      }
      video.srcObject = stream;
      await video.play().catch(() => undefined);

      /* Throttled to ~4 readings a second: any faster and a five-year-old
         Android drops frames; any slower and the coaching line lags behind
         what the person is doing. */
      const analyser = createAnalyser();
      let last = 0;
      const tick = (ts: number) => {
        if (ts - last > 240 && video.readyState >= 2) {
          last = ts;
          const q = analyser.analyse(video);
          if (q) setQuality(q);
        }
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
    } catch {
      // Denied, unavailable, or already in use. The upload path below is not
      // a consolation prize — it is a fully supported route through.
      setCamError(true);
    }
  }, [purpose]);

  function capture() {
    const video = videoRef.current;
    if (!video) return;
    // Documents get a little more resolution: small print has to survive.
    const url = toJpegDataUrl(video, purpose === "face" ? 512 : 900, 0.72);
    if (!url) return;
    setShot(url);
    stopCamera();
  }

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const url =
          toJpegDataUrl(img, purpose === "face" ? 512 : 900, 0.72) ?? String(reader.result);
        setShot(url);
        setQuality(createAnalyser().analyse(img));
        stopCamera();
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
    e.target.value = ""; // allow choosing the same file twice
  }

  /* For paper, only exposure and shake matter — a ration card has no face. */
  const effectiveVerdict: PhotoQuality["verdict"] | null =
    quality === null
      ? null
      : purpose === "document" && quality.verdict === "no-face"
        ? "ok"
        : quality.verdict;

  const tone: "neutral" | "good" | "warn" =
    effectiveVerdict === null ? "neutral" : effectiveVerdict === "ok" ? "good" : "warn";

  const coach = t(coachKey(effectiveVerdict ? { ...quality!, verdict: effectiveVerdict } : null));

  const hiddenInput = (
    <input
      ref={fileRef}
      type="file"
      accept="image/*"
      capture={purpose === "face" ? "user" : "environment"}
      onChange={onFile}
      className="sr-only"
      aria-label={t("photo.uploadInstead")}
    />
  );

  /* ---------------- confirm ---------------- */
  if (shot) {
    return (
      <div>
        <div className="cam-stage">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={shot} alt={title} />
        </div>

        {effectiveVerdict && effectiveVerdict !== "ok" && (
          <p className="coach-line coach-warn">
            <Alert size={22} />
            <span>{coach}</span>
          </p>
        )}

        <div style={{ marginTop: 16 }}>
          <BigButton onClick={() => onDone(shot, quality)} icon={<Check size={22} />}>
            {t("photo.use")}
          </BigButton>
          <BigButton
            variant="secondary"
            onClick={() => {
              setShot(null);
              setQuality(null);
              void openCamera();
            }}
            icon={<Refresh size={22} />}
          >
            {t("photo.retake")}
          </BigButton>
        </div>
      </div>
    );
  }

  /* ---------------- not opened yet ---------------- */
  if (!started) {
    return (
      <div>
        <BigButton onClick={openCamera} icon={<Camera size={22} />}>
          {t("apply.docsTake")}
        </BigButton>
        <BigButton
          variant="secondary"
          onClick={() => fileRef.current?.click()}
          icon={<Upload size={22} />}
        >
          {t("photo.uploadInstead")}
        </BigButton>
        <BigButton variant="quiet" onClick={onCancel}>
          {t("common.back")}
        </BigButton>
        {hiddenInput}
      </div>
    );
  }

  /* ---------------- live ---------------- */
  return (
    <div>
      {camError ? (
        <>
          <div className="note note-warn" role="alert">
            <Alert size={22} />
            <span>
              <strong style={{ display: "block", marginBottom: 4 }}>
                {t("photo.deniedTitle")}
              </strong>
              {t("photo.deniedBody")}
            </span>
          </div>
          <BigButton onClick={() => fileRef.current?.click()} icon={<Upload size={22} />}>
            {t("photo.uploadInstead")}
          </BigButton>
          <BigButton variant="quiet" onClick={onCancel}>
            {t("common.back")}
          </BigButton>
        </>
      ) : (
        <>
          <div className="cam-stage">
            <video ref={videoRef} playsInline muted autoPlay aria-label={title} />
            {purpose === "face" && <FaceOval tone={tone} />}
          </div>

          {/* aria-live so a screen-reader user gets the same guidance a
              sighted user gets from the oval turning green. */}
          <p
            className={`coach-line ${tone === "good" ? "coach-good" : tone === "warn" ? "coach-warn" : ""}`}
            aria-live="polite"
          >
            {tone === "good" ? <Check size={22} /> : <Info size={22} />}
            <span>{coach}</span>
          </p>

          <div style={{ marginTop: 16 }}>
            <BigButton onClick={capture} icon={<Camera size={22} />}>
              {purpose === "face" ? t("photo.capture") : t("apply.docsTake")}
            </BigButton>
            <BigButton
              variant="secondary"
              onClick={() => fileRef.current?.click()}
              icon={<Upload size={22} />}
            >
              {t("photo.uploadInstead")}
            </BigButton>
          </div>
        </>
      )}
      {hiddenInput}
    </div>
  );
}
