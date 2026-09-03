# Decisions

Every judgement call the brief left open, and every place I departed from it.
The rule I used where something was ambiguous: **pick whatever is simpler for
a 78-year-old on a cheap Android phone.**

---

## Departures from the brief

These are the four places where I did not do exactly what MASTER_PROMPT.md
says. Each one is a conflict between two of its own rules.

### 1. "Certificate" is banned, so the accepted screen does not say it

§4 gives the accepted sub-headline as *"Your life certificate has been
accepted."* §9 bans the word *certificate* from all user-facing text, and
calls the copy rules non-negotiable.

I followed §9: **"The pension office has your proof. Nothing more to do until
November 2027."** Same meaning, no jargon. §9 is the later and more explicit
rule, and "certificate" is exactly the kind of word that makes a pensioner
call their son.

### 2. Two tokens are a shade darker than specified

§3 fixes `--ink-soft: #56504A`. §10 requires every text/background pair at
AAA 7:1. Those conflict: #56504A on `--primary-tint` measures **6.81:1**.

- `--ink-soft` → `#534D47` (7.13:1 on tint). Visually indistinguishable.
- Added `--attention-text: #83321D`. The specified `--attention` (#A8452A) is
  a *fill* colour; as small text it only reaches 5.6:1. The new token is the
  same hue taken to AAA, used only where rust becomes words. `--attention`
  itself is untouched for banners and buttons.
- Placeholder text darkened to `#767068` for 4.9:1.

`npm run check:contrast` asserts all 22 pairs on every run.

### 3. Screen 1 shows the tagline three times

§4 says screen 1 has "no other content except the product name and one line",
but also says nothing may render in a language the visitor has not chosen.
Those cannot both hold — one line has to be in *some* language.

The tagline appears once per language, at 15px, under a product name shown in
all three scripts. A language chooser that speaks only English has already
failed the person it exists for.

### 4. `/demo` is English-only

Everything else goes through i18n. The presenter controls do not: they are a
tool for whoever is holding the camera, and translating them would imply a
pensioner might one day see the screen. It is unreachable from the journey.

---

## Product

**Name comes from a mocked PPO lookup, not a fourth field.**
§4 specifies exactly three fields on `/details`, but the receipt and review
screens need a name. §8 lists "PPO lookup" as mocked — so the PPO *is* the key
into the pension office, and **Send code** returns the pensioner's name along
with the OTP. One round trip, no extra field. If the PPO is unknown, a name
field appears in place with *"We could not find that PPO number. Type the name
below and carry on."* Three PPOs are seeded; `PPO-2024-000123` is the demo one.

**The reference number keeps the `DLC-` prefix but is never called a DLC.**
§6.2 requires the real `DLC-{YYYY}-{8 chars}` format; §9 bans "DLC" from
user-facing copy. The ban is about jargon as a *label*, so the string keeps
the real format and every language calls it "your reference number". The
alphabet drops I, O, 0 and 1 — this number gets read aloud over a phone.

**Assisted mode adds a field rather than hiding one.**
It changes who the copy addresses and asks who filled the form in. It never
changes what is sent. The whole point is to stop a son having to pretend to be
his father — obscuring the difference would reintroduce the problem.

**"Needs fixing" is never "rejected", including in the SMS.**
The outbox messages use the same vocabulary as the screens. A pensioner who
gets a message saying "rejected" has already had the bad afternoon, whatever
the app says later.

**Every outbound message carries the prototype disclosure**, and so does the
receipt PNG. If someone photographs the receipt and forwards it, the
disclosure travels with it.

---

## Technical

**Language lives in a cookie as well as sessionStorage.**
sessionStorage alone means the server renders English and the right script
appears a beat later. A cookie lets the root layout render the correct
language, `<html lang>` and font stack on the first paint.

> This bit me: `LANG_COOKIE` was originally exported from `lib/app-state.tsx`,
> which is `"use client"`. Every export of a client module becomes a client
> *reference* when a server component imports it — so the layout was calling
> `cookies().get(<proxy object>)` and silently getting `undefined`. Plain
> constants now live in `lib/constants.ts`.

**The mock pension office resolves lazily on read, not on a timer.**
Nothing in a serverless function may outlive its request. Each record carries
`resolveAt`; `/api/status/[id]` settles it if due. From the client this is
indistinguishable from a worker queue, and it survives a cold start — a
`setTimeout` would not.

**`globalThis` holds the store** so Next.js dev hot-reloads do not silently
drop every record between edits.

**Only the last four Aadhaar digits are stored, even in the mock.** Storing
the full number "just for the demo" is how habits get formed. The client sends
twelve; the server keeps four.

**Outcomes are decided honestly, not randomly.** If the pre-check flagged the
photo, the pension office returns `ERR_FACE_QUALITY_LOW` 85% of the time;
otherwise it accepts 70% of the time. That coupling is what makes the
pre-check feel truthful rather than decorative. An unknown PPO returns
`ERR_PPO_NOT_FOUND` on the first attempt only — otherwise a reviewer typing a
made-up number would be stuck in a loop. `/demo` always wins.

**Demo settings travel as request headers**, so the mock backend honours them
server-side. The UI never fakes a result it was told to show.

**Slow-3G simulation is real added latency** in the fetch wrapper, both ways.
A fake spinner would prove nothing.

**Layer 1 of the pre-check throttles to ~4 readings a second** and reuses one
96×128 canvas. Allocating a canvas per frame is what makes naive versions of
this stutter on a five-year-old Android.

**The receipt PNG is drawn by hand on a canvas**, including the arc text on
the stamp. html2canvas is ~200 KB — more than the entire rest of the app — and
it renders Devanagari and Gujarati badly. `fillText` uses the same font stack
the page already loaded, so all three scripts come out right. Print is offered
alongside, for anyone whose browser blocks the download.

**`hasKey()` rejects the `sk-...` placeholder from `.env.example`.** Treating
it as real cost every call a 7-second timeout before falling back — exactly
the delay the fallback exists to prevent.

**Validity is 30 November of the following year.** Whatever month it is sent
in, the next annual window closes then.

---

## Dependencies

The budget was "justify anything you reach for". The full list:

| Package | Why |
|---|---|
| `next`, `react`, `react-dom` | The stack, fixed by the brief. Pinned to 15.5.24 — 15.5.2 carries CVE-2025-66478. |
| `openai` | The brief's SDK. Server-only; `verify:no-key` proves it never ships to the browser. |
| `tailwindcss` v4 + `@tailwindcss/postcss` | The brief's styling layer. |
| `server-only` | ~1 KB, zero runtime. Turns "do not import this on the client" into a build error. |

Nothing else. No animation, chart, icon, UI or state library. Every icon and
illustration in `components/Icons.tsx` is hand-written SVG; the whole set
costs less than the import statement for a library would. First-load JS is
110-123 KB gzipped against a 150 KB budget.

---

## Left undone, deliberately

- **No OpenAI TTS by default.** `speechSynthesis` is free, instant and costs
  no bandwidth, which is the entire argument on 3G. The TTS route exists and
  works, behind `NEXT_PUBLIC_ENABLE_TTS_FALLBACK`, for devices with no local
  Hindi or Gujarati voice. An MP3 is the heaviest thing this app could send.
- **No real face detection in layer 1.** Three cheap statistics — mean
  luminance, Laplacian variance, centre-region variance — correlate well with
  how elderly users' photos actually fail. A face-detection model would be
  megabytes to catch the same problems.
- **`TRANSPORT_FAILURE_RATE` ships at 0.** The injected-failure path is built
  and the recovery UI works; a demo that randomly fails is a worse demo. Set
  it in `lib/mockPda.ts` to show it.
- **No tests.** With the deadline where it is, the budget went into three
  audits that run in a second (`npm run check`) and cover the things most
  likely to rot: banned copy, contrast, and the key leaking into the bundle.

---

# Decisions — the pension lifecycle

The first version did one thing: the annual proof-of-life. That is the last
step of a pension, not the pension. This round covers the whole lifecycle.

## Why a catalogue instead of more screens

Fourteen services hand-built would be fourteen sets of screens to keep
honest, and the fifteenth would be a rebuild. India runs at least a dozen
pension schemes across the centre and the states; any version of this that could
ship for real needs adding a scheme to be a data file.

So each service is a `ServiceDef` — eligibility questions, documents, form
fields, real approval stages, outcome kind — and one engine renders all of
them. `app/apply/[service]/[step]/page.tsx` contains no knowledge of what a
widow pension is.

The bet paid twice: the twelfth service is a data file, and the whole
catalogue arrived for **less** bundle than the single service used to cost.

## The finder is a decision tree, not a search box

You cannot search for the name of a thing you have never heard of. A widow
who has never encountered "IGNWPS" will not type it. Four questions in plain
words, ending in one named service.

It includes an honest dead end: someone aged 40–59 with no job history and no
widow or disability status genuinely falls between the old-age pension (60+)
and Atal Pension Yojana (18–40). The finder says so, and gives a phone
number, rather than inventing something.

## Eligibility is asked before the form, and never blocks

The cruellest thing the real system does is let someone complete twenty
fields and then tell them they were never eligible. So the questions come
first — and a failure names the reason, suggests the scheme they probably
wanted, and *still* offers "carry on anyway". A rule can be wrong about a
real person, and a prototype should not be the thing that stops them.

## Documents are photographed, not uploaded

Every document step is the camera, back-facing, at higher resolution than the
face photo. "Scan and upload a PDF" is where these journeys die in a village.
The layer-1 quality analysis is reused, with the "no face in frame" verdict
suppressed — a ration card does not have one.

## "Certificate" stays banned, except on paper you can hold

§9 bans "certificate" so we never say "your certificate was rejected". But a
death certificate and a disability certificate are physical papers a widow
has in a folder and must go and collect, and calling them anything else is
worse than the jargon. The linter allows exactly those two, with the reason
written next to the exception.

## Only one language is ever sent to the browser

Adding the catalogue pushed first-load JS to 161 KB, over the 150 KB budget.
The cause was not the catalogue: every visitor had always been downloading
all three dictionaries, including two scripts they cannot read.

Now the server resolves the language cookie, picks one dictionary and passes
it to `AppProvider`. Client code imports helpers from `lib/i18n/util.ts`,
which has no dictionary imports; `lib/i18n/index.ts` is server-only. Result:
110–123 KB, below where it started.

The cost is that choosing a language on screen 1 is a full page load rather
than a client navigation — the cookie has to reach the server for it to send
the right dictionary, fonts and `<html lang>` together. One reload, on the
first screen, in exchange for never shipping an unread script.

## The receipt shows what the person came for

Five outcome kinds, one layout. What changes is which number is the large
one: a monthly amount for a new pension, a date for a bank change, a lump sum
for arrears, a docket for a grievance, a validity date for the annual
renewal. Getting that hierarchy right per service is the difference between a
receipt and a form.

## Details that are the actual product

- **The 80+ increase runs from the first day of the month** of the 80th
  birthday, not the birthday. Banks miss it constantly, so the service is
  really "claim the money you are already owed" — and it computes the
  arrears. The demo pensioner was aged to Nov 1944 so the number is not zero.
- **Family pension asks first whether your name is in their PPO**, because if
  it is, the bank can start paying with no office visit. Six weeks becomes
  one, and almost nobody is told.
- **Moving banks warns you** that the new branch will ask for proof of life
  again. That is the one that catches everybody out.
- **The status timeline names who is holding the file.** "Sitting at the
  taluka office" tells a citizen who to ring. "Checking..." does not.

## Stage timing

Each record carries `nextStageAt` and a total; durations are weight-split
across the service's stages and walked forward on read. Nothing in a
serverless function may outlive its request, so a timer was never an option —
and this version catches a ten-minute-old page up in a single poll.

## Left undone

- **No state schemes.** Gujarat's own top-ups and Vay Vandana are real and
  would matter; the catalogue is shaped to take them, but fourteen central
  services was the honest limit for the time.
- **`/demo` is still English-only**, for the same reason as before.
- **Amounts are plausible, not authoritative.** EPS-95 uses the real
  pensionable-salary formula; the NSAP figures are the central rate plus a
  typical state top-up. A real version would read the state's current rates.

---

## The name

The brief named the product **Pramaan Saral** — "proof, made simple". That was
the right name when the app did one thing: prove you are alive once a year.

It stopped being right when the app grew to fourteen services. Most of them
have nothing to do with proof. Somebody claiming a widow pension, chasing
money that never arrived, or asking for the grain they are owed is not
proving anything, and a product called "proof, made simple" tells them they
are in the wrong place.

**Pension Saral** — "pension, made simple" — names what the whole thing is
actually for. It is also the one word every person arriving here already has
in their head.

Renamed everywhere it is user-facing, in every language
(पेंशन सरल · પેન્શન સરળ · পেনশন সরল · பென்ஷன் சரள் · పెన్షన్ సరళ్ ·
ಪಿಂಚಣಿ ಸರಳ್ · പെൻഷൻ സരൾ · ਪੈਨਸ਼ਨ ਸਰਲ · ପେନସନ ସରଳ), plus the package name,
the receipt stamp, the outbound messages and the docs. The reference-number
prefix `PS-` did not have to change, which is a small piece of luck.

`MASTER_PROMPT.md` and the original dossier keep the old name deliberately.
They are dated inputs, not product surfaces, and rewriting a brief after the
fact to match what you built is the wrong kind of tidy.
