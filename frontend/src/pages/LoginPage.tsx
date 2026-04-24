import { useState, type ChangeEvent, type FocusEvent, type FormEvent } from "react";
import { Link, Navigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";
import Logo from "@/components/ui/Logo";
import axios from "axios";

export default function LoginPage() {
  const { t } = useTranslation();
  const { login, isAuthenticated } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({ email: '', password: '' });

  function validateField(name: string, value: string): string {
    if (name === "email") {
      if (!value.trim()) return t("auth.login.validation.emailRequired");
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(value)) return t("auth.login.validation.emailInvalid");
    }
    if (name === "password") {
      if (!value.trim()) return t("auth.login.validation.passwordRequired");
      if (value.length < 8) return t("auth.login.validation.passwordMin");
    }
    return "";
  }

  function validateForm(): boolean {
    const errors = {
      email: validateField("email", email),
      password: validateField("password", password),
    };
    setFieldErrors(errors);
    return !errors.email && !errors.password;
  }

  function handleBlur(e: FocusEvent<HTMLInputElement>) {
    const { name, value } = e.target;
    const error = validateField(name, value);
    setFieldErrors(prev => ({ ...prev, [name]: error }));
  }

  function handleEmailChange(e: ChangeEvent<HTMLInputElement>) {
    setEmail(e.target.value);
    if (fieldErrors.email) {
      setFieldErrors(prev => ({ ...prev, email: '' }));
    }
  }

  function handlePasswordChange(e: ChangeEvent<HTMLInputElement>) {
    setPassword(e.target.value);
    if (fieldErrors.password) {
      setFieldErrors(prev => ({ ...prev, password: '' }));
    }
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!validateForm()) {
      return;
    }

    setSubmitting(true);

    try {
      await login({ email, password });
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const detail = err.response?.data?.detail;
        setError(typeof detail === "string" ? detail : t("auth.login.errors.loginFailed"));
      } else {
        setError(t("auth.login.errors.unexpectedError"));
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="texture-paper flex min-h-screen items-center justify-center bg-canvas px-4 py-8">
      <div className="w-full max-w-sm space-y-8 rounded-xl border border-line bg-surface shadow-sm sm:max-w-md" style={{ borderTop: "2px solid #B87333" }}>
        <div className="px-6 pt-8 text-center sm:px-8">
          <div className="flex justify-center">
            <Logo size={36} />
          </div>
          <h1 className="mt-4 text-xl font-semibold text-ink">
            {t("auth.login.subtitle")}
          </h1>
        </div>

        <form className="space-y-6 px-6 sm:px-8" onSubmit={handleSubmit}>
          {error && (
            <div className="rounded-md bg-danger/10 p-3 text-sm text-danger">{error}</div>
          )}

          <div className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-ink-2"
              >
                {t("auth.login.emailLabel")}
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={handleEmailChange}
                onBlur={handleBlur}
                className="mt-1 block w-full rounded-md border border-line-2 px-3 py-2 text-sm shadow-sm focus:border-copper focus:ring-1 focus:ring-copper focus:outline-none"
                placeholder={t("auth.login.emailPlaceholder")}
                autoComplete="email"
              />
              {fieldErrors.email && (
                <p className="mt-1 text-xs text-danger">{fieldErrors.email}</p>
              )}
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-ink-2"
              >
                {t("auth.login.passwordLabel")}
              </label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={handlePasswordChange}
                onBlur={handleBlur}
                className="mt-1 block w-full rounded-md border border-line-2 px-3 py-2 shadow-sm focus:border-copper focus:ring-1 focus:ring-copper focus:outline-none"
                placeholder={t("auth.login.passwordPlaceholder")}
                autoComplete="current-password"
              />
              {fieldErrors.password && (
                <p className="mt-1 text-xs text-danger">{fieldErrors.password}</p>
              )}
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-md bg-copper px-4 py-2 text-sm font-medium text-white hover:bg-gold focus:ring-2 focus:ring-copper focus:ring-offset-2 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? t("auth.login.submittingText") : t("auth.login.submitText")}
          </button>
        </form>

        <p className="px-6 pb-8 text-center text-sm text-ink-2 sm:px-8">
          {t("auth.login.noAccount")}{" "}
          <Link to="/register" className="font-medium text-copper hover:underline">
            {t("auth.login.registerLink")}
          </Link>
        </p>
      </div>
    </div>
  );
}
