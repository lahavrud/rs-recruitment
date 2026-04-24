interface LogoProps {
  className?: string;
  size?: number;
}

export default function Logo({ className = "", size = 36 }: LogoProps) {
  return (
    <span className={`inline-flex ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 36 36"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0"
      >
        {/* R */}
        <path
          d="M 6 4 L 6 31 M 6 4 L 15 4 L 18 8 L 15 12 L 6 12 M 6 19 L 18 31"
          stroke="#B87333"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* R highlight facet */}
        <path
          d="M 6 4 L 15 4 L 12 8 L 6 8"
          stroke="#C9A84C"
          strokeWidth="1"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.6"
        />
        {/* S */}
        <path
          d="M 21 4 L 32 4 L 32 12 L 21 16 L 21 20 L 32 24 L 32 31 L 21 31"
          stroke="#727472"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* S highlight facet */}
        <path
          d="M 21 4 L 32 4 L 28 8 L 21 8"
          stroke="#B87333"
          strokeWidth="1"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.5"
        />
      </svg>
    </span>
  );
}
