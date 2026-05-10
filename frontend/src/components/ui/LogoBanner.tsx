interface LogoBannerProps {
  className?: string;
}

export default function LogoBanner({ className = "" }: LogoBannerProps) {
  return (
    <div
      className={`flex flex-col items-center gap-4 sm:flex-row sm:gap-0 ${className}`}
    >
      <img
        src="/logo.svg"
        alt=""
        className="h-16 w-16 shrink-0 sm:h-24 sm:w-24"
      />

      {/* Vertical rule — desktop only */}
      <div className="hidden h-16 w-px bg-white/20 sm:mx-8 sm:block" />

      <span className="font-display text-4xl font-medium tracking-wide text-copper sm:text-6xl lg:text-7xl">
        RS Recruiting
      </span>
    </div>
  );
}
