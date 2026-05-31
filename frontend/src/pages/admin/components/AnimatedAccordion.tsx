import { useState } from "react";

/**
 * Animated accordion (controlled). Used for the description/requirements
 * sections in the detail view and the form sections inside dialogs.
 *
 * The expand/collapse animates via the `grid-template-rows: 0fr → 1fr` trick
 * so the height transitions smoothly without measuring the content.
 */
export default function AnimatedAccordion({
  title,
  children,
  defaultOpen = false,
  variant = "card",
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  /** "card": copper-bordered surface for detail sections.
   *  "form": divider-only for stacking inside form dialogs. */
  variant?: "card" | "form";
}) {
  const [open, setOpen] = useState(defaultOpen);
  const wrapperCls =
    variant === "card"
      ? "rounded-md border border-white/8 bg-card/40"
      : "border-b border-white/8 pb-3 last:border-b-0";
  const summaryCls =
    variant === "card"
      ? "px-3 py-2.5"
      : "py-2.5";
  const innerCls =
    variant === "card"
      ? "px-3 pb-3 text-sm"
      : "pt-2";
  return (
    <div className={wrapperCls}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className={`flex w-full cursor-pointer items-center justify-between gap-3 text-start text-[10px] font-semibold uppercase tracking-widest text-copper ${summaryCls}`}
      >
        <span>{title}</span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 16 16"
          fill="currentColor"
          className={`size-3.5 text-white/40 transition-transform duration-300 ease-out ${open ? "rotate-180" : ""}`}
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M4.22 5.72a.75.75 0 0 1 1.06 0L8 8.44l2.72-2.72a.75.75 0 1 1 1.06 1.06l-3.25 3.25a.75.75 0 0 1-1.06 0L4.22 6.78a.75.75 0 0 1 0-1.06Z"
            clipRule="evenodd"
          />
        </svg>
      </button>
      <div
        className={`grid transition-[grid-template-rows] duration-300 ease-out ${
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <div className="overflow-hidden">
          <div
            className={`${innerCls} transition-opacity duration-200 ${
              open ? "opacity-100 delay-100" : "opacity-0"
            }`}
          >
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

export function CollapsibleSection(props: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  return <AnimatedAccordion {...props} variant="card" />;
}

export function FormSection(props: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  return <AnimatedAccordion {...props} variant="form" />;
}
