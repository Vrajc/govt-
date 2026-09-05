# Photographs for the landing-page carousel

Seven photographs are **in use**, and are the default — they are committed,
so a fresh clone and a Vercel deploy both get them with no configuration.
Set `NEXT_PUBLIC_STORY_PHOTOS=false` and the hand-drawn scenes in
`components/StoryArt.tsx` come back, captions and all.

## What is here

| File | Pexels ID | What it shows | Caption it carries |
|---|---|---|---|
| `1.jpg` | 14798015 | An older Sikh man seated by a window, reading his phone | Facing a window, on the phone that replaced the trip to the bank |
| `2.jpg` | 38252281 | An older woman in a saree, smiling, in daylight | Every November, more than a crore people must show they are still alive |
| `3.jpg` | 36874547 | Two older women seated together against a rock wall | A widow pension exists. Most people never learn its name |
| `4.jpg` | 18083457 | An older man in a courtyard holding a phone | Four questions, and it names the pension that is yours |
| `5.jpg` | 34763973 | An older man sitting on a charpai in a village yard | The queue at the bank that no longer has to happen |
| `6.jpg` | Unsplash `photo-1741176505195-e2b04b203643` | A woman at her machine on a textile factory line | If a company cut PF from your salary for ten years, there is a pension in it |
| `7.jpg` | Unsplash `photo-1522643527310-7222a3f57bb1` | An elderly woman in a white shawl | When a pensioner dies, the pension can carry on in the family's name |

`1.jpg` – `5.jpg` are from [Pexels](https://www.pexels.com), under the Pexels
licence. `6.jpg` and `7.jpg` are from [Unsplash](https://unsplash.com), under
the Unsplash licence — Photo by
[EqualStock](https://unsplash.com/@equalstock) and Photo by
[Pranav Kumar Jain](https://unsplash.com/@peejayvisual) respectively.

Neither licence requires attribution. It is recorded here anyway, because
knowing where a picture came from is part of being able to replace it — and
because the courtesy costs nothing.

## Two rules that shaped the captions

**They describe the system, never the person.** These are identifiable
people who agreed to be photographed, not to be labelled. No caption says
that *this* woman is a widow or that *this* man is claiming a pension —
each one states a fact about the scheme and lets the picture be a picture.
Keep that if you swap the images.

**Every caption is written in all eleven languages**, as `landing.story1` …
`landing.story6` in `lib/i18n/svc-*.ts`. Change a picture and you change
eleven strings, or the sentence stops describing what is above it.
`npm run check:copy` catches a language left behind, but it cannot tell you
a caption has stopped being true.

## Replacing them

Drop in `1.jpg` … `7.jpg` and rewrite those captions. The count comes from
`STORY_SCENES` in `components/StoryArt.tsx`, not from the folder — add a
photograph and you add a drawing beside it, or the fallback runs short.

| | |
|---|---|
| Aspect ratio | The frame is **400 × 260**. Portraits are fine — `object-fit: cover` crops them, and `.story-art { object-position }` in `globals.css` biases the crop up so faces survive. Check each one after swapping. |
| Size | 1000px on the long edge is plenty. |
| Weight | Under ~200 KB each. The whole app's JS is 103 KB; seven careless photographs would dwarf it. |
| Format | `.jpg`, or change the extension in `components/Stories.tsx`. |
