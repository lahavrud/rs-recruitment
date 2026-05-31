import { useTranslation } from "react-i18next";
import type {
  CompanyProfileAdminCreate,
  CompanyProfileAdminUpdate,
} from "@/types/api";
import { inputCls } from "@/styles/forms";

interface ProfileFieldsProps {
  form: CompanyProfileAdminUpdate | Partial<CompanyProfileAdminCreate>;
  setField: (key: string, value: string) => void;
  errors?: Record<string, string>;
  /** If true, mark required fields with an asterisk and show inline hints. */
  showRequired?: boolean;
}

export default function CompanyProfileFields({
  form,
  setField,
  errors,
  showRequired = false,
}: ProfileFieldsProps) {
  const { t } = useTranslation();
  return (
    <div className="space-y-5">
      {/* Section: Company */}
      <section>
        <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-copper">
          {t("admin.companies.formSections.company")}
        </p>
        <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
          <Field
            label={t("admin.companies.fields.name")}
            required={showRequired}
            full
            name="name"
          >
            <input
              type="text"
              value={form.name ?? ""}
              onChange={(e) => setField("name", e.target.value)}
              className={inputCls}
              placeholder={t("admin.companies.placeholders.name")}
              aria-invalid={!!errors?.name}
            />
            {errors?.name && (
              <p className="mt-1 text-xs text-danger">{errors.name}</p>
            )}
          </Field>
          <Field
            label={t("admin.companies.fields.companyId")}
            required={showRequired}
            hint={showRequired ? t("admin.companies.hints.companyId") : undefined}
            name="company_id"
          >
            <input
              type="text"
              inputMode="numeric"
              value={form.company_id ?? ""}
              onChange={(e) => setField("company_id", e.target.value)}
              className={inputCls}
              placeholder="123456789"
              aria-invalid={!!errors?.company_id}
              maxLength={9}
            />
            {errors?.company_id && (
              <p className="mt-1 text-xs text-danger">{errors.company_id}</p>
            )}
          </Field>
          <Field
            label={t("admin.companies.fields.address")}
            required={showRequired}
            name="address"
          >
            <input
              type="text"
              value={form.address ?? ""}
              onChange={(e) => setField("address", e.target.value)}
              className={inputCls}
              placeholder={t("admin.companies.placeholders.address")}
              aria-invalid={!!errors?.address}
            />
            {errors?.address && (
              <p className="mt-1 text-xs text-danger">{errors.address}</p>
            )}
          </Field>
        </div>
      </section>

      {/* Section: Contact person */}
      <section>
        <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-copper">
          {t("admin.companies.formSections.contact")}
        </p>
        <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
          <Field
            label={t("admin.companies.fields.contactEmail")}
            required={showRequired}
            full
            name="contact_email"
          >
            <input
              type="email"
              value={form.contact_email ?? ""}
              onChange={(e) => setField("contact_email", e.target.value)}
              className={inputCls}
              placeholder="contact@example.com"
              autoComplete="email"
              aria-invalid={!!errors?.contact_email}
            />
            {errors?.contact_email && (
              <p className="mt-1 text-xs text-danger">{errors.contact_email}</p>
            )}
          </Field>
          <Field
            label={t("admin.companies.fields.contactFirstName")}
            required={showRequired}
            name="contact_first_name"
          >
            <input
              type="text"
              value={form.contact_first_name ?? ""}
              onChange={(e) => setField("contact_first_name", e.target.value)}
              className={inputCls}
              autoComplete="given-name"
              aria-invalid={!!errors?.contact_first_name}
            />
            {errors?.contact_first_name && (
              <p className="mt-1 text-xs text-danger">{errors.contact_first_name}</p>
            )}
          </Field>
          <Field
            label={t("admin.companies.fields.contactLastName")}
            required={showRequired}
            name="contact_last_name"
          >
            <input
              type="text"
              value={form.contact_last_name ?? ""}
              onChange={(e) => setField("contact_last_name", e.target.value)}
              className={inputCls}
              autoComplete="family-name"
              aria-invalid={!!errors?.contact_last_name}
            />
            {errors?.contact_last_name && (
              <p className="mt-1 text-xs text-danger">{errors.contact_last_name}</p>
            )}
          </Field>
          <Field
            label={t("admin.companies.fields.contactMobile")}
            required={showRequired}
            hint={showRequired ? t("admin.companies.hints.mobile") : undefined}
            name="contact_mobile_phone"
          >
            <input
              type="tel"
              value={form.contact_mobile_phone ?? ""}
              onChange={(e) => setField("contact_mobile_phone", e.target.value)}
              className={inputCls}
              placeholder="0501234567"
              autoComplete="tel"
              aria-invalid={!!errors?.contact_mobile_phone}
              maxLength={10}
            />
            {errors?.contact_mobile_phone && (
              <p className="mt-1 text-xs text-danger">{errors.contact_mobile_phone}</p>
            )}
          </Field>
          <Field
            label={t("admin.companies.fields.contactLandline")}
            optional
          >
            <input
              type="tel"
              value={form.contact_landline_phone ?? ""}
              onChange={(e) => setField("contact_landline_phone", e.target.value)}
              className={inputCls}
              placeholder="03-1234567"
              autoComplete="tel"
            />
          </Field>
        </div>
      </section>
    </div>
  );
}

function Field({
  label,
  children,
  full,
  required,
  optional,
  hint,
  name,
}: {
  label: string;
  children: React.ReactNode;
  full?: boolean;
  required?: boolean;
  optional?: boolean;
  hint?: string;
  name?: string;
}) {
  const { t } = useTranslation();
  return (
    <label
      className={`block ${full ? "sm:col-span-2" : ""}`}
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
      {hint && <span className="mt-1 block text-[11px] text-white/30">{hint}</span>}
    </label>
  );
}
