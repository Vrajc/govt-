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

/** Same, with the heading this field belongs under. */
const g =
  (group: string) =>
  (
    id: string,
    type: FieldDef["type"],
    required = true,
    extra: Partial<FieldDef> = {}
  ): FieldDef => ({ id, type, required, group, ...extra });

const you = g("you");
const home = g("home");
const pension = g("pension");
const bank = g("bank");
const newbank = g("newbank");
const household = g("household");
const husband = g("husband");
const disability = g("disability");
const work = g("work");
const deceased = g("deceased");
const apy = g("apy");
const complaint = g("complaint");

export const F = {
  fullName: you("fullName", "name"),
  dob: you("dob", "date"),
  gender: you("gender", "choice", true, {
    options: [
      { value: "f", labelKey: "genderF" },
      { value: "m", labelKey: "genderM" },
      { value: "o", labelKey: "genderO" },
    ],
  }),
  aadhaar: you("aadhaar", "aadhaar"),
  mobile: you("mobile", "mobile"),
  address: home("address", "address"),
  district: home("district", "text"),

  /* pension identifiers */
  /**
   * Central civil pensioners — the CPAO number, twelve digits.
   *
   * This is the one the Central Pension Accounting Office prints on the
   * first page of the PPO book, and it is what cpao.nic.in and the
   * pensioners' portal both ask for.
   */
  ppo: pension("ppo", "ppo", true, {
    helpKey: "ppoCpao",
    example: "700020240123",
    pattern: "\\d{12}",
  }),
  /**
   * The same question asked by a service that serves every kind of
   * pensioner at once.
   *
   * Jeevan Pramaan takes central, state, EPFO and defence pensioners, and
   * the grievance portal takes anybody at all — so neither can insist on
   * the CPAO shape without turning away the majority who are not on it.
   * The box still refuses obvious nonsense and then gets out of the way.
   */
  /**
   * Who sanctioned the pension, as against who pays it out.
   *
   * Jeevan Pramaan asks for both, and they are usually different bodies —
   * the sanctioning authority is the department or office that granted the
   * pension, the disbursing agency is the bank or post office it arrives
   * from. A certificate is matched on the pair.
   */
  sanctionAuthority: pension("sanctionAuthority", "text", true, {
    labelKey: "sanctionAuthority",
    helpKey: "sanctionAuthority",
  }),
  ppoAny: pension("ppo", "ppo", true, {
    labelKey: "ppo",
    helpKey: "ppoAny",
    example: "700020240123",
    pattern: "[A-Z0-9][A-Z0-9/\\-]{6,24}",
  }),
  uan: pension("uan", "uan"),

  /* bank */
  bankName: bank("bankName", "text"),
  accountNumber: bank("accountNumber", "account"),
  ifsc: bank("ifsc", "ifsc"),
  newBankName: newbank("newBankName", "text"),
  newAccountNumber: newbank("newAccountNumber", "account"),
  newIfsc: newbank("newIfsc", "ifsc"),

  /* means-tested schemes */
  rationCard: household("rationCard", "text"),
  annualIncome: household("annualIncome", "money", false),

  /* widow */
  husbandName: husband("husbandName", "name"),
  husbandDeathDate: husband("husbandDeathDate", "date"),

  /* disability */
  disabilityPercent: disability("disabilityPercent", "digits", true, { digits: 2 }),
  udid: disability("udid", "text", false),

  /* employment */
  employerName: work("employerName", "text"),
  retireDate: work("retireDate", "date"),
  officeName: work("officeName", "text"),
  employeeCode: work("employeeCode", "text", false),
  serviceYears: work("serviceYears", "digits", true, { digits: 2 }),

  /* family pension */
  deceasedName: deceased("deceasedName", "name"),
  deceasedPpo: deceased("deceasedPpo", "ppo", true, {
    helpKey: "deceasedPpo",
    example: "700020240123",
    pattern: "\\d{12}",
  }),
  deathDate: deceased("deathDate", "date"),
  relationship: deceased("relationship", "choice", true, {
    options: [
      { value: "spouse", labelKey: "relSpouse" },
      { value: "son", labelKey: "relSon" },
      { value: "daughter", labelKey: "relDaughter" },
      { value: "mother", labelKey: "relMother" },
      { value: "father", labelKey: "relFather" },
    ],
  }),
  nameInPpo: deceased("nameInPpo", "choice", true, {
    options: [
      { value: "yes", labelKey: "yes" },
      { value: "no", labelKey: "no" },
      { value: "dontknow", labelKey: "dontKnow" },
    ],
  }),

  /* Atal Pension Yojana */
  apyAmount: apy("apyAmount", "choice", true, {
    options: [
      { value: "1000", labelKey: "apy1000" },
      { value: "2000", labelKey: "apy2000" },
      { value: "3000", labelKey: "apy3000" },
      { value: "4000", labelKey: "apy4000" },
      { value: "5000", labelKey: "apy5000" },
    ],
  }),
  nomineeName: apy("nomineeName", "name"),
  /**
   * The same question, asked by Form 6-A rather than by APY.
   *
   * A government pension carries a family pension after the pensioner dies,
   * and Form 6-A collects the family details that make that payable. This
   * service already declares ERR_NOMINATION_MISSING as one of the ways it
   * can come back — so without the question it could reject somebody for
   * failing to answer something it never asked.
   */
  familyNominee: pension("nomineeName", "name", true, {
    labelKey: "familyNominee",
    helpKey: "familyNominee",
  }),

  /* grievance */
  complaintAbout: complaint("complaintAbout", "choice", true, {
    options: [
      { value: "notcredited", labelKey: "cmpNotCredited" },
      { value: "less", labelKey: "cmpLess" },
      { value: "stopped", labelKey: "cmpStopped" },
      { value: "nopppo", labelKey: "cmpNoPpo" },
      { value: "other", labelKey: "cmpOther" },
    ],
  }),
  monthsMissing: complaint("monthsMissing", "digits", true, { digits: 2 }),
  lastReceived: complaint("lastReceived", "date", false),

  /* turning 80 */
  currentPension: pension("currentPension", "money"),
  commutedOn: pension("commutedOn", "date"),
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
  /* A bank cannot move a pension between banks on its own. The old paying
     branch sends it to the Central Pension Accounting Office, which reissues
     the authority to the new one — which is why the transfer takes weeks
     rather than the afternoon a bank transfer would. */
  cpaoCheck: s("cpaoCheck", "office", 3),

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
