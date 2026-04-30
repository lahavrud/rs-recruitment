import { type ChangeEvent, type FormEvent, useState } from "react";
import { Link, Navigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { register } from "@/services/auth";
import { useAuth } from "@/hooks/useAuth";
import Logo from "@/components/ui/Logo";
import { inputCls } from "@/styles/forms";
import axios from "axios";

function useValidation() {
  const { t } = useTranslation();
  return {
    validateEmail(v: string): string {
      if (!v.trim()) return t("auth.register.validation.emailRequired");
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return t("auth.register.validation.emailInvalid");
      return "";
    },
    validatePassword(v: string): string {
      if (!v) return t("auth.register.validation.passwordRequired");
      if (v.length < 8) return t("auth.register.validation.passwordMin");
      return "";
    },
    validateConfirm(v: string, pw: string): string {
      if (!v) return t("auth.register.validation.confirmRequired");
      if (v !== pw) return t("auth.register.validation.confirmMismatch");
      return "";
    },
    validateCompanyName(v: string): string {
      if (!v.trim()) return t("auth.register.validation.companyNameRequired");
      if (v.length > 100) return t("auth.register.validation.companyNameMax");
      return "";
    },
    validatePhone(v: string): string {
      if (!v) return "";
      if (!/^[+\d\s()-]*$/.test(v)) return t("auth.register.validation.phoneInvalid");
      if (v.replace(/\D/g, "").length < 5) return t("auth.register.validation.phoneMin");
      return "";
    },
  };
}

interface FormState {
  email: string;
  password: string;
  confirm: string;
  companyName: string;
  contactPerson: string;
  contactPhone: string;
}

const EMPTY: FormState = {
  email: "",
  password: "",
  confirm: "",
  companyName: "",
  contactPerson: "",
  contactPhone: "",
};

export default function RegisterPage() {
  const { t } = useTranslation();
  const val = useValidation();
  const { isAuthenticated } = useAuth();
  const [searchParams] = useSearchParams();
  const inviteToken = searchParams.get("token");

  const [form, setForm] = useState<FormState>(EMPTY);
  const [fieldErrors, setFieldErrors] = useState<Partial<FormState>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (isAuthenticated) return <Navigate to="/dashboard" replace />;

  if (!inviteToken) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-void px-4">
        <div className="w-full max-w-md rounded-xl border border-white/10 bg-card p-8 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-warning/30 bg-warning/10 text-lg text-warning">
            ✕
          </div>
          <h2 className="mt-5 text-lg font-semibold text-white/90">
            {t("auth.register.noToken.title")}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-white/50">
            {t("auth.register.noToken.message")}
          </p>
          <Link
            to="/login"
            className="mt-7 inline-block rounded-sm border border-white/20 px-6 py-2.5 text-sm text-white/60 transition hover:border-white/40 hover:text-white/90"
          >
            {t("auth.register.noToken.backToLogin")}
          </Link>
        </div>
      </div>
    );
  }

  function set(field: keyof FormState, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (fieldErrors[field]) setFieldErrors((prev) => ({ ...prev, [field]: "" }));
  }

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    set(e.target.name as keyof FormState, e.target.value);
  }

  function handleBlur(e: ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;
    const err = getFieldError(name as keyof FormState, value);
    setFieldErrors((prev) => ({ ...prev, [name]: err }));
  }

  function getFieldError(field: keyof FormState, value: string): string {
    switch (field) {
      case "email":        return val.validateEmail(value);
      case "password":     return val.validatePassword(value);
      case "confirm":      return val.validateConfirm(value, form.password);
      case "companyName":  return val.validateCompanyName(value);
      case "contactPhone": return val.validatePhone(value);
      default:             return "";
    }
  }

  function validateAll(): boolean {
    const errors: Partial<FormState> = {
      email:        val.validateEmail(form.email),
      password:     val.validatePassword(form.password),
      confirm:      val.validateConfirm(form.confirm, form.password),
      companyName:  val.validateCompanyName(form.companyName),
      contactPhone: val.validatePhone(form.contactPhone),
    };
    setFieldErrors(errors);
    return Object.values(errors).every((e) => !e);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!validateAll()) return;

    setSubmitting(true);
    setSubmitError(null);
    try {
      await register(
        {
          email: form.email.trim(),
          password: form.password,
          company_profile: {
            name: form.companyName.trim(),
            contact_person: form.contactPerson.trim() || null,
            contact_phone: form.contactPhone.trim() || null,
          },
        },
        inviteToken!,
      );
      setSuccess(true);
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const status = err.response?.status;
        if (status === 429) {
          setSubmitError(t("auth.register.errors.tooManyAttempts"));
        } else if (status === 400) {
          const detail = (err.response?.data?.detail ?? "") as string;
          if (detail.toLowerCase().includes("invite") || detail.toLowerCase().includes("token")) {
            setSubmitError(t("auth.register.errors.invalidToken"));
          } else {
            setSubmitError(t("auth.register.errors.emailExists"));
          }
        } else if (status === 409) {
          setSubmitError(t("auth.register.errors.emailExists"));
        } else {
          setSubmitError(t("auth.register.errors.failed"));
        }
      } else {
        setSubmitError(t("auth.register.errors.unexpected"));
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-void px-4 py-8">
        <div className="w-full max-w-md rounded-xl border border-success/20 bg-success/8 p-10 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-success/30 bg-success/10 text-lg text-success">
            ✓
          </div>
          <h2 className="mt-5 text-lg font-semibold text-white/90">
            {t("auth.register.success.title")}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-white/50">
            {t("auth.register.success.message")}
          </p>
          <Link
            to="/login"
            className="mt-7 inline-block rounded-sm border border-white/20 px-6 py-2.5 text-sm text-white/60 transition hover:border-white/40 hover:text-white/90"
          >
            {t("auth.register.success.backToLogin")}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-void px-4 py-8">
      <div className="w-full max-w-md space-y-6 rounded-xl border border-white/10 border-t-copper/50 bg-card p-6 sm:p-8">
        <div className="flex items-center gap-3">
          <Logo size={30} />
          <div>
            <h1 className="text-lg font-semibold text-white/90">{t("auth.register.title")}</h1>
            <p className="text-xs text-white/40">{t("auth.register.subtitle")}</p>
          </div>
        </div>

        {submitError && (
          <div className="rounded-lg border border-danger/20 bg-danger/10 p-3 text-sm text-danger">
            {submitError}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate className="space-y-6">
          <section>
            <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-copper">
              {t("auth.register.companySection")}
            </p>
            <div className="space-y-3">
              <div>
                <label className="block text-sm text-white/50">
                  {t("auth.register.companyName")} <span className="text-copper/80">*</span>
                </label>
                <input
                  name="companyName"
                  type="text"
                  required
                  maxLength={100}
                  value={form.companyName}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  className={`mt-1 ${inputCls}`}
                  placeholder={t("auth.register.companyNamePlaceholder")}
                  autoComplete="organization"
                />
                {fieldErrors.companyName && (
                  <p className="mt-1 text-xs text-danger">{fieldErrors.companyName}</p>
                )}
              </div>

              <div>
                <label className="block text-sm text-white/50">
                  {t("auth.register.contactPerson")}
                </label>
                <input
                  name="contactPerson"
                  type="text"
                  maxLength={100}
                  value={form.contactPerson}
                  onChange={handleChange}
                  className={`mt-1 ${inputCls}`}
                  placeholder={t("auth.register.contactPersonPlaceholder")}
                  autoComplete="name"
                />
              </div>

              <div>
                <label className="block text-sm text-white/50">
                  {t("auth.register.contactPhone")}
                </label>
                <input
                  name="contactPhone"
                  type="tel"
                  maxLength={30}
                  value={form.contactPhone}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  className={`mt-1 ${inputCls}`}
                  placeholder={t("auth.register.contactPhonePlaceholder")}
                  autoComplete="tel"
                />
                {fieldErrors.contactPhone && (
                  <p className="mt-1 text-xs text-danger">{fieldErrors.contactPhone}</p>
                )}
              </div>
            </div>
          </section>

          <section>
            <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-copper">
              {t("auth.register.accountSection")}
            </p>
            <div className="space-y-3">
              <div>
                <label className="block text-sm text-white/50">
                  {t("auth.register.emailLabel")} <span className="text-copper/80">*</span>
                </label>
                <input
                  name="email"
                  type="email"
                  required
                  maxLength={255}
                  value={form.email}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  className={`mt-1 ${inputCls}`}
                  placeholder={t("auth.register.emailPlaceholder")}
                  autoComplete="email"
                />
                {fieldErrors.email && (
                  <p className="mt-1 text-xs text-danger">{fieldErrors.email}</p>
                )}
              </div>

              <div>
                <label className="block text-sm text-white/50">
                  {t("auth.register.passwordLabel")} <span className="text-copper/80">*</span>
                </label>
                <input
                  name="password"
                  type="password"
                  required
                  value={form.password}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  className={`mt-1 ${inputCls}`}
                  placeholder={t("auth.register.passwordPlaceholder")}
                  autoComplete="new-password"
                />
                {fieldErrors.password && (
                  <p className="mt-1 text-xs text-danger">{fieldErrors.password}</p>
                )}
              </div>

              <div>
                <label className="block text-sm text-white/50">
                  {t("auth.register.confirmLabel")} <span className="text-copper/80">*</span>
                </label>
                <input
                  name="confirm"
                  type="password"
                  required
                  value={form.confirm}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  className={`mt-1 ${inputCls}`}
                  placeholder={t("auth.register.confirmPlaceholder")}
                  autoComplete="new-password"
                />
                {fieldErrors.confirm && (
                  <p className="mt-1 text-xs text-danger">{fieldErrors.confirm}</p>
                )}
              </div>
            </div>
          </section>

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-sm bg-copper px-4 py-2.5 text-sm font-medium text-white transition hover:bg-gold focus:outline-none disabled:cursor-not-allowed disabled:opacity-40"
          >
            {submitting ? t("auth.register.submittingText") : t("auth.register.submitText")}
          </button>
        </form>

        <p className="text-center text-sm text-white/35">
          {t("auth.register.haveAccount")}{" "}
          <Link to="/login" className="text-copper transition hover:text-gold">
            {t("auth.register.loginLink")}
          </Link>
        </p>
      </div>
    </div>
  );
}
