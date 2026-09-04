/**
 * Five scenes for the landing-page carousel.
 *
 * Hand-drawn inline SVG, for the same reasons as `LandingArt`: no image
 * files, no CDN, no licence, nothing to load on a 3G connection. Stock
 * photography of smiling strangers would say less than these do and cost
 * more to ship.
 *
 * They share one visual grammar so the carousel reads as a set rather than
 * five unrelated pictures: the same 400x260 frame, the same ink-blue line at
 * 2.5, warm paper behind, and exactly one warm accent per scene. Faces are
 * drawn in profile and without features — this is a pension service, not a
 * portrait gallery, and a blank face lets the reader put their own mother in
 * the frame.
 *
 * All five are decorative. The caption beside each one carries the meaning,
 * so they are hidden from screen readers rather than given alt text that
 * would only repeat the sentence underneath.
 */

const FRAME = "0 0 400 260";

/** Shared props for every scene root. */
const svgProps = {
  viewBox: FRAME,
  className: "story-art",
  role: "presentation" as const,
  "aria-hidden": true,
  focusable: false,
  preserveAspectRatio: "xMidYMid meet",
};

/* The paper ground every scene sits on, plus the soft floor shadow that
   keeps the figures from floating. */
function Ground() {
  return (
    <>
      <rect x="0" y="0" width="400" height="260" fill="var(--surface)" />
      <rect x="0" y="212" width="400" height="48" fill="var(--paper)" />
      <line x1="0" y1="212" x2="400" y2="212" stroke="var(--line)" strokeWidth="2" />
    </>
  );
}

const ink = {
  stroke: "var(--primary-dark)",
  strokeWidth: 2.5,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  fill: "none",
};

/**
 * 1 · The window.
 * A woman turned to the light, holding the phone at eye level. The whole
 * photo step is one instruction — face a window — so the light is the
 * loudest thing in the frame.
 */
export function StoryWindow() {
  return (
    <svg {...svgProps}>
      <Ground />

      {/* the window, and the light coming through it */}
      <rect x="20" y="34" width="118" height="150" rx="4" fill="var(--primary-tint)" stroke="var(--primary-dark)" strokeWidth="2.5" />
      <line x1="79" y1="34" x2="79" y2="184" stroke="var(--primary-dark)" strokeWidth="2.5" />
      <line x1="20" y1="109" x2="138" y2="109" stroke="var(--primary-dark)" strokeWidth="2.5" />
      {[0, 1, 2].map((i) => (
        <line
          key={i}
          x1="142"
          y1={62 + i * 34}
          x2={196 + i * 10}
          y2={78 + i * 30}
          stroke="var(--focus)"
          strokeWidth="3"
          strokeLinecap="round"
          opacity={0.55 - i * 0.12}
        />
      ))}

      {/* her: shoulders, head in profile turned to the light, bun */}
      <path d="M228 212 C228 176 250 160 276 160 C302 160 324 176 324 212" {...ink} fill="var(--primary-tint)" />
      <circle cx="276" cy="126" r="30" fill="var(--surface)" stroke="var(--primary-dark)" strokeWidth="2.5" />
      <path d="M300 108 C316 100 322 116 312 126 C306 132 300 130 298 124" {...ink} />
      <path d="M252 118 C252 100 268 92 280 96" {...ink} />

      {/* the phone, held up at eye level */}
      <rect x="176" y="112" width="40" height="66" rx="6" fill="var(--surface)" stroke="var(--primary-dark)" strokeWidth="2.5" />
      <rect x="182" y="120" width="28" height="44" rx="3" fill="var(--primary-tint)" />
      <circle cx="196" cy="140" r="9" fill="none" stroke="var(--primary-dark)" strokeWidth="2" />
      <line x1="190" y1="171" x2="202" y2="171" stroke="var(--primary-dark)" strokeWidth="2.5" strokeLinecap="round" />

      {/* her arm reaching to it */}
      <path d="M244 190 C232 182 220 172 214 160" {...ink} />
    </svg>
  );
}

/**
 * 2 · The passbook.
 * Two hands holding it open. Entries are bars, never numbers: a rupee
 * figure drawn into decoration would read as a promise.
 */
export function StoryPassbook() {
  return (
    <svg {...svgProps}>
      <Ground />

      {/* the book, slightly open, one page catching more light */}
      <g transform="rotate(-3 200 120)">
        <rect x="92" y="44" width="106" height="136" rx="4" fill="var(--paper)" stroke="var(--primary-dark)" strokeWidth="2.5" />
        <rect x="198" y="44" width="106" height="136" rx="4" fill="var(--surface)" stroke="var(--primary-dark)" strokeWidth="2.5" />
        <line x1="198" y1="44" x2="198" y2="180" stroke="var(--primary-dark)" strokeWidth="2.5" />

        {/* ruled entries */}
        {[0, 1, 2, 3, 4].map((i) => (
          <g key={i}>
            <line x1="106" y1={72 + i * 20} x2="184" y2={72 + i * 20} stroke="var(--line)" strokeWidth="2" />
            <line x1="212" y1={72 + i * 20} x2="290" y2={72 + i * 20} stroke="var(--line)" strokeWidth="2" />
            <rect x="212" y={65 + i * 20} width={i === 4 ? 30 : 52 - i * 6} height="7" rx="3.5" fill="var(--primary)" opacity={i === 4 ? 0.35 : 0.75} />
          </g>
        ))}

        {/* the heading bar on the left page */}
        <rect x="106" y="54" width="46" height="8" rx="4" fill="var(--primary-dark)" />
      </g>

      {/* two hands cupping it from below */}
      <path d="M96 178 C78 178 68 190 70 204 C72 214 84 216 96 214" {...ink} fill="var(--surface)" />
      <path d="M304 178 C322 178 332 190 330 204 C328 214 316 216 304 214" {...ink} fill="var(--surface)" />
      {[0, 1, 2].map((i) => (
        <line key={i} x1={82 + i * 8} y1="192" x2={82 + i * 8} y2="208" stroke="var(--primary-dark)" strokeWidth="2" strokeLinecap="round" />
      ))}
      {[0, 1, 2].map((i) => (
        <line key={i} x1={302 + i * 8} y1="192" x2={302 + i * 8} y2="208" stroke="var(--primary-dark)" strokeWidth="2" strokeLinecap="round" />
      ))}
    </svg>
  );
}

/**
 * 3 · Two generations.
 * The assisted case, which is most of them: a son with the phone, his
 * mother beside him. Nobody is pretending to be anybody.
 */
export function StoryHelping() {
  return (
    <svg {...svgProps}>
      <Ground />

      {/* the bench they are sitting on */}
      <line x1="60" y1="212" x2="340" y2="212" stroke="var(--primary-dark)" strokeWidth="3" />
      <rect x="70" y="188" width="260" height="10" rx="4" fill="var(--paper)" stroke="var(--primary-dark)" strokeWidth="2.5" />

      {/* her, seated, sari over the shoulder */}
      <path d="M104 188 C104 152 122 138 144 138 C166 138 184 152 184 188" {...ink} fill="var(--primary-tint)" />
      <path d="M150 140 C168 150 176 166 178 188" stroke="var(--primary-dark)" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <circle cx="144" cy="108" r="26" fill="var(--surface)" stroke="var(--primary-dark)" strokeWidth="2.5" />
      <path d="M120 100 C120 84 136 76 150 80" {...ink} />
      <circle cx="144" cy="82" r="4" fill="var(--attention)" />

      {/* him, leaning in, phone held between them */}
      <path d="M216 188 C216 150 234 136 256 136 C278 136 296 150 296 188" {...ink} fill="var(--surface)" />
      <circle cx="256" cy="106" r="26" fill="var(--surface)" stroke="var(--primary-dark)" strokeWidth="2.5" />
      <path d="M232 96 C236 82 252 76 266 80 C276 83 280 90 280 98" {...ink} />

      {/* the phone, tilted so she can see it too */}
      <g transform="rotate(-12 200 156)">
        <rect x="182" y="128" width="38" height="60" rx="6" fill="var(--surface)" stroke="var(--primary-dark)" strokeWidth="2.5" />
        <rect x="188" y="136" width="26" height="40" rx="3" fill="var(--primary-tint)" />
        <line x1="194" y1="148" x2="208" y2="148" stroke="var(--primary)" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="194" y1="158" x2="204" y2="158" stroke="var(--primary)" strokeWidth="2.5" strokeLinecap="round" />
      </g>

      {/* his arm to the phone, hers resting toward it */}
      <path d="M228 172 C218 166 210 160 206 152" {...ink} />
      <path d="M172 176 C182 172 190 168 194 164" {...ink} />
    </svg>
  );
}

/**
 * 4 · The receipt.
 * The stamped slip at the end of the journey — the one thing a pensioner
 * actually wants, because it is the thing they can show their son.
 */
export function StoryReceipt() {
  return (
    <svg {...svgProps}>
      <Ground />

      {/* the slip, with a torn top edge */}
      <g transform="rotate(-2 200 120)">
        <path
          d="M118 40 l14 -6 14 6 14 -6 14 6 14 -6 14 6 14 -6 14 6 14 -6 14 6 14 -6 14 6 v146 h-164 z"
          fill="var(--surface)"
          stroke="var(--primary-dark)"
          strokeWidth="2.5"
          strokeLinejoin="round"
        />

        {/* the lines of a receipt: a heading, then quiet rows */}
        <rect x="134" y="58" width="70" height="9" rx="4.5" fill="var(--primary-dark)" />
        {[0, 1, 2].map((i) => (
          <g key={i}>
            <rect x="134" y={82 + i * 18} width="34" height="6" rx="3" fill="var(--line)" />
            <rect x="178" y={82 + i * 18} width={70 - i * 14} height="6" rx="3" fill="var(--primary)" opacity="0.6" />
          </g>
        ))}

        {/* the big date line, which is the whole point of the slip */}
        <rect x="134" y="144" width="112" height="12" rx="6" fill="var(--success)" />
        <rect x="134" y="164" width="60" height="6" rx="3" fill="var(--line)" />
      </g>

      {/* the ink stamp, rotated, overlapping the slip like a real one */}
      <g transform="rotate(-14 296 150)">
        <circle cx="296" cy="150" r="44" fill="none" stroke="var(--success)" strokeWidth="3.5" opacity="0.9" />
        <circle cx="296" cy="150" r="35" fill="none" stroke="var(--success)" strokeWidth="1.5" opacity="0.7" />
        <path d="M278 150 l12 13 24 -26" stroke="var(--success)" strokeWidth="5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </g>
    </svg>
  );
}

/**
 * 5 · The empty counter.
 * The trip that no longer has to happen. Drawn as an absence: the bench,
 * the token board and the shutter, with nobody in the queue.
 */
export function StoryQueue() {
  return (
    <svg {...svgProps}>
      <Ground />

      {/* the counter wall and the shutter above it */}
      <rect x="64" y="42" width="272" height="118" rx="4" fill="var(--paper)" stroke="var(--primary-dark)" strokeWidth="2.5" />
      <rect x="64" y="42" width="272" height="26" rx="4" fill="var(--primary-tint)" stroke="var(--primary-dark)" strokeWidth="2.5" />

      {/* the token board, showing nothing waiting */}
      <rect x="96" y="86" width="86" height="52" rx="4" fill="var(--surface)" stroke="var(--primary-dark)" strokeWidth="2.5" />
      <line x1="118" y1="112" x2="160" y2="112" stroke="var(--line)" strokeWidth="6" strokeLinecap="round" />

      {/* the window itself, shutter half down */}
      <rect x="212" y="86" width="94" height="52" rx="4" fill="var(--surface)" stroke="var(--primary-dark)" strokeWidth="2.5" />
      <rect x="212" y="86" width="94" height="20" fill="var(--primary-tint)" stroke="var(--primary-dark)" strokeWidth="2.5" />
      {[0, 1, 2, 3].map((i) => (
        <line key={i} x1={224 + i * 22} y1="112" x2={224 + i * 22} y2="132" stroke="var(--line)" strokeWidth="2" />
      ))}

      {/* the rope barrier, still up, with nobody behind it */}
      <line x1="96" y1="178" x2="96" y2="212" stroke="var(--primary-dark)" strokeWidth="3" strokeLinecap="round" />
      <line x1="304" y1="178" x2="304" y2="212" stroke="var(--primary-dark)" strokeWidth="3" strokeLinecap="round" />
      <path d="M96 180 C160 200 240 200 304 180" stroke="var(--attention)" strokeWidth="3" fill="none" strokeLinecap="round" />
      <circle cx="96" cy="176" r="5" fill="var(--primary-dark)" />
      <circle cx="304" cy="176" r="5" fill="var(--primary-dark)" />
    </svg>
  );
}

/** In carousel order. Index is the slide number the captions key off. */
export const STORY_SCENES = [
  StoryWindow,
  StoryPassbook,
  StoryHelping,
  StoryReceipt,
  StoryQueue,
];
