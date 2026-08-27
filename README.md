# Pramaan Saral · प्रमाण सरल · પ્રમાણ સરળ

**"Prove you're here. Keep your pension."**

A rebuilt citizen journey for India's Digital Life Certificate.

> **A student prototype. Not an official government service.**
> Not affiliated with, endorsed by, or connected to the Government of India,
> MeitY, UIDAI, or Jeevan Pramaan. No government emblem, logo, or flag is used
> anywhere in this project.

---

## What this is

Every year, more than a crore pensioners in India must prove they are alive to
keep their pension flowing. [Jeevan Pramaan](https://jeevanpramaan.gov.in)
replaced the annual trip to a bank branch with Aadhaar-based face
authentication — a real improvement, wrapped in an experience that routinely
defeats the people it was built for.

Face auth fails often for elderly users. Rejection arrives as an SMS carrying
an error code and no next step. The UI is jargon-heavy and English-first. A
family member almost always does this for a parent, but there is no assisted
mode, so they end up impersonating the pensioner. Missing the window stops the
pension, which is often the only income in the house.

**We are not replacing Jeevan Pramaan.** This rebuilds the citizen-facing layer
that sits on top of it. The government stays the system of record.

The thesis is one sentence: *a pensioner should never be stuck, confused, or
silently rejected.*

---

## Running it

Requires Node 20 or newer.

```bash
npm install
npm run dev          # http://localhost:3000
```

**It runs with no configuration and no API key.** Every AI call has a
hardcoded fallback, so the full journey works with `OPENAI_API_KEY` unset —
you just get the built-in explanation table instead of a live one.

To enable the live AI layer, copy `.env.example` to `.env.local` and fill in:

```
OPENAI_API_KEY=sk-...            # server-side only, never reaches the client
NEXT_PUBLIC_DEMO_MODE=true       # 8s verification, on-screen OTP, /demo controls
NEXT_PUBLIC_ENABLE_TTS_FALLBACK=false
```

Other scripts:

```bash
npm run build        # production build; check the first-load JS figure
npm start            # serve the production build
npm run lint
```

---

## The 60-second demo path

Shoot the video by following these, in order. Nothing here needs a camera or a
network — every step has a fallback that works on a laptop.

1. **Open `/`.** Three language buttons, each in its own script. Press
   **हिन्दी** — every screen after this is in Hindi, including `<html lang>`.
2. Press **🔊 सुनिए** in the header. The screen reads itself aloud. Press it
   again to stop. *(Voice works in all three languages.)*
3. **Who is this for?** Press **"I'm helping a family member."** The copy
   switches to talking *about* the pensioner — nothing is hidden, and the
   helper is named on the receipt.
4. **Details.** Press `Ctrl` `Shift` `D` → **"Fill the form with the demo
   pensioner"** → **"Back to the journey."** Press **"Send code."** The OTP
   field appears in place; the code is shown on screen in demo mode.
5. **Photo.** Three-item checklist, then **"I'm ready — open camera."** If the
   camera is denied or unavailable, press **"Upload a photo instead"** — this
   path is fully supported. Watch the live coaching line change as the light
   changes.
6. **Review.** Everything being sent, each row with a **Change** link. One line
   of pre-check result above the button. Press **Send**.
7. **Status.** A plain timeline — Received → Checking → Result — polling the
   server every 3 seconds. In demo mode it resolves in 8 seconds.
8. **Accepted.** The stamped passbook receipt: *"Your pension is safe until 30
   November 2027."* Press **"Save this"** to render it to PNG.
9. **Now the recovery path.** `Ctrl` `Shift` `D` → **"Always needs fixing"** →
   pick `ERR_FACE_QUALITY_LOW` → run the journey again. The result screen says
   *"One small thing to fix"* — never "rejected" — with one sentence of what
   went wrong, one sentence of what to do, and **"Fix and send again"**, which
   returns you to the photo screen with everything else preserved.
10. **Open `/about`.** Exactly what is real and what is mocked, in a table.

---

## What is real, and what is mocked

Honesty is a judging criterion, so this is also a page in the app at `/about`.

| Real in this prototype | Mocked |
| --- | --- |
| The full journey, start to finish | Aadhaar number, OTP, PPO lookup |
| Photo capture and client-side quality analysis | Face match against UIDAI |
| The AI rejection explainer (live OpenAI call) | The pension disbursing agency backend |
| The AI pre-submission photo check (live OpenAI call) | SMS delivery (written to a visible outbox at `/outbox`) |
| Voice guidance in all three languages | Bank / post-office integration |
| The status state machine and its audit log | |

**No real Aadhaar number, biometric, or pension record touches this
application.** The Aadhaar field accepts any twelve digits and only the last
four are ever kept, even in the mock store.

---

## How it is built

| Layer | Choice |
| --- | --- |
| Framework | Next.js 15, App Router, TypeScript |
| Styling | Tailwind CSS v4 + CSS custom properties for the token layer |
| Client state | React state + `sessionStorage` (survives a refresh mid-journey, dies with the tab) |
| "Backend" | Next.js Route Handlers + a module-level `Map` in `lib/store.ts` |
| AI | OpenAI Node SDK, `gpt-4o-mini`, server-side only, every call with a fallback |
| Voice | Web Speech API, with OpenAI TTS behind a flag |
| Camera | `getUserMedia` + `<canvas>`, with a mandatory file-upload fallback |
| Icons | Inline SVG, hand-written. No icon library. |
| Deploy | Vercel |

```
app/
  page.tsx            1 · choose your language
  who/                2 · who is this for
  details/            3 · pension details + OTP
  photo/              4 · checklist, then capture
  review/             5 · check and send
  status/[id]/        6 · we're checking this
  result/[id]/        7 · accepted, or one thing to fix
  about/              8 · what's real and what's mocked
  help/  outbox/  demo/
  api/                otp · submit · status · resubmit · precheck · explain · speak · outbox · reminder
components/           ScreenShell · BigButton · Field · ProgressBeads · SpeakButton · Receipt · Icons
lib/
  stateMachine.ts     DRAFT → SUBMITTED → VERIFYING → ACCEPTED / NEEDS_FIX
  mockPda.ts          the pretend pension office, with LATENCY_MS and FAILURE_RATE at the top
  store.ts            in-memory Map. In production: Postgres + a job queue.
  openai.ts           the three AI calls, each wrapped in a fallback
  imageQuality.ts     client-side luminance / sharpness / centre analysis
  i18n/               en · hi · gu, one dictionary, keys checked at compile time
```

### The design

The audience is 65–90, often reading in bright daylight on a five-year-old
Android through reading glasses. So the boldest move in the design is
**scale** — base type is 20px, not 16; buttons are at least 64px tall; every
text/background pair clears 7:1. Everything else is quiet: an Indian bank
passbook, cream paper and ink blue, with one stamped receipt at the end.

Failure states are rust, never alarm red. The message is *"this needs one
small fix"*, not *"you did something wrong."*

### The AI is advisory only

It does three small jobs and is never the headline:

1. **Rejection explainer** — turns `ERR_FACE_QUALITY_LOW` into one sentence a
   78-year-old understands, plus one sentence of what to do, in their language.
2. **Photo pre-check** — one vision call on `/review` that warns before
   sending. It never blocks: **"Send anyway"** is always there.
3. **Voice guidance** — reads each screen aloud.

It never decides an outcome. It only explains an outcome the government system
already returned. A wrong AI guess costs one retake, never a pension.

---

## Deploying

The app is a stock Next.js 15 project and deploys to Vercel with no build
configuration:

```bash
npm i -g vercel
vercel            # preview
vercel --prod     # production
```

Or import the repository at [vercel.com/new](https://vercel.com/new) — the
framework is detected automatically.

Set these in **Project → Settings → Environment Variables**:

| Variable | Value | Notes |
| --- | --- | --- |
| `OPENAI_API_KEY` | `sk-...` | Optional. Server-side only. |
| `NEXT_PUBLIC_DEMO_MODE` | `true` | Keep `true` for reviewers. |
| `NEXT_PUBLIC_ENABLE_TTS_FALLBACK` | `false` | Costs bandwidth when on. |

The public URL must open with **no login and no access request**. There is no
auth in this app by design.

> **One deployment caveat, stated plainly:** `lib/store.ts` is a module-level
> `Map`, so submissions live in the memory of a single serverless instance and
> are lost on cold start or when a request lands on a different instance. That
> is the correct trade for a prototype and the wrong one for production, where
> it would be a Postgres row and a job queue. `/about` says so too.

---

## Accessibility

- Whole journey completable by keyboard, with a visible 3px focus ring that is
  never removed
- All contrast ratios ≥ 7:1
- Status changes announced via `aria-live="polite"`
- `prefers-reduced-motion` respected; nothing spins
- Works at 200% zoom and at 320px width without horizontal scroll
- Every icon-bearing control carries a word as well as an icon
- Camera-denied path tested; the upload fallback is a first-class route

---

## Licence and attribution

A student hackathon prototype, built for **Build What Moves India**. Jeevan
Pramaan, Aadhaar, UIDAI, and MeitY are the property of the Government of India
and are referred to here only descriptively.
