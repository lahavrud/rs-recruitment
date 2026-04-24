import { type FormEvent, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  createJob,
  deleteJob,
  getCompanyJobs,
  updateJob,
} from "@/services/companyJobs";
import { JobStatus } from "@/types/api";
import type { JobCreate, JobRead, JobUpdate } from "@/types/api";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("he-IL", {
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
  const { t } = useTranslation();
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
      setErr(t("company.jobs.errors.saveFailed"));
      setSaving(false);
    }
  }

  const inputCls =
    "mt-1 block w-full rounded-md border border-line-2 px-3 py-2 text-sm focus:border-copper focus:ring-1 focus:ring-copper focus:outline-none";

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-ink-2">
            {t("company.jobs.form.jobTitle")} <span className="text-danger">*</span>
          </label>
          <input
            type="text"
            required
            maxLength={200}
            value={form.title}
            onChange={(e) => set("title", e.target.value)}
            className={inputCls}
            placeholder={t("company.jobs.placeholders.jobTitle")}
          />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-ink-2">
            {t("company.jobs.form.location")} <span className="text-danger">*</span>
          </label>
          <input
            type="text"
            required
            maxLength={100}
            value={form.location}
            onChange={(e) => set("location", e.target.value)}
            className={inputCls}
            placeholder={t("company.jobs.placeholders.location")}
          />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-ink-2">
            {t("company.jobs.form.description")} <span className="text-danger">*</span>
          </label>
          <textarea
            required
            maxLength={5000}
            rows={4}
            value={form.description}
            onChange={(e) => set("description", e.target.value)}
            className={inputCls + " resize-y"}
            placeholder={t("company.jobs.placeholders.description")}
          />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-ink-2">
            {t("company.jobs.form.requirements")} <span className="text-danger">*</span>
          </label>
          <textarea
            required
            maxLength={5000}
            rows={4}
            value={form.requirements}
            onChange={(e) => set("requirements", e.target.value)}
            className={inputCls + " resize-y"}
            placeholder={t("company.jobs.placeholders.requirements")}
          />
        </div>
      </div>

      {err && <p className="text-sm text-danger">{err}</p>}

      <div className="flex justify-end gap-2 pt-1">
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="rounded-md px-4 py-2 text-sm text-ink-2 hover:bg-subtle disabled:opacity-50"
        >
          {t("company.jobs.cancel")}
        </button>
        <button
          type="submit"
          disabled={saving}
          className="rounded-md bg-copper px-4 py-2 text-sm font-medium text-white hover:bg-gold disabled:opacity-50"
        >
          {saving ? t("company.jobs.saving") : submitLabel}
        </button>
      </div>
    </form>
  );
}

type Mode = "idle" | "create" | { type: "edit"; job: JobRead };

export default function CompanyJobsPage() {
  const { t } = useTranslation();
  const [jobs, setJobs] = useState<JobRead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>("idle");
  const [deleting, setDeleting] = useState<number | null>(null);

  const STATUS_LABEL: Record<string, string> = {
    PENDING_APPROVAL: t("company.jobs.statusLabels.PENDING_APPROVAL"),
    PUBLISHED: t("company.jobs.statusLabels.PUBLISHED"),
    CLOSED: t("company.jobs.statusLabels.CLOSED"),
  };

  const STATUS_COLOR: Record<string, string> = {
    PENDING_APPROVAL: "bg-warning/10 text-warning",
    PUBLISHED: "bg-success/10 text-success",
    CLOSED: "bg-subtle text-ink-2",
  };

  useEffect(() => {
    getCompanyJobs()
      .then(setJobs)
      .catch(() => setError(t("company.jobs.errors.loadFailed")))
      .finally(() => setLoading(false));
  }, [t]);

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
    if (!confirm(t("company.jobs.deleteConfirm"))) return;
    setDeleting(jobId);
    try {
      await deleteJob(jobId);
      setJobs((prev) => prev.filter((j) => j.id !== jobId));
    } catch {
      setError(t("company.jobs.errors.deleteFailed"));
    } finally {
      setDeleting(null);
    }
  }

  const showForm = mode === "create" || (typeof mode === "object" && mode.type === "edit");

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
        <h1 className="text-2xl font-bold text-ink">{t("company.jobs.title")}</h1>
        <p className="mt-1 text-sm text-ink-2">
            {t("company.jobs.subtitle")}
          </p>
        </div>
        {!showForm && (
          <button
            onClick={() => setMode("create")}
            className="rounded-md bg-copper px-4 py-2 text-sm font-medium text-white hover:bg-gold"
          >
            {t("company.jobs.postJob")}
          </button>
        )}
      </div>

      {error && (
        <div className="mb-4 rounded-md bg-danger/10 p-4 text-sm text-danger">{error}</div>
      )}

      {showForm && (
        <div className="mb-6 rounded-lg border border-copper/20 bg-surface p-6 shadow-sm">
          <h2 className="mb-4 text-base font-semibold text-ink">
            {mode === "create" ? t("company.jobs.createTitle") : t("company.jobs.editTitle")}
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
            submitLabel={mode === "create" ? t("company.jobs.submitForReview") : t("company.jobs.saveChanges")}
          />
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16 text-ink-3">{t("company.jobs.loading")}</div>
      ) : jobs.length === 0 ? (
        <div className="rounded-lg border border-dashed border-line-2 py-20 text-center text-ink-3">
          {t("company.jobs.empty")}
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
                className="flex flex-col gap-3 rounded-lg border border-line bg-surface p-5 sm:flex-row sm:items-start sm:justify-between"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-ink">{job.title}</p>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLOR[job.status]}`}
                    >
                      {STATUS_LABEL[job.status]}
                    </span>
                  </div>
                  <p className="mt-0.5 text-sm text-ink-2">{job.location}</p>
                  <p className="mt-1 text-xs text-ink-3">
                    {t("company.jobs.postedLabel")} {formatDate(job.created_at)}
                  </p>
                  <p className="mt-2 line-clamp-2 text-sm text-ink-2">
                    {job.description}
                  </p>
                </div>

                <div className="flex shrink-0 gap-2">
                  {canEdit && (
                    <button
                      onClick={() => setMode({ type: "edit", job })}
                      disabled={showForm}
                      className="rounded-md border border-line-2 px-3 py-1.5 text-sm font-medium text-ink-2 hover:bg-canvas disabled:opacity-40"
                    >
                      {t("company.jobs.edit")}
                    </button>
                  )}
                  {canDelete && (
                    <button
                      onClick={() => handleDelete(job.id)}
                      disabled={busyDel || showForm}
                      className="rounded-md border border-danger/20 px-3 py-1.5 text-sm font-medium text-danger hover:bg-danger/10 disabled:opacity-40"
                    >
                      {busyDel ? "…" : t("company.jobs.delete")}
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
