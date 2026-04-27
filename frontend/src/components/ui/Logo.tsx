import { useState } from "react";

interface LogoProps {
  className?: string;
  size?: number;
}

export default function Logo({ className = "", size = 36 }: LogoProps) {
  const [loaded, setLoaded] = useState(false);

  return (
    <img
      src="/logo.svg"
      alt="RS Recruiting"
      width={size}
      height={size}
      onLoad={() => setLoaded(true)}
      onError={() => setLoaded(true)}
      style={{ width: size, height: size, opacity: loaded ? 1 : 0, transition: "opacity 0.25s ease" }}
      className={`inline-block shrink-0 ${className}`}
    />
  );
}
