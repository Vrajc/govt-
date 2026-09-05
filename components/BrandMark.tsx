/**
 * The mark.
 *
 * A rounded square in the action blue with one check cut out of it. It is
 * the smallest thing that can say "confirmed, present" — which is the
 * entire product — and it survives being 20px in a footer.
 *
 * What it deliberately is not: an emblem, a lion, a chakra, a tricolour, a
 * seal. The brief bans the identity of the Government of India and this
 * mark has to be legible as NOT that, at a glance, to someone who cannot
 * read the disclaimer under it.
 */
export function BrandMark({ size = 42 }: { size?: number }) {
  return (
    <svg viewBox="0 0 44 44" width={size} height={size} aria-hidden="true" style={{ flex: "0 0 auto", display: "block" }}>
      <rect x="1.6" y="1.6" width="40.8" height="40.8" rx="12" fill="var(--primary)" />
      <path
        d="M12.5 23.4 l6.4 6.4 L31.5 14.6"
        fill="none"
        stroke="var(--paper)"
        strokeWidth="3.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
