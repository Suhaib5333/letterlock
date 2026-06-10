export function Logo({ size = 40 }: { size?: number }) {
  return (
    <span className="ll-logo" aria-hidden="true">
      <svg width={size} height={size} viewBox="0 0 48 54" fill="none">
        <defs>
          <linearGradient id="logoGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#3aa0ff" />
            <stop offset="100%" stopColor="#ff9f0a" />
          </linearGradient>
        </defs>
        <path
          d="M24 1.5l19.5 11.25v22.5L24 46.5 4.5 35.25v-22.5z"
          fill="url(#logoGrad)"
          stroke="#fff"
          strokeOpacity="0.35"
          strokeWidth="1.5"
        />
        {/* centered L (bbox 17–31 × 17–37 → centre 24,27 = hex centre) */}
        <path d="M17 17h4.5v15.5H31V37H17z" fill="#fff" />
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
