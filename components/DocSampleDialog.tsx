"use client";

import { useEffect, useRef } from "react";
import { useApp } from "@/lib/app-state";
import { lookFor } from "@/lib/services/docShapes";
import { BigButton } from "./BigButton";
import { DocSample } from "./DocSample";
import { Camera } from "./Icons";

/**
 * The drawing, held up close.
 *
 * The list shows a 72px thumbnail beside every document, which is enough to
 * say "a card, not a sheet" and nothing more. Somebody standing at a table
 * with the tin box open needs more than that: they have four plastic cards
 * in their hand and the question is which one. So the thumbnail is a
 * button, and this is what it opens — the same paper drawn with the marks
 * that tell it apart, big enough to hold the phone next to the card and
 * compare them.
 *
 * The three sentences come with it. On the list they would be a wall; here
 * the reader has already asked the question, and they are the answer.
 *
 * Closing it is deliberately easy — the button, the key, or the darkness
 * around it — because this is a detour and not a step. Where it is opened
 * from a document that has not been photographed yet, the camera is one tap
 * away rather than one tap back.
 */
export function DocSampleDialog({
  docId,
  name,
  hint,
  onClose,
  onTake,
}: {
  docId: string;
  /** The document's name, as the list calls it. */
  name: string;
  /** The one line under the name in the list, if it has one. */
  hint?: string;
  onClose: () => void;
  /** Straight to the camera. Absent once the photograph has been taken. */
  onTake?: () => void;
}) {
  const { t } = useApp();
  const panel = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    /* The panel itself takes focus rather than the first button, so a
       screen reader reads the document's name before it reads "Close". */
    panel.current?.focus();

    // The list behind must not scroll while this is open.
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    /* Escape closes it, and Tab wraps around inside it — the same
       wrap-around the language chooser uses, for the same reason: this is a
       short list of buttons, not a screen that needs a focus-trap library. */
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key !== "Tab" || !panel.current) return;
      const items = Array.from(panel.current.querySelectorAll<HTMLButtonElement>("button"));
      if (items.length === 0) return;
      const firstItem = items[0];
      const lastItem = items[items.length - 1];
      if (e.shiftKey && document.activeElement === firstItem) {
        e.preventDefault();
        lastItem.focus();
      } else if (!e.shiftKey && document.activeElement === lastItem) {
        e.preventDefault();
        firstItem.focus();
      }
    }

    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  return (
    <div
      className="sample"
      role="dialog"
      aria-modal="true"
      aria-labelledby="sample-title"
      /* Mousedown rather than click, so a drag that starts on the drawing
         and ends on the darkness does not close it. */
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="sample-panel" ref={panel} tabIndex={-1}>
        <h2 className="sample-title" id="sample-title">
          {name}
        </h2>
        {hint && <p className="sample-hint">{hint}</p>}

        <DocSample
          docId={docId}
          detail
          sampleLabel={t("docshot.sampleMark")}
          className="sample-art"
        />

        <DocNotes docId={docId} />

        <p className="sample-note">{t("docshot.sampleNote")}</p>

        <div className="sample-actions">
          {onTake && (
            <BigButton onClick={onTake} icon={<Camera size={22} />}>
              {t("apply.docsTake")}
            </BigButton>
          )}
          <BigButton variant={onTake ? "secondary" : "primary"} onClick={onClose}>
            {t("nav.close")}
          </BigButton>
        </div>
      </div>
    </div>
  );
}

/**
 * What the paper is, which part of it has to survive, and whether the back
 * is needed too. Three sentences, and each one answers a question a
 * first-time photographer actually has.
 *
 * Shown beside the drawing before the camera opens, and again beside the
 * enlarged drawing. Same three lines both times, on purpose: the person who
 * skipped them on the way in is the person who taps the picture.
 */
export function DocNotes({ docId }: { docId: string }) {
  const { t } = useApp();
  const look = lookFor(docId);
  return (
    <ul className="doc-sample-notes">
      <li>{t(`docshot.shape${cap(look.shape)}`)}</li>
      <li>{t(`docshot.focus${cap(look.focus)}`)}</li>
      {look.twoSided && <li>{t("docshot.bothSides")}</li>}
    </ul>
  );
}

function cap(v: string): string {
  return v.charAt(0).toUpperCase() + v.slice(1);
}
