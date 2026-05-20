import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import axios from "axios";
import PageHeader from "@/components/ui/PageHeader";
import { inputCls } from "@/styles/forms";
import {
  changePassword,
  deleteResume,
  getMe,
  patchMe,
  requestDataExport,
  uploadResume,
  type CandidateMeRead,
} from "@/services/candidate";

/**
 * Candidate self-service profile (Sprint 11 / #608).
 *
 * Four sections, each owns its own submit-state so a failure on one
 * doesn't grey out the others:
 *  1. Identity         — name / phone / LinkedIn (email read-only)
 *  2. Resume           — current file + upload (replace) + remove
 *  3. Security         — change-password (current + new + confirm)
 *  4. Your data        — request GDPR export (emailed download link)
 */
export default function CandidateProfilePage() {
  const { t } = useTranslation();
  const [me, setMe] = useState<CandidateMeRead | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const data = await getMe();
        if (alive) setMe(data);
      } catch {
        if (alive) setLoadError(t("candidate.profile.errors.loadFailed"));
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [t]);

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <div className="text-white/40">{t("candidate.profile.loading")}</div>
      </div>
    );
  }
  if (loadError || !me) {
    return (
      <div className="mx-auto max-w-2xl">
        <div className="rounded-lg border border-danger/20 bg-danger/10 p-6 text-sm text-danger">
          {loadError ?? t("candidate.profile.errors.loadFailed")}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        eyebrow={t("candidate.profile.eyebrow")}
        subtitle={t("candidate.profile.subtitle")}
      />
      <IdentitySection me={me} onChange={setMe} />
      <ResumeSection me={me} onChange={setMe} />
      <SecuritySection />
      <DataExportSection />
    </div>
  );
}

// ── Identity ─────────────────────────────────────────────────────────────

function IdentitySection({
  me,
  onChange,
}: {
  me: CandidateMeRead;
  onChange: (next: CandidateMeRead) => void;
}) {
  const { t } = useTranslation();
  const [fullName, setFullName] = useState(me.full_name);
  const [phone, setPhone] = useState(me.phone);
  const [linkedin, setLinkedin] = useState(me.linkedin_url ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [state, setState] = useState<"idle" | "saved" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setState("idle");
    setError(null);
    try {
      const updated = await patchMe({
        full_name: fullName,
        phone,
        linkedin_url: linkedin.trim() ? linkedin : null,
      });
      onChange(updated);
      setState("saved");
    } catch (err) {
      setState("error");
      setError(
        axios.isAxiosError(err) && err.response?.status === 422
          ? t("candidate.profile.identity.errors.validation")
          : t("candidate.profile.identity.errors.generic"),
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Section title={t("candidate.profile.identity.title")}>
      <form className="space-y-4" onSubmit={handleSubmit}>
        <Field label={t("candidate.profile.identity.email")}>
          <input
            type="email"
            value={me.email}
            disabled
            className={`${inputCls} cursor-not-allowed opacity-60`}
            title={t("candidate.profile.identity.emailLockedHint")}
          />
        </Field>
        <Field label={t("candidate.profile.identity.fullName")}>
          <input
            type="text"
            value={fullName}
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              setFullName(e.target.value)
            }
            className={inputCls}
            required
          />
        </Field>
        <Field label={t("candidate.profile.identity.phone")}>
          <input
            type="tel"
            value={phone}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setPhone(e.target.value)}
            className={inputCls}
            required
          />
        </Field>
        <Field label={t("candidate.profile.identity.linkedin")}>
          <input
            type="url"
            value={linkedin}
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              setLinkedin(e.target.value)
            }
            className={inputCls}
            placeholder="https://linkedin.com/in/your-handle"
          />
        </Field>

        <div className="flex items-center justify-between">
          <div className="text-xs">
            {state === "saved" && (
              <span className="text-copper">
                {t("candidate.profile.identity.saved")}
              </span>
            )}
            {state === "error" && error && (
              <span className="text-danger">{error}</span>
            )}
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="rounded-sm bg-copper px-4 py-2 text-sm font-medium text-white hover:bg-gold disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting
              ? t("candidate.profile.identity.saving")
              : t("candidate.profile.identity.save")}
          </button>
        </div>
      </form>
    </Section>
  );
}

// ── Resume ───────────────────────────────────────────────────────────────

function ResumeSection({
  me,
  onChange,
}: {
  me: CandidateMeRead;
  onChange: (next: CandidateMeRead) => void;
}) {
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleUpload(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const updated = await uploadResume(file);
      onChange(updated);
    } catch (err) {
      setError(
        axios.isAxiosError(err) && err.response?.status === 422
          ? t("candidate.profile.resume.errors.invalidFile")
          : t("candidate.profile.resume.errors.generic"),
      );
    } finally {
      setBusy(false);
      // Reset input so re-selecting the same filename still triggers onChange.
      e.target.value = "";
    }
  }

  async function handleDelete() {
    if (!confirm(t("candidate.profile.resume.confirmDelete"))) return;
    setBusy(true);
    setError(null);
    try {
      const updated = await deleteResume();
      onChange(updated);
    } catch {
      setError(t("candidate.profile.resume.errors.generic"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Section title={t("candidate.profile.resume.title")}>
      <div className="space-y-3">
        <p className="text-sm text-white/60">
          {me.resume_path
            ? t("candidate.profile.resume.currentName", { name: me.resume_path })
            : t("candidate.profile.resume.none")}
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <label className="cursor-pointer rounded-sm border border-white/20 px-4 py-2 text-sm text-white/70 transition hover:border-white/40 hover:text-white">
            <input
              type="file"
              accept=".pdf,.doc,.docx"
              className="hidden"
              onChange={handleUpload}
              disabled={busy}
            />
            {me.resume_path
              ? t("candidate.profile.resume.replace")
              : t("candidate.profile.resume.upload")}
          </label>
          {me.resume_path && (
            <button
              type="button"
              disabled={busy}
              onClick={handleDelete}
              className="rounded-sm border border-danger/40 px-4 py-2 text-sm text-danger/80 transition hover:bg-danger/10 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {t("candidate.profile.resume.remove")}
            </button>
          )}
        </div>
        {error && <p className="text-xs text-danger">{error}</p>}
      </div>
    </Section>
  );
}

// ── Security ─────────────────────────────────────────────────────────────

function SecuritySection() {
  const { t } = useTranslation();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirmNext, setConfirmNext] = useState("");
  const [state, setState] = useState<"idle" | "saved" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (next !== confirmNext) {
      setState("error");
      setError(t("candidate.profile.security.errors.mismatch"));
      return;
    }
    setBusy(true);
    setError(null);
    setState("idle");
    try {
      await changePassword(current, next);
      setState("saved");
      setCurrent("");
      setNext("");
      setConfirmNext("");
    } catch (err) {
      setState("error");
      if (axios.isAxiosError(err) && err.response?.status === 401) {
        setError(t("candidate.profile.security.errors.wrongCurrent"));
      } else if (axios.isAxiosError(err) && err.response?.status === 422) {
        setError(t("candidate.profile.security.errors.weakNew"));
      } else if (axios.isAxiosError(err) && err.response?.status === 429) {
        setError(t("candidate.profile.security.errors.tooMany"));
      } else {
        setError(t("candidate.profile.security.errors.generic"));
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <Section title={t("candidate.profile.security.title")}>
      <form className="space-y-4" onSubmit={handleSubmit}>
        <Field label={t("candidate.profile.security.current")}>
          <input
            type="password"
            value={current}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setCurrent(e.target.value)}
            className={inputCls}
            autoComplete="current-password"
            required
          />
        </Field>
        <Field label={t("candidate.profile.security.new")}>
          <input
            type="password"
            value={next}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setNext(e.target.value)}
            className={inputCls}
            autoComplete="new-password"
            required
          />
        </Field>
        <Field label={t("candidate.profile.security.confirm")}>
          <input
            type="password"
            value={confirmNext}
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              setConfirmNext(e.target.value)
            }
            className={inputCls}
            autoComplete="new-password"
            required
          />
        </Field>
        <div className="flex items-center justify-between">
          <div className="text-xs">
            {state === "saved" && (
              <span className="text-copper">
                {t("candidate.profile.security.saved")}
              </span>
            )}
            {state === "error" && error && (
              <span className="text-danger">{error}</span>
            )}
          </div>
          <button
            type="submit"
            disabled={busy}
            className="rounded-sm bg-copper px-4 py-2 text-sm font-medium text-white hover:bg-gold disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy
              ? t("candidate.profile.security.changing")
              : t("candidate.profile.security.change")}
          </button>
        </div>
      </form>
    </Section>
  );
}

// ── Data export ──────────────────────────────────────────────────────────

function DataExportSection() {
  const { t } = useTranslation();
  const [state, setState] = useState<"idle" | "queued" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleRequest() {
    setBusy(true);
    setError(null);
    setState("idle");
    try {
      await requestDataExport();
      setState("queued");
    } catch (err) {
      setState("error");
      setError(
        axios.isAxiosError(err) && err.response?.status === 429
          ? t("candidate.profile.export.errors.alreadyPending")
          : t("candidate.profile.export.errors.generic"),
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <Section title={t("candidate.profile.export.title")}>
      <div className="space-y-3">
        <p className="text-sm text-white/60">
          {t("candidate.profile.export.description")}
        </p>
        <button
          type="button"
          disabled={busy}
          onClick={handleRequest}
          className="rounded-sm bg-copper px-4 py-2 text-sm font-medium text-white hover:bg-gold disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy
            ? t("candidate.profile.export.requesting")
            : t("candidate.profile.export.request")}
        </button>
        {state === "queued" && (
          <p className="text-xs text-copper">
            {t("candidate.profile.export.queuedMessage")}
          </p>
        )}
        {state === "error" && error && (
          <p className="text-xs text-danger">{error}</p>
        )}
      </div>
    </Section>
  );
}

// ── Local helpers ────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-white/10 bg-card p-6">
      <h2 className="mb-4 text-base font-semibold text-white/85">{title}</h2>
      {children}
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs text-white/55">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}
