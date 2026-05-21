import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

interface FormFieldProps {
  label: string;
  /** Passed as htmlFor on the label and data-field on the wrapper. */
  id?: string;
  required?: boolean;
  optional?: boolean;
  /** Inline validation error shown below the field. */
  error?: string;
  /** Subtle hint shown below the field. */
  hint?: string;
  className?: string;
  children: ReactNode;
}

export default function FormField({
  label,
  id,
  required,
  optional,
  error,
  hint,
  className,
  children,
}: FormFieldProps) {
  const { t } = useTranslation();
  return (
    <div data-field={id} className={className}>
      <label
        htmlFor={id}
        className="flex items-center gap-1.5 text-xs text-white/55 sm:text-sm"
      >
        <span>{label}</span>
        {required && <span className="text-copper/80">*</span>}
        {optional && (
          <span className="text-[10px] text-white/30">({t("common.optional")})</span>
        )}
      </label>
      <div className="mt-1.5">{children}</div>
      {error && <p className="mt-1 text-xs text-danger">{error}</p>}
      {hint && <p className="mt-1 text-[11px] text-white/30">{hint}</p>}
    </div>
  );
}
