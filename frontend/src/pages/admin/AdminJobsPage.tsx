import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { approveJob, getPendingJobs, rejectJob } from "@/services/admin";
import type { JobRead } from "@/types/api";
import PageHeader from "@/components/ui/PageHeader";

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
    </div>
  );
}
