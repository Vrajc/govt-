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
export function ProgressBeads({ step }: { step: number }) {
  const { t } = useApp();
  const beads = Array.from({ length: TOTAL_STEPS }, (_, i) => i + 1);

  return (
    <div
      className="beads"
      role="group"
      aria-label={t("common.stepOf", { n: step })}
    >
      {beads.map((n, i) => (
        <span key={n} style={{ display: "contents" }}>
          {i > 0 && (
            <span className={`bead-link ${n <= step ? "bead-link-done" : ""}`} aria-hidden="true" />
          )}
          <span
            className={`bead ${n < step ? "bead-done" : n === step ? "bead-now" : ""}`}
            aria-hidden="true"
          />
        </span>
      ))}
    </div>
  );
}
