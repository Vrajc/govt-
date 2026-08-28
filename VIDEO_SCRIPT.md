# Two-minute video script

**Minute one — the journey, as a citizen. Minute two — why, and what is real.**

Total spoken text is about 300 words, which is 120 seconds at a calm pace.
Read it slower than feels natural. The audience is judges watching forty of
these in a row; the pauses are what make it land.

---

## Before you press record

1. Open `/demo` (or **Ctrl + Shift + D** from any screen).
   - Force the next result: **Decide honestly**
   - Speed: **8 seconds**
   - Press **Fill the form with the demo pensioner**
2. Go to `/` and pick **English**. Close `/demo`.
3. Browser at **1280 × 800**, zoom 100%, bookmarks bar hidden.
4. Have a second tab already on `/about` — you will cut to it at 1:45.
5. Record the screen at 1080p. Do the voiceover separately and lay it over;
   trying to talk and click at once is what makes these look nervous.

---

## MINUTE ONE — the journey (0:00 – 1:00)

> Play the clicks at normal speed. Do not rush the camera step — the coaching
> line changing colour is the single best three seconds in the video.

| Time | On screen | Say |
|---|---|---|
| **0:00** | `/` language screen. Click **हिन्दी**, let it load, then go back and pick **English** so the rest is readable. | "Every year, more than one crore Indian pensioners have to prove they are alive, or the money stops. But that is only the last step of a pension." |
| **0:08** | `/start` — the hub. Hover the three cards so the service lists are visible. | "Before it there is applying, and after it there is everything that goes wrong. Fourteen government schemes, behind one door." |
| **0:16** | Click **I am not sure which one**. Answer: *start a pension* → *neither of those* → *60 or more* → *my husband has died*. | "Nobody's portal answers the question people actually have — which pension am I entitled to. Four questions, in plain words." |
| **0:30** | Lands on **Widow pension**. Scroll slowly through: who it is for, how much, who decides, and the six real stages. | "It names the scheme, what she'll get, and who decides — the village office, the gram sabha, the Collector. Before she starts." |
| **0:40** | **Start this** → *I am helping a family member* → the eligibility checks → **Next**. | "Helping a parent is a mode, not a lie she has to tell. And the checks come before the form, not after twenty fields." |
| **0:48** | Documents step. Click **Take a photo** on the death certificate. | "Photograph the paper. Nobody in a village has a scanner." |
| **0:54** | Details → **Send code** → code appears on screen → **Check the code** → photo → **Send**. | "One screen, and the code arrives in place. She never leaves the page." |

---

## MINUTE TWO — why we built it this way (1:00 – 2:00)

| Time | On screen | Say |
|---|---|---|
| **1:00** | The status timeline, walking: village office → gram sabha → taluka → Collector. Let it run. | "Now the part that matters. Not a spinner — the real approval chain, and who is holding her file right now. A person who can see it is at the taluka office knows who to ring." |
| **1:12** | The receipt: ₹1,050 a month, order number, first payment date. | "And a receipt she can show her son. For a new pension the big number is the money. For the yearly renewal it is a date. She gets what she came for." |
| **1:22** | `/demo` → *Always needs fixing* → run any journey → the result screen. Expand **Technical details**. | "When something fails, never the word rejected. One sentence on what happened, one on what to do, one button. The raw code is here, for you — invisible to her." |
| **1:34** | The **Turning 80** service with the demo pensioner. Point at the arrears figure. | "AI does three small jobs and is never the pitch. It explains a code in her language, and checks her photo before it is sent. It never decides an outcome — a wrong guess costs one retake, never a pension." |
| **1:45** | Cut to `/about`. Scroll the real-versus-mocked table, then the service map. | "Here is exactly what is real and what is not. Every scheme is mapped to the government system it stands for. Aadhaar, the OTP and the face match are mocked — the journey, the state machine and both AI calls are not." |
| **1:55** | End on the hub, or the language screen. | "A pensioner should never be stuck, confused, or silently rejected. That is the whole product." |

---

## If you overrun

Cut in this order — each is the least load-bearing thing left:

1. **0:00 language toggle** (−6s). Start in English and say "three languages" over the hub.
2. **1:34 the 80+ arrears** (−11s). Say the AI line over the `/about` scroll instead.
3. **0:30 service page scroll** (−6s). Land on it, read the title, move on.

Do **not** cut: the finder, the status timeline, or `/about`. Those three are
the product, the engineering, and the honesty criterion.

---

## If you have slack

- **Slow 3G.** `/demo` → *Pretend the network is slow*, then send something.
  "This is the same journey on a bad connection." (+8s)
- **The family-pension question.** Its first eligibility question asks whether
  her name is already in his PPO — because if it is, the bank can start paying
  with no office visit at all. Six weeks becomes one, and almost nobody is
  told. (+10s)

---

## Numbers you can quote, all true of the build

| | |
|---|---|
| Services | 14, each mapped to a real scheme and its real form |
| Languages | 3, complete — 739 strings each, checked by a linter |
| Widow pension in the demo | ₹1,050 a month, six approval stages |
| 80+ arrears, demo pensioner | ₹77,280 owed since 1 November 2024, at 20% |
| First-load JavaScript | ~115 KB — only the chosen language is sent |
| Contrast | Every text pair at WCAG AAA |
| Works with the AI key removed | Yes — every call has a hardcoded fallback |

---

## Two honesty lines worth keeping in

Say at least one of these out loud. Judges mark for it.

- "The AI never decides an outcome. It explains one the government system
  already returned."
- "The pension office here is a mock. It is a real state machine with a real
  audit log — but it is ours, not the government's."

---

## Recording notes

- **Do not** say "biometric", "authentication", "verification" or "rejected".
  The app does not, and the contrast is the point.
- Show one journey properly rather than four badly.
- The banner across the top says it is a student prototype. Leave it visible
  in every frame — do not crop it out.
- If the app has just been deployed, load a page and wait before recording.
  The pension office is an in-memory store; a cold start can lose a record
  mid-journey.
