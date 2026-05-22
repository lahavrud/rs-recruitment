import {
  type ChangeEvent,
  type FocusEvent,
  type FormEvent,
  useEffect,
  useState,
} from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { getPublicJob, submitApplication } from "@/services/jobs";
import { trackEvent } from "@/utils/analytics";
import { EMAIL_RE, MOBILE_RE } from "@/utils/validators";
import { getMe as getCandidateMe } from "@/services/candidate";
import SeoHead, { SITE_URL } from "@/components/ui/SeoHead";
import type { CandidateApplicationForm, JobPublicRead } from "@/types/api";
import { UserRole } from "@/types/api";
import { useAuth } from "@/hooks/useAuth";
import axios from "axios";
import Stepper from "./components/Stepper";
import Eyebrow from "@/components/ui/Eyebrow";
import IdentityStep from "./components/IdentityStep";
import ResumeStep from "./components/ResumeStep";
import QuestionsStep from "./components/QuestionsStep";
import ClaimAccountSection from "./components/ClaimAccountSection";
import { PrivacyModal, TermsModal } from "./components/LegalModals";
import StepNav from "./components/StepNav";
import {
  RESUME_ALLOWED_EXTENSIONS,
  RESUME_MAX_FILE_SIZE_BYTES,
  RESUME_MAX_FILE_SIZE_MB,
} from "@/utils/resume";

const TEXT_FIELD_MAX = 2000;

const TOTAL_STEPS = 3;
type Step = 1 | 2 | 3;

const EMPTY_FORM: Omit<CandidateApplicationForm, "job_id"> = {
  full_name: "",
  email: "",
  phone: "",
  linkedin_url: "",
  service_concept: "",
  salary_expectations: "",
  growth_area: "",
  strength: "",
};

const STEP_1_FIELDS = ["full_name", "email", "phone", "linkedin_url"] as const;
const STEP_3_FIELDS = [
  "service_concept",
  "salary_expectations",
  "strength",
  "growth_area",
] as const;

// ── Page ──────────────────────────────────────────────────────────────────

export default function ApplicationPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const jobId = id !== undefined ? Number.parseInt(id, 10) : NaN;

  const { user } = useAuth();
  // Logged-in candidate: their session email is the canonical email — the
  // backend ignores the form field, and we hide consent + the claim toggle
  // since consent was captured at activation (Sprint 11 / #605, #606).
  const isLoggedInCandidate = user?.role === UserRole.CANDIDATE;

  const [job, setJob] = useState<JobPublicRead | null>(null);
  const [jobLoading, setJobLoading] = useState(true);
  const [jobError, setJobError] = useState<string | null>(null);

  const [form, setForm] = useState<Omit<CandidateApplicationForm, "job_id">>(() =>
    isLoggedInCandidate ? { ...EMPTY_FORM, email: user!.email } : EMPTY_FORM,
  );
  // Anonymous-only claim toggle: when checked we send password +
  // password_confirm with the apply submission.
  const [claimAccount, setClaimAccount] = useState(false);
  const [claimPassword, setClaimPassword] = useState("");
  const [claimPasswordConfirm, setClaimPasswordConfirm] = useState("");
  const [claimError, setClaimError] = useState<string | null>(null);
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [resumeError, setResumeError] = useState<string | null>(null);
  // Sprint 11 PR B: logged-in candidates can apply with their existing
  // profile-resume snapshot (no re-upload). When this is set and the user
  // hasn't picked a new file, we submit without a `resume` part and the
  // backend reuses `CandidateProfile.resume_path`.
  const [savedResumeFilename, setSavedResumeFilename] = useState<string | null>(
    null,
  );
  const [profilePrefilled, setProfilePrefilled] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [termsOpen, setTermsOpen] = useState(false);

  // Wizard state — track current step + the highest step reached so the
  // stepper only lets candidates jump back to steps they've completed.
  const [step, setStep] = useState<Step>(1);
  const [maxStep, setMaxStep] = useState<Step>(1);

  // ── Validation ──────────────────────────────────────────────────────────

  function validateClaimPassword(val: string): string | null {
    const key = checkPasswordComplexity(val);
    return key ? t(key) : null;
  }

  function validateField(name: string, value: string): string | null {
    if (name === "full_name") {
      if (!value.trim())
        return t("publicJobs.application.validation.fullNameRequired");
      if (value.trim().length < 2)
        return t("publicJobs.application.validation.fullNameMin");
      if (value.length > 100)
        return t("publicJobs.application.validation.fullNameMax");
    }
    if (name === "email") {
      if (!value.trim())
        return t("publicJobs.application.validation.emailRequired");
      if (value.length > 255)
        return t("publicJobs.application.validation.emailMax");
      if (!EMAIL_RE.test(value))
        return t("publicJobs.application.validation.emailInvalid");
    }
    if (name === "phone") {
      if (!value.trim())
        return t("publicJobs.application.validation.phoneRequired");
      if (!MOBILE_RE.test(value.replace(/\D/g, "")))
        return t("publicJobs.application.validation.phoneFormat");
    }
    if (name === "linkedin_url" && value.trim()) {
      let parsed: URL;
      try {
        parsed = new URL(value);
      } catch {
        return t("publicJobs.application.validation.urlInvalid");
      }
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
        return t("publicJobs.application.validation.urlProtocol");
      }
      if (!parsed.hostname.endsWith("linkedin.com")) {
        return t("publicJobs.application.validation.urlLinkedin");
      }
    }
    if (
      (STEP_3_FIELDS as readonly string[]).includes(name) &&
      value.length > TEXT_FIELD_MAX
    ) {
      return t("publicJobs.application.validation.textMax");
    }
    return null;
  }

  function validateStep(target: Step): boolean {
    const errors: Record<string, string> = { ...fieldErrors };
    let ok = true;

    if (target === 1) {
      for (const name of STEP_1_FIELDS) {
        const err = validateField(name, form[name] ?? "");
        if (err) {
          errors[name] = err;
          ok = false;
        } else {
          delete errors[name];
        }
      }
      setFieldErrors(errors);
      return ok;
    }

    if (target === 2) {
      // A new upload OR the saved-profile-resume affordance both satisfy
      // the "every live application has a resume" backend rule.
      if (!resumeFile && !savedResumeFilename) {
        setResumeError(t("publicJobs.application.resumeErrors.required"));
        return false;
      }
      if (resumeError) return false;
      return true;
    }

    // Step 3 fields are optional — only validate maxlen + consent.
    for (const name of STEP_3_FIELDS) {
      const err = validateField(name, form[name] ?? "");
      if (err) {
        errors[name] = err;
        ok = false;
      } else {
        delete errors[name];
      }
    }
    // Consent only validated on the anonymous path — logged-in candidates
    // already accepted at activation time (Sprint 11 / #605).
    if (!isLoggedInCandidate) {
      if (!privacyAccepted) {
        errors.privacy = t("publicJobs.application.validation.privacyRequired");
        ok = false;
      } else {
        delete errors.privacy;
      }
      if (!termsAccepted) {
        errors.terms = t("publicJobs.application.validation.termsRequired");
        ok = false;
      } else {
        delete errors.terms;
      }
    } else {
      delete errors.privacy;
      delete errors.terms;
    }
    setFieldErrors(errors);
    return ok;
  }

  function handleBlur(e: FocusEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const { name, value } = e.target;
    const error = validateField(name, value);
    setFieldErrors((prev) => ({ ...prev, [name]: error || "" }));
  }

  function handleChange(e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (fieldErrors[name]) {
      setFieldErrors((prev) => ({ ...prev, [name]: "" }));
    }
  }

  // Lock body scroll when any legal modal is open
  useEffect(() => {
    document.body.style.overflow = privacyOpen || termsOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [privacyOpen, termsOpen]);

  // ── Job fetch ───────────────────────────────────────────────────────────

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

  // Logged-in candidate: prefill identity + autofill fields from
  // /api/candidate/me so they don't retype data they already gave us. If
  // the profile already has a resume_path, expose the "use saved resume"
  // affordance — submitting without a new file lets the backend reuse the
  // existing snapshot (PR B / backend resume_required fallback).
  useEffect(() => {
    if (!isLoggedInCandidate) return;
    let cancelled = false;
    (async () => {
      try {
        const me = await getCandidateMe();
        if (cancelled) return;
        setForm((prev) => ({
          ...prev,
          full_name: me.full_name || prev.full_name,
          email: me.email,
          phone: me.phone ?? prev.phone,
          linkedin_url: me.linkedin_url ?? prev.linkedin_url,
        }));
        if (me.resume_path) {
          setSavedResumeFilename(me.resume_path.split("/").pop() ?? "resume");
        }
        setProfilePrefilled(true);
      } catch {
        // Non-fatal — the form still works without prefill. The candidate
        // can type their data manually.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isLoggedInCandidate]);

  useEffect(() => {
    if (!job) return;
    trackEvent("apply_start", { job_id: job.id, job_title: job.title });
  }, [job]);

  // ── Resume handling (drag-drop + click) ─────────────────────────────────

  function ingestResume(file: File | null) {
    setResumeError(null);
    if (!file) {
      setResumeFile(null);
      return;
    }
    const ext = "." + file.name.split(".").pop()?.toLowerCase();
    if (!(RESUME_ALLOWED_EXTENSIONS as readonly string[]).includes(ext)) {
      setResumeError(
        t("publicJobs.application.resumeErrors.invalidExtension"),
      );
      return;
    }
    if (file.size > RESUME_MAX_FILE_SIZE_BYTES) {
      setResumeError(
        t("publicJobs.application.resumeErrors.fileTooBig", {
          maxSize: RESUME_MAX_FILE_SIZE_MB,
        }),
      );
      return;
    }
    setResumeFile(file);
  }

  function handleResumeChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    ingestResume(file);
    // Reset the input so the same file can be re-picked after a remove.
    e.target.value = "";
  }

  function clearResume() {
    setResumeFile(null);
    setResumeError(null);
  }

  // ── Step navigation ─────────────────────────────────────────────────────

  function handleNext() {
    if (!validateStep(step)) return;
    const next = Math.min(step + 1, TOTAL_STEPS) as Step;
    setStep(next);
    if (next > maxStep) setMaxStep(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleBack() {
    if (step > 1) {
      setStep((s) => (s - 1) as Step);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  function jumpTo(target: Step) {
    if (target === step || target > maxStep) return;
    // Backward jumps are always free — the user can edit any reached step.
    if (target < step) {
      setStep(target);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    // Forward jumps must clear validation for every intermediate step;
    // otherwise the candidate could re-break a field on step 1, click
    // step 3 in the stepper, and skip past the invalid state.
    for (let s = step; s < target; s++) {
      if (!validateStep(s as Step)) {
        setStep(s as Step);
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
    }
    setStep(target);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // The form's onSubmit is ONLY allowed to perform the real network submit,
  // and only when we're on the final step. Any other submit-shaped event
  // (a stray Enter keypress, a future button that forgets type="button",
  // an implicit single-control form submission, etc.) is swallowed. This
  // is intentional belt-and-braces: a previous version routed non-final
  // submits through handleNext, which caused the wizard to surprise-submit
  // when transitioning between steps.
  function handleFormSubmit(e: FormEvent) {
    e.preventDefault();
    if (step !== TOTAL_STEPS) return;
    void doFinalSubmit();
  }

  /**
   * Pull a useful message out of a FastAPI error. Returns a Hebrew message
   * that mentions the offending field when we can identify one, so
   * candidates aren't stuck on a generic "something went wrong" toast.
   */
  function describeServerError(err: unknown): string {
    if (!axios.isAxiosError(err)) {
      return t("publicJobs.application.errors.generic");
    }
    const httpStatus = err.response?.status;
    const detail = err.response?.data?.detail;
    if (httpStatus === 409) {
      const code = typeof detail === "object" ? detail?.error_code : null;
      // already_applied_editable is handled by the caller (redirect to edit
      // page); only the locked + email-collision cases need a string here.
      if (code === "already_applied_locked") {
        return t("publicJobs.application.errors.alreadyApplied");
      }
      if (code === "email_already_registered") {
        return t("publicJobs.application.errors.emailAlreadyRegistered");
      }
      return t("publicJobs.application.errors.alreadyApplied");
    }
    if (httpStatus === 404) {
      return t("publicJobs.application.errors.jobUnavailable");
    }
    if (httpStatus === 400) {
      if (detail === "privacy_consent_required") {
        return t("publicJobs.application.validation.privacyRequired");
      }
      if (detail === "terms_consent_required") {
        return t("publicJobs.application.validation.termsRequired");
      }
      if (detail === "passwords_do_not_match") {
        return t("publicJobs.application.validation.passwordMismatch");
      }
      return t("publicJobs.application.errors.generic");
    }
    return t("publicJobs.application.errors.generic");
  }

  async function doFinalSubmit() {
    if (!Number.isFinite(jobId)) return;
    // Hard guard — submitting from anywhere other than the final step is a
    // bug. Bail out instead of POSTing a half-filled application.
    if (step !== TOTAL_STEPS) return;
    // Re-validate everything before final submit.
    if (!validateStep(1)) {
      setStep(1);
      return;
    }
    if (!validateStep(2)) {
      setStep(2);
      return;
    }
    if (!validateStep(3)) return;

    // Client-side guard for the claim password fields before the multipart
    // submission. The backend re-validates on the same source-of-truth.
    if (!isLoggedInCandidate && claimAccount) {
      if (claimPassword !== claimPasswordConfirm) {
        setClaimError(t("publicJobs.application.validation.passwordMismatch"));
        return;
      }
      const claimPwError = validateClaimPassword(claimPassword);
      if (claimPwError) {
        setClaimError(claimPwError);
        return;
      }
      setClaimError(null);
    }

    setSubmitting(true);
    setSubmitError(null);

    try {
      await submitApplication(jobId, form, resumeFile, {
        password:
          !isLoggedInCandidate && claimAccount && claimPassword
            ? claimPassword
            : null,
      });
      trackEvent("apply_submit", { job_id: jobId, job_title: job?.title ?? "" });
      setSuccess(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      // 409 already_applied_editable carries an application_id — redirect
      // the candidate straight to their existing application's editor (lands
      // in #610). For now navigate to the placeholder candidate-applications
      // route; if it 404s, the message in submitError still informs them.
      if (axios.isAxiosError(err) && err.response?.status === 409) {
        const detail = err.response?.data?.detail;
        if (
          detail &&
          typeof detail === "object" &&
          detail.error_code === "already_applied_editable" &&
          typeof detail.application_id === "number"
        ) {
          navigate(`/candidate/applications/${detail.application_id}`);
          return;
        }
      }
      setSubmitError(describeServerError(err));
    } finally {
      setSubmitting(false);
    }
  }

  // ── Early returns ───────────────────────────────────────────────────────

  if (jobLoading) {
    return (
      <div className="flex justify-center py-24">
        <div className="text-white/30">
          {t("publicJobs.application.loading")}
        </div>
      </div>
    );
  }

  if (jobError) {
    return (
      <div className="text-center">
        <div className="rounded-lg border border-danger/20 bg-danger/10 p-6 text-sm text-danger">
          {jobError}
        </div>
        <Link
          to="/jobs"
          className="mt-6 inline-block text-sm text-white/40 transition hover:text-copper"
        >
          {t("publicJobs.application.backToJob")}
        </Link>
      </div>
    );
  }

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6 py-8">
      <div className="w-full max-w-2xl">
        <div className="rounded-xl border border-success/20 bg-success/8 p-10 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-success/30 bg-success/10 text-lg text-success">
            ✓
          </div>
          <h2 className="mt-5 text-lg font-semibold text-white/90">
            {t("publicJobs.application.submitted")}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-white/50">
            {t("publicJobs.application.submittedMessage")}{" "}
            <span className="text-white/70">{job?.title}</span>.{" "}
            {t("publicJobs.application.submittedDetail")}
          </p>
          {claimAccount && (
            <p className="mt-4 rounded-lg border border-copper/20 bg-copper/5 px-4 py-3 text-sm leading-relaxed text-white/65">
              {t("publicJobs.application.claim.accountCreated")}
            </p>
          )}
          <Link
            to="/jobs"
            className="mt-7 inline-block rounded-sm border border-white/20 px-6 py-2.5 text-sm text-white/60 transition hover:border-white/40 hover:text-white/90"
          >
            {t("publicJobs.application.browseMore")}
          </Link>
        </div>
      </div>
      </div>
    );
  }

  // ── Main render ─────────────────────────────────────────────────────────

  const stepHint =
    step === 1
      ? t("publicJobs.application.identityStepHint")
      : step === 2
        ? t("publicJobs.application.resumeStepHint")
        : null;

  return (
    /* full-width bg; StepNav siblings here are sticky-until-parent-ends */
    <div className="flex min-h-screen flex-col bg-page">
    <div className="flex-1 overflow-auto">
    <div className="mx-auto max-w-2xl px-6 pt-24 pb-8">
      <SeoHead
        title={
          job
            ? `${t("publicJobs.application.applyFor")} ${job.title}`
            : t("publicJobs.application.applyFor")
        }
        description={`${t("publicJobs.application.applyFor")}${job ? ` ${job.title}` : ""} ב-RS Recruiting.`}
        canonical={`${SITE_URL}/jobs/${jobId}/apply`}
        noIndex
      />

      <Link
        to={`/jobs/${jobId}`}
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-white/35 transition hover:text-copper"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 16 16"
          fill="currentColor"
          className="size-4"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M6.22 4.22a.75.75 0 0 1 1.06 0l3.25 3.25a.75.75 0 0 1 0 1.06L7.28 11.78a.75.75 0 0 1-1.06-1.06L8.94 8 6.22 5.28a.75.75 0 0 1 0-1.06Z"
            clipRule="evenodd"
          />
        </svg>
        {t("publicJobs.application.backToJob")}
      </Link>

      {/* Compact job header */}
      <div className="mb-8 flex items-start justify-between gap-4 rounded-xl border border-white/8 bg-card p-5 sm:p-6">
        <div className="min-w-0">
          <Eyebrow>
            {t("publicJobs.application.applyFor")}
          </Eyebrow>
          <h1 className="mt-1 truncate text-lg font-semibold text-white/90 sm:text-xl">
            {job?.title}
          </h1>
          {job?.location && (
            <p className="mt-0.5 flex items-center gap-1.5 text-xs text-white/40">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 16 16"
                fill="currentColor"
                className="size-3 shrink-0"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M8 1.5A4.5 4.5 0 0 0 3.5 6c0 2.625 3.375 7.5 4.5 7.5S12.5 8.625 12.5 6A4.5 4.5 0 0 0 8 1.5ZM8 7.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z"
                  clipRule="evenodd"
                />
              </svg>
              {job.location}
            </p>
          )}
        </div>

      </div>

      <Stepper step={step} maxStep={maxStep} onJump={jumpTo} />

      <form id="apply-form" onSubmit={handleFormSubmit} className="mt-8 space-y-6" noValidate>
        {isLoggedInCandidate && profilePrefilled && (
          <div className="flex items-center gap-2 rounded-lg border border-copper/20 bg-copper/5 px-3 py-2 text-xs text-white/70">
            <span className="rounded-sm bg-copper/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-copper">
              {t("publicJobs.application.prefilledTag")}
            </span>
            <span className="truncate">
              {t("publicJobs.application.prefilledHint", { email: user!.email })}
            </span>
          </div>
        )}

        {submitError && (
          <div className="rounded-lg border border-danger/20 bg-danger/10 p-4 text-sm text-danger">
            {submitError}
          </div>
        )}

        {stepHint && (
          <p className="text-sm leading-relaxed text-white/45">{stepHint}</p>
        )}

        <div key={step} className="page-enter">
          {step === 1 && (
            <IdentityStep
              form={form}
              fieldErrors={fieldErrors}
              onChange={handleChange}
              onBlur={handleBlur}
              emailReadOnly={isLoggedInCandidate}
            />
          )}
          {step === 2 && (
            <ResumeStep
              file={resumeFile}
              error={resumeError}
              savedResumeFilename={savedResumeFilename}
              onFile={ingestResume}
              onPick={handleResumeChange}
              onClear={clearResume}
              onClearSaved={() => setSavedResumeFilename(null)}
            />
          )}
          {step === 3 && (
            <>
              <QuestionsStep
                form={form}
                fieldErrors={fieldErrors}
                onChange={handleChange}
                onBlur={handleBlur}
                privacyAccepted={privacyAccepted}
                onPrivacyChange={setPrivacyAccepted}
                onPrivacyOpen={() => setPrivacyOpen(true)}
                termsAccepted={termsAccepted}
                onTermsChange={setTermsAccepted}
                onTermsOpen={() => setTermsOpen(true)}
                hideConsent={isLoggedInCandidate}
              />
              {!isLoggedInCandidate && (
                <ClaimAccountSection
                  enabled={claimAccount}
                  onToggle={setClaimAccount}
                  password={claimPassword}
                  onPasswordChange={setClaimPassword}
                  passwordConfirm={claimPasswordConfirm}
                  onPasswordConfirmChange={setClaimPasswordConfirm}
                  error={claimError}
                />
              )}
            </>
          )}
        </div>

      </form>


      {privacyOpen && (
        <PrivacyModal onClose={() => { setPrivacyAccepted(true); setPrivacyOpen(false); }} />
      )}
      {termsOpen && (
        <TermsModal onClose={() => { setTermsAccepted(true); setTermsOpen(false); }} />
      )}
    </div>
    </div>

    {/* StepNav — sticky bottom-0 INSIDE bg-page div, so it naturally stops
        at the footer (sticky can't extend past its parent's bounds).
        Full-width because it's inside the full-width bg-page wrapper.      */}
    <StepNav
      step={step}
      submitting={submitting}
      privacyAccepted={isLoggedInCandidate ? true : privacyAccepted}
      termsAccepted={isLoggedInCandidate ? true : termsAccepted}
      onBack={handleBack}
      onNext={handleNext}
    />
    </div>
  );
}
