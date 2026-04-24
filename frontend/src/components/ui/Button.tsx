import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "danger" | "ghost" | "success";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  children: ReactNode;
}

const variantCls: Record<Variant, string> = {
  primary:
    "bg-copper text-white transition hover:brightness-110 focus:ring-2 focus:ring-copper/40 focus:ring-offset-2 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed",
  secondary:
    "border border-line-2 text-ink-2 hover:bg-canvas disabled:opacity-50",
  danger:
    "border border-danger/30 text-danger hover:bg-danger/10 disabled:opacity-50",
  ghost:
    "text-ink-2 hover:bg-subtle disabled:opacity-50",
  success:
    "bg-success text-white hover:bg-success/90 disabled:opacity-50",
};

const sizeCls: Record<Size, string> = {
  sm: "px-3 py-1.5 text-sm",
  md: "px-4 py-2 text-sm",
  lg: "px-6 py-3 text-sm",
};

export default function Button({
  variant = "primary",
  size = "md",
  className = "",
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center rounded-md font-medium transition ${variantCls[variant]} ${sizeCls[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
