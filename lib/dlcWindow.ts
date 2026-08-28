/**
 * When the annual life certificate may be sent.
 *
 * Everyone may file from 1 November to 30 November; pensioners of eighty and
 * over get a head start from 1 October. Missing the window is the single most
 * common way a pension stops, and the real portals mention it nowhere a
 * pensioner would look before starting — so it belongs on the service page,
 * before the journey, not in the receipt afterwards.
 */

export type DlcWindowState = "open" | "opensSoon" | "closed";

export interface DlcWindow {
  state: DlcWindowState;
  /** Days until it opens, or until it shuts if it is already open. */
  days: number;
  /** The day this pensioner may start: 1 October at 80+, else 1 November. */
  opensOn: Date;
  closesOn: Date;
}

const DAY_MS = 86_400_000;

/** Whole days from `a` to `b`, both taken at UTC midnight. */
function daysBetween(a: Date, b: Date): number {
  const from = Date.UTC(a.getUTCFullYear(), a.getUTCMonth(), a.getUTCDate());
  const to = Date.UTC(b.getUTCFullYear(), b.getUTCMonth(), b.getUTCDate());
  return Math.round((to - from) / DAY_MS);
}

export function dlcWindow(now = new Date(), isEighty = false): DlcWindow {
  const openMonth = isEighty ? 9 : 10; // October is 9, November is 10
  const year = now.getUTCFullYear();

  const opensThisYear = new Date(Date.UTC(year, openMonth, 1));
  const closesThisYear = new Date(Date.UTC(year, 10, 30));

  // Past this year's close, the next chance is next year's window.
  if (daysBetween(now, closesThisYear) < 0) {
    const opensNext = new Date(Date.UTC(year + 1, openMonth, 1));
    return {
      state: "closed",
      days: daysBetween(now, opensNext),
      opensOn: opensNext,
      closesOn: new Date(Date.UTC(year + 1, 10, 30)),
    };
  }

  if (daysBetween(now, opensThisYear) > 0) {
    return {
      state: "opensSoon",
      days: daysBetween(now, opensThisYear),
      opensOn: opensThisYear,
      closesOn: closesThisYear,
    };
  }

  return {
    state: "open",
    days: daysBetween(now, closesThisYear),
    opensOn: opensThisYear,
    closesOn: closesThisYear,
  };
}
