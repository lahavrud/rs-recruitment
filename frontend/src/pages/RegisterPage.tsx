import { type ChangeEvent, type FormEvent, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { register } from "@/services/auth";
import { useAuth } from "@/hooks/useAuth";
import axios from "axios";

// ── Field error helpers ───────────────────────────────────────────────────────

function validateEmail(v: string): string {
  if (!v.trim()) return "Email is required";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return "Enter a valid email address";
  return "";
}
function validatePassword(v: string): string {
  if (!v) return "Password is required";
  if (v.length < 8) return "Password must be at least 8 characters";
  return "";
}
function validateConfirm(v: string, pw: string): string {
  if (!v) return "Please confirm your password";
  if (v !== pw) return "Passwords do not match";
  return "";
}
function validateCompanyName(v: string): string {
  if (!v.trim()) return "Company name is required";
  if (v.length > 100) return "Company name cannot exceed 100 characters";
  return "";
}
function validatePhone(v: string): string {
  if (!v) return "";
  if (!/^[+\d\s()-]*$/.test(v)) return "Phone may only contain digits, spaces, +, -, (, )";
  if (v.replace(/\D/g, "").length < 5) return "Phone must have at least 5 digits";
  return "";
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

// ── Component ─────────────────────────────────────────────────────────────────

const inputCls =
  "mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm " +
  "focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none";

export default function RegisterPage() {
  const { isAuthenticated } = useAuth();
  const [form, setForm] = useState<FormState>(EMPTY);
  const [fieldErrors, setFieldErrors] = useState<Partial<FormState>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (isAuthenticated) return <Navigate to="/" replace />;

  function set(field: keyof FormState, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    // Clear the field's error as the user types
    if (fieldErrors[field]) {
      setFieldErrors((prev) => ({ ...prev, [field]: "" }));
    }
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
      case "email":        return validateEmail(value);
      case "password":     return validatePassword(value);
      case "confirm":      return validateConfirm(value, form.password);
      case "companyName":  return validateCompanyName(value);
      case "contactPhone": return validatePhone(value);
      default:             return "";
    }
  }

  function validateAll(): boolean {
    const errors: Partial<FormState> = {
      email:        validateEmail(form.email),
      password:     validatePassword(form.password),
      confirm:      validateConfirm(form.confirm, form.password),
      companyName:  validateCompanyName(form.companyName),
      contactPhone: validatePhone(form.contactPhone),
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
      await register({
        email: form.email.trim(),
        password: form.password,
        company_profile: {
          name: form.companyName.trim(),
          contact_person: form.contactPerson.trim() || null,
          contact_phone: form.contactPhone.trim() || null,
        },
      });
      setSuccess(true);
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const status = err.response?.status;
        const detail = err.response?.data?.detail;
        if (status === 429) {
          setSubmitError("Too many registration attempts. Please try again later.");
        } else if (typeof detail === "string") {
          setSubmitError(detail);
        } else {
          setSubmitError("Registration failed. Please try again.");
        }
      } else {
        setSubmitError("An unexpected error occurred.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  // ── Success ──────────────────────────────────────────────────────────────────

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-8">
        <div className="w-full max-w-md rounded-lg border border-green-200 bg-green-50 p-8 text-center shadow">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-2xl">
            ✓
          </div>
          <h2 className="mt-4 text-xl font-semibold text-green-800">
            Registration Submitted!
          </h2>
          <p className="mt-2 text-sm text-green-700">
            Your company account is pending admin approval. You will be notified
            by email once your account has been reviewed.
          </p>
          <Link
            to="/login"
            className="mt-6 inline-block rounded-md bg-green-600 px-5 py-2 text-sm font-medium text-white hover:bg-green-700"
          >
            Back to Login
          </Link>
        </div>
      </div>
    );
  }

  // ── Form ─────────────────────────────────────────────────────────────────────

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-8">
      <div className="w-full max-w-md space-y-6 rounded-lg bg-white p-6 shadow sm:p-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">Create an Account</h1>
          <p className="mt-1 text-sm text-gray-500">
            Register your company to start posting jobs.
          </p>
        </div>

        {/* Global error */}
        {submitError && (
          <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">
            {submitError}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate className="space-y-6">
          {/* ── Company Information ── */}
          <section>
            <h2 className="mb-3 border-b border-gray-100 pb-1.5 text-sm font-semibold uppercase tracking-wide text-gray-500">
              Company Information
            </h2>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Company Name <span className="text-red-500">*</span>
                </label>
                <input
                  name="companyName"
                  type="text"
                  required
                  maxLength={100}
                  value={form.companyName}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  className={inputCls}
                  placeholder="Acme Ltd."
                  autoComplete="organization"
                />
                {fieldErrors.companyName && (
                  <p className="mt-1 text-xs text-red-600">{fieldErrors.companyName}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Contact Person
                </label>
                <input
                  name="contactPerson"
                  type="text"
                  maxLength={100}
                  value={form.contactPerson}
                  onChange={handleChange}
                  className={inputCls}
                  placeholder="Jane Smith"
                  autoComplete="name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Contact Phone
                </label>
                <input
                  name="contactPhone"
                  type="tel"
                  maxLength={30}
                  value={form.contactPhone}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  className={inputCls}
                  placeholder="+972 50 000 0000"
                  autoComplete="tel"
                />
                {fieldErrors.contactPhone && (
                  <p className="mt-1 text-xs text-red-600">{fieldErrors.contactPhone}</p>
                )}
              </div>
            </div>
          </section>

          {/* ── Account ── */}
          <section>
            <h2 className="mb-3 border-b border-gray-100 pb-1.5 text-sm font-semibold uppercase tracking-wide text-gray-500">
              Account
            </h2>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Email Address <span className="text-red-500">*</span>
                </label>
                <input
                  name="email"
                  type="email"
                  required
                  maxLength={255}
                  value={form.email}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  className={inputCls}
                  placeholder="you@company.com"
                  autoComplete="email"
                />
                {fieldErrors.email && (
                  <p className="mt-1 text-xs text-red-600">{fieldErrors.email}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Password <span className="text-red-500">*</span>
                </label>
                <input
                  name="password"
                  type="password"
                  required
                  value={form.password}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  className={inputCls}
                  placeholder="At least 8 characters"
                  autoComplete="new-password"
                />
                {fieldErrors.password && (
                  <p className="mt-1 text-xs text-red-600">{fieldErrors.password}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Confirm Password <span className="text-red-500">*</span>
                </label>
                <input
                  name="confirm"
                  type="password"
                  required
                  value={form.confirm}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  className={inputCls}
                  placeholder="Repeat your password"
                  autoComplete="new-password"
                />
                {fieldErrors.confirm && (
                  <p className="mt-1 text-xs text-red-600">{fieldErrors.confirm}</p>
                )}
              </div>
            </div>
          </section>

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-md bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? "Submitting…" : "Create Account"}
          </button>
        </form>

        {/* Login link */}
        <p className="text-center text-sm text-gray-500">
          Already have an account?{" "}
          <Link to="/login" className="font-medium text-blue-600 hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
