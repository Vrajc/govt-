# Photographs for the landing-page carousel

The carousel on `/` ships with five hand-drawn scenes. Nothing here is
required — the page is finished as it stands. This folder exists so that
real photography can replace the drawings without touching any code.

## To use photographs

1. Put five files in this folder, named exactly:

   ```
   1.jpg   a pensioner facing a window, phone at eye level
   2.jpg   hands holding an open pension passbook
   3.jpg   a family member helping an older person with a phone
   4.jpg   a stamped receipt or paper being held up
   5.jpg   a bank counter or queue
   ```

2. Set the flag, locally in `.env.local` and in the Vercel project:

   ```
   NEXT_PUBLIC_STORY_PHOTOS=true
   ```

That is the whole change. Captions, timing, keyboard control, the
reduced-motion behaviour and the language handling all stay as they are.

## What the files need to be

| | |
|---|---|
| Aspect ratio | **400 × 260** (about 3:2 landscape). Other ratios are cropped from the centre by `object-fit: cover`, so keep the subject away from the edges. |
| Size | 1200 × 780 is plenty. Above that you are spending a pensioner's data on detail nobody sees. |
| Weight | Aim under 150 KB each. The whole app's JS is 103 KB; five careless photographs would dwarf it. |
| Format | `.jpg`. Rename to `.webp` in `components/Stories.tsx` if you would rather serve that. |

## Two things worth saying out loud

**Licensing is yours to check.** Nothing in this repo ships a photograph,
partly for this reason. If a picture shows an identifiable person, you need
their permission — more so here, where the implied caption is that they are
poor, elderly, or recently widowed.

**The captions are already written**, in all eleven languages, as
`landing.story1` … `landing.story5`. If your photographs say something
different from the drawings they replace, change the captions to match
rather than leaving a sentence that no longer describes the picture above
it. `npm run check:copy` will tell you if a language falls behind.
