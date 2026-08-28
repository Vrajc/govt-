# Pramaan Saral · प्रमाण सरल · પ્રમાણ સરળ

**Prove you are here. Keep your pension.**

The whole pension journey for an Indian citizen — applying when you have
none, renewing every year, taking one over after a death, and the service
requests in between — rebuilt as one simple thing.

> **A student prototype. Not an official government service.**
> Not affiliated with, endorsed by, or connected to the Government of India,
> MeitY, UIDAI, EPFO or Jeevan Pramaan. No government emblem, logo or flag
> appears anywhere in it.

---

## What this is

India runs at least a dozen separate pension schemes across the centre and
the states, each with its own portal, its own form, and its own vocabulary.
A 62-year-old widow in a village has no way to learn that IGNWPS exists, let
alone that she qualifies for it and not for the three schemes listed beside
it. The people who need these schemes most are the people least able to
navigate them.

So this is not a form. It is **eleven government processes behind one door**,
with a finder that answers the question nobody's portal answers: *which
pension am I even entitled to?*

| | Service | What it really is |
|---|---|---|
| **Start a pension** | Old-age pension | IGNOAPS (NSAP) — panchayat → gram sabha → Collector |
| | Widow pension | IGNWPS (NSAP) |
| | Disability pension | IGNDPS (NSAP) |
| | Pension from your PF | EPS-95, **Form 10D**, EPFO member portal |
| | Government service pension | **Bhavishya**, Form 6-A, Head of Office → PAO → e-PPO |
| | Save now for a pension at 60 | Atal Pension Yojana |
| **After a death** | Take over a pension | **Form 14** family pension |
| **Already have one** | Prove you are alive | Jeevan Pramaan, the annual DLC |
| | Move it to another bank | CPAO transfer |
| | Extra pension after 80 | The 20% at 80 that banks routinely miss |
| | My pension has not come | CPENGRAMS grievance |

Every one of them is a **data definition**, not a hand-built set of screens.
One engine renders all eleven. Adding the twelfth — or a state scheme, or the
22nd scheduled language — is a data file, not a rebuild.

---

## Run it

```bash
npm install
cp .env.example .env.local     # works fine with the key left as-is
npm run dev                    # http://localhost:3000
```

**It runs with no API key.** Every AI call has a hardcoded fallback, so the
whole thing works with `OPENAI_API_KEY` unset — you just get the built-in
explanations instead of live ones.

| Variable | Default | Effect |
|---|---|---|
| `OPENAI_API_KEY` | unset | Server-side only. Enables the live explainer and photo check. |
| `NEXT_PUBLIC_DEMO_MODE` | `true` | 8-second processing, on-screen OTP, `/demo` controls. |
| `NEXT_PUBLIC_ENABLE_TTS_FALLBACK` | `false` | Routes voice through OpenAI TTS when a device has no local voice. |

> **If you are on Windows and this folder is inside OneDrive:** OneDrive
> deletes files out of `.next` while `next build` is writing them, and
> `next start` then fails with a missing `BUILD_ID`. `npm run dev` is
> unaffected. To use production builds, exclude `.next` from OneDrive sync
> or move the repo somewhere else.

### Verify it

```bash
npm run check           # types + copy rules + contrast
npm run build
npm run verify:no-key   # proves no key or SDK reaches the browser
```

- `check:copy` — 634 strings × 3 languages: no banned jargon, no exclamation
  marks, no emoji, nothing left untranslated.
- `check:contrast` — all 22 text/background pairs against WCAG AAA (7:1).
- `verify:no-key` — greps the built client bundle for the key, the SDK and the
  API host.

---

## The 60-second demo path

Press **Ctrl + Shift + D** from any screen to reach the presenter controls.

**Before you record:** `/demo` → *Fill the form with the demo pensioner*.
Leave the result on *Decide honestly*, speed on *8 seconds*.

| # | Do this | Say this | ~ |
|---|---|---|---|
| 1 | Open the link. Tap **હિન્દી** or **ગુજરાતી**. | "Language first. Nothing appears in a language you did not choose — and only that language is downloaded." | 5s |
| 2 | On the hub, tap **I am not sure which one**. Answer: *start a pension* → *neither of those* → *60 or more* → *my husband has died*. | "Nobody's portal answers the actual question: which pension am I entitled to. Four questions, and it names one." | 12s |
| 3 | It lands on **Widow pension**. Read the page: who decides, how long, what to bring, and the six real stages. | "The village office, the gram sabha, the Collector. This is the real chain, named, before she starts." | 8s |
| 4 | **Start this** → helping a family member → the eligibility checks. | "Asked before the form, not after. Getting this wrong at the end is the cruellest thing the real system does." | 6s |
| 5 | On documents, tap **Take a photo** on the death certificate. | "Photograph the paper. Nobody in a village has a scanner." | 7s |
| 6 | Details, **Send code**, the code is on screen, **Check the code**. Photo checklist → capture. **Send**. | "One screen, and the code appears in place — you never leave the page." | 12s |
| 7 | Watch the timeline walk: village office → gram sabha → taluka → Collector. | "Not a spinner. She can see her file is sitting at the taluka office, so she knows who to ring." | 8s |
| 8 | The receipt: a monthly amount, an order number, a first payment date. | "For a new pension the big number is the money. For the annual renewal it is a date. The receipt shows what she came for." | 6s |

**Also worth showing**

- `/demo` → *Always needs fixing* → any code, then run a journey. Never
  "rejected": one sentence on what happened, one on what to do, one button.
  Expand **Technical details** for the raw code and the full audit log.
- **Turning 80** with the demo pensioner (born Nov 1944) — it computes the
  arrears owed since 1 November 2024, because the increase runs from the
  first of the *month*, not the birthday, and banks miss it.
- **Family pension** — the first question asks whether her name is already in
  his PPO, because if it is, the bank can start paying without any office
  visit at all. Almost nobody is told this.
- `/demo` → *Pretend the network is slow*, then run anything.
- `/about` — real versus pretend, and every service mapped to the government
  system it stands for.

---

## What is real, and what is mocked

| Real in this prototype | Mocked |
|---|---|
| All eleven journeys, start to finish | Aadhaar, the OTP, the PPO lookup |
| Photo capture and on-device quality analysis | Face matching against UIDAI |
| Photographing documents | The offices that actually decide |
| The plain-language explainer (live OpenAI call) | SMS delivery — written to a visible outbox at `/outbox` |
| The pre-submission photo check (live OpenAI call) | Bank and post-office integration |
| Spoken guidance in all three languages | |
| The state machine, staged approval chain, audit log and idempotent resubmission | |

The same table is on `/about`, in all three languages, alongside a
service-by-service map of which real government system each one stands for.

---

## How it is put together

```
app/
  page.tsx                    choose your language
  start/                      the hub, and each category
  find/                       the decision tree
  service/[id]/               what it is, before you start
  apply/[service]/[step]/     who · eligibility · documents · details · photo · review
  status/[id]/                the real approval chain, walking
  result/[id]/                five outcome shapes, one receipt
  about/ help/ outbox/ demo/
  api/                        otp · submit · status · resubmit · precheck
                              explain · speak · outbox · reminder
lib/services/
  catalogue.ts                the eleven services, with their real portals
  shared.ts                   fields, documents and stages, defined once
  finder.ts                   the decision tree
  engine.ts                   step order, validation, field behaviour
lib/
  i18n/                       en · hi · gu, assembled on the server
  stateMachine.ts             DRAFT → SUBMITTED → VERIFYING → ACCEPTED / NEEDS_FIX
  mockPda.ts                  the pretend offices, with their knobs at the top
  store.ts                    the in-memory Map, and what it would be in production
  openai.ts                   server-only, timeout-bounded, fallback on every path
  explainFallback.ts          21 codes × 3 languages, hardcoded
  imageQuality.ts             luminance / Laplacian / centre variance, on-device
  receiptCanvas.ts            the receipt drawn to PNG by hand
components/                   ScreenShell · BigButton · Field · PhotoCapture
                              Receipt · Icons (all hand-written SVG)
scripts/                      copy, contrast and bundle audits
```

### The backend is a real backend

Not `setTimeout` in a component. `/api/submit` creates a record and drives it
through a state machine that throws on illegal transitions, appending an audit
entry for every move. The mock offices resolve **lazily on read** — each
record carries `nextStageAt`, and the status route walks it forward — which is
the only model that survives a serverless cold start.

Consequences you can see:

- **The status page survives a hard refresh.** The id is in the URL, the state
  is on the server.
- **Submission is idempotent** on a client-generated `requestId`. Double-tap
  Send, or retry after a dropped connection, and you get the same record back.
- **Resubmission preserves history.** "Fix and send again" keeps the same
  reference number and grows the audit log rather than starting over.
- **A page left open for ten minutes catches up in one poll**, rather than
  crawling forward one stage at a time.

### The three AI jobs

| Where | What it does | Fallback |
|---|---|---|
| `/api/explain` | Turns a code into two sentences a 78-year-old understands, in their language | A hardcoded table, 21 codes × 3 languages. It shipped first; the model is layered on top. |
| `/api/precheck` | One vision call on the captured photo, before sending | The on-device analysis that was already coaching the camera |
| `SpeakButton` | Reads the screen aloud | `speechSynthesis` **is** the default — free, instant, no bandwidth. OpenAI TTS is a flagged fallback. |

All three are server-side. None decides an outcome — the explainer explains a
result the government system already returned, and the pre-check only warns.
**A wrong guess costs one retake, never a pension.**

### Built for a cheap phone in daylight

- 20px base type, 64px buttons, 16px minimum between anything tappable
- Every text pair at AAA 7:1 (`npm run check:contrast`)
- **110–123 KB first-load JS** — smaller than the single-service version was,
  because only the chosen language is ever sent to the browser
- No animation, chart, icon or UI library
- Camera denial is a supported route, not an error state
- Photos are resized before they touch the network
- Works at 320px wide and at 200% zoom without sideways scroll

---

## Deploying

```bash
vercel
```

Set `OPENAI_API_KEY` and `NEXT_PUBLIC_DEMO_MODE=true` in the Vercel project.
The link is public — no login wall, no access request. `robots` is `noindex`,
so a prototype of a government service never turns up in search.

---

## Licence and use

Coursework prototype, built for the *Build What Moves India* hackathon.
It touches no government system and uses no real Aadhaar, PAN, OTP or payment
data. Every identifier in it is invented.
