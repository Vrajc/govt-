import { lookFor, type DocFocus, type DocMark, type DocShape } from "@/lib/services/docShapes";

/**
 * A drawing of the document, inside a camera frame.
 *
 * "Upload your bank passbook" assumes the reader knows which of the papers
 * in the tin box is the bank passbook, which page of it matters, and how
 * close to hold the phone. A drawing answers all three before the camera
 * opens, and it answers them without a word of text — which is the only way
 * to answer them for somebody who cannot read.
 *
 * It is a diagram, not a picture. The lines where the writing goes are grey
 * bars, the number is a row of blocks, and nothing on it could be mistaken
 * for a real card or filled in as one. What it does show truthfully is the
 * shape, the part that has to be readable, and how much of the frame the
 * document should take up: the corner brackets are the camera, the document
 * nearly fills them, and the rust band is the line the office will actually
 * read.
 *
 * It is drawn at two sizes, and they are not the same drawing.
 *
 * The thumbnail, at 72px in the list, has one job: say which drawer this
 * paper lives in. A card, a booklet, a sheet. Anything finer than that is
 * mud at 72px, and mud reads as a smudged photograph rather than as a
 * diagram.
 *
 * The enlarged view, opened by tapping it, has the opposite job: the reader
 * is now holding four plastic cards and deciding which one this is. So
 * `detail` adds the marks that separate them — the emblem and the three
 * groups of four on an Aadhaar card, the photograph low on the left on a
 * PAN card, the household grid on a ration card — and the frame closes in
 * around the paper so it fills the view. The word SAMPLE goes across it in
 * the reader's own language, because the whole point of drawing it better
 * is that it gets closer to the real thing, and nothing here should ever be
 * mistaken for the real thing.
 */

/** The frame the thumbnail is drawn in. Fixed, so every thumbnail lines up. */
const THUMB_W = 260;
const THUMB_H = 176;

/** How close the brackets sit to the paper in the enlarged view. */
const DETAIL_PAD = 22;

/** How far the second copy peeks out from behind, on the two-sided ones. */
const BACK_OFFSET = 12;

/**
 * Screen pixels per unit of the drawing, in the enlarged view.
 *
 * Sizing the enlarged drawing by the panel instead would blow a passbook up
 * to the same width as a cheque, and every line on it with it: the same 2.5
 * stroke lands at 3px on one and 6px on the other, and the passbook comes
 * out looking like a woodcut. Fixing the scale instead keeps every drawing
 * drawn with the same pen — and has the second virtue of making the cheque
 * genuinely wider than the passbook on screen, which is true of the paper.
 */
const DETAIL_SCALE = 1.4;

/** How big each shape is drawn. The same at both sizes; only the frame moves. */
const SIZES: Record<DocShape, { w: number; h: number }> = {
  card: { w: 196, h: 124 },
  booklet: { w: 104, h: 147 },
  paper: { w: 108, h: 152 },
  cheque: { w: 216, h: 99 },
  face: { w: 100, h: 129 },
  people: { w: 176, h: 132 },
};

export function DocSample({
  docId,
  className,
  detail = false,
  sampleLabel,
}: {
  docId: string;
  className?: string;
  /** The enlarged view: the marks that identify this paper, and a tight frame. */
  detail?: boolean;
  /** "Sample", in the reader's language. Written across the enlarged drawing. */
  sampleLabel?: string;
}) {
  const look = lookFor(docId);
  const { w, h } = SIZES[look.shape];

  /* A document that needs its back photographed is drawn as two, the second
     peeking out behind — so the frame has to hold both, and the pair is what
     gets centred rather than the front one. */
  const off = look.twoSided ? BACK_OFFSET : 0;
  const vw = detail ? w + off + DETAIL_PAD * 2 : THUMB_W;
  const vh = detail ? h + off + DETAIL_PAD * 2 : THUMB_H;
  const x = (vw - w - off) / 2;
  const y = (vh - h - off) / 2 + off;

  return (
    <svg
      viewBox={`0 0 ${vw} ${vh}`}
      className={className}
      style={detail ? { width: vw * DETAIL_SCALE, maxWidth: "100%" } : undefined}
      /* The sentences next to this drawing say the same thing in words, so
         to a screen reader it is decoration and repeating it is noise. */
      aria-hidden="true"
      focusable="false"
    >
      <CameraFrame vw={vw} vh={vh} />
      <g transform={`translate(${x} ${y})`}>
        {look.twoSided && <BackCard w={w} h={h} />}
        <Document
          shape={look.shape}
          focus={look.focus}
          mark={look.mark}
          detail={detail}
          w={w}
          h={h}
        />
        {detail && sampleLabel && <Watermark w={w} h={h} label={sampleLabel} />}
      </g>
    </svg>
  );
}

/* ------------------------------------------------------------------ *
 * The camera
 * ------------------------------------------------------------------ */

/** Four corner brackets. The document should very nearly reach them. */
function CameraFrame({ vw, vh }: { vw: number; vh: number }) {
  const m = 6;
  const len = 22;
  const corners = [
    `M${m} ${m + len} L${m} ${m} L${m + len} ${m}`,
    `M${vw - m - len} ${m} L${vw - m} ${m} L${vw - m} ${m + len}`,
    `M${vw - m} ${vh - m - len} L${vw - m} ${vh - m} L${vw - m - len} ${vh - m}`,
    `M${m + len} ${vh - m} L${m} ${vh - m} L${m} ${vh - m - len}`,
  ];
  return (
    <g stroke="var(--line)" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round">
      {corners.map((d) => (
        <path key={d} d={d} />
      ))}
    </g>
  );
}

/**
 * The same card again, behind the first one.
 *
 * "Both sides" is a sentence somebody has to read. Two cards where there
 * was one is a thing somebody sees, and it survives at 72px, in eleven
 * scripts, and for a reader who does not read any of them.
 */
function BackCard({ w, h }: { w: number; h: number }) {
  return (
    <rect
      x={BACK_OFFSET}
      y={-BACK_OFFSET}
      width={w}
      height={h}
      rx="6"
      fill="var(--paper)"
      stroke="var(--ink-soft)"
      strokeWidth="2"
      opacity="0.55"
    />
  );
}

/**
 * The one word on the drawing, and the reason it can afford to be a good
 * drawing. Set quietly enough to read the paper through it.
 */
function Watermark({ w, h, label }: { w: number; h: number; label: string }) {
  return (
    <text
      x={w / 2}
      y={h / 2}
      transform={`rotate(-20 ${w / 2} ${h / 2})`}
      textAnchor="middle"
      dominantBaseline="middle"
      fontSize={Math.round(w * 0.15)}
      fontWeight="700"
      letterSpacing="1.5"
      fill="var(--ink-soft)"
      opacity="0.16"
    >
      {label}
    </text>
  );
}

/* ------------------------------------------------------------------ *
 * The documents
 * ------------------------------------------------------------------ */

interface Parts {
  shape: DocShape;
  focus: DocFocus;
  mark: DocMark;
  detail: boolean;
  w: number;
  h: number;
}

function Document({ shape, focus, mark, detail, w, h }: Parts) {
  switch (shape) {
    case "card":
      return <Card w={w} h={h} focus={focus} mark={mark} detail={detail} />;
    case "booklet":
      return <Booklet w={w} h={h} focus={focus} mark={mark} detail={detail} />;
    case "cheque":
      return <Cheque w={w} h={h} detail={detail} />;
    case "face":
      return <FacePhoto w={w} h={h} detail={detail} />;
    case "people":
      return <TwoPeople w={w} h={h} />;
    default:
      return <Paper w={w} h={h} focus={focus} detail={detail} />;
  }
}

/* ---------------- the pieces every document is made of ---------------- */

/** A grey bar where a line of writing goes. */
function Rule({ x, y, w, thick = 4 }: { x: number; y: number; w: number; thick?: number }) {
  return <rect x={x} y={y} width={w} height={thick} rx={thick / 2} fill="var(--line)" />;
}

/** The band the office actually reads. */
function Focus({ x, y, w, h }: { x: number; y: number; w: number; h: number }) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx="4" fill="var(--attention-tint)" />
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        rx="4"
        fill="none"
        stroke="var(--attention)"
        strokeWidth="2"
        strokeDasharray="5 4"
      />
    </g>
  );
}

/** A row of small blocks, standing in for a long printed number. */
function NumberRow({ x, y, groups = 3 }: { x: number; y: number; groups?: number }) {
  const blocks = [];
  for (let g = 0; g < groups; g++) {
    for (let i = 0; i < 4; i++) {
      blocks.push(<rect key={`${g}-${i}`} x={x + g * 34 + i * 7} y={y} width="5" height="9" rx="1" fill="var(--ink-soft)" />);
    }
  }
  return <g>{blocks}</g>;
}

/** The same blocks in one unbroken run — a PAN number, not an Aadhaar one. */
function BlockRun({ x, y, n }: { x: number; y: number; n: number }) {
  return (
    <g>
      {Array.from({ length: n }, (_, i) => (
        <rect key={i} x={x + i * 7} y={y} width="5" height="9" rx="1" fill="var(--ink-soft)" />
      ))}
    </g>
  );
}

function Sheet({ w, h, rx = 6 }: { w: number; h: number; rx?: number }) {
  return (
    <rect
      width={w}
      height={h}
      rx={rx}
      fill="var(--surface)"
      stroke="var(--ink-soft)"
      strokeWidth="2.5"
    />
  );
}

/**
 * The state emblem, as a shape rather than as itself.
 *
 * Every government paper in this list carries one, and its silhouette is
 * how a reader picks the official paper out of the folder from across the
 * table. Drawn as rings and a pillar — the position on the page is the
 * information; the emblem itself is not ours to reproduce.
 */
function Emblem({ cx, cy, r }: { cx: number; cy: number; r: number }) {
  return (
    <g stroke="var(--primary)" fill="none" strokeWidth="1.6">
      <circle cx={cx} cy={cy} r={r} />
      <circle cx={cx} cy={cy} r={r * 0.55} />
      <path d={`M${cx} ${cy - r * 0.55} V${cy + r * 0.55}`} strokeWidth="1.2" />
    </g>
  );
}

/** The photograph on a card: a head and a pair of shoulders in a box. */
function Portrait({ x, y, w, h }: { x: number; y: number; w: number; h: number }) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx="3" fill="var(--primary-tint)" stroke="var(--line)" strokeWidth="2" />
      <circle cx={x + w / 2} cy={y + h * 0.35} r={w * 0.23} fill="var(--line)" />
      <path
        d={`M${x + w * 0.14} ${y + h} a${w * 0.36} ${h * 0.3} 0 0 1 ${w * 0.72} 0 z`}
        fill="var(--line)"
      />
    </g>
  );
}

/** The square of dots in the corner of a modern card. */
function Qr({ x, y, size }: { x: number; y: number; size: number }) {
  const cell = size / 5;
  const on = [0, 1, 4, 5, 6, 9, 10, 12, 14, 16, 18, 20, 21, 24];
  return (
    <g>
      <rect x={x} y={y} width={size} height={size} rx="2" fill="var(--surface)" stroke="var(--line)" strokeWidth="1.6" />
      {on.map((i) => (
        <rect
          key={i}
          x={x + (i % 5) * cell + cell * 0.15}
          y={y + Math.floor(i / 5) * cell + cell * 0.15}
          width={cell * 0.7}
          height={cell * 0.7}
          fill="var(--ink-soft)"
        />
      ))}
    </g>
  );
}

/** The signature at the foot of anything official. */
function Signature({ x, y, w }: { x: number; y: number; w: number }) {
  return (
    <path
      d={`M${x} ${y} c${w * 0.2} -9 ${w * 0.35} 6 ${w * 0.55} -3 s${w * 0.3} 5 ${w * 0.45} -1`}
      fill="none"
      stroke="var(--ink)"
      strokeWidth="2"
      strokeLinecap="round"
    />
  );
}

/* ---------------- the cards ---------------- */

function Card({
  w,
  h,
  focus,
  mark,
  detail,
}: {
  w: number;
  h: number;
  focus: DocFocus;
  mark: DocMark;
  detail: boolean;
}) {
  /* PAN is laid out the other way up from every other card in the folder —
     the photograph is at the bottom, not the top — so once there is room to
     show that, it is the difference worth showing. */
  const pan = detail && mark === "pan";

  return (
    <g>
      <Sheet w={w} h={h} />
      {/* the coloured band every Indian ID card has across the top */}
      <path
        d={`M0 8 a8 8 0 0 1 8 -8 h${w - 16} a8 8 0 0 1 8 8 v16 h-${w} z`}
        fill="var(--primary-tint)"
      />

      {detail && mark !== "pan" && <Emblem cx={20} cy={12} r={8} />}
      <Rule x={detail && mark !== "pan" ? 36 : 14} y={9} w={detail && mark !== "pan" ? 62 : 78} thick={5} />
      {pan && <Rule x={14} y={17} w={54} thick={3} />}
      {detail && <circle cx={w - 20} cy={12} r="7" fill="none" stroke="var(--primary)" strokeWidth="1.6" />}

      {pan ? <PanFace w={w} h={h} /> : <IdFace w={w} h={h} focus={focus} mark={mark} detail={detail} />}
    </g>
  );
}

/** Aadhaar, UDID, and any card the catalogue gains later: photograph top left. */
function IdFace({
  w,
  h,
  focus,
  mark,
  detail,
}: {
  w: number;
  h: number;
  focus: DocFocus;
  mark: DocMark;
  detail: boolean;
}) {
  /* The square of dots and the percentage box both live on the right, so
     the name lines stop short of them once either is drawn. */
  const nameW = detail ? [68, 44, 56] : [92, 64, 78];

  return (
    <g>
      <Portrait x={14} y={38} w={44} h={54} />

      <Rule x={70} y={42} w={nameW[0]} />
      <Rule x={70} y={56} w={nameW[1]} />
      <Rule x={70} y={70} w={nameW[2]} />

      {detail && mark === "aadhaar" && <Qr x={w - 54} y={38} size={42} />}
      {detail && mark === "udid" && (
        <g>
          {/* the box with the percentage in it, which is the line the office
              reads on a disability card */}
          <rect
            x={w - 58}
            y={40}
            width={46}
            height={30}
            rx="3"
            fill="var(--surface)"
            stroke="var(--line-strong)"
            strokeWidth="1.6"
          />
          <BlockRun x={w - 50} y={50} n={3} />
        </g>
      )}

      {focus === "number" && <Focus x={10} y={h - 26} w={w - 20} h={20} />}
      <NumberRow x={20} y={h - 21} />
    </g>
  );
}

/** PAN: the photograph at the foot on the left, the signature beside it. */
function PanFace({ w, h }: { w: number; h: number }) {
  return (
    <g>
      <Rule x={66} y={34} w={96} thick={5} />
      <Rule x={66} y={48} w={72} />
      <Rule x={66} y={60} w={84} />

      {/* one unbroken run of ten, which is what a PAN number looks like and
          an Aadhaar number does not */}
      <Focus x={62} y={74} w={w - 74} h={20} />
      <BlockRun x={70} y={80} n={10} />

      <Portrait x={14} y={h - 58} w={40} h={48} />
      <Signature x={70} y={h - 12} w={72} />
    </g>
  );
}

/* ---------------- the booklets ---------------- */

function Booklet({
  w,
  h,
  focus,
  mark,
  detail,
}: {
  w: number;
  h: number;
  focus: DocFocus;
  mark: DocMark;
  detail: boolean;
}) {
  return (
    <g>
      {/* the page behind, so it reads as a bound book and not a sheet */}
      <rect x={6} y={4} width={w} height={h} rx="4" fill="var(--paper)" stroke="var(--line)" strokeWidth="2" />
      <Sheet w={w} h={h} rx={4} />
      {/* the stitched spine */}
      <path d={`M9 6 V${h - 6}`} stroke="var(--primary)" strokeWidth="3" strokeDasharray="6 5" strokeLinecap="round" />

      {detail && mark === "ration" ? (
        <RationInside w={w} h={h} focus={focus} />
      ) : (
        <PassbookInside w={w} h={h} focus={focus} detail={detail} />
      )}
    </g>
  );
}

function PassbookInside({
  w,
  h,
  focus,
  detail,
}: {
  w: number;
  h: number;
  focus: DocFocus;
  detail: boolean;
}) {
  return (
    <g>
      {/* The band is an opaque fill, so it is always drawn before the lines
          it is drawing attention to. */}
      {focus === "name" && <Focus x={14} y={12} w={w - 26} h={26} />}
      <Rule x={20} y={16} w={62} thick={5} />
      <Rule x={20} y={30} w={44} />
      {detail && (
        /* the bank's own mark, top right, which is how somebody finds the
           right passbook among the three in the tin */
        <rect x={w - 26} y={12} width={16} height={16} rx="3" fill="var(--primary-tint)" stroke="var(--primary)" strokeWidth="1.4" />
      )}

      {/* the account block, which is the whole reason for this photograph */}
      {focus === "account" && <Focus x={14} y={48} w={w - 26} h={40} />}
      <Rule x={20} y={54} w={30} />
      <NumberRow x={20} y={66} groups={2} />
      <Rule x={20} y={80} w={54} />

      {detail ? (
        /* the ruled entries down the rest of the page, with the money in a
           column of its own */
        <g>
          <path d={`M${w - 34} 96 V${h - 8}`} stroke="var(--line)" strokeWidth="1.4" />
          {[0, 1, 2, 3, 4].map((i) => (
            <g key={i}>
              <Rule x={20} y={100 + i * 9} w={38} thick={3} />
              <Rule x={w - 30} y={100 + i * 9} w={18} thick={3} />
            </g>
          ))}
        </g>
      ) : (
        <g>
          <Rule x={20} y={104} w={68} />
          <Rule x={20} y={116} w={52} />
        </g>
      )}
    </g>
  );
}

/** A ration card: a household, one line per person. */
function RationInside({ w, h, focus }: { w: number; h: number; focus: DocFocus }) {
  return (
    <g>
      {/* the letters in the corner that say BPL or APL — the one thing on
          this card the office is looking for */}
      <rect x={w - 40} y={10} width={30} height={16} rx="3" fill="var(--attention-tint)" stroke="var(--attention)" strokeWidth="1.6" />
      <Rule x={w - 35} y={16} w={20} thick={3} />

      {focus === "name" && <Focus x={14} y={12} w={w - 60} h={26} />}
      <Rule x={20} y={16} w={44} thick={5} />
      <Rule x={20} y={30} w={34} />

      {/* the household grid */}
      <rect
        x={16}
        y={48}
        width={w - 28}
        height={h - 70}
        rx="3"
        fill="none"
        stroke="var(--line-strong)"
        strokeWidth="1.4"
      />
      {[0, 1, 2, 3].map((i) => (
        <g key={i}>
          {i > 0 && (
            <path d={`M16 ${48 + i * 19} H${w - 12}`} stroke="var(--line)" strokeWidth="1.2" />
          )}
          <circle cx={26} cy={58 + i * 19} r="5" fill="var(--primary-tint)" stroke="var(--line)" strokeWidth="1.2" />
          <Rule x={36} y={55 + i * 19} w={40} thick={3} />
        </g>
      ))}
    </g>
  );
}

/* ---------------- the sheets ---------------- */

function Paper({ w, h, focus, detail }: { w: number; h: number; focus: DocFocus; detail: boolean }) {
  return (
    <g>
      <Sheet w={w} h={h} rx={3} />
      {detail && (
        /* the printed border a government form is set inside */
        <rect x={6} y={6} width={w - 12} height={h - 12} rx="2" fill="none" stroke="var(--line)" strokeWidth="1.2" />
      )}

      {/* the emblem and the heading a government form always carries */}
      {detail && <Emblem cx={w / 2} cy={19} r={8} />}
      <Rule x={22} y={detail ? 31 : 16} w={w - 44} thick={5} />
      <Rule x={32} y={detail ? 40 : 28} w={w - 64} />

      {(focus === "name" || focus === "number") && <Focus x={12} y={50} w={w - 24} h={26} />}
      <Rule x={20} y={56} w={w - 52} />
      {focus === "number" ? <NumberRow x={20} y={67} groups={2} /> : <Rule x={20} y={68} w={w - 68} />}

      <Rule x={20} y={86} w={w - 40} />
      <Rule x={20} y={96} w={w - 58} />
      {detail && (
        <g>
          <Rule x={20} y={106} w={w - 44} thick={3} />
          <Rule x={20} y={114} w={w - 62} thick={3} />
        </g>
      )}

      {/* the round stamp and the signature under it */}
      {focus === "seal" && <Focus x={12} y={h - 58} w={w - 24} h={48} />}
      <circle cx={w - 34} cy={h - 34} r="17" fill="none" stroke="var(--primary)" strokeWidth="2.5" />
      <circle cx={w - 34} cy={h - 34} r="11" fill="none" stroke="var(--primary)" strokeWidth="1.5" />
      {detail &&
        /* The ring of marks between the two circles that says "stamp"
           rather than "circle". A crosshair, which is what a cross in a
           ring reads as, says something else entirely. */
        [0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
          const a = (i * Math.PI) / 4;
          return (
            <circle
              key={i}
              cx={w - 34 + Math.cos(a) * 14}
              cy={h - 34 + Math.sin(a) * 14}
              r="1.4"
              fill="var(--primary)"
            />
          );
        })}
      <Signature x={20} y={h - 26} w={38} />
    </g>
  );
}

function Cheque({ w, h, detail }: { w: number; h: number; detail: boolean }) {
  return (
    <g>
      <Sheet w={w} h={h} rx={3} />
      <Rule x={16} y={14} w={70} thick={5} />
      {detail && (
        <g>
          {/* the bank's mark, the date boxes, and the two lines the amount
              is written along — the furniture that says "cheque" */}
          <rect x={w - 60} y={10} width={44} height={14} rx="2" fill="none" stroke="var(--line-strong)" strokeWidth="1.4" />
          <path d={`M${w - 49} 10 v14 M${w - 38} 10 v14`} stroke="var(--line)" strokeWidth="1.2" />
          <Rule x={16} y={26} w={40} thick={3} />
        </g>
      )}
      <Rule x={16} y={34} w={120} />
      <Rule x={16} y={48} w={96} />
      <rect x={w - 78} y={30} width={62} height={22} rx="3" fill="none" stroke="var(--line)" strokeWidth="2" />
      {detail && <Signature x={w - 84} y={h - 30} w={66} />}

      {/* the MICR band at the foot, which is what the bank actually reads */}
      <Focus x={10} y={h - 26} w={w - 20} h={19} />
      <NumberRow x={20} y={h - 21} groups={4} />

      {/* the line drawn through it, corner to corner, twice */}
      <path
        d={`M14 ${h - 14} L${w - 14} 14 M14 ${h - 26} L${w - 14} 2`}
        stroke="var(--attention)"
        strokeWidth="2.5"
        strokeLinecap="round"
        opacity="0.8"
      />
    </g>
  );
}

function FacePhoto({ w, h, detail }: { w: number; h: number; detail: boolean }) {
  return (
    <g>
      <Sheet w={w} h={h} rx={4} />
      <ellipse cx={w / 2} cy={h * 0.42} rx={w * 0.26} ry={h * 0.24} fill="var(--primary-tint)" />
      <path
        d={`M${w * 0.16} ${h - 8} a${w * 0.34} ${h * 0.3} 0 0 1 ${w * 0.68} 0 z`}
        fill="var(--primary-tint)"
      />
      <ellipse
        cx={w / 2}
        cy={h * 0.46}
        rx={w * 0.36}
        ry={h * 0.4}
        fill="none"
        stroke="var(--success)"
        strokeWidth="2.5"
        strokeDasharray="6 5"
      />
      {detail && (
        /* eye level, a third of the way down, which is the one thing people
           get wrong when they hold the phone at their chest */
        <path
          d={`M${w * 0.12} ${h * 0.38} H${w * 0.88}`}
          stroke="var(--success)"
          strokeWidth="1.4"
          strokeDasharray="3 4"
        />
      )}
    </g>
  );
}

function TwoPeople({ w, h }: { w: number; h: number }) {
  const person = (cx: number) => (
    <g key={cx}>
      <circle cx={cx} cy={h * 0.34} r={h * 0.15} fill="var(--primary-tint)" />
      <path
        d={`M${cx - h * 0.24} ${h - 12} a${h * 0.24} ${h * 0.28} 0 0 1 ${h * 0.48} 0 z`}
        fill="var(--primary-tint)"
      />
    </g>
  );
  return (
    <g>
      <Sheet w={w} h={h} rx={4} />
      {person(w * 0.34)}
      {person(w * 0.66)}
    </g>
  );
}
