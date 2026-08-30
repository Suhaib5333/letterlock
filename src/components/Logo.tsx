export function Logo({ size = 40 }: { size?: number }) {
  return (
    <span className="ll-logo" aria-hidden="true">
      <svg width={size} height={size} viewBox="0 0 48 54" fill="none">
        <defs>
          <linearGradient id="logoGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#d6c2ff" />
            <stop offset="45%" stopColor="#a78bfa" />
            <stop offset="100%" stopColor="#7c5aff" />
          </linearGradient>
        </defs>
        <path
          d="M24 1.5l19.5 11.25v22.5L24 46.5 4.5 35.25v-22.5z"
          fill="url(#logoGrad)"
          stroke="#fff"
          strokeOpacity="0.35"
          strokeWidth="1.5"
        />
        {/* L nudged up-right of the geometric centre so its visual mass
            (stem bottom-left heavy) reads centred in the hex */}
        <path d="M19 15h4.5v15.5H33V35.5H19z" fill="#fff" />
      </svg>
    </span>
  );
}

export function Wordmark() {
  return (
    <span className="ll-wordmark">
      Letter<span className="lock">lock</span>
      <span className="lock-emoji" aria-hidden="true">
        🔒
      </span>
    </span>
  );
}
