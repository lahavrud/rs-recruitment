import type { ReactNode } from "react";

type Size = "sm" | "md";

const sizeCls: Record<Size, string> = {
  sm: "text-[10px]",
  md: "text-[11px]",
};

/**
 * Small copper caps label. `sm` (10px) for page headers/eyebrows above a
 * gold rule; `md` (11px) for in-card filter and form section labels.
 */
export default function Eyebrow({
  children,
  size = "sm",
  className,
}: {
  children: ReactNode;
  size?: Size;
  className?: string;
}) {
  return (
    <p
      className={`${sizeCls[size]} font-semibold uppercase tracking-widest text-copper${className ? ` ${className}` : ""}`}
    >
      {children}
    </p>
  );
}
