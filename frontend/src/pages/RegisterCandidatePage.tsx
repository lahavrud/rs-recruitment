import { useState, type ChangeEvent, type FormEvent } from "react";
import { Link, Navigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import axios from "axios";
import { useAuth } from "@/hooks/useAuth";
import Logo from "@/components/ui/Logo";
import { inputCls } from "@/styles/forms";
import { registerCandidate } from "@/services/auth";

interface FieldErrors {
  email: string;
  password: string;
  passwordConfirm: string;
  fullName: string;
  privacy: string;
  terms: string;
}

const EMPTY_ERRORS: FieldErrors = {
  email: "",
  password: "",
  passwordConfirm: "",
  fullName: "",
  privacy: "",
  terms: "",
};

const PASSWORD_RE = {
  upper: /[A-Z]/,
  lower: /[a-z]/,
  digit: /\d/,
  special: /[^A-Za-z0-9]/,
};

export default function RegisterCandidatePage() {
  const { t } = useTranslation();
  const { isAuthenticated } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [fullName, setFullName] = useState("");
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>(EMPTY_ERRORS);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  if (isAuthenticated) return <Navigate to="/dashboard" replace />;

  function validate(): boolean {
    const errs: FieldErrors = { ...EMPTY_ERRORS };
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim()) errs.email = t("auth.registerCandidate.validation.emailRequired");
    else if (!emailRe.test(email)) errs.email = t("auth.registerCandidate.validation.emailInvalid");
    if (!fullName.trim()) errs.fullName = t("auth.registerCandidate.validation.fullNameRequired");
    if (password.length < 8) {
      errs.password = t("auth.registerCandidate.validation.passwordMin");
    } else if (
      !PASSWORD_RE.upper.test(password) ||
      !PASSWORD_RE.lower.test(password) ||
      !PASSWORD_RE.digit.test(password) ||
      !PASSWORD_RE.special.test(password)
    ) {
      errs.password = t("auth.registerCandidate.validation.passwordComplexity");
    }
    if (password !== passwordConfirm) {
      errs.passwordConfirm = t("auth.registerCandidate.validation.passwordMismatch");
    }
    if (!privacyAccepted) errs.privacy = t("auth.registerCandidate.validation.privacyRequired");
    if (!termsAccepted) errs.terms = t("auth.registerCandidate.validation.termsRequired");
    setFieldErrors(errs);
    return Object.values(errs).every((v) => !v);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    if (!validate()) return;
    setSubmitting(true);
    try {
      await registerCandidate({
        email: email.trim().toLowerCase(),
        password,
        full_name: fullName.trim(),
        privacy_accepted: privacyAccepted,
        terms_accepted: termsAccepted,
      });
      setSubmitted(true);
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const status = err.response?.status;
        if (status === 409) {
          setFormError(t("auth.registerCandidate.errors.emailExists"));
        } else if (status === 429) {
          setFormError(t("auth.registerCandidate.errors.tooManyAttempts"));
        } else if (status === 422) {
          setFormError(t("auth.registerCandidate.errors.validation"));
        } else {
          setFormError(t("auth.registerCandidate.errors.generic"));
        }
      } else {
        setFormError(t("auth.registerCandidate.errors.generic"));
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-void px-4 py-8">
        <div className="w-full max-w-md space-y-6 rounded-xl border border-white/10 border-t-copper/50 bg-card p-8 text-center">
          <div className="flex justify-center">
            <Logo size={36} />
          </div>
          <h1 className="text-lg font-semibold text-white/85">
            {t("auth.registerCandidate.success.title")}
          </h1>
          <p className="text-sm text-white/60">
            {t("auth.registerCandidate.success.body")}
          </p>
          <Link
            to="/login"
            className="inline-block rounded-sm border border-white/20 px-4 py-2 text-sm text-white/70 transition hover:border-white/40 hover:text-white"
          >
            {t("auth.registerCandidate.success.backToLogin")}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-void px-4 py-8">
      <div className="w-full max-w-md space-y-8 rounded-xl border border-white/10 border-t-copper/50 bg-card">
        <div className="px-6 pt-8 text-center sm:px-8">
          <div className="flex justify-center">
            <Logo size={36} />
          </div>
          <h1 className="mt-4 text-lg font-semibold text-white/85">
            {t("auth.registerCandidate.subtitle")}
          </h1>
          <p className="mt-1 text-xs text-white/40">
            {t("auth.registerCandidate.description")}
          </p>
        </div>

        <form className="space-y-5 px-6 sm:px-8" onSubmit={handleSubmit} noValidate>
          {formError && (
            <div className="rounded-lg border border-danger/20 bg-danger/10 p-3 text-sm text-danger">
              {formError}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label htmlFor="fullName" className="block text-sm text-white/50">
                {t("auth.registerCandidate.fullNameLabel")}
              </label>
              <input
                id="fullName"
                name="fullName"
                type="text"
                required
                autoComplete="name"
                value={fullName}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setFullName(e.target.value)}
                className={`mt-1 ${inputCls}`}
              />
              {fieldErrors.fullName && (
                <p className="mt-1 text-xs text-danger">{fieldErrors.fullName}</p>
              )}
            </div>

            <div>
              <label htmlFor="email" className="block text-sm text-white/50">
                {t("auth.registerCandidate.emailLabel")}
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                className={`mt-1 ${inputCls}`}
              />
              {fieldErrors.email && (
                <p className="mt-1 text-xs text-danger">{fieldErrors.email}</p>
              )}
            </div>

            <div>
              <label htmlFor="password" className="block text-sm text-white/50">
                {t("auth.registerCandidate.passwordLabel")}
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                autoComplete="new-password"
                value={password}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                className={`mt-1 ${inputCls}`}
              />
              {fieldErrors.password && (
                <p className="mt-1 text-xs text-danger">{fieldErrors.password}</p>
              )}
            </div>

            <div>
              <label htmlFor="passwordConfirm" className="block text-sm text-white/50">
                {t("auth.registerCandidate.passwordConfirmLabel")}
              </label>
              <input
                id="passwordConfirm"
                name="passwordConfirm"
                type="password"
                required
                autoComplete="new-password"
                value={passwordConfirm}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setPasswordConfirm(e.target.value)}
                className={`mt-1 ${inputCls}`}
              />
              {fieldErrors.passwordConfirm && (
                <p className="mt-1 text-xs text-danger">{fieldErrors.passwordConfirm}</p>
              )}
            </div>

            <div className="space-y-2 pt-2">
              <label className="flex items-start gap-2 text-xs text-white/60">
                <input
                  type="checkbox"
                  checked={privacyAccepted}
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    setPrivacyAccepted(e.target.checked)
                  }
                  className="mt-0.5"
                />
                <span>{t("auth.registerCandidate.privacyConsent")}</span>
              </label>
              {fieldErrors.privacy && (
                <p className="text-xs text-danger">{fieldErrors.privacy}</p>
              )}
              <label className="flex items-start gap-2 text-xs text-white/60">
                <input
                  type="checkbox"
                  checked={termsAccepted}
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    setTermsAccepted(e.target.checked)
                  }
                  className="mt-0.5"
                />
                <span>{t("auth.registerCandidate.termsConsent")}</span>
              </label>
              {fieldErrors.terms && (
                <p className="text-xs text-danger">{fieldErrors.terms}</p>
              )}
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-sm bg-copper px-4 py-2.5 text-sm font-medium text-white transition hover:bg-gold focus:outline-none disabled:cursor-not-allowed disabled:opacity-40"
          >
            {submitting
              ? t("auth.registerCandidate.submittingText")
              : t("auth.registerCandidate.submitText")}
          </button>
        </form>

        <p className="px-6 pb-8 text-center text-sm text-white/35 sm:px-8">
          <Link to="/login" className="text-copper transition hover:text-gold">
            {t("auth.registerCandidate.backToLoginLink")}
          </Link>
        </p>
      </div>
    </div>
  );
}
