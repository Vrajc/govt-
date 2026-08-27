# Decisions

Every judgement call the brief left open, and why it went the way it did. The
tie-breaker throughout: *whichever option is simpler for a 78-year-old on a
cheap Android phone.*

---

## Product

**The word "rejected" appears nowhere in the UI.**
The failure screen is titled *"One small thing to fix."* A pensioner reading
"rejected" concludes their pension has stopped. It has not — they need to
retake a photo. The technical code is still shown, collapsed, under
*"Technical details"*, because judges deserve the truth and pensioners deserve
the plain version. Both, in the right order.

**Rust, not red, for failure.**
`--attention: #A8452A`. Alarm red says *you did something wrong*. This screen
means *the light was bad*. The colour should not accuse.

**Assisted mode changes the copy, never the payload.**
Selecting *"I'm helping a family member"* rewrites guidance into the second
person about the pensioner and adds a helper-name field. It does not hide a
single field or alter what is submitted. The problem it solves is that helpers
currently have to impersonate a parent; the fix is to let them say so, not to
give them a shortcut.

**No progress beads on `/`, `/about`, `/help`, `/outbox`, `/demo`.**
The beads exist to answer *"how much more of this is there?"* during the
journey. On a page outside the journey they answer a question nobody asked.

**Errors sit under the field, in words, with the number the person typed.**
*"That's 11 digits. Aadhaar has 12."* not *"Invalid input"*. The error has to
be actionable without a second reading.

**The OTP appears on screen in demo mode.**
A reviewer with no Indian phone number would otherwise be stranded at step 3.
The line is explicit that it is a demo affordance.

---

## Design

**Base font size is 20px, and the type scale is in absolute pixels.**
Not rem. A large share of this audience already runs the OS font scale high;
rem would compound the two into a layout that no longer fits. Absolute px plus
an unrestricted browser zoom (`maximumScale: 5`) is the combination that
actually works at 200%.

**Noto Sans / Devanagari / Gujarati, swapped by a class on `<html>`.**
It is the only family with correct, legible coverage of all three scripts at
the weights needed. Devanagari and Gujarati get `line-height: 1.8` against
Latin's 1.6 — the conjuncts collide otherwise.

**The receipt is the only place the design gets loud.**
Ruled passbook paper, a rotated circular ink stamp, one large date. This is
the artefact a pensioner wants: proof they can show their son. Every other
screen stays quiet so this one lands.

**Icons are hand-written inline SVG and never appear alone.**
No icon library — it would have been most of the JS budget. Every icon sits
next to a word, so all of them are `aria-hidden`; an icon-only button is
unreadable to the people this app is for.

**The primary action is sticky to the bottom on mobile.**
Reachable by thumb without scrolling past the content that explains it.

---

## Language

**Written, not translated.**
The Hindi and Gujarati dictionaries deliberately avoid Sanskritised officialese
(`प्रमाणीकरण`, `સત્યાપન`) in favour of the words people say out loud. A literal
translation of the English would have been faster and would have read like the
circular this project exists to replace.

**One dictionary, keys checked at compile time.**
`Dict` is derived from `en.ts`, so a missing or misspelled key in `hi.ts` or
`gu.ts` is a build error rather than an `undefined` in front of a pensioner.
This is also the argument that 22 scheduled languages is a content-pipeline
problem and not a rebuild.

**Language choice is stored in `localStorage`; the application is not.**
The language should survive coming back tomorrow. Somebody else's Aadhaar
number on a shared phone should not — that lives in `sessionStorage` and dies
with the tab. A cookie carries the language too, so the server can render the
right script on the first paint instead of flashing English.

---

## AI

**Three jobs, all server-side, all with fallbacks.**
`OPENAI_API_KEY` is read only inside route handlers. Remove it and the whole
app still works: the explainer falls back to a hardcoded table covering all six
codes in all three languages, and the pre-check falls back to the client-side
canvas verdict. This was built table-first and API-second, deliberately —
a demo that dies when a key expires is not a demo.

**The pre-check never blocks submission.**
A warning plus **"Take it again"** next to **"Send anyway"**. The model is
advisory; it does not get a veto over somebody's pension. A wrong guess costs
one retake.

**Two layers of photo checking, because the cheap one is instant.**
Layer 1 is client-side canvas analysis — mean luminance, Laplacian variance,
centre-region variance — running live during preview at low resolution. It
costs nothing, needs no network, and is what makes capture feel guided instead
of silent. Layer 2 is a single vision call on `/review`, on a photo resized to
512px at quality 0.7, because bandwidth is a real constraint here.

**The vision prompt forbids commenting on appearance, age, clothing, or
background, and forbids identifying the person.**
It is asked one question: would this photo fail an automated face match.

**Explanations are cached by `code + language`.**
The same six codes recur forever; the second pensioner to hit
`ERR_FACE_QUALITY_LOW` should not cost a second call.

**Voice is Web Speech API first, OpenAI TTS second and behind a flag.**
`speechSynthesis` is free, instant, and costs no bandwidth — which matters on
3G more than voice quality does.

---

## Backend

**A real state machine behind real HTTP, not `setTimeout` in a component.**
`DRAFT → SUBMITTED → VERIFYING → ACCEPTED | NEEDS_FIX`, with illegal
transitions throwing and every transition appending to an audit log. The point
of the exercise is end-to-end thinking; faking the round trip would have
skipped it.

**The mock pension office resolves honestly, not randomly.**
If our own pre-check flagged the photo, the outcome weights heavily toward
`ERR_FACE_QUALITY_LOW`. Otherwise it accepts about 70% of the time. Real
first-attempt failure rates for elderly users are considerably worse than 30%;
this number keeps the demo watchable while still exercising the recovery path.
Outcomes forced from `/demo` always win.

**`LATENCY_MS` and `FAILURE_RATE` are constants at the top of `lib/mockPda.ts`.**
So degraded-network behaviour can be demonstrated on camera by changing one
line, and so a reader can see exactly where the pretending happens.

**Submission is idempotent on a client-generated `requestId`.**
Pressing Send twice, or retrying after the connection drops, reuses the same
id and does not create a second record. The retry button deliberately reuses
the id rather than minting a new one.

**Storage is a module-level `Map`, and the app says so out loud.**
On `/about` and in the README. In production it is a Postgres row and a job
queue; on Vercel it means a submission is lost on cold start. That is the right
trade for a prototype and the wrong one for a pension, and hiding it would have
been the actual mistake.

**The status page survives a hard refresh.**
The id is in the URL and the state is on the server, so a reload re-reads
rather than restarts.

**Only the last four digits of the Aadhaar number are ever stored, even in the
mock.**
There is no reason for the rest to exist past validation, and building the mock
the careless way teaches the wrong shape.

---

## Deployment

**`bom1` (Mumbai) as the Vercel region.**
Every user of this is in India. The round trip should not cross an ocean.

**`X-Robots-Tag: noindex, nofollow` on everything.**
An app that resembles a government pension service must not turn up in a search
for one. The same reasoning drives the permanent banner and the
`notAffiliated` line on `/about`.

**`Permissions-Policy: camera=(self), microphone=(), geolocation=()`.**
The app needs a camera. It has no business asking for anything else.

---

## Things deliberately not built

- **Auth.** A login wall between a pensioner and their pension is the problem,
  not the solution. It also means the public URL opens for a reviewer with no
  account.
- **A database.** Out of scope, and `lib/store.ts` makes the boundary legible.
- **Real SMS.** Written to a visible outbox at `/outbox` instead, so the
  notification design can be reviewed without a gateway.
- **An animation library, a chart library, a UI component library, a state
  management library.** The performance budget is 150 KB of first-load JS, and
  the finished app lands at 125–130 KB. Every one of these would have been
  spent on something the pensioner did not ask for.
