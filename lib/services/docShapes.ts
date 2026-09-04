/**
 * What each document physically is.
 *
 * The catalogue already knows which papers a service asks for. It does not
 * know that an Aadhaar card is a plastic card in landscape and a death
 * certificate is a sheet of A4 in portrait — and that is exactly the
 * knowledge a first-time photographer is missing. Somebody who has never
 * uploaded anything holds the phone over the paper, gets a picture with the
 * top third cut off, and finds out six weeks later.
 *
 * So each document gets three facts, and all three earn their place on the
 * screen:
 *
 *   `shape`  — drives the drawing shown before the camera opens, so the
 *              reader sees what a good photograph looks like first.
 *   `ratio`  — the real thing's proportions, checked against what the
 *              camera actually caught. A card that comes out as a narrow
 *              strip is a card with its edge cut off.
 *   `focus`  — the one part that has to survive. On a passbook that is the
 *              account number line; on a certificate it is the seal. The
 *              rest of the paper can be soft and nothing is lost.
 *   `mark`   — what makes this particular paper recognisable across a
 *              room: the emblem and the three groups of four on an
 *              Aadhaar card, the household grid on a ration card. Drawn
 *              only in the enlarged view, where there is room for it.
 */

export type DocShape =
  /** ID-1 plastic, landscape: Aadhaar, PAN, voter, UDID. */
  | "card"
  /** A sheet, portrait: certificates, income papers, service book pages. */
  | "paper"
  /** A bound booklet, portrait: bank passbooks, ration cards. */
  | "booklet"
  /** Long and short: a cheque with a line through it. */
  | "cheque"
  /** A face, taken with the camera rather than found in a drawer. */
  | "face"
  /** Two people in one frame. */
  | "people";

/** Which band of the document has to come out readable. */
export type DocFocus =
  | "number" // a long printed number: Aadhaar, PPO, PAN
  | "account" // the account number and IFSC on a passbook
  | "seal" // the office stamp and signature that make a paper official
  | "name" // the name, spelled as the office has it
  | "face" // a face, ours or two of them
  | "whole"; // nothing in particular — all of it matters equally

/**
 * The features that identify one document rather than the class of it.
 *
 * `shape` gets somebody to the right drawer — a card, not a sheet. It does
 * not get them past the four plastic cards in that drawer, and an Aadhaar
 * card and a PAN card are the same rectangle. What separates them is where
 * the photograph sits, whether there is an emblem across the top, and
 * whether the long number runs in three groups of four or in one run of
 * ten. Those are the marks, and they are what a reader is actually matching
 * against the thing in their hand.
 *
 * They are drawn at the enlarged size only. At 72px they would be mud, and
 * mud on a thumbnail is worse than an honest outline.
 */
export type DocMark =
  /** The emblem, the photograph on the left, the number in three fours. */
  | "aadhaar"
  /** The photograph low on the left, the signature strip beside it. */
  | "pan"
  /** The hospital's card: a photograph, and the box with the percentage. */
  | "udid"
  /** The bank's name across the top, the account block under it. */
  | "passbook"
  /** The household grid — one line per name. */
  | "ration"
  /** A paper an office issued: emblem, heading, round seal, signature. */
  | "office"
  /** A cheque: payee line, amount box, the band of digits at the foot. */
  | "cheque"
  /** A face, or two of them. */
  | "portrait";

export interface DocLook {
  shape: DocShape;
  /** Width over height of the real thing, held the way it should be photographed. */
  ratio: number;
  focus: DocFocus;
  /** What identifies this paper rather than its class. Enlarged view only. */
  mark: DocMark;
  /** Needs the back as well as the front. */
  twoSided?: boolean;
}

/* The measurements are the real ones. ID-1 is 85.6 x 54 mm, which is where
   1.59 comes from; A4 is 210 x 297; an Indian passbook is close to A6; a
   cheque is 8 x 3.67 inches. */
const CARD = 85.6 / 54;
const A4 = 210 / 297;
const A6 = 105 / 148;
const CHEQUE = 8 / 3.67;
const PORTRAIT_PHOTO = 35 / 45; // the passport-photo standard, 35 x 45 mm

export const DOC_LOOK: Record<string, DocLook> = {
  aadhaarCard: { shape: "card", ratio: CARD, focus: "number", mark: "aadhaar", twoSided: true },
  panCard: { shape: "card", ratio: CARD, focus: "number", mark: "pan" },
  disabilityCert: { shape: "card", ratio: CARD, focus: "number", mark: "udid" },

  bankPassbook: { shape: "booklet", ratio: A6, focus: "account", mark: "passbook" },
  newPassbook: { shape: "booklet", ratio: A6, focus: "account", mark: "passbook" },
  bplCard: { shape: "booklet", ratio: A6, focus: "name", mark: "ration" },

  deathCertificate: { shape: "paper", ratio: A4, focus: "seal", mark: "office" },
  incomeCert: { shape: "paper", ratio: A4, focus: "seal", mark: "office" },
  residenceProof: { shape: "paper", ratio: A4, focus: "name", mark: "office" },
  marriageProof: { shape: "paper", ratio: A4, focus: "name", mark: "office" },
  ageProof: { shape: "paper", ratio: A4, focus: "name", mark: "office" },
  serviceRecord: { shape: "paper", ratio: A4, focus: "name", mark: "office" },
  pensionSlip: { shape: "paper", ratio: A4, focus: "number", mark: "office" },
  ppoCopy: { shape: "paper", ratio: A4, focus: "number", mark: "office" },

  cancelledCheque: { shape: "cheque", ratio: CHEQUE, focus: "account", mark: "cheque" },

  passportPhoto: { shape: "face", ratio: PORTRAIT_PHOTO, focus: "face", mark: "portrait" },
  jointPhoto: { shape: "people", ratio: 4 / 3, focus: "face", mark: "portrait" },
};

/** A sane default for a document the catalogue gains before this file does. */
export const DEFAULT_LOOK: DocLook = { shape: "paper", ratio: A4, focus: "whole", mark: "office" };

export function lookFor(docId: string): DocLook {
  return DOC_LOOK[docId] ?? DEFAULT_LOOK;
}
