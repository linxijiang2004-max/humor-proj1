// The logo mark. Inline so the strokes follow the --accent / --muted tokens.
// Decorative: the wordmark next to it carries the name.
export function BitMark({ size = 26 }: { size?: number }) {
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden="true">
      <path
        d="M16 29 L32 13 L48 29"
        fill="none"
        stroke="var(--accent)"
        strokeWidth="9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M16 35 L32 51 L48 35"
        fill="none"
        stroke="var(--muted)"
        strokeWidth="9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
