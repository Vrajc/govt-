import { D, F, S } from "./shared";
import type { Category, ServiceDef, ServiceId } from "./types";

/**
 * The eleven services, each mapped to the government process it stands for.
 *
 * `realPortal` and `realForm` are not decoration: they are printed on every
 * service page and on /about, so nobody can mistake this prototype for the
 * thing itself, and so anyone who wants the real route can go and find it.
 */

export const CATALOGUE: Record<ServiceId, ServiceDef> = {
  /* ================================================================
   * STARTING A PENSION
   * ================================================================ */

  /**
   * IGNOAPS. 60+, from a Below Poverty Line household. ₹200/month from the
   * centre (₹500 once you turn 80), topped up by the state. Applied at the
   * Gram Panchayat or ward office, read out at the Gram Sabha, sanctioned by
   * the District Collector.
   */
  oldage: {
    id: "oldage",
    category: "start",
    realPortal: "nsap.nic.in",
    realForm: "NSAP application form",
    authorityKey: "authVillage",
    typicalDays: 60,
    needsPhoto: true,
    eligibility: [
      { id: "age", type: "age", range: { min: 60 }, failKey: "eligAge60", suggest: "apy" },
      { id: "bpl", type: "yesno", pass: ["yes"], failKey: "eligBpl" },
      {
        id: "otherPension",
        type: "yesno",
        pass: ["no"],
        failKey: "eligOtherPension",
        suggest: "lifecert",
      },
    ],
    documents: [
      D.aadhaarCard,
      D.ageProof,
      D.bplCard,
      D.bankPassbook,
      D.residenceProof,
      D.passportPhoto,
      D.incomeCert,
    ],
    fields: [
      F.fullName,
      F.dob,
      F.gender,
      F.aadhaar,
      F.mobile,
      F.address,
      F.district,
      F.rationCard,
      F.annualIncome,
      F.bankName,
      F.accountNumber,
      F.ifsc,
    ],
    stages: [
      S.received,
      S.villageCheck,
      S.gramSabha,
      S.blockCheck,
      S.districtSanction,
      S.firstPayment,
    ],
    outcome: "sanction",
    codes: ["ERR_BPL_NOT_LISTED", "ERR_AGE_PROOF_UNCLEAR", "ERR_BANK_MISMATCH", "ERR_DOC_UNREADABLE"],
  },

  /**
   * IGNWPS. Widow, 40–79, BPL household. ₹300/month from the centre, ₹500
   * once she turns 80, plus the state's share.
   */
  widow: {
    id: "widow",
    category: "start",
    realPortal: "nsap.nic.in",
    realForm: "NSAP application form",
    authorityKey: "authVillage",
    typicalDays: 60,
    needsPhoto: true,
    eligibility: [
      { id: "widowed", type: "yesno", pass: ["yes"], failKey: "eligWidow" },
      { id: "age", type: "age", range: { min: 40 }, failKey: "eligAge40" },
      { id: "bpl", type: "yesno", pass: ["yes"], failKey: "eligBpl" },
      { id: "remarried", type: "yesno", pass: ["no"], failKey: "eligRemarried" },
    ],
    documents: [
      D.aadhaarCard,
      D.deathCertificate,
      D.ageProof,
      D.bplCard,
      D.bankPassbook,
      D.residenceProof,
      D.passportPhoto,
      D.marriageProof,
    ],
    fields: [
      F.fullName,
      F.dob,
      F.aadhaar,
      F.mobile,
      F.address,
      F.district,
      F.husbandName,
      F.husbandDeathDate,
      F.rationCard,
      F.bankName,
      F.accountNumber,
      F.ifsc,
    ],
    stages: [
      S.received,
      S.villageCheck,
      S.gramSabha,
      S.blockCheck,
      S.districtSanction,
      S.firstPayment,
    ],
    outcome: "sanction",
    codes: ["ERR_DEATH_CERT_UNCLEAR", "ERR_BPL_NOT_LISTED", "ERR_BANK_MISMATCH", "ERR_DOC_UNREADABLE"],
  },

  /**
   * IGNDPS. 18–79, disability of 80% or more, BPL household.
   */
  disability: {
    id: "disability",
    category: "start",
    realPortal: "nsap.nic.in",
    realForm: "NSAP application form",
    authorityKey: "authVillage",
    typicalDays: 60,
    needsPhoto: true,
    eligibility: [
      { id: "age", type: "age", range: { min: 18 }, failKey: "eligAge18" },
      { id: "certified", type: "yesno", pass: ["yes"], failKey: "eligDisabilityCert" },
      { id: "severity", type: "yesno", pass: ["yes"], failKey: "eligDisability80" },
      { id: "bpl", type: "yesno", pass: ["yes"], failKey: "eligBpl" },
    ],
    documents: [
      D.aadhaarCard,
      D.disabilityCert,
      D.ageProof,
      D.bplCard,
      D.bankPassbook,
      D.residenceProof,
      D.passportPhoto,
    ],
    fields: [
      F.fullName,
      F.dob,
      F.gender,
      F.aadhaar,
      F.mobile,
      F.address,
      F.district,
      F.disabilityPercent,
      F.udid,
      F.rationCard,
      F.bankName,
      F.accountNumber,
      F.ifsc,
    ],
    stages: [
      S.received,
      S.villageCheck,
      S.blockCheck,
      S.districtSanction,
      S.firstPayment,
    ],
    outcome: "sanction",
    codes: ["ERR_DISABILITY_CERT", "ERR_BPL_NOT_LISTED", "ERR_BANK_MISMATCH", "ERR_DOC_UNREADABLE"],
  },

  /**
   * EPS-95, Form 10D. Anyone whose employer cut PF for ten years or more,
   * from age 58 (or a reduced pension from 50). Filed on the EPFO member
   * portal; the employer has to attest before EPFO will look at it, which is
   * where most of these get stuck.
   */
  epfpension: {
    id: "epfpension",
    category: "start",
    realPortal: "unifiedportal-mem.epfindia.gov.in",
    realForm: "Form 10D",
    authorityKey: "authEpfo",
    typicalDays: 30,
    needsPhoto: true,
    eligibility: [
      { id: "age", type: "age", range: { min: 50 }, failKey: "eligAge58Eps" },
      { id: "pfCut", type: "yesno", pass: ["yes"], failKey: "eligNoPf", suggest: "oldage" },
      { id: "tenYears", type: "yesno", pass: ["yes"], failKey: "eligTenYears" },
      { id: "uanKnown", type: "yesno", pass: ["yes", "no"], failKey: "eligUan" },
    ],
    documents: [
      D.aadhaarCard,
      D.panCard,
      D.bankPassbook,
      D.cancelledCheque,
      D.jointPhoto,
      D.passportPhoto,
    ],
    fields: [
      F.fullName,
      F.dob,
      F.aadhaar,
      F.mobile,
      F.uan,
      F.employerName,
      F.serviceYears,
      F.retireDate,
      F.bankName,
      F.accountNumber,
      F.ifsc,
    ],
    stages: [
      S.received,
      S.employerCheck,
      S.epfoCheck,
      S.ppoIssued,
      S.bankSetup,
      S.firstPayment,
    ],
    outcome: "sanction",
    codes: ["ERR_UAN_NOT_FOUND", "ERR_KYC_PENDING", "ERR_EXIT_DATE_MISSING", "ERR_BANK_MISMATCH"],
  },

  /**
   * Central civil service pension. Form 6-A on Bhavishya — since the
   * CCS (Pension) Rules 2021 this single form replaced Forms 1, 3, 4 and 5.
   * The Head of Office verifies the service book, the Pay & Accounts Officer
   * issues the e-PPO, and it lands in DigiLocker.
   */
  govtretire: {
    id: "govtretire",
    category: "start",
    realPortal: "bhavishya.nic.in",
    realForm: "Form 6-A",
    authorityKey: "authOffice",
    typicalDays: 45,
    needsPhoto: true,
    eligibility: [
      { id: "govtJob", type: "yesno", pass: ["yes"], failKey: "eligNotGovt", suggest: "epfpension" },
      { id: "retiringSoon", type: "yesno", pass: ["yes"], failKey: "eligRetireWindow" },
      { id: "tenYears", type: "yesno", pass: ["yes"], failKey: "eligTenYearsGovt" },
    ],
    documents: [
      D.aadhaarCard,
      D.panCard,
      D.jointPhoto,
      D.bankPassbook,
      D.cancelledCheque,
      D.serviceRecord,
    ],
    fields: [
      F.fullName,
      F.dob,
      F.aadhaar,
      F.mobile,
      F.officeName,
      F.employeeCode,
      F.retireDate,
      F.serviceYears,
      F.address,
      F.bankName,
      F.accountNumber,
      F.ifsc,
    ],
    stages: [
      S.received,
      S.officeCheck,
      S.paoCheck,
      S.ppoIssued,
      S.bankSetup,
      S.firstPayment,
    ],
    outcome: "sanction",
    codes: ["ERR_SERVICE_BOOK", "ERR_NOMINATION_MISSING", "ERR_BANK_MISMATCH", "ERR_DOC_UNREADABLE"],
  },

  /**
   * Atal Pension Yojana. 18–40, a bank or post-office savings account, and
   * not an income-tax payer. You choose the pension you want at 60 and the
   * contribution is auto-debited every month until then.
   */
  apy: {
    id: "apy",
    category: "start",
    realPortal: "npscra.nsdl.co.in",
    realForm: "APY subscriber registration form",
    authorityKey: "authBank",
    typicalDays: 7,
    needsPhoto: false,
    eligibility: [
      { id: "age", type: "age", range: { min: 18, max: 40 }, failKey: "eligApyAge", suggest: "oldage" },
      { id: "savings", type: "yesno", pass: ["yes"], failKey: "eligNoAccount" },
      { id: "taxpayer", type: "yesno", pass: ["no"], failKey: "eligTaxpayer" },
    ],
    documents: [D.aadhaarCard, D.bankPassbook, D.panCard],
    fields: [
      F.fullName,
      F.dob,
      F.gender,
      F.aadhaar,
      F.mobile,
      F.apyAmount,
      F.nomineeName,
      F.bankName,
      F.accountNumber,
      F.ifsc,
    ],
    stages: [S.received, S.bankVerify, S.recordUpdated],
    outcome: "change",
    codes: ["ERR_BANK_MISMATCH", "ERR_AGE_PROOF_UNCLEAR", "ERR_DOC_UNREADABLE"],
  },

  /* ================================================================
   * AFTER A DEATH IN THE FAMILY
   * ================================================================ */

  /**
   * Family pension, Form 14. The thing almost nobody is told: if the
   * spouse's name is already in the PPO, the bank can start the family
   * pension directly — no fresh sanction, no office visit. The first
   * eligibility question here exists to surface exactly that.
   */
  familypension: {
    id: "familypension",
    category: "family",
    realPortal: "pensionersportal.gov.in",
    realForm: "Form 14",
    authorityKey: "authBankOrOffice",
    typicalDays: 30,
    needsPhoto: true,
    eligibility: [
      { id: "wasPensioner", type: "yesno", pass: ["yes"], failKey: "eligNotPensioner" },
      {
        id: "relationship",
        type: "choice",
        pass: ["spouse", "son", "daughter", "mother", "father"],
        options: [
          { value: "spouse", labelKey: "relSpouse" },
          { value: "son", labelKey: "relSon" },
          { value: "daughter", labelKey: "relDaughter" },
          { value: "mother", labelKey: "relMother" },
          { value: "father", labelKey: "relFather" },
        ],
        failKey: "eligRelationship",
      },
      { id: "haveDeathCert", type: "yesno", pass: ["yes"], failKey: "eligDeathCert" },
    ],
    documents: [
      D.deathCertificate,
      D.aadhaarCard,
      D.ppoCopy,
      D.bankPassbook,
      D.passportPhoto,
      D.marriageProof,
    ],
    fields: [
      F.fullName,
      F.dob,
      F.aadhaar,
      F.mobile,
      F.relationship,
      F.deceasedName,
      F.deceasedPpo,
      F.deathDate,
      F.nameInPpo,
      F.address,
      F.bankName,
      F.accountNumber,
      F.ifsc,
    ],
    stages: [S.received, S.officeCheck, S.ppoIssued, S.bankSetup, S.firstPayment],
    outcome: "sanction",
    codes: ["ERR_DEATH_CERT_UNCLEAR", "ERR_NOT_IN_PPO", "ERR_BANK_MISMATCH", "ERR_DOC_UNREADABLE"],
  },

  /* ================================================================
   * WHEN YOU ALREADY GET A PENSION
   * ================================================================ */

  /**
   * The annual Digital Life Certificate. The journey this app started as.
   */
  lifecert: {
    id: "lifecert",
    category: "have",
    realPortal: "jeevanpramaan.gov.in",
    realForm: null,
    authorityKey: "authPda",
    typicalDays: 1,
    needsPhoto: true,
    eligibility: [],
    documents: [],
    fields: [F.ppo, F.aadhaar, F.mobile],
    stages: [S.received, S.faceMatch, S.recordUpdated],
    outcome: "lifecert",
    codes: [
      "ERR_FACE_QUALITY_LOW",
      "ERR_LIVENESS_FAIL",
      "ERR_AADHAAR_NAME_MISMATCH",
      "ERR_PPO_NOT_FOUND",
      "ERR_FACE_NOT_CENTERED",
      "ERR_DUPLICATE_SUBMISSION",
    ],
  },

  /**
   * Moving the pension to another bank or branch. Routed through CPAO in
   * reality; a fresh life certificate is needed at the new branch, which is
   * the part that catches people out.
   */
  changebank: {
    id: "changebank",
    category: "have",
    realPortal: "cpao.nic.in",
    realForm: "Pension transfer request",
    authorityKey: "authBank",
    typicalDays: 21,
    needsPhoto: false,
    eligibility: [
      { id: "havePpo", type: "yesno", pass: ["yes"], failKey: "eligNoPpo" },
      { id: "newAccountOpen", type: "yesno", pass: ["yes"], failKey: "eligOpenAccount" },
    ],
    documents: [D.ppoCopy, D.aadhaarCard, D.newPassbook, D.cancelledCheque],
    fields: [
      F.fullName,
      F.ppo,
      F.aadhaar,
      F.mobile,
      F.bankName,
      F.newBankName,
      F.newAccountNumber,
      F.newIfsc,
    ],
    stages: [S.received, S.bankVerify, S.bankUpdate, S.firstPayment],
    outcome: "change",
    codes: ["ERR_PPO_NOT_FOUND", "ERR_BANK_MISMATCH", "ERR_ACCOUNT_CLOSED", "ERR_DOC_UNREADABLE"],
  },

  /**
   * The extra pension on turning 80. Twenty per cent at 80, rising to a
   * hundred at 100 — and it is supposed to be automatic, from the first day
   * of the *month* you turn 80, not the birthday. Banks routinely miss it,
   * so this service is really "claim the money you are already owed", and it
   * calculates the arrears.
   */
  age80: {
    id: "age80",
    category: "have",
    realPortal: "pensionersportal.gov.in",
    realForm: null,
    authorityKey: "authBank",
    typicalDays: 21,
    needsPhoto: false,
    eligibility: [
      { id: "age", type: "age", range: { min: 80 }, failKey: "eligAge80" },
      { id: "havePpo", type: "yesno", pass: ["yes"], failKey: "eligNoPpo" },
      { id: "alreadyIncreased", type: "yesno", pass: ["no"], failKey: "eligAlreadyIncreased" },
    ],
    documents: [D.ppoCopy, D.aadhaarCard, D.pensionSlip, D.ageProof],
    fields: [F.fullName, F.dob, F.ppo, F.aadhaar, F.mobile, F.currentPension, F.bankName],
    stages: [S.received, S.bankVerify, S.arrearsCalc, S.bankUpdate],
    outcome: "increase",
    codes: ["ERR_AGE_PROOF_UNCLEAR", "ERR_PPO_NOT_FOUND", "ERR_ALREADY_APPLIED", "ERR_DOC_UNREADABLE"],
  },

  /**
   * The pension has not arrived. In reality this goes to CPENGRAMS and comes
   * back with a docket number. Deliberately the shortest journey in the app,
   * because the person filing it has already had a bad month.
   */
  notarrived: {
    id: "notarrived",
    category: "have",
    realPortal: "pgportal.gov.in / CPENGRAMS",
    realForm: null,
    authorityKey: "authGrievance",
    typicalDays: 30,
    needsPhoto: false,
    skipOtp: false,
    eligibility: [],
    documents: [D.ppoCopy, D.bankPassbook, D.pensionSlip],
    fields: [
      F.fullName,
      F.ppo,
      F.mobile,
      F.complaintAbout,
      F.monthsMissing,
      F.lastReceived,
      F.bankName,
      F.accountNumber,
    ],
    stages: [S.received, S.assigned, S.underReview, S.answered],
    outcome: "grievance",
    codes: ["ERR_PPO_NOT_FOUND", "ERR_NEED_MORE_INFO"],
  },
};

export const ALL_SERVICES: ServiceDef[] = Object.values(CATALOGUE);

export function serviceById(id: string): ServiceDef | null {
  return (CATALOGUE as Record<string, ServiceDef>)[id] ?? null;
}

export function servicesIn(category: Category): ServiceDef[] {
  return ALL_SERVICES.filter((s) => s.category === category);
}

export function isServiceId(v: unknown): v is ServiceId {
  return typeof v === "string" && v in CATALOGUE;
}

/** Every outcome code across the catalogue — used to seed the explainer. */
export const ALL_CODES: string[] = Array.from(
  new Set(ALL_SERVICES.flatMap((s) => s.codes))
).sort();
