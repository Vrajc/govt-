"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useApp } from "@/lib/app-state";
import { Chevron } from "@/components/Icons";
import { STORY_SCENES } from "@/components/StoryArt";

/**
 * The landing-page carousel: five scenes, three seconds each.
 *
 * Auto-advancing carousels are usually a bad idea, and on a page read by
 * 78-year-olds they would be an actively hostile one, so this is built to
 * get out of the way the moment anyone shows an interest:
 *
 *   · it stops on hover, on focus, and while the tab is in the background;
 *   · `prefers-reduced-motion` turns the timer off entirely and the reader
 *     drives it by hand, which is also what happens after any manual move;
 *   · it never traps a keyboard — dots and arrows are ordinary buttons, and
 *     the slide that is off-screen is really off, not just transparent.
 *
 * The transition is a crossfade rather than a slide. Horizontal movement
 * under a caption is what makes these things hard to read, and a fade costs
 * one property instead of a transform per frame.
 *
 * Photographs: set `NEXT_PUBLIC_STORY_PHOTOS=true` and drop 1.jpg … 5.jpg
 * into `public/stories/` and they replace the drawings, captions and all
 * behaviour unchanged. See `public/stories/README.md`. Until then the
 * drawings ship, because a placeholder is not a design.
 */

const COUNT = STORY_SCENES.length;
/* Three seconds. Long enough to read a short caption, short enough that
   all five are seen without anybody choosing to wait. */
const DWELL = 3000;

/* On unless switched off. The photographs are committed, so a fresh clone
   and a Vercel deploy both get them with no configuration — which an
   opt-in flag living in an ignored .env.local would quietly deny them.
   Set NEXT_PUBLIC_STORY_PHOTOS=false to fall back to the drawings. */
const USE_PHOTOS = process.env.NEXT_PUBLIC_STORY_PHOTOS !== "false";

export function Stories() {
  const { d } = useApp();
  const L = d.landing as Record<string, string>;

  const [i, setI] = useState(0);
  /* Held rather than stopped: the timer resumes when the pointer leaves or
     focus moves out, but a deliberate tap on a dot ends it for good. */
  const [held, setHeld] = useState(false);
  const [manual, setManual] = useState(false);
  const [reduced, setReduced] = useState(false);
  const liveRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduced(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  /* A carousel that keeps animating in a tab nobody is looking at is just a
     battery cost on a phone that may not have much left. */
  useEffect(() => {
    const sync = () => setHeld(document.hidden);
    document.addEventListener("visibilitychange", sync);
    return () => document.removeEventListener("visibilitychange", sync);
  }, []);

  const running = !held && !manual && !reduced;

  useEffect(() => {
    if (!running) return;
    const id = window.setTimeout(() => setI((n) => (n + 1) % COUNT), DWELL);
    return () => window.clearTimeout(id);
  }, [running, i]);

  const go = useCallback((next: number) => {
    setI(((next % COUNT) + COUNT) % COUNT);
    setManual(true);
  }, []);

  const caption = (n: number) => L[`story${n + 1}`] ?? "";
  const label = (n: number) =>
    (L.storyOf ?? "{n} / {total}")
      .replace("{n}", String(n + 1))
      .replace("{total}", String(COUNT));

  return (
    <section
      className="lp-section stories"
      aria-roledescription="carousel"
      aria-label={L.storiesTitle}
      onMouseEnter={() => setHeld(true)}
      onMouseLeave={() => setHeld(false)}
      onFocusCapture={() => setHeld(true)}
      onBlurCapture={() => setHeld(false)}
    >
      <h2 className="lp-h2">{L.storiesTitle}</h2>
      <p className="lp-lede">{L.storiesSub}</p>

      <div className="stories-frame">
        <div className="stories-stage">
          {STORY_SCENES.map((Scene, n) => {
            const on = n === i;
            return (
              <div
                key={n}
                className={`stories-slide${on ? " is-on" : ""}`}
                role="group"
                aria-roledescription="slide"
                aria-label={label(n)}
                aria-hidden={!on}
                /* Off-slides leave the tab order rather than merely fading.
                   Nothing inside them is focusable today, so this is a guard
                   against a future slide that holds a link. */
                inert={!on}
              >
                {USE_PHOTOS ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={`/stories/${n + 1}.jpg`}
                    alt=""
                    className="story-art"
                    loading={n === 0 ? "eager" : "lazy"}
                    decoding="async"
                  />
                ) : (
                  <Scene />
                )}
              </div>
            );
          })}
        </div>

        {/* The caption sits outside the stage so it never moves with the
            picture, and so one live region can announce all five. */}
        <p className="stories-caption" ref={liveRef} aria-live={manual ? "polite" : "off"}>
          {caption(i)}
        </p>

        <div className="stories-controls">
          <button
            type="button"
            className="stories-arrow"
            onClick={() => go(i - 1)}
            aria-label={L.storyPrev}
          >
            <span className="stories-arrow-flip">
              <Chevron size={20} />
            </span>
          </button>

          <div className="stories-dots" role="tablist" aria-label={L.storiesTitle}>
            {STORY_SCENES.map((_, n) => (
              <button
                key={n}
                type="button"
                role="tab"
                aria-selected={n === i}
                aria-label={label(n)}
                className={`stories-dot${n === i ? " is-on" : ""}`}
                onClick={() => go(n)}
              >
                <span
                  className="stories-dot-fill"
                  style={running && n === i ? { animationDuration: `${DWELL}ms` } : undefined}
                  data-run={running && n === i ? "1" : undefined}
                />
              </button>
            ))}
          </div>

          <button
            type="button"
            className="stories-arrow"
            onClick={() => go(i + 1)}
            aria-label={L.storyNext}
          >
            <Chevron size={20} />
          </button>
        </div>
      </div>
    </section>
  );
}
