import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

interface AdminFieldProps {
  label: string;
  /** Passed as data-field for focusFirstError to locate the element. */
  name?: string;
  /** Spans two columns in sm:grid-cols-2 layouts. */
  full?: boolean;
  required?: boolean;
  optional?: boolean;
  /** Inline validation error shown below the field. */
  error?: string;
  /** Subtle hint shown below the field. */
  hint?: string;
  children: ReactNode;
}

export default function AdminField({
  label,
  name,
  full,
  required,
  optional,
  error,
  hint,
  children,
}: AdminFieldProps) {
  const { t } = useTranslation();
  return (
    <label
      className={`block${full ? " sm:col-span-2" : ""}`}
      data-field={name}
    >
      <span className="flex items-center gap-1.5 text-xs text-white/55">
        <span>{label}</span>
        {required && <span className="text-copper/80">*</span>}
        {optional && (
          <span className="text-[10px] text-white/30">({t("common.optional")})</span>
        )}
      </span>
      <span className="mt-1 block">{children}</span>
      {error && <span className="mt-1 block text-xs text-danger">{error}</span>}
      {hint && <span className="mt-1 block text-[11px] text-white/30">{hint}</span>}
    </label>
  );
}
