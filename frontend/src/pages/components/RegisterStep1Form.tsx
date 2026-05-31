import { type ChangeEvent, type RefObject } from "react";
import { useTranslation } from "react-i18next";
import { inputCls } from "@/styles/forms";

interface FormState {
  email: string;
  password: string;
  confirm: string;
  companyName: string;
  companyId: string;
  address: string;
  contactFirstName: string;
  contactLastName: string;
  contactMobilePhone: string;
  contactLandlinePhone: string;
}

interface FieldErrors {
  email?: string;
  password?: string;
  confirm?: string;
  companyName?: string;
  companyId?: string;
  address?: string;
  contactFirstName?: string;
  contactLastName?: string;
  contactMobilePhone?: string;
  logo?: string;
}

interface RegisterStep1FormProps {
  form: FormState;
  fieldErrors: FieldErrors;
  emailPreFilled: boolean;
  logoInputRef: RefObject<HTMLInputElement | null>;
  handleChange: (e: ChangeEvent<HTMLInputElement>) => void;
  handleBlur: (e: ChangeEvent<HTMLInputElement>) => void;
  handleLogoChange: (e: ChangeEvent<HTMLInputElement>) => void;
  handleNext: () => void;
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs text-white/45">{label}</label>
      {children}
      {error && <p className="mt-1 text-xs text-danger">{error}</p>}
    </div>
  );
}

export default function RegisterStep1Form({
  form,
  fieldErrors,
  emailPreFilled,
  logoInputRef,
  handleChange,
  handleBlur,
  handleLogoChange,
  handleNext,
}: RegisterStep1FormProps) {
  const { t } = useTranslation();

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-white/8 bg-card px-5 py-5">
        <p className="mb-4 text-[10px] font-semibold uppercase tracking-widest text-copper">
          {t("auth.register.companySection")}
        </p>
        <div className="space-y-3">
          <Field label={`${t("auth.register.companyName")} *`} error={fieldErrors.companyName}>
            <input
              name="companyName" type="text" required maxLength={100}
              value={form.companyName} onChange={handleChange} onBlur={handleBlur}
              className={inputCls} placeholder="Acme בע״מ"
              autoComplete="organization"
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label={`${t("auth.register.companyIdLabel")} *`} error={fieldErrors.companyId}>
              <input
                name="companyId" type="text" required maxLength={9}
                value={form.companyId} onChange={handleChange} onBlur={handleBlur}
                className={inputCls} placeholder="123456789" dir="ltr"
              />
            </Field>
            <Field label={`${t("auth.register.addressLabel")} *`} error={fieldErrors.address}>
              <input
                name="address" type="text" required maxLength={200}
                value={form.address} onChange={handleChange} onBlur={handleBlur}
                className={inputCls} placeholder={t("auth.register.addressPlaceholder")}
                autoComplete="street-address"
              />
            </Field>
          </div>

          <Field label={`${t("auth.register.logoLabel")} *`} error={fieldErrors.logo}>
            <input
              ref={logoInputRef} type="file" accept="image/*"
              onChange={handleLogoChange}
              className="mt-0.5 block w-full cursor-pointer rounded-sm border border-white/10 bg-well px-3 py-2 text-xs text-white/50 file:ml-3 file:rounded-sm file:border-0 file:bg-copper/20 file:px-2.5 file:py-1 file:text-[11px] file:font-medium file:text-copper hover:file:bg-copper/30"
            />
          </Field>
        </div>
      </div>

      <div className="rounded-xl border border-white/8 bg-card px-5 py-5">
        <p className="mb-4 text-[10px] font-semibold uppercase tracking-widest text-copper">
          {t("auth.register.contactSection", "איש קשר")}
        </p>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label={`${t("auth.register.contactFirstName")} *`} error={fieldErrors.contactFirstName}>
              <input
                name="contactFirstName" type="text" required maxLength={100}
                value={form.contactFirstName} onChange={handleChange} onBlur={handleBlur}
                className={inputCls} placeholder={t("auth.register.contactFirstNamePlaceholder")}
                autoComplete="given-name"
              />
            </Field>
            <Field label={`${t("auth.register.contactLastName")} *`} error={fieldErrors.contactLastName}>
              <input
                name="contactLastName" type="text" required maxLength={100}
                value={form.contactLastName} onChange={handleChange} onBlur={handleBlur}
                className={inputCls} placeholder={t("auth.register.contactLastNamePlaceholder")}
                autoComplete="family-name"
              />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label={`${t("auth.register.contactMobilePhone")} *`} error={fieldErrors.contactMobilePhone}>
              <input
                name="contactMobilePhone" type="tel" required maxLength={15}
                value={form.contactMobilePhone} onChange={handleChange} onBlur={handleBlur}
                className={inputCls} placeholder={t("auth.register.contactMobilePhonePlaceholder")}
                autoComplete="tel" dir="ltr"
              />
            </Field>
            <Field label={t("auth.register.contactLandlinePhone")}>
              <input
                name="contactLandlinePhone" type="tel" maxLength={15}
                value={form.contactLandlinePhone} onChange={handleChange}
                className={inputCls} placeholder={t("auth.register.contactLandlinePhonePlaceholder")}
                dir="ltr"
              />
            </Field>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-white/8 bg-card px-5 py-5">
        <p className="mb-4 text-[10px] font-semibold uppercase tracking-widest text-copper">
          {t("auth.register.accountSection")}
        </p>
        <div className="space-y-3">
          <Field label={`${t("auth.register.emailLabel")} *`} error={fieldErrors.email}>
            <input
              name="email" type="email" required maxLength={255}
              value={form.email} onChange={handleChange} onBlur={handleBlur}
              readOnly={emailPreFilled}
              className={`${inputCls} ${emailPreFilled ? "cursor-not-allowed opacity-60" : ""}`}
              placeholder={t("auth.register.emailPlaceholder")}
              autoComplete="email" dir="ltr"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label={`${t("auth.register.passwordLabel")} *`} error={fieldErrors.password}>
              <input
                name="password" type="password" required
                value={form.password} onChange={handleChange} onBlur={handleBlur}
                className={inputCls} placeholder="••••••••"
                autoComplete="new-password"
              />
            </Field>
            <Field label={`${t("auth.register.confirmLabel")} *`} error={fieldErrors.confirm}>
              <input
                name="confirm" type="password" required
                value={form.confirm} onChange={handleChange} onBlur={handleBlur}
                className={inputCls} placeholder="••••••••"
                autoComplete="new-password"
              />
            </Field>
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={handleNext}
        className="w-full rounded-sm bg-copper px-4 py-2.5 text-sm font-medium text-white transition hover:bg-gold"
      >
        {t("auth.register.nextStep")} ←
      </button>
    </div>
  );
}
