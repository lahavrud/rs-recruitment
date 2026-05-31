import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import axios from "axios";
import { getApplications } from "@/services/adminApplications";
import { fetchResumeBlob } from "@/services/adminCandidates";
import type { ApplicationWithDetails, CandidateProfileRead } from "@/types/api";
import Dialog from "@/components/ui/Dialog";
import { MIME_TO_EXT } from "@/utils/mime";

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("he-IL", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function buildDownloadName(candidateName: string, fileKey: string, mimeType: string): string {
  const slug = candidateName.trim().replace(/\s+/g, "-");
  const keyExt = fileKey.includes(".") ? fileKey.split(".").pop() : undefined;
  const safeKeyExt = keyExt && /^[a-zA-Z0-9]{1,5}$/.test(keyExt) ? keyExt.toLowerCase() : undefined;
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

// ── ResumeLink ────────────────────────────────────────────────────────────────

export function ResumeLink({
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
      // Scoped to iOS only: other platforms (including Chrome on Linux) mishandle
      // navigator.share with files and download the blob UUID instead of the filename.
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
        // PDFs open inline in a new tab (browser PDF viewer / iOS Quick Look).
        // iOS fallback when Web Share isn't available: open in new tab so Safari
        // can offer Quick Look + share sheet from there.
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

// ── CandidateDetailBody ───────────────────────────────────────────────────────

/** Detail body shared by the desktop dialog and the mobile inline expansion. */
export function CandidateDetailBody({
  candidate,
  applications: appsProp,
  appsError: appsErrorProp,
  onLeavePage,
}: {
  candidate: CandidateProfileRead;
  applications?: ApplicationWithDetails[] | null;
  appsError?: boolean;
  onLeavePage?: () => void;
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const c = candidate;

  // Self-fetch the applications list when the parent didn't pass one (mobile).
  const useLocal = appsProp === undefined;
  const [localApps, setLocalApps] = useState<ApplicationWithDetails[] | null>(null);
  const [localAppsError, setLocalAppsError] = useState(false);
  useEffect(() => {
    if (!useLocal) return;
    const ctrl = new AbortController();
    /* eslint-disable react-hooks/set-state-in-effect */
    setLocalApps(null);
    setLocalAppsError(false);
    /* eslint-enable react-hooks/set-state-in-effect */
    getApplications({ candidate_id: candidate.id, limit: 100 }, ctrl.signal)
      .then((page) => setLocalApps(page.items))
      .catch((e) => {
        if (axios.isCancel(e)) return;
        setLocalAppsError(true);
      });
    return () => ctrl.abort();
  }, [candidate.id, useLocal]);
  const applications = useLocal ? localApps : appsProp;
  const appsError = useLocal ? localAppsError : (appsErrorProp ?? false);

  return (
    <div className="space-y-5 text-sm">
      <div className="flex flex-wrap gap-x-6 gap-y-1">
        <a
          href={`mailto:${c.email}?subject=${encodeURIComponent(t("admin.candidates.emailSubject", { name: c.full_name }))}`}
          className="text-copper/85 transition hover:text-copper hover:underline"
        >
          {c.email}
        </a>
        {c.phone && <span className="text-white/60">{c.phone}</span>}
        {c.linkedin_url && (
          <a
            href={c.linkedin_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-copper hover:text-gold"
          >
            LinkedIn ↗
          </a>
        )}
        {c.resume_path ? (
          <ResumeLink
            fileKey={c.resume_path.split("/").pop() ?? c.resume_path}
            label={t("admin.candidates.table.resume")}
            candidateName={c.full_name}
          />
        ) : (
          <span className="text-white/40">
            {t("admin.candidates.table.resume")}: {t("admin.candidates.noFile")}
          </span>
        )}
      </div>

      <div className="border-t border-white/8 pt-4">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-copper">
          {t("admin.candidates.applicationsSection")}
        </p>
        {appsError ? (
          <p className="mt-3 text-xs text-danger">
            {t("admin.candidates.errors.applicationsLoadFailed")}
          </p>
        ) : applications == null ? (
          <p className="mt-3 text-xs text-white/35">{t("common.loading")}</p>
        ) : applications.length === 0 ? (
          <p className="mt-3 text-xs text-white/35">
            {t("admin.candidates.noApplications")}
          </p>
        ) : (
          <ul className="mt-3 space-y-1.5">
            {applications.map((a) => {
              const hasAppAnswers =
                a.service_concept ||
                a.salary_expectations ||
                a.strength ||
                a.growth_area;
              return (
                <li key={a.id} className="rounded-sm border border-white/6 bg-card">
                  <button
                    type="button"
                    onClick={() => {
                      onLeavePage?.();
                      navigate(`/admin/applications?candidate=${a.candidate_id}`, {
                        state: { autoOpen: a },
                      });
                    }}
                    className="flex w-full items-center justify-between px-3 py-2 transition hover:border-copper/25 hover:bg-card-raised"
                  >
                    <span className="text-white/80">{a.job.title}</span>
                    <span className="text-xs text-white/40">
                      {t(`admin.applications.statusLabels.${a.status}`)} ·{" "}
                      {formatDate(a.created_at)}
                    </span>
                  </button>
                  {hasAppAnswers && (
                    <dl className="grid grid-cols-1 gap-x-8 gap-y-1 border-t border-white/6 px-3 py-2 text-xs sm:grid-cols-2">
                      {a.service_concept && (
                        <>
                          <dt className="text-white/35">
                            {t("admin.candidates.details.serviceConcept")}
                          </dt>
                          <dd className="text-white/60">{a.service_concept}</dd>
                        </>
                      )}
                      {a.salary_expectations && (
                        <>
                          <dt className="text-white/35">
                            {t("admin.candidates.details.salaryExpectations")}
                          </dt>
                          <dd className="text-white/60">{a.salary_expectations}</dd>
                        </>
                      )}
                      {a.strength && (
                        <>
                          <dt className="text-white/35">
                            {t("admin.candidates.details.strength")}
                          </dt>
                          <dd className="text-white/60">{a.strength}</dd>
                        </>
                      )}
                      {a.growth_area && (
                        <>
                          <dt className="text-white/35">
                            {t("admin.candidates.details.weakness")}
                          </dt>
                          <dd className="text-white/60">{a.growth_area}</dd>
                        </>
                      )}
                    </dl>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

// ── DetailDialog ──────────────────────────────────────────────────────────────

export interface CandidateDetailDialogProps {
  candidate: CandidateProfileRead | null;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export default function CandidateDetailDialog({
  candidate,
  onClose,
  onEdit,
  onDelete,
}: CandidateDetailDialogProps) {
  const { t } = useTranslation();
  const [applications, setApplications] = useState<ApplicationWithDetails[] | null>(null);
  const [appsError, setAppsError] = useState(false);

  useEffect(() => {
    // Reset state when the target candidate changes — the only sane way to
    // clear the previous candidate's applications before fetching the new
    // one's. setState-in-effect is intentional here.
    /* eslint-disable react-hooks/set-state-in-effect */
    if (!candidate) {
      setApplications(null);
      setAppsError(false);
      return;
    }
    const ctrl = new AbortController();
    setApplications(null);
    setAppsError(false);
    /* eslint-enable react-hooks/set-state-in-effect */
    getApplications({ candidate_id: candidate.id, limit: 100 }, ctrl.signal)
      .then((page) => setApplications(page.items))
      .catch((e) => {
        if (axios.isCancel(e)) return;
        setAppsError(true);
      });
    return () => ctrl.abort();
  }, [candidate]);

  if (!candidate) return null;
  const c = candidate;

  return (
    <Dialog
      open={candidate != null}
      onOpenChange={(o) => !o && onClose()}
      title={c.full_name}
      description={c.email}
      size="lg"
      footer={
        <>
          <button
            onClick={onDelete}
            className="rounded-sm border border-danger/40 px-4 py-2 text-sm text-danger hover:bg-danger/10"
          >
            {t("admin.candidates.deleteAction")}
          </button>
          <button
            onClick={onEdit}
            className="rounded-sm bg-copper px-4 py-2 text-sm font-medium text-white hover:bg-gold"
          >
            {t("admin.candidates.editAction")}
          </button>
        </>
      }
    >
      <CandidateDetailBody
        candidate={c}
        applications={applications}
        appsError={appsError}
        onLeavePage={onClose}
      />
    </Dialog>
  );
}
