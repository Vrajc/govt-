#!/usr/bin/env node
/**
 * Every service, end to end, against a running server.
 *
 *   node scripts/check-services.mjs [baseUrl]
 *
 * For each of the eleven services it:
 *   1. builds a payload from the service's own field definitions
 *   2. sends it, forcing an accept so the outcome is deterministic
 *   3. checks the record settled, walked its real stages, and produced
 *      the right shape of outcome
 *   4. sends it again with the same requestId to prove idempotency
 *   5. forces a rejection, then checks the explainer answers in all
 *      three languages, and that resubmission recovers
 *
 * This exists because "eleven services" is only true if all eleven work.
 */
const BASE = process.argv[2] ?? "http://localhost:3000";

/* The catalogue is TypeScript; rather than compile it, this mirrors the
   field ids each service asks for. If they drift, the submit route's own
   validation fails the check loudly, which is the point. */
const SAMPLE = {
  fullName: "Ramanbhai Patel",
  deceasedName: "Manubhai Patel",
  dob: "1944-11-12",
  gender: "m",
  aadhaar: "998812344821",
  mobile: "9825012345",
  address: "Naranpura, Ahmedabad",
  district: "Ahmedabad",
  ppo: "PPO-2024-000123",
  deceasedPpo: "PPO-2024-000123",
  uan: "100234567890",
  bankName: "Bank of Baroda",
  accountNumber: "20194400871",
  ifsc: "BARB0NARANP",
  newBankName: "State Bank of India",
  newAccountNumber: "38810042219",
  newIfsc: "SBIN0001234",
  rationCard: "GJ-01-2019-004471",
  annualIncome: "42000",
  husbandName: "Manubhai Patel",
  husbandDeathDate: "2025-03-14",
  deathDate: "2025-03-14",
  relationship: "spouse",
  nameInPpo: "yes",
  disabilityPercent: "85",
  udid: "GJ0112345678",
  employerName: "Arvind Mills",
  officeName: "Office of the Collector, Ahmedabad",
  employeeCode: "GJ-4471",
  serviceYears: "32",
  retireDate: "2026-08-31",
  currentPension: "18400",
  apyAmount: "3000",
  nomineeName: "Nisha Patel",
  complaintAbout: "notcredited",
  monthsMissing: "3",
  lastReceived: "2026-05-01",
};

/** service id -> [expected outcome kind, expected number of stages] */
/** Codes each service is allowed to come back with. */
const CODES = {
  oldage: ["ERR_BPL_NOT_LISTED", "ERR_AGE_PROOF_UNCLEAR", "ERR_BANK_MISMATCH", "ERR_DOC_UNREADABLE"],
  widow: ["ERR_DEATH_CERT_UNCLEAR", "ERR_BPL_NOT_LISTED", "ERR_BANK_MISMATCH", "ERR_DOC_UNREADABLE"],
  disability: ["ERR_DISABILITY_CERT", "ERR_BPL_NOT_LISTED", "ERR_BANK_MISMATCH", "ERR_DOC_UNREADABLE"],
  epfpension: ["ERR_UAN_NOT_FOUND", "ERR_KYC_PENDING", "ERR_EXIT_DATE_MISSING", "ERR_BANK_MISMATCH"],
  govtretire: ["ERR_SERVICE_BOOK", "ERR_NOMINATION_MISSING", "ERR_BANK_MISMATCH", "ERR_DOC_UNREADABLE"],
  apy: ["ERR_BANK_MISMATCH", "ERR_AGE_PROOF_UNCLEAR", "ERR_DOC_UNREADABLE"],
  familypension: ["ERR_DEATH_CERT_UNCLEAR", "ERR_NOT_IN_PPO", "ERR_BANK_MISMATCH", "ERR_DOC_UNREADABLE"],
  lifecert: [
    "ERR_FACE_QUALITY_LOW", "ERR_LIVENESS_FAIL", "ERR_AADHAAR_NAME_MISMATCH",
    "ERR_PPO_NOT_FOUND", "ERR_FACE_NOT_CENTERED", "ERR_DUPLICATE_SUBMISSION",
  ],
  changebank: ["ERR_PPO_NOT_FOUND", "ERR_BANK_MISMATCH", "ERR_ACCOUNT_CLOSED", "ERR_DOC_UNREADABLE"],
  age80: ["ERR_AGE_PROOF_UNCLEAR", "ERR_PPO_NOT_FOUND", "ERR_ALREADY_APPLIED", "ERR_DOC_UNREADABLE"],
  notarrived: ["ERR_PPO_NOT_FOUND", "ERR_NEED_MORE_INFO"],
};

const SERVICES = [
  ["oldage", "sanction", 6],
  ["widow", "sanction", 6],
  ["disability", "sanction", 5],
  ["epfpension", "sanction", 6],
  ["govtretire", "sanction", 6],
  ["apy", "change", 3],
  ["familypension", "sanction", 5],
  ["lifecert", "lifecert", 3],
  ["changebank", "change", 4],
  ["age80", "increase", 4],
  ["notarrived", "grievance", 4],
];

const LANGS = ["en", "hi", "gu"];

let failures = 0;
const ok = (m) => console.log(`    ✓ ${m}`);
const bad = (m) => {
  console.log(`    ✗ ${m}`);
  failures++;
};

async function post(path, body, headers = {}) {
  const res = await fetch(BASE + path, {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
  return { status: res.status, body: await res.json().catch(() => null) };
}

async function get(path) {
  const res = await fetch(BASE + path);
  return { status: res.status, body: await res.json().catch(() => null) };
}

const FAST = { "x-demo-speed": "instant" };
const ACCEPT = { ...FAST, "x-demo-outcome": "ACCEPTED" };
const REJECT = { ...FAST, "x-demo-outcome": "NEEDS_FIX" };

async function checkService(id, wantKind, wantStages) {
  console.log(`\n  ${id}`);
  const stamp = `${id}-${Date.now()}`;

  /* ---- 1. the happy path ---- */
  const payload = {
    requestId: stamp,
    serviceId: id,
    lang: "en",
    mode: "self",
    helperName: "",
    docCount: 4,
    values: SAMPLE,
    precheckFlagged: false,
  };

  const a = await post("/api/submit", payload, ACCEPT);
  if (a.status !== 201 || !a.body?.ok) {
    bad(`submit -> ${a.status} ${JSON.stringify(a.body).slice(0, 140)}`);
    return;
  }
  const rec = a.body.record;
  if (rec.state !== "ACCEPTED") bad(`state is ${rec.state}, wanted ACCEPTED`);
  else ok(`accepted as ${rec.id}`);

  if (rec.stages.length !== wantStages) {
    bad(`${rec.stages.length} stages, wanted ${wantStages}`);
  } else ok(`walked ${wantStages} stages: ${rec.stages.map((s) => s.id).join(" -> ")}`);

  if (rec.outcome?.kind !== wantKind) {
    bad(`outcome kind ${rec.outcome?.kind}, wanted ${wantKind}`);
  } else {
    const o = rec.outcome;
    const detail =
      wantKind === "sanction"
        ? `${o.orderNo}, ${o.monthly}/month`
        : wantKind === "increase"
          ? `${o.newMonthly}/month, arrears ${o.arrears}`
          : wantKind === "grievance"
            ? o.docket
            : wantKind === "change"
              ? o.effectiveFrom?.slice(0, 10)
              : o.validUntil?.slice(0, 10);
    ok(`outcome ${wantKind}: ${detail}`);
  }

  /* Nothing sensitive may come back on the wire. */
  if (rec.values.aadhaar && rec.values.aadhaar.length > 4) {
    bad(`aadhaar came back as "${rec.values.aadhaar}"`);
  } else ok("aadhaar reduced to last four");

  /* ---- 2. idempotency ---- */
  const again = await post("/api/submit", payload, ACCEPT);
  if (again.body?.record?.id !== rec.id || again.body?.duplicate !== true) {
    bad("same requestId created a second record");
  } else ok("idempotent on requestId");

  /* ---- 3. the status route agrees ---- */
  const st = await get(`/api/status/${rec.id}`);
  if (st.body?.record?.state !== "ACCEPTED") bad("status route disagrees");
  else ok("status route agrees");

  /* ---- 4. the recovery path ---- */
  const r = await post(
    "/api/submit",
    { ...payload, requestId: `${stamp}-fix` },
    REJECT
  );
  const bad1 = r.body?.record;
  if (bad1?.state !== "NEEDS_FIX" || !bad1?.errorCode) {
    bad(`forced rejection did not produce a code (${bad1?.state})`);
    return;
  }
  if (!CODES[id].includes(bad1.errorCode)) {
    bad(`${bad1.errorCode} is not a code ${id} can return`);
  } else ok(`rejects with ${bad1.errorCode}, a code this service declares`);

  /* The explainer must answer in every language, with two sentences. */
  for (const lang of LANGS) {
    const e = await post("/api/explain", { code: bad1.errorCode, language: lang });
    const good =
      e.body?.ok && e.body.reason?.length > 10 && e.body.action?.length > 10;
    if (!good) bad(`explainer ${lang} -> ${JSON.stringify(e.body).slice(0, 90)}`);
  }
  ok(`explained in ${LANGS.join(", ")}`);

  /* And resubmission recovers, keeping the same reference number. */
  const fixed = await post(
    `/api/resubmit/${bad1.id}`,
    { requestId: `${stamp}-fix-2`, precheckFlagged: false },
    ACCEPT
  );
  const f = fixed.body?.record;
  if (f?.state !== "ACCEPTED" || f.id !== bad1.id || f.attempts !== 2) {
    bad(`resubmit -> ${f?.state}, attempt ${f?.attempts}, id ${f?.id}`);
  } else ok(`recovered on attempt 2, same reference ${f.id}`);
}

console.log(`Checking every service against ${BASE}`);
for (const [id, kind, stages] of SERVICES) {
  try {
    await checkService(id, kind, stages);
  } catch (err) {
    bad(`${id} threw: ${err.message}`);
  }
}

console.log(
  failures === 0
    ? `\nAll ${SERVICES.length} services work end to end.`
    : `\n${failures} problem${failures === 1 ? "" : "s"} across ${SERVICES.length} services.`
);
process.exit(failures === 0 ? 0 : 1);
