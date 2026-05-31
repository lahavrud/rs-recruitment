import type { ButtonHTMLAttributes } from "react";

type Size = "sm" | "md";

interface KebabButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  size?: Size;
}

const sizeCls: Record<Size, string> = {
  sm: "h-8 w-8",
  md: "size-9",
};

/**
 * 3-dot trigger for `DropdownMenu`. Pass `onClick={(e) => e.stopPropagation()}`
 * when the parent row also handles clicks.
 */
export default function KebabButton({
  size = "md",
  className = "",
  ...props
}: KebabButtonProps) {
  return (
    <button
      type="button"
      className={`inline-flex items-center justify-center rounded-full text-white/45 transition hover:bg-white/8 hover:text-white/85 ${sizeCls[size]} ${className}`}
      {...props}
    >
      <span aria-hidden>⋮</span>
    </button>
  );
}
