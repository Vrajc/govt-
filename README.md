# Pramaan Saral · प्रमाण सरल · પ્રમાણ સરળ

**Prove you are here. Keep your pension.**

A rebuilt citizen journey for India's Digital Life Certificate — the annual
proof-of-life that more than one crore pensioners must file to keep their
pension flowing.

> **A student prototype. Not an official government service.**
> Not affiliated with, endorsed by, or connected to the Government of India,
> MeitY, UIDAI or Jeevan Pramaan. No government emblem, logo or flag appears
> anywhere in it.

---

## What this is

Jeevan Pramaan already replaced the annual trip to the bank branch with
Aadhaar-based face authentication. The idea is right. The experience built
around it is not: face matching fails often for elderly users, rejection
arrives as a cryptic SMS with an error code, the interface is English-first
and jargon-heavy, and the family member who is actually holding the phone has
no choice but to impersonate their parent.

**We are not replacing Jeevan Pramaan.** This is the citizen-facing layer that
would sit on top of it.

The thesis: *a pensioner should never be stuck, confused, or silently
rejected.* Ease of use is the product. AI does three small, load-bearing jobs
in the background and is never the headline.

---

## Run it

```bash
npm install
cp .env.example .env.local     # works fine with the key left as-is
npm run dev                    # http://localhost:3000
```

**It runs with no API key.** Every AI call has a hardcoded fallback, so the
whole journey works with `OPENAI_API_KEY` unset — you just get the built-in
explanations instead of live ones. To turn the live calls on, put a real key
in `.env.local`.

| Variable | Default | Effect |
|---|---|---|
| `OPENAI_API_KEY` | unset | Server-side only. Enables the live explainer and photo check. |
| `NEXT_PUBLIC_DEMO_MODE` | `true` | 8-second verification, on-screen OTP, `/demo` controls. |
| `NEXT_PUBLIC_ENABLE_TTS_FALLBACK` | `false` | Routes voice through OpenAI TTS when a device has no local voice. |

### Verify it

```bash
npm run check           # types + copy rules + contrast
npm run build
npm run verify:no-key   # proves no key or SDK reaches the browser
```

- `check:copy` — 243 strings × 3 languages: no banned jargon, no exclamation
  marks, no emoji, nothing left untranslated.
- `check:contrast` — every text/background pair against WCAG AAA (7:1).
- `verify:no-key` — greps the built client bundle for the key, the SDK and the
  API host.

---

## The 60-second demo path

Shoot this without thinking. Press **Ctrl + Shift + D** from any screen to
reach the presenter controls.

**Before you record:** open `/demo` → *Fill the form with the demo pensioner*,
and leave the result on *Decide honestly*, speed on *8 seconds*.

| # | Do this | Say this | ~ |
|---|---|---|---|
| 1 | Open the public link. Tap **हिन्दी**. | "Language first. Nothing appears in a language you did not choose." | 5s |
| 2 | Tap **"I am helping a family member."** | "Most people do this for a parent. There is no need to pretend to be them." | 5s |
| 3 | On details, tap **Send code**. The name comes back; the code is on screen. Tap **Check the code**. | "One screen, three fields, and the code appears in place — you never leave the page." | 12s |
| 4 | Read the three-item checklist, tap **open the camera**. Move into shadow — the line turns rust and says it is too dark. Move back to the light. Capture. **Use this photo**. | "The camera coaches you before the shutter. That runs on the device, no network, no cost." | 15s |
| 5 | On review, the pre-check line appears above the button. Tap **Send**. | "This is everything that gets sent. Nothing else." | 6s |
| 6 | Watch the timeline. It resolves in 8 seconds. | "A real state machine on a real backend. Close the tab and the link still works." | 8s |
| 7 | **If accepted:** the stamped receipt. Tap **Save this**. | "This is what a pensioner actually wants — proof they can show their son." | 9s |
| 7b | **To show recovery:** `/demo` → *Always needs fixing* → `ERR_FACE_QUALITY_LOW`, then run steps 4–6 again. On the result, expand **Technical details**. | "Never 'rejected'. One sentence on what happened, one on what to do, one button. The raw code is there for you, invisible to them." | — |
| 8 | Open `/about`. | "And here is exactly what is real and what is pretend." | 5s |

**To show it degrades well:** `/demo` → *Pretend the network is slow*, then run
the journey again. Nothing breaks, nothing spins forever.

---

## What is real, and what is mocked

| Real in this prototype | Mocked |
|---|---|
| The whole journey, start to finish | Aadhaar number, the OTP, the PPO lookup |
| Photo capture and on-device quality analysis | Face matching against the UIDAI database |
| The plain-language explainer (live OpenAI call) | The pension disbursing agency backend |
| The pre-submission photo check (live OpenAI call) | SMS delivery — written to a visible outbox at `/outbox` |
| Spoken guidance in all three languages | Bank and post-office integration |
| The state machine, its audit log, and idempotent resubmission | |

The same table is on `/about`, in all three languages, because honesty is a
judging criterion rather than a footnote.

---

## How it is put together

```
app/
  page.tsx              1 · choose your language
  who/                  2 · who is this for
  details/              3 · PPO, Aadhaar, mobile, code in place
  photo/                4 · checklist, then live-coached capture
  review/               5 · exactly what is being sent
  status/[id]/          6 · polling timeline, survives a refresh
  result/[id]/          7 · the receipt, or the one thing to fix
  about/ help/ outbox/ demo/
  api/                  otp · submit · status · resubmit · precheck
                        explain · speak · outbox · reminder
lib/
  i18n/                 en · hi · gu, one typed dictionary
  stateMachine.ts       DRAFT → SUBMITTED → VERIFYING → ACCEPTED / NEEDS_FIX
  mockPda.ts            the pretend pension office, with its knobs at the top
  store.ts              the in-memory Map, and what it would be in production
  openai.ts             server-only, timeout-bounded, fallback on every path
  explainFallback.ts    6 codes × 3 languages, hardcoded
  imageQuality.ts       luminance / Laplacian / centre variance, on-device
  receiptCanvas.ts      the receipt drawn to PNG by hand
components/             ScreenShell · BigButton · Field · ProgressBeads
                        SpeakButton · Receipt · Icons (all hand-written SVG)
scripts/                copy, contrast and bundle audits
```

### The backend is a real backend

Not `setTimeout` in a component. `/api/submit` creates a record, drives it
through a state machine that throws on illegal transitions, and appends an
audit entry for every move. The mock pension office resolves **lazily on
read** — each record carries a `resolveAt` and the status route settles it —
which is the only model that survives a serverless cold start.

Consequences you can see:

- **The status page survives a hard refresh.** The id is in the URL, the state
  is on the server.
- **Submission is idempotent** on a client-generated `requestId`. Double-tap
  Send, or retry after a dropped connection, and you get the same record back.
- **Resubmission preserves history.** "Fix and send again" keeps the same
  reference number and grows the audit log rather than starting over. You can
  read the whole trail under *Technical details*.

### The three AI jobs

| Where | What it does | Fallback |
|---|---|---|
| `/api/explain` | Turns `ERR_FACE_QUALITY_LOW` into two sentences a 78-year-old understands, in their language | A hardcoded table, 6 codes × 3 languages. It shipped first; the model is layered on top. |
| `/api/precheck` | One vision call on the captured still, before sending | The on-device analysis that was already coaching the camera |
| `SpeakButton` | Reads the screen aloud | `speechSynthesis` **is** the default — free, instant, no bandwidth. OpenAI TTS is the flagged fallback. |

All three are server-side. None of them decides an outcome — the explainer
explains a result the government system already returned, and the pre-check
only warns. **A wrong guess costs one retake, never a pension.**

### Built for a cheap phone in daylight

- 20px base type, 64px buttons, 16px minimum between anything tappable
- Every text pair at AAA 7:1 (`npm run check:contrast`)
- ~127 KB first-load JS. No animation, chart, icon or UI library.
- Camera denial is a supported route, not an error state
- The photo is resized to 512px at q0.7 before it ever touches the network
- Works at 320px wide and at 200% zoom without sideways scroll

---

## Deploying

```bash
vercel
```

Set `OPENAI_API_KEY` and `NEXT_PUBLIC_DEMO_MODE=true` in the Vercel project.
The link is public — no login wall, no access request. `robots` is set to
`noindex` so a prototype of a government service never turns up in search.

---

## Licence and use

Coursework prototype, built for the *Build What Moves India* hackathon.
It touches no government system and uses no real Aadhaar, PAN, OTP or payment
data. Every identifier in it is invented.
