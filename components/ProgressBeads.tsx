"use client";

import { useApp } from "@/lib/app-state";

export const TOTAL_STEPS = 6;

/**
 * Six beads: language, who, details, photo, review, result.
 *
 * Deliberately not numbered on screen — a count of steps remaining is
 * reassuring, a numeral is one more thing to read. The full count goes to
 * screen readers through the label.
 */
export function ProgressBeads({
  step,
  total = TOTAL_STEPS,
  labelFor,
  onGo,
}: {
  step: number;
  /** Services have different numbers of steps, so this is not fixed at six. */
  total?: number;
  /** Name of a step, for the label a screen reader reads out. */
  labelFor?: (n: number) => string;
  /**
   * Go back to an earlier step. Only completed steps are offered — going
   * forward past unanswered questions is how people end up stuck.
   */
  onGo?: (n: number) => void;
}) {
  const { t } = useApp();
  const beads = Array.from({ length: total }, (_, i) => i + 1);

  return (
    <div
      className="beads"
      role="group"
      aria-label={t("common.stepOf", { n: step, total })}
    >
      {beads.map((n, i) => (
        <span key={n} style={{ display: "contents" }}>
          {i > 0 && (
            <span className={`bead-link ${n <= step ? "bead-link-done" : ""}`} aria-hidden="true" />
          )}
          {onGo && n < step ? (
            <button
              type="button"
              className="bead-btn"
              onClick={() => onGo(n)}
              aria-label={t("nav.stepDone", { step: labelFor?.(n) ?? String(n) })}
            >
              <span className="bead bead-done" aria-hidden="true" />
            </button>
          ) : (
            <span
              className="bead-static"
              aria-label={
                labelFor
                  ? t(n === step ? "nav.stepNow" : "nav.stepTodo", { step: labelFor(n) })
                  : undefined
              }
            >
              <span
                className={`bead ${n < step ? "bead-done" : n === step ? "bead-now" : ""}`}
                aria-hidden="true"
              />
            </span>
          )}
        </span>
      ))}
    </div>
  );
}
