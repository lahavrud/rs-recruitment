import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { approveJob, contactJob, getPendingJobs, rejectJob } from "@/services/admin";
import type { JobRead } from "@/types/api";
import PageHeader from "@/components/ui/PageHeader";
import { textareaCls } from "@/styles/forms";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("he-IL", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function AdminJobsPage() {
  const { t } = useTranslation();
  const [jobs, setJobs] = useState<JobRead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [acting, setActing] = useState<number | null>(null);

  const [composingJob, setComposingJob] = useState<JobRead | null>(null);
  const [contactNote, setContactNote] = useState("");
  const [contacting, setContacting] = useState(false);
  const [contactError, setContactError] = useState<string | null>(null);
  const [contactSuccess, setContactSuccess] = useState(false);

  useEffect(() => {
    getPendingJobs()
      .then(setJobs)
      .catch(() => setError(t("admin.jobs.loadError")))
      .finally(() => setLoading(false));
  }, [t]);

  async function handleApprove(jobId: number) {
    setActing(jobId);
    try {
      await approveJob(jobId);
      setJobs((prev) => prev.filter((j) => j.id !== jobId));
    } catch {
      setError(t("admin.jobs.approveError"));
    } finally {
      setActing(null);
    }
  }

  async function handleReject(jobId: number) {
    if (!confirm(t("admin.jobs.rejectConfirm"))) return;
    setActing(jobId);
    try {
      await rejectJob(jobId);
      setJobs((prev) => prev.filter((j) => j.id !== jobId));
    } catch {
      setError(t("admin.jobs.rejectError"));
    } finally {
      setActing(null);
    }
  }

  function openComposeModal(job: JobRead) {
    setComposingJob(job);
    setContactNote("");
    setContactError(null);
    setContactSuccess(false);
  }

  function closeComposeModal() {
    setComposingJob(null);
    setContactNote("");
    setContactError(null);
    setContactSuccess(false);
  }

  async function handleContact() {
    if (!composingJob) return;
    setContacting(true);
    setContactError(null);
    try {
      await contactJob(composingJob.id, contactNote);
      setContactSuccess(true);
    } catch {
      setContactError(t("admin.jobs.emailError"));
    } finally {
      setContacting(false);
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow={t("admin.jobs.title")}
        subtitle={t("admin.jobs.subtitle")}
        action={
          !loading ? (
            <span className="rounded-full bg-warning/10 px-3 py-1 text-sm font-medium text-warning">
              {jobs.length} {t("admin.jobs.pending")}
            </span>
          ) : undefined
        }
      />

      {error && (
        <div className="mb-4 rounded-lg border border-danger/20 bg-danger/10 p-4 text-sm text-danger">{error}</div>
      )}

      {loading ? (
        <div className="flex justify-center py-16 text-white/25">{t("admin.jobs.loading")}</div>
      ) : jobs.length === 0 ? (
        <div className="rounded-xl border border-dashed border-white/10 py-20 text-center text-sm text-white/25">
          {t("admin.jobs.empty")}
        </div>
      ) : (
        <div className="space-y-3">
          {jobs.map((job) => {
            const busy = acting === job.id;
            return (
              <div
                key={job.id}
                className="flex flex-col gap-4 rounded-xl border border-white/8 bg-card p-5 sm:flex-row sm:items-start sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="font-medium text-white/85">{job.title}</p>
                  <p className="mt-0.5 text-sm text-white/45">{job.location}</p>
                  <p className="mt-1 text-xs text-white/25">
                    {t("admin.jobs.companyLabel", { id: job.company_id })} · {t("admin.jobs.submittedLabel")} {formatDate(job.created_at)}
                  </p>
                  <p className="mt-2 line-clamp-2 text-sm text-white/50">{job.description}</p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <button
                    onClick={() => openComposeModal(job)}
                    disabled={busy}
                    className="rounded-sm border border-white/20 px-4 py-1.5 text-sm font-medium text-white/60 transition hover:border-white/40 hover:text-white/90 disabled:opacity-40"
                  >
                    {t("admin.jobs.email")}
                  </button>
                  <button
                    onClick={() => handleApprove(job.id)}
                    disabled={busy}
                    className="rounded-sm bg-success/15 px-4 py-1.5 text-sm font-medium text-success transition hover:bg-success/25 disabled:opacity-40"
                  >
                    {busy ? "…" : t("admin.jobs.approve")}
                  </button>
                  <button
                    onClick={() => handleReject(job.id)}
                    disabled={busy}
                    className="rounded-sm border border-danger/25 px-4 py-1.5 text-sm font-medium text-danger transition hover:bg-danger/10 disabled:opacity-40"
                  >
                    {busy ? "…" : t("admin.jobs.reject")}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Compose modal */}
      {composingJob && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-void/80 p-4"
          onClick={(e) => { if (e.target === e.currentTarget) closeComposeModal(); }}
        >
          <div className="w-full max-w-md rounded-xl border border-white/8 bg-card p-6 shadow-xl">
            <h2 className="mb-1 font-medium text-white/85">{t("admin.jobs.emailModalTitle")}</h2>
            <p className="mb-4 text-sm text-white/40">{composingJob.title}</p>

            {contactSuccess ? (
              <div className="mb-4 rounded-lg border border-success/20 bg-success/10 p-3 text-sm text-success">
                {t("admin.jobs.emailSuccess")}
              </div>
            ) : (
              <>
                <label className="mb-1 block text-xs font-medium text-white/50">
                  {t("admin.jobs.emailModalLabel")}
                </label>
                <textarea
                  className={`${textareaCls} mb-4 min-h-[120px]`}
                  placeholder={t("admin.jobs.emailModalPlaceholder")}
                  value={contactNote}
                  onChange={(e) => setContactNote(e.target.value)}
                  disabled={contacting}
                />
                {contactError && (
                  <p className="mb-3 text-sm text-danger">{contactError}</p>
                )}
              </>
            )}

            <div className="flex justify-end gap-2">
              <button
                onClick={closeComposeModal}
                className="rounded-sm border border-white/20 px-4 py-1.5 text-sm font-medium text-white/60 hover:border-white/40 hover:text-white/90"
              >
                {t("common.close")}
              </button>
              {!contactSuccess && (
                <button
                  onClick={handleContact}
                  disabled={contacting}
                  className="rounded-sm bg-copper px-4 py-1.5 text-sm font-medium text-white hover:bg-gold disabled:opacity-40"
                >
                  {contacting ? t("admin.jobs.emailSending") : t("admin.jobs.emailSend")}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
