/**
 * The one illustration in the app.
 *
 * Hand-drawn inline SVG, like every other mark here — no image files, no
 * stock photography of smiling strangers, nothing that would need a CDN or
 * a licence. It draws the two objects this whole product sits between: the
 * pension passbook a family already keeps in a tin, and the phone that now
 * does the trip to the bank.
 *
 * Entries are drawn as bars rather than numbers on purpose. A specific
 * rupee figure in a decorative drawing would read as a promise.
 *
 * Decorative: the sentences beside it say everything it says, so it is
 * hidden from screen readers rather than given a label nobody needs.
 */
export function PassbookArt() {
  return (
    <svg
      viewBox="0 0 340 280"
      className="lp-art"
      role="presentation"
      aria-hidden="true"
      focusable="false"
    >
      {/* the page behind, so it reads as a booklet and not a card */}
      <g transform="rotate(-4 150 140)">
        <rect
          x="26"
          y="26"
          width="230"
          height="196"
          rx="6"
          fill="var(--surface)"
          stroke="var(--line)"
          strokeWidth="2"
          opacity="0.7"
        />
      </g>

      <g transform="rotate(2 150 140)">
        <rect
          x="16"
          y="18"
          width="230"
          height="196"
          rx="6"
          fill="var(--surface)"
          stroke="var(--line)"
          strokeWidth="2"
        />

        {/* the header band, where a passbook carries the name and number */}
        <rect x="16" y="18" width="230" height="46" rx="6" fill="var(--primary-tint)" />
        <rect x="16" y="58" width="230" height="6" fill="var(--primary-tint)" />
        <rect x="32" y="32" width="104" height="9" rx="4.5" fill="var(--primary-dark)" />
        <rect x="32" y="46" width="62" height="6" rx="3" fill="var(--primary)" opacity="0.5" />

        {/* ruled entries: a date bar on the left, an amount bar on the right */}
        {[0, 1, 2, 3, 4].map((i) => {
          const y = 84 + i * 26;
          return (
            <g key={i}>
              <line x1="32" y1={y + 12} x2="230" y2={y + 12} stroke="var(--line)" strokeWidth="1.5" />
              <rect x="32" y={y} width={i === 4 ? 40 : 58} height="7" rx="3.5" fill="var(--ink-soft)" opacity="0.32" />
              <rect
                x={i === 4 ? 168 : 158}
                y={y}
                width={i === 4 ? 62 : 72}
                height="7"
                rx="3.5"
                fill="var(--success)"
                opacity={i === 4 ? 0.75 : 0.45}
              />
            </g>
          );
        })}
      </g>

      {/* the stamp a clerk presses when the year is settled */}
      <g transform="rotate(-13 214 84)" opacity="0.85">
        <circle cx="214" cy="84" r="40" fill="none" stroke="var(--success)" strokeWidth="3" />
        <circle cx="214" cy="84" r="33" fill="none" stroke="var(--success)" strokeWidth="1.4" />
        <path d="M186 84h56" stroke="var(--success)" strokeWidth="1.4" opacity="0.6" />
        <path
          d="m200 84 9 9 19-19"
          fill="none"
          stroke="var(--success)"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>

      {/* the phone that replaced the trip to the branch */}
      <g transform="rotate(6 268 196)">
        <rect
          x="236"
          y="140"
          width="86"
          height="132"
          rx="14"
          fill="var(--surface)"
          stroke="var(--ink)"
          strokeWidth="2.5"
        />
        <rect x="258" y="149" width="42" height="5" rx="2.5" fill="var(--ink)" opacity="0.25" />
        <circle cx="279" cy="196" r="21" fill="var(--success-tint)" stroke="var(--success)" strokeWidth="2.5" />
        <path
          d="m270 196 6.5 6.5L289 190"
          fill="none"
          stroke="var(--success)"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <rect x="252" y="230" width="54" height="6" rx="3" fill="var(--ink-soft)" opacity="0.3" />
        <rect x="262" y="243" width="34" height="6" rx="3" fill="var(--ink-soft)" opacity="0.2" />
      </g>
    </svg>
  );
}
