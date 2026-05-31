import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import Dialog from "@/components/ui/Dialog";
import { fetchResumeBlob } from "@/services/adminCandidates";
import type { ApplicationWithDetails } from "@/types/api";
import { MIME_TO_EXT } from "@/utils/mime";

// ── Internal helpers ──────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("he-IL", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function buildDownloadName(
  candidateName: string,
  fileKey: string,
  mimeType: string,
): string {
  const slug = candidateName.trim().replace(/\s+/g, "-");
  const keyExt = fileKey.includes(".") ? fileKey.split(".").pop() : undefined;
  const safeKeyExt =
    keyExt && /^[a-zA-Z0-9]{1,5}$/.test(keyExt) ? keyExt.toLowerCase() : undefined;
  const ext = MIME_TO_EXT[mimeType] ?? safeKeyExt ?? "bin";
  return `${slug}-resume.${ext}`;
}

function triggerDownload(url: string, filename: string) {
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// ── ResumeLink — fetches via axios so the JWT travels with it ─────────────────

function ResumeLink({
  fileKey,
  label,
  candidateName,
}: {
  fileKey: string;
  label: string;
  candidateName: string;
}) {
  const [isLoading, setIsLoading] = useState(false);
  async function open(e: React.MouseEvent) {
    e.stopPropagation();
    if (isLoading) return;
    setIsLoading(true);
    try {
      const blob = await fetchResumeBlob(fileKey);
      const mimeType = blob.type || "application/octet-stream";
      const filename = buildDownloadName(candidateName, fileKey, mimeType);
      const isPdf = mimeType === "application/pdf" || fileKey.toLowerCase().endsWith(".pdf");

      // iOS ignores <a download> on blob URLs — use Web Share API instead.
      // Scoped to iOS only: other platforms mishandle navigator.share with files.
      const isIOS =
        /iPhone|iPad|iPod/.test(navigator.userAgent) ||
        (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
      if (isIOS && typeof navigator.canShare === "function") {
        const file = new File([blob], filename, { type: mimeType });
        if (navigator.canShare({ files: [file] })) {
          try {
            await navigator.share({ files: [file] });
            return;
          } catch (err) {
            if (err instanceof Error && err.name === "AbortError") return;
          }
        }
      }

      const url = URL.createObjectURL(blob);
      if (isPdf || isIOS) {
        const win = window.open(url, "_blank");
        if (!win) triggerDownload(url, filename);
      } else {
        triggerDownload(url, filename);
      }
      window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
    } catch (err) {
      console.error("Failed to fetch resume", err);
    } finally {
      setIsLoading(false);
    }
  }
  return (
    <button
      onClick={open}
      disabled={isLoading}
      className={`text-copper hover:text-gold transition-opacity ${isLoading ? "opacity-50 cursor-wait" : ""}`}
    >
      {isLoading ? "טוען..." : `${label} ↗`}
    </button>
  );
}

// ── ApplicationDetailBody — shared by dialog and mobile inline expansion ──────

export interface ApplicationDetailBodyProps {
  app: ApplicationWithDetails;
  onLeavePage?: () => void;
}

export function ApplicationDetailBody({
  app,
  onLeavePage,
}: ApplicationDetailBodyProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const c = app.candidate;
  const linkBtnCls =
    "inline-flex items-center rounded-sm border border-white/10 bg-white/5 px-2 py-0.5 text-xs text-copper/90 transition hover:border-copper/30 hover:bg-copper/10 sm:rounded-none sm:border-0 sm:bg-transparent sm:p-0 sm:text-copper/80 sm:hover:bg-transparent sm:hover:text-copper sm:hover:underline";
  return (
    <div className="space-y-4 text-sm">
      <div className="flex flex-wrap items-center gap-2 border-b border-white/8 pb-3">
        <button
          type="button"
          onClick={() => {
            onLeavePage?.();
            navigate(`/admin/candidates?detail=${app.candidate_id}`);
          }}
          className={linkBtnCls}
        >
          {t("common.viewCandidate")}
        </button>
        <button
          type="button"
          onClick={() => {
            onLeavePage?.();
            navigate(`/admin/jobs?detail=${app.job_id}`);
          }}
          className={linkBtnCls}
        >
          {t("common.viewJob")}
        </button>
        <span className="text-xs text-white/40">{formatDate(app.created_at)}</span>
      </div>
      <div className="flex flex-wrap gap-x-6 gap-y-1">
        <span className="text-white/60">{c.email}</span>
        {c.phone && <span className="text-white/60">{c.phone}</span>}
        {c.linkedin_url && (
          <a
            href={c.linkedin_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-copper hover:text-gold"
          >
            {t("admin.applications.details.linkedin")} ↗
          </a>
        )}
        {c.resume_path ? (
          <ResumeLink
            fileKey={c.resume_path.split("/").pop() ?? c.resume_path}
            label={t("admin.applications.details.resume")}
            candidateName={c.full_name}
          />
        ) : (
          <span className="text-white/40">
            {t("admin.applications.details.resume")}:{" "}
            {t("admin.applications.details.noFile")}
          </span>
        )}
      </div>

      {(app.service_concept ||
        app.salary_expectations ||
        app.strength ||
        app.growth_area) && (
        <dl className="grid grid-cols-1 gap-x-8 gap-y-2 sm:grid-cols-2">
          {app.service_concept && (
            <>
              <dt className="text-white/35">
                {t("admin.applications.details.serviceConcept")}
              </dt>
              <dd className="text-white/70">{app.service_concept}</dd>
            </>
          )}
          {app.salary_expectations && (
            <>
              <dt className="text-white/35">
                {t("admin.applications.details.salaryExpectations")}
              </dt>
              <dd className="text-white/70">{app.salary_expectations}</dd>
            </>
          )}
          {app.strength && (
            <>
              <dt className="text-white/35">
                {t("admin.applications.details.strength")}
              </dt>
              <dd className="text-white/70">{app.strength}</dd>
            </>
          )}
          {app.growth_area && (
            <>
              <dt className="text-white/35">
                {t("admin.applications.details.weakness")}
              </dt>
              <dd className="text-white/70">{app.growth_area}</dd>
            </>
          )}
        </dl>
      )}

      {app.admin_notes && (
        <div className="rounded-md border border-white/8 bg-card p-3 text-white/70">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-copper">
            {t("admin.applications.modal.adminNotes")}
          </p>
          <p className="mt-1 whitespace-pre-wrap">{app.admin_notes}</p>
        </div>
      )}
    </div>
  );
}

// ── DetailDialog ──────────────────────────────────────────────────────────────

export interface DetailDialogProps {
  app: ApplicationWithDetails | null;
  onClose: () => void;
  onUpdateStatus: () => void;
  onEditNotes: () => void;
  onDelete: () => void;
}

export function DetailDialog({
  app,
  onClose,
  onUpdateStatus,
  onEditNotes,
  onDelete,
}: DetailDialogProps) {
  const { t } = useTranslation();
  if (!app) return null;
  const c = app.candidate;
  return (
    <Dialog
      open={app != null}
      onOpenChange={(o) => !o && onClose()}
      title={c.full_name}
      description={app.job.title}
      size="lg"
      footer={
        <>
          <button
            onClick={onDelete}
            className="rounded-sm border border-danger/40 px-4 py-2 text-sm text-danger hover:bg-danger/10"
          >
            {t("admin.applications.deleteAction")}
          </button>
          <button
            onClick={onEditNotes}
            className="rounded-sm border border-white/20 px-4 py-2 text-sm text-white/70 hover:border-white/40 hover:text-white/90"
          >
            {t("admin.applications.editNotesAction")}
          </button>
          <button
            onClick={onUpdateStatus}
            className="rounded-sm bg-copper px-4 py-2 text-sm font-medium text-white hover:bg-gold"
          >
            {t("admin.applications.updateStatusAction")}
          </button>
        </>
      }
    >
      <ApplicationDetailBody app={app} onLeavePage={onClose} />
    </Dialog>
  );
}
