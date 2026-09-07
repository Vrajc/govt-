#!/usr/bin/env node
/**
 * Conformance check: the fourteen journeys against the processes they model.
 *
 * `check-services.mjs` proves each service *works* — it submits, settles and
 * comes back with an outcome. It says nothing about whether the service is
 * the right shape. This one is the other half: does the app ask what the
 * real form asks, admit who the real rules admit, and route the file through
 * the offices that really decide it?
 *
 * Every expectation below is written out as the government process, with the
 * authority named. That is deliberate. A catalogue is data, and data drifts
 * silently — an age bound edited in a hurry, a stage dropped in a refactor —
 * and the failure is not a crash but a pensioner told the wrong thing with
 * complete confidence. This turns each of those into a build failure.
 *
 * Where a rule varies by state or by employer, it is recorded as UNMODELLED
 * with the reason, rather than asserted loosely. An honest gap in the list is
 * worth more than a check that passes because it demands nothing.
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const out = join(root, "node_modules", ".cache", "scheme-check");

/* The catalogue is TypeScript and this is a plain node script, so compile the
   handful of pure-data modules it needs. No regex parsing: the point of this
   file is to be exact, and a regex over a source file is not. */
function loadCatalogue() {
  rmSync(out, { recursive: true, force: true });
  mkdirSync(out, { recursive: true });
  const cfg = join(out, "tsconfig.json");
  writeFileSync(
    cfg,
    JSON.stringify({
      compilerOptions: {
        target: "ES2022",
        module: "CommonJS",
        moduleResolution: "Node",
        outDir: out,
        rootDir: root,
        baseUrl: root,
        paths: { "@/*": ["./*"] },
        skipLibCheck: true,
        strict: false,
        noEmitOnError: false,
      },
      include: [join(root, "lib/services/**/*.ts"), join(root, "lib/types.ts")],
    }),
  );
  execFileSync(process.execPath, [join(root, "node_modules/typescript/bin/tsc"), "-p", cfg], {
    stdio: "pipe",
  });
  return require(join(out, "lib/services/catalogue.js"));
}

const { createRequire } = await import("node:module");
const require = createRequire(import.meta.url);

/* ------------------------------------------------------------------ *
 * What each scheme really is
 * ------------------------------------------------------------------ */

/**
 * age: [min, max] as the scheme actually runs, null for no bound.
 * overGoesTo: where somebody past the maximum should be sent, or null when
 *   there is genuinely nowhere — itself worth asserting, because "nowhere"
 *   said plainly is a real answer and a repeated age range is not.
 * elig / docs / fields: ids that must be present. Extras are allowed —
 *   this asserts nothing is *missing*, not that nothing was added.
 * stages: the exact chain, in order, as the file really travels.
 */
const EXPECTED = {
  /* NSAP · IGNOAPS. 60+, BPL. Sanctioned by the District Collector after the
     Gram Sabha has read the list out. */
  oldage: {
    form: "NSAP application form",
    age: [60, null],
    elig: ["age", "bpl", "otherPension"],
    docs: ["aadhaarCard", "ageProof", "bplCard", "bankPassbook", "residenceProof"],
    fields: ["fullName", "dob", "aadhaar", "mobile", "address", "district", "rationCard"],
    stages: ["received", "villageCheck", "gramSabha", "blockCheck", "districtSanction", "firstPayment"],
    outcome: "sanction",
  },
  /* NSAP · IGNWPS. 40 to 79 — at 80 she moves to IGNOAPS, which pays more.
     Stops on remarriage. */
  widow: {
    form: "NSAP application form",
    age: [40, 79],
    overGoesTo: "oldage",
    elig: ["widowed", "age", "bpl", "remarried"],
    docs: ["aadhaarCard", "deathCertificate", "ageProof", "bplCard", "bankPassbook"],
    fields: ["fullName", "husbandName", "husbandDeathDate", "rationCard"],
    stages: ["received", "villageCheck", "gramSabha", "blockCheck", "districtSanction", "firstPayment"],
    outcome: "sanction",
  },
  /* NSAP · IGNDPS. 18 to 79, and the disability must be 80% or more —
     "severe or multiple". Transfers to IGNOAPS at 80. */
  disability: {
    form: "NSAP application form",
    age: [18, 79],
    overGoesTo: "oldage",
    elig: ["age", "certified", "severity", "bpl"],
    docs: ["aadhaarCard", "disabilityCert", "ageProof", "bplCard", "bankPassbook"],
    fields: ["disabilityPercent", "udid"],
    stages: ["received", "villageCheck", "blockCheck", "districtSanction", "firstPayment"],
    outcome: "sanction",
  },
  /* EPFO · EPS-95, Form 10D. Ten years of service; full pension at 58, a
     reduced one from 50. The joint photograph with the spouse is a real and
     frequently-missed requirement of this form. */
  epfpension: {
    form: "Form 10D",
    age: [50, null],
    elig: ["age", "pfCut", "tenYears", "uanKnown"],
    docs: ["aadhaarCard", "bankPassbook", "cancelledCheque", "jointPhoto"],
    fields: ["uan", "employerName", "serviceYears", "retireDate"],
    stages: ["received", "employerCheck", "epfoCheck", "ppoIssued", "bankSetup", "firstPayment"],
    outcome: "sanction",
  },
  /* CCS (Pension) Rules 2021 · Form 6-A on Bhavishya, which opens a year
     before retirement. Head of Office, then the PAO works it out, then CPAO
     authorises it and issues the PPO the bank pays against. Form 6-A also
     collects the family details that make a family pension payable later. */
  govtretire: {
    form: "Form 6-A",
    age: null,
    elig: ["govtJob", "retiringSoon", "tenYears"],
    docs: ["aadhaarCard", "jointPhoto", "bankPassbook", "cancelledCheque"],
    fields: ["officeName", "retireDate", "serviceYears", "nomineeName"],
    stages: ["received", "officeCheck", "paoCheck", "cpaoCheck", "ppoIssued", "bankSetup", "firstPayment"],
    outcome: "sanction",
  },
  /* PFRDA · Atal Pension Yojana. 18 to 40, a savings account, and since
     October 2022 not an income-tax payer. Opened through the bank. */
  apy: {
    form: "APY subscriber registration form",
    age: [18, 40],
    overGoesTo: null,
    elig: ["age", "savings", "taxpayer"],
    docs: ["aadhaarCard", "bankPassbook"],
    fields: ["apyAmount", "nomineeName"],
    stages: ["received", "bankVerify", "recordUpdated"],
    outcome: "sanction",
  },
  /* NSAP · Annapurna. 65+, eligible for the old-age pension and not getting
     it. Ten kilos of grain, not money — so the outcome is a grant. */
  annapurna: {
    form: "NSAP application form",
    age: [65, null],
    elig: ["age", "getOldAgePension", "bpl"],
    docs: ["aadhaarCard", "ageProof", "bplCard", "residenceProof"],
    fields: ["rationCard", "district"],
    stages: ["received", "villageCheck", "blockCheck", "districtSanction"],
    outcome: "grant",
  },
  /* DoPPW · Form 14. The rule worth modelling is the one that saves a
     journey: where the claimant is already named in the deceased's PPO, the
     bank may start the family pension without Form 14 at all. */
  familypension: {
    form: "Form 14",
    age: null,
    elig: ["wasPensioner", "relationship", "haveDeathCert"],
    docs: ["deathCertificate", "aadhaarCard", "ppoCopy", "bankPassbook"],
    fields: ["relationship", "deceasedName", "deceasedPpo", "deathDate", "nameInPpo"],
    stages: ["received", "officeCheck", "ppoIssued", "bankSetup", "firstPayment"],
    outcome: "sanction",
  },
  /* NSAP · NFBS. Death of the household's earner between 18 and 59, BPL,
     claimed within three years. Twenty thousand rupees, once. */
  nfbs: {
    form: "NSAP application form",
    age: null,
    elig: ["breadwinner", "deceasedAge", "bpl", "withinThreeYears", "haveDeathCert"],
    docs: ["deathCertificate", "aadhaarCard", "bplCard", "bankPassbook"],
    fields: ["deceasedName", "deathDate", "relationship", "rationCard"],
    stages: ["received", "villageCheck", "blockCheck", "districtSanction", "firstPayment"],
    outcome: "grant",
  },
  /* Jeevan Pramaan. No eligibility and no papers — it is proof of life, not
     an application. It is matched on a pair the app must therefore collect:
     who sanctioned the pension, and who disburses it. */
  lifecert: {
    form: null,
    age: null,
    elig: [],
    docs: [],
    fields: ["ppo", "aadhaar", "mobile", "sanctionAuthority", "bankName", "accountNumber"],
    stages: ["received", "faceMatch", "recordUpdated"],
    outcome: "lifecert",
  },
  /* CPAO. Banks cannot move a pension between themselves: the old paying
     branch sends it to CPAO, which reissues the authority to the new one. */
  changebank: {
    form: "Pension transfer request",
    age: null,
    elig: ["havePpo", "newAccountOpen"],
    docs: ["ppoCopy", "aadhaarCard", "newPassbook"],
    fields: ["ppo", "newBankName", "newAccountNumber", "newIfsc"],
    stages: ["received", "bankVerify", "cpaoCheck", "bankUpdate", "firstPayment"],
    outcome: "change",
  },
  /* Additional quantum of pension: 20% at 80, 30% at 85, 40% at 90, 50% at
     95, 100% at 100. The bank is supposed to apply it unprompted and often
     does not, which is what makes the arrears the point of this journey. */
  age80: {
    form: null,
    age: [80, null],
    elig: ["age", "havePpo", "alreadyIncreased"],
    docs: ["ppoCopy", "aadhaarCard", "pensionSlip", "ageProof"],
    fields: ["ppo", "currentPension"],
    stages: ["received", "bankVerify", "arrearsCalc", "bankUpdate"],
    outcome: "increase",
  },
  /* Commutation restored fifteen years from the date it was commuted — not
     from retirement, which is why the app asks when the lump sum was taken. */
  restorecommuted: {
    form: "Restoration request",
    age: null,
    elig: ["havePpo", "commuted", "fifteenYears", "alreadyRestored"],
    docs: ["ppoCopy", "aadhaarCard", "pensionSlip"],
    fields: ["ppo", "commutedOn", "currentPension"],
    stages: ["received", "bankVerify", "arrearsCalc", "bankUpdate"],
    outcome: "increase",
  },
  /* CPENGRAMS. A grievance, not an application: no eligibility, and an
     officer has to answer. */
  notarrived: {
    form: null,
    age: null,
    elig: [],
    docs: ["ppoCopy", "bankPassbook", "pensionSlip"],
    fields: ["ppo", "complaintAbout", "monthsMissing"],
    stages: ["received", "assigned", "underReview", "answered"],
    outcome: "grievance",
  },
};

/**
 * Recorded, not asserted. Each of these is a real part of the process that
 * this prototype does not model, with the reason it does not — so the list
 * is a decision that can be argued with rather than an oversight.
 */
const UNMODELLED = [
  ["all NSAP schemes", "state top-ups. The centre pays ₹200-500; every state adds its own amount and they change with each budget. The copy says 'depending on your state' rather than inventing 28 figures."],
  ["epfpension", "the EPFO's own PPO shape. This journey identifies the member by UAN, which is what Form 10D asks for, so no PPO is collected to validate."],
  ["lifecert, notarrived", "a strict PPO format. Both serve central, state, EPFO and defence pensioners at once, so insisting on the CPAO twelve digits would turn away the majority."],
  ["defence pensioners", "SPARSH. A separate system with its own forms and its own disbursement chain — a fifteenth journey, not a gap in these fourteen."],
];

/* ------------------------------------------------------------------ *
 * Run
 * ------------------------------------------------------------------ */

const { ALL_SERVICES } = loadCatalogue();
let problems = 0;
let hereProblems = 0;
const say = (s) => console.log(s);
const bad = (id, msg) => {
  problems++;
  hereProblems++;
  say(`    ✗ ${msg}`);
};

say(`Checking ${ALL_SERVICES.length} services against the processes they model\n`);

const seen = new Set();
for (const svc of ALL_SERVICES) {
  const want = EXPECTED[svc.id];
  seen.add(svc.id);
  hereProblems = 0;
  say(`  ${svc.id}`);
  if (!want) {
    bad(svc.id, "no expectation recorded for this service — add one to check-schemes.mjs");
    continue;
  }

  if (svc.realForm !== want.form) {
    bad(svc.id, `form is ${JSON.stringify(svc.realForm)}, the real one is ${JSON.stringify(want.form)}`);
  }

  const eligIds = svc.eligibility.map((q) => q.id);
  for (const id of want.elig) {
    if (!eligIds.includes(id)) bad(svc.id, `eligibility does not ask "${id}"`);
  }

  if (want.age) {
    const q = svc.eligibility.find((x) => x.id === "age" && x.type === "age");
    if (!q) bad(svc.id, "no age question, but the scheme has an age rule");
    else {
      const [min, max] = want.age;
      const r = q.range ?? {};
      if ((r.min ?? null) !== min) bad(svc.id, `age starts at ${r.min ?? "none"}, the scheme starts at ${min}`);
      if ((r.max ?? null) !== max) bad(svc.id, `age ends at ${r.max ?? "none"}, the scheme ends at ${max ?? "none"}`);
      /* An upper bound is only humane if it says where to go instead. */
      if (max !== null && !q.failOverKey) {
        bad(svc.id, "has an upper age bound with no separate message for being over it");
      }
      if (max !== null) {
        const goes = q.suggestOver !== undefined ? q.suggestOver : (q.suggest ?? null);
        if (goes !== (want.overGoesTo ?? null)) {
          bad(
            svc.id,
            want.overGoesTo
              ? `sends people over ${max} to ${goes ?? "nowhere"}, but they move to ${want.overGoesTo}`
              : `sends people over ${max} to ${goes}, but there is nowhere for them to go`,
          );
        }
      }
    }
  }

  const docIds = svc.documents.map((d) => d.id);
  for (const id of want.docs) {
    if (!docIds.includes(id)) bad(svc.id, `does not ask for "${id}"`);
  }

  const fieldIds = svc.fields.map((f) => f.id);
  for (const id of want.fields) {
    if (!fieldIds.includes(id)) bad(svc.id, `form does not collect "${id}"`);
  }

  const stageIds = svc.stages.map((s) => s.id);
  if (stageIds.join(" > ") !== want.stages.join(" > ")) {
    bad(svc.id, `chain is\n        ${stageIds.join(" > ")}\n      the real one is\n        ${want.stages.join(" > ")}`);
  }

  if (svc.outcome !== want.outcome) {
    bad(svc.id, `outcome is ${svc.outcome}, should be ${want.outcome}`);
  }

  if (!hereProblems) say(`    ✓ form, rules, papers, chain and outcome all match`);
}

for (const id of Object.keys(EXPECTED)) {
  if (!seen.has(id)) {
    problems++;
    say(`  ✗ ${id} is expected but no longer in the catalogue`);
  }
}

say("\nKnown and deliberate gaps:");
for (const [where, why] of UNMODELLED) say(`  · ${where} — ${why}`);

rmSync(out, { recursive: true, force: true });

if (problems) {
  say(`\n${problems} places the app and the real process disagree.`);
  process.exit(1);
}
say(`\nAll ${ALL_SERVICES.length} services match the process they model.`);
