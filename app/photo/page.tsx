"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { useApp } from "@/lib/app-state";
import { ScreenShell } from "@/components/ScreenShell";
import { BigButton } from "@/components/BigButton";
import { FaceOval } from "@/components/CameraArt";
import { Alert, ArtEyeLevel, ArtGlasses, ArtWindow, Camera, Check, Info, Refresh, Upload } from "@/components/Icons";
import { coachKey, createAnalyser, toJpegDataUrl } from "@/lib/imageQuality";
import type { PhotoQuality } from "@/lib/types";

type Stage = "checklist" | "capturing" | "preview";

export default function PhotoPage() {
  return (
    <Suspense fallback={null}>
      <PhotoScreen />
    </Suspense>
  );
}

/**
 * Screen 4 — two stages on one route.
 *
 * Stage A is a checklist, before the camera opens, because the three things
 * that decide whether a photo passes are all decided before the shutter.
 * Stage B coaches live off client-side canvas analysis (lib/imageQuality),
 * so capture feels guided instead of silent.
 */
function PhotoScreen() {
  const { t, app, patch } = useApp();
  const router = useRouter();
  const params = useSearchParams();
  const assisted = app.mode === "assisted";

  /* Arriving from "Fix and send again": only the photo is being replaced. */
  const fixing = params.get("fix");

  const [stage, setStage] = useState<Stage>("checklist");
  const [quality, setQuality] = useState<PhotoQuality | null>(null);
  const [shot, setShot] = useState<string | null>(null);
  const [camError, setCamError] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (fixing) patch({ fixingId: fixing });
    // Only when the query parameter itself changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fixing]);

  /* ---------------- camera lifecycle ---------------- */
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
    setStage("capturing");

    if (!navigator.mediaDevices?.getUserMedia) {
      setCamError(true);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 720 }, height: { ideal: 960 } },
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

      /* Layer 1 of the pre-check. Throttled to ~4 readings a second: any
         faster and a five-year-old Android drops frames; any slower and the
         coaching line lags behind what the person is doing. */
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
      // Denied, unavailable, or already in use. The upload path below is
      // not a consolation prize — it is a fully supported route through.
      setCamError(true);
    }
  }, []);

  function capture() {
    const video = videoRef.current;
    if (!video) return;
    const url = toJpegDataUrl(video, 512, 0.7);
    if (!url) return;
    setShot(url);
    stopCamera();
    setStage("preview");
  }

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const url = toJpegDataUrl(img, 512, 0.7) ?? String(reader.result);
        setShot(url);
        setQuality(createAnalyser().analyse(img));
        stopCamera();
        setStage("preview");
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
    // Allow choosing the same file twice in a row.
    e.target.value = "";
  }

  function usePhoto() {
    if (!shot) return;
    patch({ photo: shot, photoQuality: quality });
    router.push("/review");
  }

  function retake() {
    setShot(null);
    setQuality(null);
    void openCamera();
  }

  const tone: "neutral" | "good" | "warn" =
    quality === null ? "neutral" : quality.verdict === "ok" ? "good" : "warn";

  const coach = t(coachKey(quality));

  /* ================= Stage A — the checklist ================= */
  if (stage === "checklist") {
    const items = [
      { art: <ArtWindow />, text: assisted ? t("photo.check1Assisted") : t("photo.check1") },
      { art: <ArtGlasses />, text: assisted ? t("photo.check2Assisted") : t("photo.check2") },
      { art: <ArtEyeLevel />, text: assisted ? t("photo.check3Assisted") : t("photo.check3") },
    ];

    return (
      <ScreenShell
        step={4}
        back="/details"
        title={assisted ? t("photo.titleAssisted") : t("photo.title")}
        guide={t("photo.guide")}
        speakExtra={items.map((i) => i.text).join(". ")}
        action={
          <>
            <BigButton onClick={openCamera} icon={<Camera size={22} />}>
              {t("photo.ready")}
            </BigButton>
            <BigButton
              variant="secondary"
              onClick={() => fileRef.current?.click()}
              icon={<Upload size={22} />}
            >
              {t("photo.uploadInstead")}
            </BigButton>
          </>
        }
      >
        {fixing && (
          <div className="note note-info">
            <Info size={22} />
            <span>{t("photo.fixBanner")}</span>
          </div>
        )}

        <div className="panel">
          {items.map((item, i) => (
            <div className="checklist-item" key={i}>
              <span className="checklist-art">{item.art}</span>
              <span style={{ fontSize: 20, fontWeight: 600 }}>{item.text}</span>
            </div>
          ))}
        </div>

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="user"
          onChange={onFile}
          className="sr-only"
          aria-label={t("photo.uploadInstead")}
        />
      </ScreenShell>
    );
  }

  /* ================= Stage B — capture ================= */
  if (stage === "capturing") {
    return (
      <ScreenShell
        step={4}
        back="/details"
        title={assisted ? t("photo.titleAssisted") : t("photo.title")}
        guide={assisted ? t("photo.lookAtAssisted") : t("photo.lookAt")}
        action={
          camError ? (
            <BigButton onClick={() => fileRef.current?.click()} icon={<Upload size={22} />}>
              {t("photo.uploadInstead")}
            </BigButton>
          ) : (
            <BigButton onClick={capture} icon={<Camera size={22} />}>
              {t("photo.capture")}
            </BigButton>
          )
        }
      >
        {camError ? (
          <div className="note note-warn" role="alert">
            <Alert size={22} />
            <span>
              <strong style={{ display: "block", marginBottom: 4 }}>
                {t("photo.deniedTitle")}
              </strong>
              {t("photo.deniedBody")}
            </span>
          </div>
        ) : (
          <>
            <div className="cam-stage">
              <video
                ref={videoRef}
                playsInline
                muted
                autoPlay
                aria-label={assisted ? t("photo.lookAtAssisted") : t("photo.lookAt")}
              />
              <FaceOval tone={tone} />
            </div>

            {/* The live coaching line. aria-live so a screen-reader user
                gets the same guidance a sighted user gets from the oval. */}
            <p
              className={`coach-line ${tone === "good" ? "coach-good" : tone === "warn" ? "coach-warn" : ""}`}
              aria-live="polite"
            >
              {tone === "good" ? <Check size={22} /> : <Info size={22} />}
              <span>{coach}</span>
            </p>
          </>
        )}

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="user"
          onChange={onFile}
          className="sr-only"
          aria-label={t("photo.uploadInstead")}
        />
      </ScreenShell>
    );
  }

  /* ================= Stage B' — confirm ================= */
  return (
    <ScreenShell
      step={4}
      back="/details"
      title={assisted ? t("photo.titleAssisted") : t("photo.title")}
      guide={coach}
      action={
        <>
          <BigButton onClick={usePhoto} icon={<Check size={22} />}>
            {t("photo.use")}
          </BigButton>
          <BigButton variant="secondary" onClick={retake} icon={<Refresh size={22} />}>
            {t("photo.retake")}
          </BigButton>
        </>
      }
    >
      <div className="cam-stage">
        {/* Data URL from the device — next/image would add work and bytes
            for an asset that never touches the network. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {shot && <img src={shot} alt={t("photo.photoAlt")} />}
      </div>

      {quality && quality.verdict !== "ok" && (
        <p className="coach-line coach-warn" style={{ marginTop: 16 }}>
          <Alert size={22} />
          <span>{coach}</span>
        </p>
      )}
    </ScreenShell>
  );
}
