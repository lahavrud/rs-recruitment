import type { ChangeEvent, FocusEvent } from "react";
import { useTranslation } from "react-i18next";
import { inputCls } from "@/styles/forms";
import type { CandidateApplicationForm } from "@/types/api";
import FormField from "./FormField";

interface IdentityStepProps {
  form: Omit<CandidateApplicationForm, "job_id">;
  fieldErrors: Record<string, string>;
  onChange: (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  onBlur: (e: FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  emailReadOnly?: boolean;
}

export default function IdentityStep({
  form,
  fieldErrors,
  onChange,
  onBlur,
  emailReadOnly = false,
}: IdentityStepProps) {
  const { t } = useTranslation();
  return (
    <div className="grid gap-4 sm:grid-cols-2 sm:gap-x-6 sm:gap-y-5">
      <FormField
        label={t("publicJobs.application.fullName")}
        id="full_name"
        required
      >
        <input
          id="full_name"
          name="full_name"
          type="text"
          required
          value={form.full_name}
          onChange={onChange}
          onBlur={onBlur}
          className={inputCls}
          placeholder={t("publicJobs.application.placeholders.fullName")}
          autoComplete="name"
          aria-invalid={!!fieldErrors.full_name}
        />
        {fieldErrors.full_name && (
          <p className="mt-1 text-xs text-danger">{fieldErrors.full_name}</p>
        )}
      </FormField>

      <FormField
        label={t("publicJobs.application.email")}
        id="email"
        required
      >
        <input
          id="email"
          name="email"
          type="email"
          required
          value={form.email}
          onChange={onChange}
          onBlur={onBlur}
          className={inputCls}
          placeholder={t("publicJobs.application.placeholders.email")}
          autoComplete="email"
          aria-invalid={!!fieldErrors.email}
          readOnly={emailReadOnly}
          aria-readonly={emailReadOnly}
          title={
            emailReadOnly
              ? t("publicJobs.application.emailLockedHint")
              : undefined
          }
        />
        {fieldErrors.email && (
          <p className="mt-1 text-xs text-danger">{fieldErrors.email}</p>
        )}
      </FormField>

      <FormField
        label={t("publicJobs.application.phone")}
        id="phone"
        required
      >
        <input
          id="phone"
          name="phone"
          type="tel"
          value={form.phone}
          onChange={onChange}
          onBlur={onBlur}
          className={inputCls}
          placeholder={t("publicJobs.application.placeholders.phone")}
          autoComplete="tel"
          aria-invalid={!!fieldErrors.phone}
        />
        {fieldErrors.phone && (
          <p className="mt-1 text-xs text-danger">{fieldErrors.phone}</p>
        )}
      </FormField>

      <FormField
        label={t("publicJobs.application.linkedin")}
        id="linkedin_url"
        optional
        className="sm:col-span-2"
      >
        <input
          id="linkedin_url"
          name="linkedin_url"
          type="url"
          value={form.linkedin_url}
          onChange={onChange}
          onBlur={onBlur}
          className={inputCls}
          placeholder={t("publicJobs.application.placeholders.linkedin")}
          aria-invalid={!!fieldErrors.linkedin_url}
        />
        {fieldErrors.linkedin_url && (
          <p className="mt-1 text-xs text-danger">{fieldErrors.linkedin_url}</p>
        )}
      </FormField>
    </div>
  );
}
