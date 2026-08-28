import type { DocDef, FieldDef, StageDef } from "./types";

/**
 * Shared vocabulary.
 *
 * Eleven services ask for the same twenty things. Defining each one once —
 * one label, one helper sentence, one validation rule, in three languages —
 * is not just less work. It means "Aadhaar number" is worded identically
 * whether you are claiming a widow pension or moving your bank, which is
 * exactly what someone filling their second form needs.
 */

/* ==================================================================
 * Fields
 * ================================================================== */
const f = (
  id: string,
  type: FieldDef["type"],
  required = true,
  extra: Partial<FieldDef> = {}
): FieldDef => ({ id, type, required, ...extra });

export const F = {
  fullName: f("fullName", "name"),
  dob: f("dob", "date"),
  gender: f("gender", "choice", true, {
    options: [
      { value: "f", labelKey: "genderF" },
      { value: "m", labelKey: "genderM" },
      { value: "o", labelKey: "genderO" },
    ],
  }),
  aadhaar: f("aadhaar", "aadhaar"),
  mobile: f("mobile", "mobile"),
  address: f("address", "address"),
  district: f("district", "text"),

  /* pension identifiers */
  ppo: f("ppo", "ppo"),
  uan: f("uan", "uan"),

  /* bank */
  bankName: f("bankName", "text"),
  accountNumber: f("accountNumber", "account"),
  ifsc: f("ifsc", "ifsc"),
  newBankName: f("newBankName", "text"),
  newAccountNumber: f("newAccountNumber", "account"),
  newIfsc: f("newIfsc", "ifsc"),

  /* means-tested schemes */
  rationCard: f("rationCard", "text"),
  annualIncome: f("annualIncome", "money", false),

  /* widow */
  husbandName: f("husbandName", "name"),
  husbandDeathDate: f("husbandDeathDate", "date"),

  /* disability */
  disabilityPercent: f("disabilityPercent", "digits", true, { digits: 2 }),
  udid: f("udid", "text", false),

  /* employment */
  employerName: f("employerName", "text"),
  retireDate: f("retireDate", "date"),
  officeName: f("officeName", "text"),
  employeeCode: f("employeeCode", "text", false),
  serviceYears: f("serviceYears", "digits", true, { digits: 2 }),

  /* family pension */
  deceasedName: f("deceasedName", "name"),
  deceasedPpo: f("deceasedPpo", "ppo"),
  deathDate: f("deathDate", "date"),
  relationship: f("relationship", "choice", true, {
    options: [
      { value: "spouse", labelKey: "relSpouse" },
      { value: "son", labelKey: "relSon" },
      { value: "daughter", labelKey: "relDaughter" },
      { value: "mother", labelKey: "relMother" },
      { value: "father", labelKey: "relFather" },
    ],
  }),
  nameInPpo: f("nameInPpo", "choice", true, {
    options: [
      { value: "yes", labelKey: "yes" },
      { value: "no", labelKey: "no" },
      { value: "dontknow", labelKey: "dontKnow" },
    ],
  }),

  /* Atal Pension Yojana */
  apyAmount: f("apyAmount", "choice", true, {
    options: [
      { value: "1000", labelKey: "apy1000" },
      { value: "2000", labelKey: "apy2000" },
      { value: "3000", labelKey: "apy3000" },
      { value: "4000", labelKey: "apy4000" },
      { value: "5000", labelKey: "apy5000" },
    ],
  }),
  nomineeName: f("nomineeName", "name"),

  /* grievance */
  complaintAbout: f("complaintAbout", "choice", true, {
    options: [
      { value: "notcredited", labelKey: "cmpNotCredited" },
      { value: "less", labelKey: "cmpLess" },
      { value: "stopped", labelKey: "cmpStopped" },
      { value: "nopppo", labelKey: "cmpNoPpo" },
      { value: "other", labelKey: "cmpOther" },
    ],
  }),
  monthsMissing: f("monthsMissing", "digits", true, { digits: 2 }),
  lastReceived: f("lastReceived", "date", false),

  /* turning 80 */
  currentPension: f("currentPension", "money"),
} satisfies Record<string, FieldDef>;

/* ==================================================================
 * Documents — all of them photographable with the phone
 * ================================================================== */
const d = (id: string, required = true): DocDef => ({ id, required });

export const D = {
  aadhaarCard: d("aadhaarCard"),
  bankPassbook: d("bankPassbook"),
  passportPhoto: d("passportPhoto"),
  ageProof: d("ageProof"),
  bplCard: d("bplCard"),
  residenceProof: d("residenceProof"),
  incomeCert: d("incomeCert", false),
  deathCertificate: d("deathCertificate"),
  marriageProof: d("marriageProof", false),
  disabilityCert: d("disabilityCert"),
  pensionSlip: d("pensionSlip"),
  ppoCopy: d("ppoCopy"),
  panCard: d("panCard", false),
  cancelledCheque: d("cancelledCheque"),
  jointPhoto: d("jointPhoto"),
  serviceRecord: d("serviceRecord", false),
  newPassbook: d("newPassbook"),
} satisfies Record<string, DocDef>;

/* ==================================================================
 * Stages — the real approval chain, with the real actors named
 * ================================================================== */
const s = (id: string, actor: StageDef["actor"], weight = 1): StageDef => ({
  id,
  actor,
  weight,
});

export const S = {
  received: s("received", "system", 0.5),

  /* NSAP route: panchayat → gram sabha → block → district */
  villageCheck: s("villageCheck", "village", 2),
  gramSabha: s("gramSabha", "village", 2),
  blockCheck: s("blockCheck", "block", 2),
  districtSanction: s("districtSanction", "district", 2),

  /* employment route */
  employerCheck: s("employerCheck", "office", 2),
  epfoCheck: s("epfoCheck", "office", 2),
  officeCheck: s("officeCheck", "office", 2),
  paoCheck: s("paoCheck", "office", 2),

  /* common tail */
  ppoIssued: s("ppoIssued", "system", 1),
  bankSetup: s("bankSetup", "bank", 1),
  firstPayment: s("firstPayment", "bank", 1),

  /* life certificate */
  faceMatch: s("faceMatch", "system", 2),
  recordUpdated: s("recordUpdated", "office", 1),

  /* service requests */
  bankVerify: s("bankVerify", "bank", 2),
  bankUpdate: s("bankUpdate", "bank", 2),
  arrearsCalc: s("arrearsCalc", "office", 2),

  /* grievance */
  assigned: s("assigned", "office", 1),
  underReview: s("underReview", "office", 2),
  answered: s("answered", "office", 1),
} satisfies Record<string, StageDef>;
