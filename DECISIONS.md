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
~127 KB gzipped against a 150 KB budget.

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
