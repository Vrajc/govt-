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

export interface DocLook {
  shape: DocShape;
  /** Width over height of the real thing, held the way it should be photographed. */
  ratio: number;
  focus: DocFocus;
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
  aadhaarCard: { shape: "card", ratio: CARD, focus: "number", twoSided: true },
  panCard: { shape: "card", ratio: CARD, focus: "number" },
  disabilityCert: { shape: "card", ratio: CARD, focus: "number" },

  bankPassbook: { shape: "booklet", ratio: A6, focus: "account" },
  newPassbook: { shape: "booklet", ratio: A6, focus: "account" },
  bplCard: { shape: "booklet", ratio: A6, focus: "name" },

  deathCertificate: { shape: "paper", ratio: A4, focus: "seal" },
  incomeCert: { shape: "paper", ratio: A4, focus: "seal" },
  residenceProof: { shape: "paper", ratio: A4, focus: "name" },
  marriageProof: { shape: "paper", ratio: A4, focus: "name" },
  ageProof: { shape: "paper", ratio: A4, focus: "name" },
  serviceRecord: { shape: "paper", ratio: A4, focus: "name" },
  pensionSlip: { shape: "paper", ratio: A4, focus: "number" },
  ppoCopy: { shape: "paper", ratio: A4, focus: "number" },

  cancelledCheque: { shape: "cheque", ratio: CHEQUE, focus: "account" },

  passportPhoto: { shape: "face", ratio: PORTRAIT_PHOTO, focus: "face" },
  jointPhoto: { shape: "people", ratio: 4 / 3, focus: "face" },
};

/** A sane default for a document the catalogue gains before this file does. */
export const DEFAULT_LOOK: DocLook = { shape: "paper", ratio: A4, focus: "whole" };

export function lookFor(docId: string): DocLook {
  return DOC_LOOK[docId] ?? DEFAULT_LOOK;
}
