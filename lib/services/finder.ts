import type { ServiceId } from "./types";

/**
 * The finder.
 *
 * The single largest failure of the real system is not any one form — it is
 * that a 62-year-old widow in a village has no way to learn that IGNWPS
 * exists, let alone that she qualifies for it and not for the three schemes
 * next to it on the page. Every portal assumes you already know which door
 * you want.
 *
 * So: four questions at most, plain words, and an honest "there is nothing
 * for you yet" ending where that is the truth. A decision tree rather than a
 * search box, because you cannot search for the name of a thing you have
 * never heard of.
 */

export type FinderTarget =
  | { kind: "node"; id: string }
  | { kind: "service"; id: ServiceId }
  /** No central scheme fits. Say so plainly and point somewhere real. */
  | { kind: "none"; messageKey: string; suggest?: ServiceId };

export interface FinderOption {
  /** Key into `finder` — the answer as the person would say it. */
  labelKey: string;
  subKey?: string;
  to: FinderTarget;
}

export interface FinderNode {
  id: string;
  /** Key into `finder`. */
  questionKey: string;
  options: FinderOption[];
}

const node = (id: string): FinderTarget => ({ kind: "node", id });
const svc = (id: ServiceId): FinderTarget => ({ kind: "service", id });

export const FINDER: Record<string, FinderNode> = {
  root: {
    id: "root",
    questionKey: "qRoot",
    options: [
      { labelKey: "oRootStart", subKey: "oRootStartSub", to: node("startWork") },
      { labelKey: "oRootHave", subKey: "oRootHaveSub", to: node("haveWhat") },
      { labelKey: "oRootDied", subKey: "oRootDiedSub", to: svc("familypension") },
    ],
  },

  /* ---------------- starting a pension ---------------- */
  startWork: {
    id: "startWork",
    questionKey: "qStartWork",
    options: [
      { labelKey: "oWorkGovt", subKey: "oWorkGovtSub", to: svc("govtretire") },
      { labelKey: "oWorkPf", subKey: "oWorkPfSub", to: svc("epfpension") },
      { labelKey: "oWorkNone", subKey: "oWorkNoneSub", to: node("noJobAge") },
    ],
  },

  noJobAge: {
    id: "noJobAge",
    questionKey: "qAge",
    options: [
      { labelKey: "oAge60", to: node("sixtyPlus") },
      { labelKey: "oAge40", to: node("middleAge") },
      { labelKey: "oAge18", subKey: "oAge18Sub", to: svc("apy") },
    ],
  },

  sixtyPlus: {
    id: "sixtyPlus",
    questionKey: "qWhichTrue",
    options: [
      { labelKey: "oTrueWidow", to: svc("widow") },
      { labelKey: "oTrueDisability", to: svc("disability") },
      { labelKey: "oTrueNone", to: svc("oldage") },
    ],
  },

  middleAge: {
    id: "middleAge",
    questionKey: "qWhichTrue",
    options: [
      { labelKey: "oTrueWidow", to: svc("widow") },
      { labelKey: "oTrueDisability", to: svc("disability") },
      {
        labelKey: "oTrueNone",
        // Honest dead end: the old-age pension starts at 60 and Atal Pension
        // Yojana closes at 40. Someone 40-59 with no job history genuinely
        // falls between the two, and pretending otherwise wastes their day.
        to: { kind: "none", messageKey: "noneMiddleAge", suggest: "oldage" },
      },
    ],
  },

  /* ---------------- already getting a pension ---------------- */
  haveWhat: {
    id: "haveWhat",
    questionKey: "qHaveWhat",
    options: [
      { labelKey: "oHaveLife", subKey: "oHaveLifeSub", to: svc("lifecert") },
      { labelKey: "oHaveMissing", subKey: "oHaveMissingSub", to: svc("notarrived") },
      { labelKey: "oHaveBank", subKey: "oHaveBankSub", to: svc("changebank") },
      { labelKey: "oHave80", subKey: "oHave80Sub", to: svc("age80") },
    ],
  },
};

export const FINDER_ROOT = "root";

export function finderNode(id: string): FinderNode | null {
  return FINDER[id] ?? null;
}
