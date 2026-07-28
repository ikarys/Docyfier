/**
 * The mark: a raw draft card behind, the formatted document in front. Drawn for
 * the size it is actually used at — beside the wordmark in a header — so the
 * concept art's stat cards and callout are dropped; at 20px they read as noise.
 * The front card carries a hairline because it is nearly the colour of the paper
 * it sits on. Inline rather than an `<img>`: no request, and it scales in `em`.
 */
export function BrandLogo() {
  return (
    <svg
      className="brand-logo"
      viewBox="3 5 30 30"
      role="img"
      aria-label="Docyfier"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect
        x="-8"
        y="-12"
        width="16"
        height="24"
        rx="3"
        fill="#9aa0aa"
        transform="translate(14,20) rotate(-8)"
      />
      <rect
        x="12"
        y="6"
        width="20"
        height="28"
        rx="3.5"
        fill="#eef3f8"
        stroke="#b9c4d0"
        strokeWidth="1"
      />
      <path d="M26 6 L32 6 L32 12 Z" fill="#c17a54" />
      <rect x="16" y="11" width="9" height="2" rx="1" fill="#7c8896" />
      <rect x="16" y="23" width="3.5" height="7" rx="1" fill="#4fd1c5" />
      <rect x="22" y="19" width="3.5" height="11" rx="1" fill="#f6ad55" />
      <rect x="27.5" y="25" width="3.5" height="5" rx="1" fill="#8b7cf6" />
    </svg>
  );
}
