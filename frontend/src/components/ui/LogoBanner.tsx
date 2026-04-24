interface LogoBannerProps {
  className?: string;
  logoSize?: number;
  textSize?: string;
}

export default function LogoBanner({
  className = "",
  logoSize = 56,
  textSize = "text-4xl sm:text-5xl",
}: LogoBannerProps) {
  return (
    <div className={`flex items-center justify-center gap-5 ${className}`}>
      <img
        src="/logo.svg"
        alt=""
        width={logoSize}
        height={logoSize}
        className="shrink-0"
      />
      <span
        className={`font-display font-semibold tracking-tight text-white ${textSize}`}
      >
        RS Recruiting
      </span>
    </div>
  );
}
