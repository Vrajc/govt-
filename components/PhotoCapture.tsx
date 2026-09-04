"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useApp } from "@/lib/app-state";
import { apiFetch } from "@/lib/api";
import { BigButton } from "./BigButton";
import { FaceOval } from "./CameraArt";
import { DocSample } from "./DocSample";
import { DocNotes, DocSampleDialog } from "./DocSampleDialog";
import { Alert, Camera, Check, Info, Refresh, Search, Upload } from "./Icons";
import { coachKey, createAnalyser, toJpegDataUrl } from "@/lib/imageQuality";
import { createDocAnalyser, docCoachKey, type DocQuality } from "@/lib/docCheck";
import type { PhotoQuality } from "@/lib/types";

/**
 * Whether the second look is available at all, remembered for the session.
 *
 * With no API key configured the route still answers, politely and
 * instantly, that everything is fine. Asking it eleven more times during one
 * application is eleven round trips on a 3G connection to be told the same
 * thing. The first answer carries `keyPresent`, so after it we know.
 */
let secondLookAvailable: boolean | null = null;

/**
 * One camera for two jobs.
 *
 * `face` is the identity photo: an oval guide and a live coaching line
 * driven by on-device canvas analysis.
 *
 * `document` is a photo of a piece of paper — a ration card, a passbook.
 * It gets a drawing of what the paper looks like before the camera opens, a
 * different set of live checks while it is open, and a second look
 * afterwards that asks the one question arithmetic cannot: is this the paper
 * that was asked for. Photographing the paper is the whole simplification
 * here; "scan and upload a PDF" is where these journeys die.
 */
export function PhotoCapture({
  purpose,
  docId,
  title,
  onDone,
  onCancel,
}: {
  purpose: "face" | "document";
  /** Which document this is, for the drawing and the checks. */
  docId?: string;
  title: string;
  onDone: (dataUrl: string, quality: PhotoQuality | null) => void;
  onCancel: () => void;
}) {
  const { t, d, lang } = useApp();

  const [quality, setQuality] = useState<PhotoQuality | null>(null);
  const [docQuality, setDocQuality] = useState<DocQuality | null>(null);
  const [shot, setShot] = useState<string | null>(null);
  const [camError, setCamError] = useState(false);
  const [started, setStarted] = useState(false);
  const [second, setSecond] = useState<SecondLook>({ state: "idle" });
  /** The drawing, held up close. A detour, not a step. */
  const [sample, setSample] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const isDoc = purpose === "document";
  const hint = docId ? (d.docs as Record<string, string>)[`${docId}Hint`] : undefined;

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
          facingMode: isDoc ? "environment" : "user",
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
      const faces = createAnalyser();
      const papers = createDocAnalyser();
      let last = 0;
      const tick = (ts: number) => {
        if (ts - last > 240 && video.readyState >= 2) {
          last = ts;
          if (isDoc) {
            const q = papers.analyse(video, docId ?? "");
            if (q) setDocQuality(q);
          } else {
            const q = faces.analyse(video);
            if (q) setQuality(q);
          }
        }
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
    } catch {
      // Denied, unavailable, or already in use. The upload path below is not
      // a consolation prize — it is a fully supported route through.
      setCamError(true);
    }
  }, [isDoc, docId]);

  /**
   * The second look. Sends the still to the model, which is the only thing
   * in this flow that can tell a passbook from a ration card.
   *
   * It is fire-and-forget by design: the answer arrives under the photo when
   * it arrives, and the Use button is live the whole time. Nobody waits on a
   * network round trip to keep a photograph they can see is fine.
   */
  const askSecondLook = useCallback(
    async (dataUrl: string, local: DocQuality | null) => {
      if (!isDoc || !docId) return;
      if (secondLookAvailable === false) return;
      setSecond({ state: "asking" });
      const res = await apiFetch<{
        match: boolean;
        readable: boolean;
        issue: string | null;
        saw: string | null;
        source: "openai" | "fallback";
        keyPresent: boolean;
      }>("/api/doccheck", {
        method: "POST",
        timeoutMs: 12_000,
        body: JSON.stringify({
          photo: dataUrl,
          docId,
          language: lang,
          verdict: local?.verdict ?? null,
        }),
      });

      if (!res.ok) {
        /* A check that could not run says nothing. Layer 1 already had its
           say on the screen and it does not need to be contradicted by a
           network failure. */
        setSecond({ state: "idle" });
        return;
      }
      secondLookAvailable = res.data.keyPresent;
      if (!res.data.keyPresent) {
        setSecond({ state: "idle" });
        return;
      }
      setSecond({ state: "done", ...res.data });
    },
    [isDoc, docId, lang],
  );

  const keep = useCallback(
    (url: string, q: DocQuality | null) => {
      setShot(url);
      stopCamera();
      void askSecondLook(url, q);
    },
    [stopCamera, askSecondLook],
  );

  function capture() {
    const video = videoRef.current;
    if (!video) return;
    // Documents get a little more resolution: small print has to survive.
    const url = toJpegDataUrl(video, isDoc ? 900 : 512, 0.72);
    if (!url) return;
    keep(url, docQuality);
  }

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const url = toJpegDataUrl(img, isDoc ? 900 : 512, 0.72) ?? String(reader.result);
        /* A picture chosen from the gallery gets exactly the same checks as
           one taken here. It is the same photograph to the office. */
        let q: DocQuality | null = null;
        if (isDoc) {
          q = createDocAnalyser().analyse(img, docId ?? "");
          setDocQuality(q);
        } else {
          setQuality(createAnalyser().analyse(img));
        }
        keep(url, q);
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
    e.target.value = ""; // allow choosing the same file twice
  }

  /* ---------------- what the coaching line says ---------------- */
  const faceVerdict = quality?.verdict ?? null;
  const docVerdict = docQuality?.verdict ?? null;

  const tone: "neutral" | "good" | "warn" = isDoc
    ? docVerdict === null
      ? "neutral"
      : docVerdict === "ok"
        ? "good"
        : "warn"
    : faceVerdict === null
      ? "neutral"
      : faceVerdict === "ok"
        ? "good"
        : "warn";

  const coach = isDoc ? t(docCoachKey(docQuality)) : t(coachKey(quality));

  const hiddenInput = (
    <input
      ref={fileRef}
      type="file"
      accept="image/*"
      capture={isDoc ? "environment" : "user"}
      onChange={onFile}
      className="sr-only"
      aria-label={t("photo.uploadInstead")}
    />
  );

  /* ---------------- confirm ---------------- */
  if (shot) {
    const wrong = second.state === "done" && (!second.match || !second.readable);
    return (
      <div>
        <div className="cam-stage">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={shot} alt={title} />
        </div>

        {/* Layer 1 first: it is instant, it never gets it wrong about the
            light, and it is the only one of the two that is always there. */}
        {isDoc && docVerdict && docVerdict !== "ok" && (
          <p className="coach-line coach-warn">
            <Alert size={22} />
            <span>{coach}</span>
          </p>
        )}
        {!isDoc && faceVerdict && faceVerdict !== "ok" && (
          <p className="coach-line coach-warn">
            <Alert size={22} />
            <span>{coach}</span>
          </p>
        )}

        {second.state === "asking" && (
          <p className="coach-line" aria-live="polite">
            <Info size={22} />
            <span>{t("docshot.checking")}</span>
          </p>
        )}

        {wrong && (
          <div className="note note-warn" role="status">
            <Alert size={22} />
            <span>
              {/* The heading only appears when this is the wrong kind of
                  paper. A readable-but-smudged number is a note, not an
                  accusation, and it reads better as one sentence. */}
              {!second.match && (
                <strong style={{ display: "block", marginBottom: 4 }}>
                  {t("docshot.looksWrong", { name: title })}
                </strong>
              )}
              {second.issue}
              {second.saw ? ` ${t("docshot.sawInstead", { what: second.saw })}` : ""}
              <span className="micro" style={{ display: "block", marginTop: 6 }}>
                {t("docshot.looksWrongBody")}
              </span>
            </span>
          </div>
        )}

        {second.state === "done" && !wrong && isDoc && (
          <p className="coach-line coach-good">
            <Check size={22} />
            <span>{t("docshot.looksRight")}</span>
          </p>
        )}

        <div style={{ marginTop: 16 }}>
          <BigButton
            onClick={() => onDone(shot, quality)}
            icon={<Check size={22} />}
            variant={wrong ? "secondary" : "primary"}
          >
            {wrong ? t("docshot.keepAnyway") : t("photo.use")}
          </BigButton>
          <BigButton
            variant={wrong ? "primary" : "secondary"}
            onClick={() => {
              setShot(null);
              setQuality(null);
              setDocQuality(null);
              setSecond({ state: "idle" });
              void openCamera();
            }}
            icon={<Refresh size={22} />}
          >
            {t("photo.retake")}
          </BigButton>
        </div>

        {/* Where the answer came from, and — when the picture left the
            phone to get it — the fact that it did. Somebody photographing
            an Aadhaar card is owed that sentence without having to go
            looking for it. */}
        {isDoc && second.state === "done" && (
          <p className="micro" style={{ marginTop: 10 }}>
            {second.source === "openai"
              ? `${t("docshot.checkedAway")} ${t("docshot.away")}`
              : t("docshot.checkedHere")}
          </p>
        )}
      </div>
    );
  }

  /* ---------------- not opened yet ---------------- */
  if (!started) {
    return (
      <div>
        {/* The drawing goes before the camera button, not behind a link.
            Somebody who does not know which paper this is will not go
            looking for a picture of it — they will photograph the wrong
            one and find out in six weeks. */}
        {isDoc && docId && (
          <div className="doc-sample">
            {/* Tapping the drawing enlarges it. At 160px it says which paper;
                at full width it says which of the four cards in the hand. */}
            <button
              type="button"
              className="doc-sample-btn"
              onClick={() => setSample(true)}
              aria-label={`${t("docshot.example")} — ${title}`}
            >
              <DocSample docId={docId} className="doc-sample-art" />
              <span className="doc-thumb-zoom" aria-hidden="true">
                <Search size={16} />
              </span>
            </button>
            <DocNotes docId={docId} />
          </div>
        )}

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

        {sample && docId && (
          <DocSampleDialog
            docId={docId}
            name={title}
            hint={hint}
            onClose={() => setSample(false)}
            onTake={() => {
              setSample(false);
              void openCamera();
            }}
          />
        )}
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
            {!isDoc && <FaceOval tone={tone} />}
            {/* Corner brackets, the same four the drawing had, so "fill the
                frame like the picture" means something once the camera is
                actually open. */}
            {isDoc && <DocBrackets tone={tone} />}
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
              {isDoc ? t("apply.docsTake") : t("photo.capture")}
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

/* ------------------------------------------------------------------ */

type SecondLook =
  | { state: "idle" }
  | { state: "asking" }
  | {
      state: "done";
      match: boolean;
      readable: boolean;
      issue: string | null;
      saw: string | null;
      source: "openai" | "fallback";
    };

/** The same four corners as the drawing, over the live camera. */
function DocBrackets({ tone }: { tone: "neutral" | "good" | "warn" }) {
  const colour =
    tone === "good" ? "var(--success)" : tone === "warn" ? "var(--attention)" : "rgba(255,255,255,0.8)";
  return (
    <svg className="cam-brackets" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
      <g stroke={colour} strokeWidth="1.6" fill="none" strokeLinecap="round" vectorEffect="non-scaling-stroke">
        <path d="M4 16 L4 4 L16 4" />
        <path d="M84 4 L96 4 L96 16" />
        <path d="M96 84 L96 96 L84 96" />
        <path d="M16 96 L4 96 L4 84" />
      </g>
    </svg>
  );
}

