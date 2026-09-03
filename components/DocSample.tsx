import { lookFor, type DocFocus, type DocShape } from "@/lib/services/docShapes";

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
 */

const VB_W = 260;
const VB_H = 176;

/** How big each shape is drawn, inside the frame. */
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
}: {
  docId: string;
  className?: string;
}) {
  const look = lookFor(docId);
  const { w, h } = SIZES[look.shape];
  const x = (VB_W - w) / 2;
  const y = (VB_H - h) / 2;

  return (
    <svg
      viewBox={`0 0 ${VB_W} ${VB_H}`}
      className={className}
      /* The sentences next to this drawing say the same thing in words, so
         to a screen reader it is decoration and repeating it is noise. */
      aria-hidden="true"
      focusable="false"
    >
      <CameraFrame />
      <g transform={`translate(${x} ${y})`}>
        <Document shape={look.shape} focus={look.focus} w={w} h={h} />
      </g>
      {look.twoSided && <BackHint />}
    </svg>
  );
}

/* ------------------------------------------------------------------ *
 * The camera
 * ------------------------------------------------------------------ */

/** Four corner brackets. The document should very nearly reach them. */
function CameraFrame() {
  const m = 6;
  const len = 22;
  const corners = [
    `M${m} ${m + len} L${m} ${m} L${m + len} ${m}`,
    `M${VB_W - m - len} ${m} L${VB_W - m} ${m} L${VB_W - m} ${m + len}`,
    `M${VB_W - m} ${VB_H - m - len} L${VB_W - m} ${VB_H - m} L${VB_W - m - len} ${VB_H - m}`,
    `M${m + len} ${VB_H - m} L${m} ${VB_H - m} L${m} ${VB_H - m - len}`,
  ];
  return (
    <g stroke="var(--line)" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round">
      {corners.map((d) => (
        <path key={d} d={d} />
      ))}
    </g>
  );
}

/** A second card, peeking out behind, for the documents that need both sides. */
function BackHint() {
  return (
    <g opacity="0.45">
      <rect
        x={VB_W - 52}
        y={VB_H - 44}
        width="40"
        height="26"
        rx="4"
        fill="var(--surface)"
        stroke="var(--ink-soft)"
        strokeWidth="2"
      />
      <path
        d={`M${VB_W - 46} ${VB_H - 34} h16 M${VB_W - 46} ${VB_H - 28} h10`}
        stroke="var(--ink-soft)"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </g>
  );
}

/* ------------------------------------------------------------------ *
 * The documents
 * ------------------------------------------------------------------ */

interface Parts {
  shape: DocShape;
  focus: DocFocus;
  w: number;
  h: number;
}

function Document({ shape, focus, w, h }: Parts) {
  switch (shape) {
    case "card":
      return <Card w={w} h={h} focus={focus} />;
    case "booklet":
      return <Booklet w={w} h={h} focus={focus} />;
    case "cheque":
      return <Cheque w={w} h={h} />;
    case "face":
      return <FacePhoto w={w} h={h} />;
    case "people":
      return <TwoPeople w={w} h={h} />;
    default:
      return <Paper w={w} h={h} focus={focus} />;
  }
}

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

function Card({ w, h, focus }: { w: number; h: number; focus: DocFocus }) {
  return (
    <g>
      <Sheet w={w} h={h} />
      {/* the coloured band every Indian ID card has across the top */}
      <path
        d={`M0 8 a8 8 0 0 1 8 -8 h${w - 16} a8 8 0 0 1 8 8 v16 h-${w} z`}
        fill="var(--primary-tint)"
      />
      <Rule x={14} y={9} w={78} thick={5} />

      {/* photograph */}
      <rect x={14} y={38} width={44} height={54} rx="3" fill="var(--primary-tint)" stroke="var(--line)" strokeWidth="2" />
      <circle cx={36} cy={57} r="10" fill="var(--line)" />
      <path d={`M20 92 a16 16 0 0 1 32 0 z`} fill="var(--line)" />

      {/* name and details */}
      <Rule x={70} y={42} w={92} />
      <Rule x={70} y={56} w={64} />
      <Rule x={70} y={70} w={78} />

      {focus === "number" && <Focus x={10} y={h - 26} w={w - 20} h={20} />}
      <NumberRow x={20} y={h - 21} />
    </g>
  );
}

function Booklet({ w, h, focus }: { w: number; h: number; focus: DocFocus }) {
  return (
    <g>
      {/* the page behind, so it reads as a bound book and not a sheet */}
      <rect x={6} y={4} width={w} height={h} rx="4" fill="var(--paper)" stroke="var(--line)" strokeWidth="2" />
      <Sheet w={w} h={h} rx={4} />
      {/* the stitched spine */}
      <path d={`M9 6 V${h - 6}`} stroke="var(--primary)" strokeWidth="3" strokeDasharray="6 5" strokeLinecap="round" />

      {/* The band is an opaque fill, so it is always drawn before the lines
          it is drawing attention to. */}
      {focus === "name" && <Focus x={14} y={12} w={w - 26} h={26} />}
      <Rule x={20} y={16} w={62} thick={5} />
      <Rule x={20} y={30} w={44} />

      {/* the account block, which is the whole reason for this photograph */}
      {focus === "account" && <Focus x={14} y={48} w={w - 26} h={40} />}
      <Rule x={20} y={54} w={30} />
      <NumberRow x={20} y={66} groups={2} />
      <Rule x={20} y={80} w={54} />

      <Rule x={20} y={104} w={68} />
      <Rule x={20} y={116} w={52} />
    </g>
  );
}

function Paper({ w, h, focus }: { w: number; h: number; focus: DocFocus }) {
  return (
    <g>
      <Sheet w={w} h={h} rx={3} />

      {/* the heading a government form always carries */}
      <Rule x={22} y={16} w={w - 44} thick={5} />
      <Rule x={32} y={28} w={w - 64} />

      {focus === "name" && <Focus x={12} y={44} w={w - 24} h={26} />}
      <Rule x={20} y={50} w={w - 52} />
      <Rule x={20} y={62} w={w - 68} />

      {focus === "number" && <Focus x={12} y={44} w={w - 24} h={26} />}
      {focus === "number" && <NumberRow x={20} y={51} groups={2} />}

      <Rule x={20} y={82} w={w - 40} />
      <Rule x={20} y={94} w={w - 58} />

      {/* the round stamp and the signature under it */}
      {focus === "seal" && <Focus x={12} y={h - 58} w={w - 24} h={48} />}
      <circle cx={w - 34} cy={h - 34} r="17" fill="none" stroke="var(--primary)" strokeWidth="2.5" />
      <circle cx={w - 34} cy={h - 34} r="11" fill="none" stroke="var(--primary)" strokeWidth="1.5" />
      <path
        d={`M20 ${h - 26} c8 -10 14 6 22 -3`}
        fill="none"
        stroke="var(--ink)"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </g>
  );
}

function Cheque({ w, h }: { w: number; h: number }) {
  return (
    <g>
      <Sheet w={w} h={h} rx={3} />
      <Rule x={16} y={14} w={70} thick={5} />
      <Rule x={16} y={34} w={120} />
      <Rule x={16} y={48} w={96} />
      <rect x={w - 78} y={30} width={62} height={22} rx="3" fill="none" stroke="var(--line)" strokeWidth="2" />

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

function FacePhoto({ w, h }: { w: number; h: number }) {
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
