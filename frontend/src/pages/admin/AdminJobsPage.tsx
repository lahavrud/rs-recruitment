import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { approveJob, getPendingJobs, rejectJob } from "@/services/admin";
import type { JobRead } from "@/types/api";

function formatDate(iso: string, locale: string) {
  return new Date(iso).toLocaleDateString(locale === "he" ? "he-IL" : "en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function AdminJobsPage() {
  const { t, i18n } = useTranslation();
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
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t("admin.jobs.title")}</h1>
          <p className="mt-1 text-sm text-gray-500">
            {t("admin.jobs.subtitle")}
          </p>
        </div>
        {!loading && (
          <span className="rounded-full bg-yellow-50 px-3 py-1 text-sm font-medium text-yellow-700">
            {jobs.length} {t("admin.jobs.pending")}
          </span>
        )}
      </div>

      {error && (
        <div className="mb-4 rounded-md bg-red-50 p-4 text-sm text-red-700">{error}</div>
      )}

      {loading ? (
        <div className="flex justify-center py-16 text-gray-400">{t("admin.jobs.loading")}</div>
      ) : jobs.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 py-20 text-center text-gray-400">
          {t("admin.jobs.empty")}
        </div>
      ) : (
        <div className="space-y-3">
          {jobs.map((job) => {
            const busy = acting === job.id;
            return (
              <div
                key={job.id}
                className="flex flex-col gap-4 rounded-lg border border-gray-200 bg-white p-5 sm:flex-row sm:items-start sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="font-semibold text-gray-900">{job.title}</p>
                  <p className="mt-0.5 text-sm text-gray-500">{job.location}</p>
                  <p className="mt-1 text-xs text-gray-400">
                    {t("admin.jobs.companyLabel", { id: job.company_id })} · {t("admin.jobs.submittedLabel")} {formatDate(job.created_at, i18n.language)}
                  </p>
                  <p className="mt-2 line-clamp-2 text-sm text-gray-600">
                    {job.description}
                  </p>
                </div>

                <div className="flex shrink-0 gap-2">
                  <button
                    onClick={() => handleApprove(job.id)}
                    disabled={busy}
                    className="rounded-md bg-green-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
                  >
                    {busy ? "…" : t("admin.jobs.approve")}
                  </button>
                  <button
                    onClick={() => handleReject(job.id)}
                    disabled={busy}
                    className="rounded-md border border-red-300 px-4 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
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
