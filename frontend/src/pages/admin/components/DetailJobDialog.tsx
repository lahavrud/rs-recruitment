import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import type { JobRead } from "@/types/api";
import { JobStatus } from "@/types/api";
import Dialog from "@/components/ui/Dialog";
import { getApplications } from "@/services/adminApplications";
import { CollapsibleSection } from "./AnimatedAccordion";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("he-IL", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// ── Detail dialog ──────────────────────────────────────────────────────────

interface DetailProps {
  job: JobRead | null;
  statusLabels: Record<string, string>;
  statusColors: Record<string, string>;
  companyName?: string;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onApprove?: () => void;
  onReject?: () => void;
}

export default function DetailJobDialog({
  job,
  statusLabels,
  statusColors,
  companyName,
  onClose,
  onEdit,
  onDelete,
  onApprove,
  onReject,
}: DetailProps) {
  const { t } = useTranslation();
  if (!job) return null;
  const isPending = job.status === JobStatus.PENDING_APPROVAL;
  return (
    <Dialog
      open={job != null}
      onOpenChange={(o) => !o && onClose()}
      title={job.title}
      description={job.location}
      size="lg"
      footer={
        <>
          <button
            onClick={onDelete}
            className="rounded-sm border border-danger/40 px-4 py-2 text-sm text-danger hover:bg-danger/10"
          >
            {t("admin.jobs.deleteAction")}
          </button>
          {isPending && onReject && (
            <button
              onClick={onReject}
              className="rounded-sm border border-white/20 px-4 py-2 text-sm text-white/70 hover:border-white/40 hover:text-white"
            >
              {t("admin.jobs.reject")}
            </button>
          )}
          {isPending && onApprove && (
            <button
              onClick={onApprove}
              className="rounded-sm border border-success/40 bg-success/15 px-4 py-2 text-sm font-medium text-success hover:bg-success/25"
            >
              {t("admin.jobs.approve")}
            </button>
          )}
          <button
            onClick={onEdit}
            className="rounded-sm bg-copper px-4 py-2 text-sm font-medium text-white hover:bg-gold"
          >
            {t("admin.jobs.editAction")}
          </button>
        </>
      }
    >
      <JobDetailBody
        job={job}
        statusLabels={statusLabels}
        statusColors={statusColors}
        companyName={companyName}
        onLeavePage={onClose}
      />
    </Dialog>
  );
}

/** Body content shared by the desktop detail dialog and the mobile inline card expansion. */
export function JobDetailBody({
  job,
  statusLabels,
  statusColors,
  companyName,
  onLeavePage,
}: {
  job: JobRead;
  statusLabels: Record<string, string>;
  statusColors: Record<string, string>;
  companyName?: string;
  onLeavePage?: () => void;
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  // Lazy-fetch application count for this job. `null` = loading, number = total.
  // We fetch a generous first page; if it's smaller than the limit it's exact.
  // If we got exactly the limit, we report "N+" since there may be more.
  const APP_FETCH_LIMIT = 100;
  const [applicationCount, setApplicationCount] = useState<{
    n: number;
    capped: boolean;
  } | null>(null);
  useEffect(() => {
    const ctrl = new AbortController();
    getApplications({ job_id: job.id, limit: APP_FETCH_LIMIT }, ctrl.signal)
      .then((page) =>
        setApplicationCount({
          n: page.items.length,
          capped: page.items.length === APP_FETCH_LIMIT,
        }),
      )
      .catch(() => {});
    return () => ctrl.abort();
  }, [job.id]);

  const salaryStr =
    job.salary_min != null && job.salary_max != null
      ? `${job.salary_min.toLocaleString("he-IL")}–${job.salary_max.toLocaleString("he-IL")} ₪/חודש`
      : null;

  return (
    <div className="space-y-4 text-sm">
      {/* Header strip: status + featured ribbon eyebrow only */}
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[job.status]}`}
        >
          {statusLabels[job.status]}
        </span>
        {job.is_featured && (
          <span className="inline-flex items-center gap-1 rounded-full border border-gold/40 bg-gold/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-gold">
            <svg
              viewBox="0 0 24 24"
              fill="currentColor"
              className="size-2.5"
              aria-hidden="true"
            >
              <path d="M12 2c.7 2.5 2.5 3.5 2.5 6a2.5 2.5 0 0 1-5 0c0-1 .4-1.7 1-2.3C9 7 9 5 12 2zm0 8c3.5 0 6 2.8 6 6.3a6 6 0 1 1-12 0c0-2 1-3.5 2.4-4.5-.1 1.6.7 2.7 1.9 3.3-.7-2.2.7-3.5 1.7-5.1z" />
            </svg>
            {t("publicJobs.board.featured")}
          </span>
        )}
      </div>

      {/* Metadata grid — labeled fields read cleanly on mobile */}
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-xs sm:grid-cols-[auto_1fr_auto_1fr] sm:gap-x-6">
        <dt className="text-white/40">{t("admin.jobs.fields.company")}</dt>
        <dd>
          <button
            type="button"
            onClick={() => {
              onLeavePage?.();
              navigate(`/admin/companies?detail=${job.company_id}`);
            }}
            className="inline-flex items-center rounded-sm border border-white/10 bg-white/5 px-2 py-0.5 text-copper/90 transition hover:border-copper/30 hover:bg-copper/10 sm:rounded-none sm:border-0 sm:bg-transparent sm:p-0 sm:text-copper/85 sm:hover:bg-transparent sm:hover:text-copper sm:hover:underline"
          >
            {companyName ?? t("admin.jobs.companyLabel", { id: job.company_id })}
          </button>
        </dd>
        <dt className="text-white/40">{t("admin.jobs.submittedLabel")}</dt>
        <dd className="text-white/70">{formatDate(job.created_at)}</dd>
        {salaryStr && (
          <>
            <dt className="text-white/40">{t("common.salary")}</dt>
            <dd className="font-medium text-copper/85">{salaryStr}</dd>
          </>
        )}
        <dt className="text-white/40">{t("admin.jobs.candidatesLabel")}</dt>
        <dd className="inline-flex items-center gap-1.5">
          <span className="font-medium text-copper/85">
            {applicationCount == null
              ? "…"
              : applicationCount.capped
                ? `${applicationCount.n}+`
                : applicationCount.n}
          </span>
          {applicationCount != null && applicationCount.n > 0 && (
            <button
              type="button"
              onClick={() => {
                onLeavePage?.();
                navigate(`/admin/applications?job=${job.id}`);
              }}
              className="inline-flex items-center rounded-sm border border-white/10 bg-white/5 px-2 py-0.5 text-white/65 transition hover:border-copper/30 hover:bg-copper/10 hover:text-copper sm:rounded-none sm:border-0 sm:bg-transparent sm:p-0 sm:text-white/40 sm:hover:bg-transparent sm:hover:text-copper sm:hover:underline"
            >
              {t("admin.jobs.candidatesView")}
            </button>
          )}
        </dd>
      </dl>

      {job.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {job.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full border border-copper/25 bg-copper/10 px-2.5 py-0.5 text-xs font-medium text-copper/90"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Short description: lifted into a subtle well so it doesn't compete with the metadata */}
      <div className="rounded-md border border-white/6 bg-well/30 px-3 py-2.5">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-copper">
          {t("admin.jobs.fields.shortDescription")}
        </p>
        <p className="mt-1 leading-relaxed text-white/80">{job.short_description}</p>
      </div>

      <CollapsibleSection title={t("admin.jobs.fields.description")}>
        <p className="whitespace-pre-wrap leading-relaxed text-white/75">
          {job.description}
        </p>
      </CollapsibleSection>
      {job.requirements.length > 0 && (
        <CollapsibleSection title={t("admin.jobs.fields.requirements")}>
          <ul className="space-y-1.5 text-white/75">
            {job.requirements.map((req, i) => (
              <li key={i} className="flex items-start gap-2">
                <span
                  aria-hidden="true"
                  className="mt-2 inline-block size-1.5 shrink-0 rounded-full bg-copper/70"
                />
                <span>{req.text}</span>
              </li>
            ))}
          </ul>
        </CollapsibleSection>
      )}
    </div>
  );
}
