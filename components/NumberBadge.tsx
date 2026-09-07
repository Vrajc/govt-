"use client";

import { useApp } from "@/lib/app-state";

/**
 * The number, printed beside the thing it belongs to.
 *
 * Deliberately not the same shape as the step numbers in the voice panel,
 * which are filled circles. A number in a list of steps means "third thing
 * to do"; this one means "the name of this door" — two different ideas
 * that would be one confusing idea if they were drawn the same way.
 *
 * The digit is hidden from a screen reader and the words are given
 * instead, because "3" read out in the middle of a list of service names
 * is a fragment, and "number 3" is a sentence.
 */
export function NumberBadge({
  n,
  size = "md",
  withWord = false,
  invert = false,
}: {
  n: number;
  size?: "md" | "lg";
  withWord?: boolean;
  /** For the one place it sits on a filled button rather than on paper. */
  invert?: boolean;
}) {
  const { t } = useApp();
  const badge = (
    <span
      className={`num-badge${size === "lg" ? " num-badge-lg" : ""}${
        invert ? " num-badge-invert" : ""
      }`}
      aria-hidden="true"
    >
      {n}
    </span>
  );

  if (withWord) {
    return (
      <span className="num-word">
        {badge}
        {t("num.of", { n })}
      </span>
    );
  }

  return (
    <>
      {badge}
      <span className="sr-only">{t("num.of", { n })}</span>
    </>
  );
}
