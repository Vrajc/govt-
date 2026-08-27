/**
 * The two larger pieces of drawing in the app, kept out of Icons.tsx because
 * neither is an icon: one is an overlay on live video, the other is the ink
 * stamp on the receipt.
 */

/**
 * The oval face guide. Everything outside the oval is dimmed so it reads as
 * a window to stand in, not a decorative ring to ignore. The stroke colour
 * tracks the live coaching verdict, which is the only moving part on the
 * capture screen.
 */
export function FaceOval({ tone = "neutral" }: { tone?: "neutral" | "good" | "warn" }) {
  const stroke =
    tone === "good" ? "#7ED4AC" : tone === "warn" ? "#F0B49B" : "rgba(255,255,255,0.85)";

  return (
    <svg
      className="cam-oval"
      viewBox="0 0 300 400"
      preserveAspectRatio="none"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <mask id="ps-oval-mask">
          <rect width="300" height="400" fill="white" />
          <ellipse cx="150" cy="185" rx="98" ry="130" fill="black" />
        </mask>
      </defs>
      <rect width="300" height="400" fill="rgba(20,17,15,0.45)" mask="url(#ps-oval-mask)" />
      <ellipse
        cx="150"
        cy="185"
        rx="98"
        ry="130"
        fill="none"
        stroke={stroke}
        strokeWidth="4"
        strokeDasharray="14 12"
      />
    </svg>
  );
}

/**
 * The stamp. This is the one place the design is allowed to be loud — it is
 * what a pensioner will actually show their son, so it should look like
 * something a clerk pressed onto a passbook.
 */
export function InkStamp({
  top,
  middle,
  bottom,
  size = 122,
}: {
  top: string;
  middle: string;
  bottom: string;
  size?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 140 140"
      className="receipt-stamp"
      role="img"
      aria-label={`${top}. ${middle}.`}
    >
      <defs>
        <path id="ps-stamp-top" d="M70,70 m-52,0 a52,52 0 1,1 104,0" fill="none" />
        <path id="ps-stamp-bottom" d="M70,70 m-45,0 a45,45 0 1,0 90,0" fill="none" />
      </defs>

      <g stroke="#17694A" fill="none" opacity="0.85">
        <circle cx="70" cy="70" r="60" strokeWidth="3" />
        <circle cx="70" cy="70" r="52" strokeWidth="1.4" />
      </g>

      <g fill="#17694A" opacity="0.9">
        <text fontSize="12" fontWeight="700" letterSpacing="2.4">
          <textPath href="#ps-stamp-top" startOffset="50%" textAnchor="middle">
            {top}
          </textPath>
        </text>
        <text fontSize="9.5" fontWeight="600" letterSpacing="1.6">
          <textPath href="#ps-stamp-bottom" startOffset="50%" textAnchor="middle">
            {bottom}
          </textPath>
        </text>
        <text x="70" y="67" textAnchor="middle" fontSize="10.5" fontWeight="700">
          {middle}
        </text>
      </g>

      <path d="M50 76h40" stroke="#17694A" strokeWidth="2" opacity="0.7" fill="none" />
    </svg>
  );
}
