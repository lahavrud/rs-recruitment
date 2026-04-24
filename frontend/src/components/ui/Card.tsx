import type { ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  className?: string;
  padding?: "sm" | "md" | "lg";
  hover?: boolean;
}

const paddingCls = {
  sm: "p-4",
  md: "p-5",
  lg: "p-6 sm:p-8",
};

export default function Card({
  children,
  className = "",
  padding = "md",
  hover = false,
}: CardProps) {
  return (
    <div
      className={`rounded-lg border border-line bg-surface shadow-sm ${paddingCls[padding]} ${
        hover ? "transition hover:border-copper/40 hover:shadow-md" : ""
      } ${className}`}
    >
      {children}
    </div>
  );
}
