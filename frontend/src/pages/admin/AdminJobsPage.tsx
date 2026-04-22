import { useEffect, useState } from "react";
import { approveJob, getPendingJobs, rejectJob } from "@/services/admin";
import type { JobRead } from "@/types/api";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function AdminJobsPage() {
  const [jobs, setJobs] = useState<JobRead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [acting, setActing] = useState<number | null>(null);

  useEffect(() => {
    getPendingJobs()
      .then(setJobs)
      .catch(() => setError("Failed to load pending jobs."))
      .finally(() => setLoading(false));
  }, []);

  async function handleApprove(jobId: number) {
    setActing(jobId);
    try {
      await approveJob(jobId);
      setJobs((prev) => prev.filter((j) => j.id !== jobId));
    } catch {
      setError("Failed to approve job.");
    } finally {
      setActing(null);
    }
  }

  async function handleReject(jobId: number) {
    if (!confirm("Reject this job posting? It will be marked as Closed.")) return;
    setActing(jobId);
    try {
      await rejectJob(jobId);
      setJobs((prev) => prev.filter((j) => j.id !== jobId));
    } catch {
      setError("Failed to reject job.");
    } finally {
      setActing(null);
    }
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pending Jobs</h1>
          <p className="mt-1 text-sm text-gray-500">
            Review and approve job postings before they go live.
          </p>
        </div>
        {!loading && (
          <span className="rounded-full bg-yellow-50 px-3 py-1 text-sm font-medium text-yellow-700">
            {jobs.length} pending
          </span>
        )}
      </div>

      {error && (
        <div className="mb-4 rounded-md bg-red-50 p-4 text-sm text-red-700">{error}</div>
      )}

      {loading ? (
        <div className="flex justify-center py-16 text-gray-400">Loading…</div>
      ) : jobs.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 py-20 text-center text-gray-400">
          No pending job postings.
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
                {/* Info */}
                <div className="min-w-0">
                  <p className="font-semibold text-gray-900">{job.title}</p>
                  <p className="mt-0.5 text-sm text-gray-500">{job.location}</p>
                  <p className="mt-1 text-xs text-gray-400">
                    Company #{job.company_id} · Submitted {formatDate(job.created_at)}
                  </p>
                  <p className="mt-2 line-clamp-2 text-sm text-gray-600">
                    {job.description}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex shrink-0 gap-2">
                  <button
                    onClick={() => handleApprove(job.id)}
                    disabled={busy}
                    className="rounded-md bg-green-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
                  >
                    {busy ? "…" : "Approve"}
                  </button>
                  <button
                    onClick={() => handleReject(job.id)}
                    disabled={busy}
                    className="rounded-md border border-red-300 px-4 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                  >
                    {busy ? "…" : "Reject"}
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
