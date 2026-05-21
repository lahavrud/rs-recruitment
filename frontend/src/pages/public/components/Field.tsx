import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

export interface FieldProps {
  label: string;
  id: string;
  required?: boolean;
  optional?: boolean;
  className?: string;
  children: ReactNode;
}

export default function Field({ label, id, required, optional, className, children }: FieldProps) {
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
          <span className="text-[10px] text-white/30">
            ({t("common.optional")})
          </span>
        )}
      </label>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}
