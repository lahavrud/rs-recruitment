import type { ReactNode } from "react";

export default function Eyebrow({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <p className={`text-[10px] font-semibold uppercase tracking-widest text-copper${className ? ` ${className}` : ""}`}>
      {children}
    </p>
  );
}
