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
        className="h-12 w-12 shrink-0 sm:h-16 sm:w-16"
      />

      {/* Vertical rule — desktop only */}
      <div className="hidden h-10 w-px bg-white/20 sm:mx-6 sm:block" />

      <span className="font-display text-2xl font-medium tracking-wide text-white sm:text-4xl lg:text-5xl">
        RS Recruiting
      </span>
    </div>
  );
}
