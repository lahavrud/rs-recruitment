import { type ChangeEvent, type FocusEvent, type FormEvent, type ReactNode, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { getPublicJob, submitApplication } from "@/services/jobs";
import type { CandidateApplicationForm, JobPublicRead } from "@/types/api";
import axios from "axios";

const ALLOWED_EXTENSIONS = [".pdf", ".doc", ".docx"];
const MAX_FILE_SIZE_MB = 10;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

const EMPTY_FORM: Omit<CandidateApplicationForm, "job_id"> = {
  full_name: "",
  email: "",
  phone: "",
  linkedin_url: "",
  service_concept: "",
  salary_expectations: "",
  military_service_details: "",
  transportation: "",
  personality_weakness: "",
  personality_strength: "",
};

interface FieldProps {
  label: string;
  id: string;
  required?: boolean;
  children: ReactNode;
}

function Field({ label, id, required, children }: FieldProps) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-ink-2">
        {label}
        {required && <span className="ms-1 text-danger">*</span>}
      </label>
      <div className="mt-1">{children}</div>
    </div>
  );
}

const inputCls =
  "block w-full rounded-md border border-line-2 px-3 py-2 text-sm shadow-sm focus:border-copper focus:ring-1 focus:ring-copper focus:outline-none";
const textareaCls = inputCls + " resize-y min-h-[80px]";

export default function ApplicationPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const jobId = id !== undefined ? Number.parseInt(id, 10) : NaN;

  const [job, setJob] = useState<JobPublicRead | null>(null);
  const [jobLoading, setJobLoading] = useState(true);
  const [jobError, setJobError] = useState<string | null>(null);

  const [form, setForm] =
    useState<Omit<CandidateApplicationForm, "job_id">>(EMPTY_FORM);
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [resumeError, setResumeError] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  function validateField(name: string, value: string): string | null {
    const v = t;
    if (name === "full_name") {
      if (!value.trim()) return v("publicJobs.application.validation.fullNameRequired");
      if (value.trim().length < 2) return v("publicJobs.application.validation.fullNameMin");
      if (value.length > 100) return v("publicJobs.application.validation.fullNameMax");
    }
    if (name === "email") {
      if (!value.trim()) return v("publicJobs.application.validation.emailRequired");
      if (value.length > 255) return v("publicJobs.application.validation.emailMax");
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(value)) return v("publicJobs.application.validation.emailInvalid");
    }
    if (name === "phone" && value.trim()) {
      const phoneRegex = /^[+\d\s()-]*$/;
      if (!phoneRegex.test(value)) return v("publicJobs.application.validation.phoneInvalid");
      if (value.replace(/\D/g, "").length < 5) return v("publicJobs.application.validation.phoneMin");
    }
    if (name === "linkedin_url" && value.trim()) {
      let parsed: URL;
      try {
        parsed = new URL(value);
      } catch {
        return v("publicJobs.application.validation.urlInvalid");
      }
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
        return v("publicJobs.application.validation.urlProtocol");
      }
      if (!parsed.hostname.endsWith("linkedin.com")) {
        return v("publicJobs.application.validation.urlLinkedin");
      }
    }
    const textFields = ["service_concept", "salary_expectations", "military_service_details", "transportation", "personality_strength", "personality_weakness"];
    if (textFields.includes(name) && value.length > 2000) {
      return v("publicJobs.application.validation.textMax");
    }
    return null;
  }

  function validateForm(): boolean {
    const errors: Record<string, string> = {};
    Object.entries(form).forEach(([key, value]) => {
      const error = validateField(key, value);
      if (error) errors[key] = error;
    });
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  function handleBlur(e: FocusEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const { name, value } = e.target;
    const error = validateField(name, value);
    setFieldErrors(prev => ({ ...prev, [name]: error || "" }));
  }

  function handleChange(e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (fieldErrors[name]) {
      setFieldErrors(prev => ({ ...prev, [name]: "" }));
    }
  }

  useEffect(() => {
    if (!Number.isFinite(jobId)) {
      navigate("/jobs", { replace: true });
      return;
    }

    let cancelled = false;

    async function fetchJob() {
      try {
        const data = await getPublicJob(jobId);
        if (!cancelled) setJob(data);
      } catch (err) {
        if (!cancelled) {
          if (axios.isAxiosError(err) && err.response?.status === 404) {
            setJobError(t("publicJobs.application.unavailable"));
          } else {
            setJobError(t("publicJobs.application.errorLoad"));
          }
        }
      } finally {
        if (!cancelled) setJobLoading(false);
      }
    }

    fetchJob();
    return () => {
      cancelled = true;
    };
  }, [jobId, navigate, t]);

  function handleResumeChange(e: ChangeEvent<HTMLInputElement>) {
    setResumeError(null);
    const file = e.target.files?.[0] ?? null;
    if (!file) {
      setResumeFile(null);
      return;
    }

    const ext = "." + file.name.split(".").pop()?.toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      setResumeError(t("publicJobs.application.resumeErrors.invalidExtension"));
      e.target.value = "";
      return;
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      setResumeError(t("publicJobs.application.resumeErrors.fileTooBig", { maxSize: MAX_FILE_SIZE_MB }));
      e.target.value = "";
      return;
    }

    setResumeFile(file);
  }

  function clearResume() {
    setResumeFile(null);
    setResumeError(null);
    const input = document.getElementById("resume") as HTMLInputElement | null;
    if (input) input.value = "";
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!Number.isFinite(jobId)) return;

    if (!validateForm()) {
      return;
    }

    if (resumeError) {
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    try {
      await submitApplication(jobId, form, resumeFile);
      setSuccess(true);
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const status = err.response?.status;
        const detail = err.response?.data?.detail;
        if (status === 409) {
          setSubmitError(t("publicJobs.application.errors.alreadyApplied"));
        } else if (status === 404) {
          setSubmitError(t("publicJobs.application.errors.jobUnavailable"));
        } else if (typeof detail === "string") {
          setSubmitError(detail);
        } else {
          setSubmitError(t("publicJobs.application.errors.generic"));
        }
      } else {
        setSubmitError(t("publicJobs.application.errors.generic"));
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (jobLoading) {
    return (
      <div className="flex justify-center py-24">
        <div className="text-ink-3">{t("publicJobs.application.loading")}</div>
      </div>
    );
  }

  if (jobError) {
    return (
      <div className="text-center">
        <div className="rounded-md bg-danger/10 p-6 text-danger">{jobError}</div>
        <Link
          to="/jobs"
          className="mt-6 inline-block text-sm text-copper hover:underline"
        >
          {t("publicJobs.application.backToJob")}
        </Link>
      </div>
    );
  }

  if (success) {
    return (
      <div className="mx-auto max-w-2xl">
        <div className="rounded-lg border border-success/20 bg-success/10 p-10 text-center">
          <div className="text-4xl">✓</div>
          <h2 className="mt-4 text-xl font-semibold text-success">
            {t("publicJobs.application.submitted")}
          </h2>
          <p className="mt-2 text-sm text-success">
            {t("publicJobs.application.submittedMessage")} <span className="font-medium">{job?.title}</span>.
            {t("publicJobs.application.submittedDetail")}
          </p>
          <Link
            to="/jobs"
            className="mt-6 block rounded-md bg-success px-5 py-2 text-sm font-medium text-white hover:bg-success/80 sm:inline-block"
          >
            {t("publicJobs.application.browseMore")}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <Link
        to={`/jobs/${jobId}`}
        className="mb-6 inline-flex items-center gap-1 text-sm text-copper hover:underline"
      >
        {t("publicJobs.application.backToJob")}
      </Link>

      <h1 className="text-xl font-bold text-ink sm:text-2xl">{t("publicJobs.application.applyFor")} {job?.title}</h1>
      <p className="mt-1 text-sm text-ink-2">{job?.location}</p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-10" noValidate>
        {submitError && (
          <div className="rounded-md bg-danger/10 p-4 text-sm text-danger">
            {submitError}
          </div>
        )}

        <section>
          <h2 className="mb-4 border-b border-line pb-2 text-base font-semibold text-ink">
            {t("publicJobs.application.personalSection")}
          </h2>
          <div className="space-y-4">
            <Field label={t("publicJobs.application.fullName")} id="full_name" required>
              <input
                id="full_name"
                name="full_name"
                type="text"
                required
                value={form.full_name}
                onChange={handleChange}
                onBlur={handleBlur}
                className={inputCls}
                placeholder={t("publicJobs.application.placeholders.fullName")}
                autoComplete="name"
              />
              {fieldErrors.full_name && (
                <p className="mt-1 text-xs text-danger">{fieldErrors.full_name}</p>
              )}
            </Field>

            <Field label={t("publicJobs.application.email")} id="email" required>
              <input
                id="email"
                name="email"
                type="email"
                required
                value={form.email}
                onChange={handleChange}
                onBlur={handleBlur}
                className={inputCls}
                placeholder={t("publicJobs.application.placeholders.email")}
                autoComplete="email"
              />
              {fieldErrors.email && (
                <p className="mt-1 text-xs text-danger">{fieldErrors.email}</p>
              )}
            </Field>

            <Field label={t("publicJobs.application.phone")} id="phone">
              <input
                id="phone"
                name="phone"
                type="tel"
                value={form.phone}
                onChange={handleChange}
                onBlur={handleBlur}
                className={inputCls}
                placeholder={t("publicJobs.application.placeholders.phone")}
                autoComplete="tel"
              />
              {fieldErrors.phone && (
                <p className="mt-1 text-xs text-danger">{fieldErrors.phone}</p>
              )}
            </Field>

            <Field label={t("publicJobs.application.linkedin")} id="linkedin_url">
              <input
                id="linkedin_url"
                name="linkedin_url"
                type="url"
                value={form.linkedin_url}
                onChange={handleChange}
                onBlur={handleBlur}
                className={inputCls}
                placeholder={t("publicJobs.application.placeholders.linkedin")}
              />
              {fieldErrors.linkedin_url && (
                <p className="mt-1 text-xs text-danger">{fieldErrors.linkedin_url}</p>
              )}
            </Field>
          </div>
        </section>

        <section>
          <h2 className="mb-4 border-b border-line pb-2 text-base font-semibold text-ink">
            {t("publicJobs.application.resumeSection")}
          </h2>
          <Field label={t("publicJobs.application.resumeUpload")} id="resume">
            {resumeFile ? (
              <div className="flex items-center gap-3 rounded-md border border-line-2 bg-canvas px-3 py-2">
                <span className="flex-1 truncate text-sm text-ink-2">
                  {resumeFile.name}
                </span>
                <button
                  type="button"
                  onClick={clearResume}
                  className="shrink-0 text-xs text-danger hover:text-danger"
                >
                  {t("publicJobs.application.removeFile")}
                </button>
              </div>
            ) : (
              <input
                id="resume"
                name="resume"
                type="file"
                accept=".pdf,.doc,.docx"
                onChange={handleResumeChange}
                className="block w-full text-sm text-ink-2 file:me-3 file:rounded-md file:border-0 file:bg-copper/10 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-copper hover:file:bg-copper/20"
              />
            )}
          </Field>
          {resumeError && <p className="mt-1 text-xs text-danger">{resumeError}</p>}
          <p className="mt-1 text-xs text-ink-3">
            {t("publicJobs.application.fileHint", { maxSize: MAX_FILE_SIZE_MB })}
          </p>
        </section>

        <section>
          <h2 className="mb-1 border-b border-line pb-2 text-base font-semibold text-ink">
            {t("publicJobs.application.interviewSection")}
          </h2>
          <p className="mb-4 text-xs text-ink-2">
            {t("publicJobs.application.interviewSectionHint")}
          </p>
          <div className="space-y-4">
            <Field label={t("publicJobs.application.serviceConcept")} id="service_concept">
              <textarea
                id="service_concept"
                name="service_concept"
                value={form.service_concept}
                onChange={handleChange}
                onBlur={handleBlur}
                className={textareaCls}
                placeholder={t("publicJobs.application.placeholders.serviceConcept")}
              />
              {fieldErrors.service_concept && (
                <p className="mt-1 text-xs text-danger">{fieldErrors.service_concept}</p>
              )}
            </Field>

            <Field label={t("publicJobs.application.salaryExpectations")} id="salary_expectations">
              <textarea
                id="salary_expectations"
                name="salary_expectations"
                value={form.salary_expectations}
                onChange={handleChange}
                onBlur={handleBlur}
                className={textareaCls}
                placeholder={t("publicJobs.application.placeholders.salaryExpectations")}
              />
              {fieldErrors.salary_expectations && (
                <p className="mt-1 text-xs text-danger">{fieldErrors.salary_expectations}</p>
              )}
            </Field>

            <Field label={t("publicJobs.application.militaryService")} id="military_service_details">
              <textarea
                id="military_service_details"
                name="military_service_details"
                value={form.military_service_details}
                onChange={handleChange}
                onBlur={handleBlur}
                className={textareaCls}
                placeholder={t("publicJobs.application.placeholders.militaryService")}
              />
              {fieldErrors.military_service_details && (
                <p className="mt-1 text-xs text-danger">{fieldErrors.military_service_details}</p>
              )}
            </Field>

            <Field label={t("publicJobs.application.transportation")} id="transportation">
              <textarea
                id="transportation"
                name="transportation"
                value={form.transportation}
                onChange={handleChange}
                onBlur={handleBlur}
                className={textareaCls}
                placeholder={t("publicJobs.application.placeholders.transportation")}
              />
              {fieldErrors.transportation && (
                <p className="mt-1 text-xs text-danger">{fieldErrors.transportation}</p>
              )}
            </Field>

            <Field label={t("publicJobs.application.strength")} id="personality_strength">
              <textarea
                id="personality_strength"
                name="personality_strength"
                value={form.personality_strength}
                onChange={handleChange}
                onBlur={handleBlur}
                className={textareaCls}
                placeholder={t("publicJobs.application.placeholders.strength")}
              />
              {fieldErrors.personality_strength && (
                <p className="mt-1 text-xs text-danger">{fieldErrors.personality_strength}</p>
              )}
            </Field>

            <Field label={t("publicJobs.application.weakness")} id="personality_weakness">
              <textarea
                id="personality_weakness"
                name="personality_weakness"
                value={form.personality_weakness}
                onChange={handleChange}
                onBlur={handleBlur}
                className={textareaCls}
                placeholder={t("publicJobs.application.placeholders.weakness")}
              />
              {fieldErrors.personality_weakness && (
                <p className="mt-1 text-xs text-danger">{fieldErrors.personality_weakness}</p>
              )}
            </Field>
          </div>
        </section>

        <div className="border-t border-line pt-6">
          <button
            type="submit"
            disabled={submitting || !!resumeError}
            className="w-full rounded-md bg-copper px-6 py-3 text-sm font-medium text-white hover:bg-gold focus:ring-2 focus:ring-copper focus:ring-offset-2 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
          >
            {submitting ? t("publicJobs.application.submittingText") : t("publicJobs.application.submitText")}
          </button>
        </div>
      </form>
    </div>
  );
}
