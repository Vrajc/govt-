/**
 * Hand-written inline SVG. No icon library — the whole point of the
 * performance budget is that nothing arrives that a pensioner did not need.
 *
 * Every icon is decorative: it always sits next to a word, never alone, so
 * they are all aria-hidden and carry no title.
 */
type P = { size?: number; className?: string };

const base = (size: number) => ({
  width: size,
  height: size,
  viewBox: "0 0 24 24",
  fill: "none" as const,
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
  focusable: false as const,
});

export const ArrowLeft = ({ size = 22, className }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M19 12H5" />
    <path d="m12 19-7-7 7-7" />
  </svg>
);

export const ArrowRight = ({ size = 22, className }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M5 12h14" />
    <path d="m12 5 7 7-7 7" />
  </svg>
);

export const Speaker = ({ size = 22, className }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M11 5 6 9H3v6h3l5 4z" />
    <path d="M15.5 8.5a5 5 0 0 1 0 7" />
    <path d="M18.5 5.5a9 9 0 0 1 0 13" />
  </svg>
);

export const StopSquare = ({ size = 22, className }: P) => (
  <svg {...base(size)} className={className}>
    <rect x="5" y="5" width="14" height="14" rx="2" fill="currentColor" />
  </svg>
);

export const Check = ({ size = 22, className }: P) => (
  <svg {...base(size)} className={className}>
    <path d="m4 12.5 5.5 5.5L20 7" />
  </svg>
);

export const Alert = ({ size = 22, className }: P) => (
  <svg {...base(size)} className={className}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7.5v5.5" />
    <path d="M12 16.5h.01" />
  </svg>
);

export const Info = ({ size = 22, className }: P) => (
  <svg {...base(size)} className={className}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 11v5.5" />
    <path d="M12 7.5h.01" />
  </svg>
);

export const Person = ({ size = 22, className }: P) => (
  <svg {...base(size)} className={className}>
    <circle cx="12" cy="8" r="4" />
    <path d="M4.5 20a7.5 7.5 0 0 1 15 0" />
  </svg>
);

export const People = ({ size = 22, className }: P) => (
  <svg {...base(size)} className={className}>
    <circle cx="9" cy="8" r="3.5" />
    <path d="M2.5 20a6.5 6.5 0 0 1 13 0" />
    <path d="M16 5.2a3.5 3.5 0 0 1 0 6.6" />
    <path d="M18 14.4A6.5 6.5 0 0 1 21.5 20" />
  </svg>
);

export const Camera = ({ size = 22, className }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M3 8.5A1.5 1.5 0 0 1 4.5 7h2.2l1.4-2h7.8l1.4 2h2.2A1.5 1.5 0 0 1 21 8.5v9A1.5 1.5 0 0 1 19.5 19h-15A1.5 1.5 0 0 1 3 17.5z" />
    <circle cx="12" cy="13" r="3.6" />
  </svg>
);

export const Upload = ({ size = 22, className }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M12 16V4" />
    <path d="m7 9 5-5 5 5" />
    <path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" />
  </svg>
);

export const Refresh = ({ size = 22, className }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M20 12a8 8 0 1 1-2.6-5.9" />
    <path d="M20 4v4h-4" />
  </svg>
);

export const Send = ({ size = 22, className }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M21 3 10.5 13.5" />
    <path d="M21 3l-6.8 18-3.7-7.5L3 9.8z" />
  </svg>
);

export const Save = ({ size = 22, className }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M12 3v11" />
    <path d="m7.5 10 4.5 4.5 4.5-4.5" />
    <path d="M4 16.5v2A1.5 1.5 0 0 0 5.5 20h13a1.5 1.5 0 0 0 1.5-1.5v-2" />
  </svg>
);

export const Phone = ({ size = 22, className }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M6.5 3h3l1.5 4-2 1.5a12 12 0 0 0 5.5 5.5L16 12l4 1.5v3a2 2 0 0 1-2.2 2A16.5 16.5 0 0 1 4 6.2 2 2 0 0 1 6.5 3z" />
  </svg>
);

export const MapPin = ({ size = 22, className }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11z" />
    <circle cx="12" cy="10" r="2.6" />
  </svg>
);

export const Book = ({ size = 22, className }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H11v16H5.5A1.5 1.5 0 0 1 4 18.5z" />
    <path d="M20 5.5A1.5 1.5 0 0 0 18.5 4H13v16h5.5a1.5 1.5 0 0 0 1.5-1.5z" />
  </svg>
);

export const Bell = ({ size = 22, className }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M6 9a6 6 0 1 1 12 0c0 4 1.5 5.5 1.5 5.5h-15S6 13 6 9z" />
    <path d="M10 18a2 2 0 0 0 4 0" />
  </svg>
);

export const Message = ({ size = 22, className }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M4 5.5h16v11H9.5L5.5 20v-3.5H4z" />
  </svg>
);

export const Sliders = ({ size = 22, className }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M4 8h11" />
    <path d="M19 8h1" />
    <circle cx="17" cy="8" r="2" />
    <path d="M4 16h5" />
    <path d="M13 16h7" />
    <circle cx="11" cy="16" r="2" />
  </svg>
);

/** The three checklist drawings on /photo. Larger, quieter line work. */
export const ArtWindow = ({ size = 56 }: { size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 56 56"
    fill="none"
    stroke="var(--primary)"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden
    focusable="false"
  >
    <rect x="5" y="8" width="22" height="26" rx="2" />
    <path d="M16 8v26M5 21h22" />
    <path d="M30 18h4M30 24h6M30 12h6" strokeOpacity="0.5" />
    <circle cx="43" cy="22" r="6" />
    <path d="M37 44a6 6 0 0 1 12 0" />
  </svg>
);

export const ArtGlasses = ({ size = 56 }: { size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 56 56"
    fill="none"
    stroke="var(--primary)"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden
    focusable="false"
  >
    <circle cx="16" cy="28" r="7" />
    <circle cx="40" cy="28" r="7" />
    <path d="M23 28h10" />
    <path d="M9 25 5 21M47 25l4-4" />
    <path d="m10 42 36-28" stroke="var(--attention)" />
  </svg>
);

export const ArtEyeLevel = ({ size = 56 }: { size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 56 56"
    fill="none"
    stroke="var(--primary)"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden
    focusable="false"
  >
    <circle cx="17" cy="18" r="6" />
    <path d="M8 38a9 9 0 0 1 18 0" />
    <rect x="34" y="12" width="16" height="28" rx="3" />
    <path d="M40 17h4" />
    <path d="M26 22h8" strokeDasharray="3 3" />
  </svg>
);

export const Chevron = ({ size = 22, className }: P) => (
  <svg {...base(size)} className={className}>
    <path d="m9 5 7 7-7 7" />
  </svg>
);

export const Clock = ({ size = 22, className }: P) => (
  <svg {...base(size)} className={className}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5.2l3.2 2" />
  </svg>
);

export const Printer = ({ size = 22, className }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M7 8V3h10v5" />
    <path d="M5 8h14a2 2 0 0 1 2 2v6h-4v5H7v-5H3v-6a2 2 0 0 1 2-2z" />
  </svg>
);
