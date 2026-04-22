import { type FormEvent, useEffect, useState } from "react";
import {
  createJob,
  deleteJob,
  getCompanyJobs,
  updateJob,
} from "@/services/companyJobs";
import { JobStatus } from "@/types/api";
import type { JobCreate, JobRead, JobUpdate } from "@/types/api";

const STATUS_LABEL: Record<string, string> = {
  PENDING_APPROVAL: "Pending Review",
  PUBLISHED: "Published",
  CLOSED: "Closed",
};

const STATUS_COLOR: Record<string, string> = {
  PENDING_APPROVAL: "bg-yellow-50 text-yellow-700",
  PUBLISHED: "bg-green-50 text-green-700",
  CLOSED: "bg-gray-100 text-gray-500",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

const EMPTY_FORM: JobCreate = { title: "", description: "", requirements: "", location: "" };

interface JobFormProps {
  initial: JobCreate;
  onSubmit: (data: JobCreate) => Promise<void>;
  onCancel: () => void;
  submitLabel: string;
}

function JobForm({ initial, onSubmit, onCancel, submitLabel }: JobFormProps) {
  const [form, setForm] = useState<JobCreate>(initial);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function set(field: keyof JobCreate, val: string) {
    setForm((prev) => ({ ...prev, [field]: val }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setErr(null);
    try {
      await onSubmit(form);
    } catch {
      setErr("Failed to save. Please try again.");
      setSaving(false);
    }
  }

  const inputCls =
    "mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none";

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-gray-700">
            Job Title <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            required
            maxLength={200}
            value={form.title}
            onChange={(e) => set("title", e.target.value)}
            className={inputCls}
            placeholder="e.g. Senior Account Manager"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-gray-700">
            Location <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            required
            maxLength={100}
            value={form.location}
            onChange={(e) => set("location", e.target.value)}
            className={inputCls}
            placeholder="e.g. Tel Aviv"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-gray-700">
            Description <span className="text-red-500">*</span>
          </label>
          <textarea
            required
            maxLength={5000}
            rows={4}
            value={form.description}
            onChange={(e) => set("description", e.target.value)}
            className={inputCls + " resize-y"}
            placeholder="Describe the role and responsibilities…"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-gray-700">
            Requirements <span className="text-red-500">*</span>
          </label>
          <textarea
            required
            maxLength={5000}
            rows={4}
            value={form.requirements}
            onChange={(e) => set("requirements", e.target.value)}
            className={inputCls + " resize-y"}
            placeholder="List required skills and qualifications…"
          />
        </div>
      </div>

      {err && <p className="text-sm text-red-600">{err}</p>}

      <div className="flex justify-end gap-2 pt-1">
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="rounded-md px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? "Saving…" : submitLabel}
        </button>
      </div>
    </form>
  );
}

type Mode = "idle" | "create" | { type: "edit"; job: JobRead };

export default function CompanyJobsPage() {
  const [jobs, setJobs] = useState<JobRead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>("idle");
  const [deleting, setDeleting] = useState<number | null>(null);

  useEffect(() => {
    getCompanyJobs()
      .then(setJobs)
      .catch(() => setError("Failed to load jobs."))
      .finally(() => setLoading(false));
  }, []);

  async function handleCreate(data: JobCreate) {
    const job = await createJob(data);
    setJobs((prev) => [job, ...prev]);
    setMode("idle");
  }

  async function handleEdit(jobId: number, data: JobCreate) {
    const update: JobUpdate = { ...data };
    const job = await updateJob(jobId, update);
    setJobs((prev) => prev.map((j) => (j.id === jobId ? job : j)));
    setMode("idle");
  }

  async function handleDelete(jobId: number) {
    if (!confirm("Delete this job posting?")) return;
    setDeleting(jobId);
    try {
      await deleteJob(jobId);
      setJobs((prev) => prev.filter((j) => j.id !== jobId));
    } catch {
      setError("Failed to delete job. Only pending jobs can be deleted.");
    } finally {
      setDeleting(null);
    }
  }

  const showForm = mode === "create" || (typeof mode === "object" && mode.type === "edit");

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Jobs</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage your job postings. New jobs require admin approval before going live.
          </p>
        </div>
        {!showForm && (
          <button
            onClick={() => setMode("create")}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            + Post a Job
          </button>
        )}
      </div>

      {error && (
        <div className="mb-4 rounded-md bg-red-50 p-4 text-sm text-red-700">{error}</div>
      )}

      {/* Create / Edit form panel */}
      {showForm && (
        <div className="mb-6 rounded-lg border border-blue-100 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-base font-semibold text-gray-900">
            {mode === "create" ? "Post a New Job" : "Edit Job"}
          </h2>
          <JobForm
            initial={
              typeof mode === "object" && mode.type === "edit"
                ? {
                    title: mode.job.title,
                    description: mode.job.description,
                    requirements: mode.job.requirements,
                    location: mode.job.location,
                  }
                : EMPTY_FORM
            }
            onSubmit={
              typeof mode === "object" && mode.type === "edit"
                ? (data) => handleEdit(mode.job.id, data)
                : handleCreate
            }
            onCancel={() => setMode("idle")}
            submitLabel={mode === "create" ? "Submit for Review" : "Save Changes"}
          />
        </div>
      )}

      {/* Jobs list */}
      {loading ? (
        <div className="flex justify-center py-16 text-gray-400">Loading…</div>
      ) : jobs.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 py-20 text-center text-gray-400">
          No jobs yet. Post your first job to get started.
        </div>
      ) : (
        <div className="space-y-3">
          {jobs.map((job) => {
            const canEdit =
              job.status === JobStatus.PENDING_APPROVAL ||
              job.status === JobStatus.PUBLISHED;
            const canDelete = job.status === JobStatus.PENDING_APPROVAL;
            const busyDel = deleting === job.id;

            return (
              <div
                key={job.id}
                className="flex flex-col gap-3 rounded-lg border border-gray-200 bg-white p-5 sm:flex-row sm:items-start sm:justify-between"
              >
                {/* Info */}
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-gray-900">{job.title}</p>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLOR[job.status]}`}
                    >
                      {STATUS_LABEL[job.status]}
                    </span>
                  </div>
                  <p className="mt-0.5 text-sm text-gray-500">{job.location}</p>
                  <p className="mt-1 text-xs text-gray-400">
                    Posted {formatDate(job.created_at)}
                  </p>
                  <p className="mt-2 line-clamp-2 text-sm text-gray-600">
                    {job.description}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex shrink-0 gap-2">
                  {canEdit && (
                    <button
                      onClick={() => setMode({ type: "edit", job })}
                      disabled={showForm}
                      className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40"
                    >
                      Edit
                    </button>
                  )}
                  {canDelete && (
                    <button
                      onClick={() => handleDelete(job.id)}
                      disabled={busyDel || showForm}
                      className="rounded-md border border-red-200 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-40"
                    >
                      {busyDel ? "…" : "Delete"}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
