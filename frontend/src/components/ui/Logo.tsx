interface LogoProps {
  className?: string;
  size?: number;
}

export default function Logo({ className = "", size = 36 }: LogoProps) {
  return (
    <img
      src="/logo.svg"
      alt="RS Recruiting"
      width={size}
      height={size}
      className={`inline-block shrink-0 ${className}`}
    />
  );
}
