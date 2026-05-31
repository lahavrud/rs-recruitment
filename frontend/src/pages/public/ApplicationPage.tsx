import {
  type ChangeEvent,
  type FocusEvent,
  type FormEvent,
  useEffect,
  useState,
} from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { getPublicJob, submitApplication } from "@/services/jobs";
import { trackEvent } from "@/utils/analytics";
import { getMe as getCandidateMe } from "@/services/candidate";
import SeoHead, { SITE_URL } from "@/components/ui/SeoHead";
import type { CandidateApplicationForm, JobPublicRead } from "@/types/api";
import { UserRole } from "@/types/api";
import { useAuth } from "@/hooks/useAuth";
import axios from "axios";
import Stepper from "./components/Stepper";
import type { Step } from "./components/Stepper";
import IdentityStep from "./components/IdentityStep";
import ResumeStep from "./components/ResumeStep";
import QuestionsStep from "./components/QuestionsStep";
import ClaimAccountSection from "./components/ClaimAccountSection";
import PrivacyModal from "./components/PrivacyModal";
import TermsModal from "./components/TermsModal";
import StepNav from "./components/StepNav";
import SuccessScreen from "./components/SuccessScreen";
import JobHeader from "./components/JobHeader";
import ApplicationStatus from "./components/ApplicationStatus";

const ALLOWED_EXTENSIONS = [".pdf", ".doc", ".docx"];
const MAX_FILE_SIZE_MB = 10;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
const TEXT_FIELD_MAX = 2000;

const TOTAL_STEPS = 3;

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
  const [savedResumeFilename, setSavedResumeFilename] = useState<string | null>(null);
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

  function validateField(name: string, value: string): string | null {
    if (name === "full_name") {
      if (!value.trim()) return t("publicJobs.application.validation.fullNameRequired");
      if (value.trim().length < 2) return t("publicJobs.application.validation.fullNameMin");
      if (value.length > 100) return t("publicJobs.application.validation.fullNameMax");
    }
    if (name === "email") {
      if (!value.trim()) return t("publicJobs.application.validation.emailRequired");
      if (value.length > 255) return t("publicJobs.application.validation.emailMax");
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))
        return t("publicJobs.application.validation.emailInvalid");
    }
    if (name === "phone") {
      if (!value.trim()) return t("publicJobs.application.validation.phoneRequired");
      if (!/^[+\d\s()-]*$/.test(value))
        return t("publicJobs.application.validation.phoneInvalid");
      // Israeli mobile: exactly 10 digits starting with 05 after stripping
      // spaces/dashes/parens. Matches backend `_validate_phone_value`.
      if (!/^05\d{8}$/.test(value.replace(/\D/g, "")))
        return t("publicJobs.application.validation.phoneFormat");
    }
    if (name === "linkedin_url" && value.trim()) {
      let parsed: URL;
      try { parsed = new URL(value); } catch {
        return t("publicJobs.application.validation.urlInvalid");
      }
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:")
        return t("publicJobs.application.validation.urlProtocol");
      if (!parsed.hostname.endsWith("linkedin.com"))
        return t("publicJobs.application.validation.urlLinkedin");
    }
    if ((STEP_3_FIELDS as readonly string[]).includes(name) && value.length > TEXT_FIELD_MAX)
      return t("publicJobs.application.validation.textMax");
    return null;
  }

  function validateStep(target: Step): boolean {
    const errors: Record<string, string> = { ...fieldErrors };
    let ok = true;
    if (target === 1) {
      for (const name of STEP_1_FIELDS) {
        const err = validateField(name, form[name] ?? "");
        if (err) { errors[name] = err; ok = false; } else { delete errors[name]; }
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
      if (err) { errors[name] = err; ok = false; } else { delete errors[name]; }
    }
    // Consent only validated on the anonymous path — logged-in candidates
    // already accepted at activation time (Sprint 11 / #605).
    if (!isLoggedInCandidate) {
      if (!privacyAccepted) { errors.privacy = t("publicJobs.application.validation.privacyRequired"); ok = false; }
      else { delete errors.privacy; }
      if (!termsAccepted) { errors.terms = t("publicJobs.application.validation.termsRequired"); ok = false; }
      else { delete errors.terms; }
    } else {
      delete errors.privacy;
      delete errors.terms;
    }
    setFieldErrors(errors);
    return ok;
  }

  function handleBlur(e: FocusEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const { name, value } = e.target;
    setFieldErrors((prev) => ({ ...prev, [name]: validateField(name, value) || "" }));
  }

  function handleChange(e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (fieldErrors[name]) setFieldErrors((prev) => ({ ...prev, [name]: "" }));
  }

  // Lock body scroll when any legal modal is open
  useEffect(() => {
    document.body.style.overflow = privacyOpen || termsOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [privacyOpen, termsOpen]);

  // ── Job fetch ───────────────────────────────────────────────────────────

  useEffect(() => {
    if (!Number.isFinite(jobId)) { navigate("/jobs", { replace: true }); return; }
    let cancelled = false;
    async function fetchJob() {
      try {
        const data = await getPublicJob(jobId);
        if (!cancelled) setJob(data);
      } catch (err) {
        if (!cancelled) {
          setJobError(
            axios.isAxiosError(err) && err.response?.status === 404
              ? t("publicJobs.application.unavailable")
              : t("publicJobs.application.errorLoad"),
          );
        }
      } finally {
        if (!cancelled) setJobLoading(false);
      }
    }
    fetchJob();
    return () => { cancelled = true; };
  }, [jobId, navigate, t]);

  // Logged-in candidate: prefill identity + autofill fields from
  // /api/candidate/me so they don't retype data they already gave us.
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
        if (me.resume_path) setSavedResumeFilename(me.resume_path.split("/").pop() ?? "resume");
        setProfilePrefilled(true);
      } catch {
        // Non-fatal — the form still works without prefill.
      }
    })();
    return () => { cancelled = true; };
  }, [isLoggedInCandidate]);

  useEffect(() => {
    if (job) trackEvent("apply_start", { job_id: job.id, job_title: job.title });
  }, [job]);

  // ── Resume handling ─────────────────────────────────────────────────────

  function ingestResume(file: File | null) {
    setResumeError(null);
    if (!file) { setResumeFile(null); return; }
    const ext = "." + file.name.split(".").pop()?.toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      setResumeError(t("publicJobs.application.resumeErrors.invalidExtension"));
      return;
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      setResumeError(t("publicJobs.application.resumeErrors.fileTooBig", { maxSize: MAX_FILE_SIZE_MB }));
      return;
    }
    setResumeFile(file);
  }

  function handleResumeChange(e: ChangeEvent<HTMLInputElement>) {
    ingestResume(e.target.files?.[0] ?? null);
    e.target.value = ""; // Reset so same file can be re-picked after remove
  }

  function clearResume() { setResumeFile(null); setResumeError(null); }

  // ── Step navigation ─────────────────────────────────────────────────────

  function handleNext() {
    if (!validateStep(step)) return;
    const next = Math.min(step + 1, TOTAL_STEPS) as Step;
    setStep(next);
    if (next > maxStep) setMaxStep(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleBack() {
    if (step > 1) { setStep((s) => (s - 1) as Step); window.scrollTo({ top: 0, behavior: "smooth" }); }
  }

  function jumpTo(target: Step) {
    if (target === step || target > maxStep) return;
    if (target < step) { setStep(target); window.scrollTo({ top: 0, behavior: "smooth" }); return; }
    // Forward jumps must clear validation for every intermediate step.
    for (let s = step; s < target; s++) {
      if (!validateStep(s as Step)) { setStep(s as Step); window.scrollTo({ top: 0, behavior: "smooth" }); return; }
    }
    setStep(target);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // The form's onSubmit is ONLY allowed to perform the real network submit,
  // and only when we're on the final step. Any other submit-shaped event is
  // swallowed — belt-and-braces against stray Enter keypresses or implicit
  // single-control submissions triggering premature POSTs.
  function handleFormSubmit(e: FormEvent) {
    e.preventDefault();
    if (step !== TOTAL_STEPS) return;
    void doFinalSubmit();
  }

  function describeServerError(err: unknown): string {
    if (!axios.isAxiosError(err)) return t("publicJobs.application.errors.generic");
    const status = err.response?.status;
    const detail = err.response?.data?.detail;
    if (status === 409) {
      const code = typeof detail === "object" ? detail?.error_code : null;
      if (code === "already_applied_locked") return t("publicJobs.application.errors.alreadyApplied");
      if (code === "email_already_registered") return t("publicJobs.application.errors.emailAlreadyRegistered");
      return t("publicJobs.application.errors.alreadyApplied");
    }
    if (status === 404) return t("publicJobs.application.errors.jobUnavailable");
    if (status === 400) {
      if (detail === "privacy_consent_required") return t("publicJobs.application.validation.privacyRequired");
      if (detail === "terms_consent_required") return t("publicJobs.application.validation.termsRequired");
      if (detail === "passwords_do_not_match") return t("publicJobs.application.validation.passwordMismatch");
    }
    return t("publicJobs.application.errors.generic");
  }

  async function doFinalSubmit() {
    if (!Number.isFinite(jobId) || step !== TOTAL_STEPS) return;
    // Re-validate all steps before posting.
    if (!validateStep(1)) { setStep(1); return; }
    if (!validateStep(2)) { setStep(2); return; }
    if (!validateStep(3)) return;

    // Client-side password guard before multipart submission.
    if (!isLoggedInCandidate && claimAccount) {
      if (claimPassword !== claimPasswordConfirm) {
        setClaimError(t("publicJobs.application.validation.passwordMismatch"));
        return;
      }
      if (claimPassword.length < 8) {
        setClaimError(t("publicJobs.application.validation.passwordMin"));
        return;
      }
      setClaimError(null);
    }

    setSubmitting(true);
    setSubmitError(null);
    try {
      await submitApplication(jobId, form, resumeFile, {
        password: !isLoggedInCandidate && claimAccount && claimPassword ? claimPassword : null,
      });
      trackEvent("apply_submit", { job_id: jobId, job_title: job?.title ?? "" });
      setSuccess(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      // 409 already_applied_editable carries an application_id — redirect to editor.
      if (axios.isAxiosError(err) && err.response?.status === 409) {
        const d = err.response?.data?.detail;
        if (d && typeof d === "object" && d.error_code === "already_applied_editable" && typeof d.application_id === "number") {
          navigate(`/candidate/applications/${d.application_id}`);
          return;
        }
      }
      setSubmitError(describeServerError(err));
    } finally {
      setSubmitting(false);
    }
  }

  // ── Early returns ───────────────────────────────────────────────────────

  if (jobLoading) return <ApplicationStatus variant="loading" />;
  if (jobError) return <ApplicationStatus variant="error" message={jobError} />;
  if (success) return <SuccessScreen jobTitle={job?.title} claimAccount={claimAccount} />;

  // ── Main render ─────────────────────────────────────────────────────────

  const stepHint =
    step === 1 ? t("publicJobs.application.identityStepHint")
    : step === 2 ? t("publicJobs.application.resumeStepHint")
    : null;

  return (
    /* full-width bg; StepNav is sticky-until-parent-ends */
    <div className="flex min-h-screen flex-col bg-page">
      <div className="flex-1 overflow-auto">
        <div className="mx-auto max-w-2xl px-6 pt-24 pb-8">
          <SeoHead
            title={job ? `${t("publicJobs.application.applyFor")} ${job.title}` : t("publicJobs.application.applyFor")}
            description={`${t("publicJobs.application.applyFor")}${job ? ` ${job.title}` : ""} ב-RS Recruiting.`}
            canonical={`${SITE_URL}/jobs/${jobId}/apply`}
            noIndex
          />

          <JobHeader job={job} jobId={jobId} />
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
            {stepHint && <p className="text-sm leading-relaxed text-white/45">{stepHint}</p>}

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

      {/* StepNav sticky bottom-0 inside bg-page — stops at footer naturally */}
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
