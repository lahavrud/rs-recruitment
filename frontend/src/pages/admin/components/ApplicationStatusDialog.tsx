import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import Dialog from "@/components/ui/Dialog";
import { updateApplicationStatus } from "@/services/adminApplications";
import { ApplicationStatus } from "@/types/api";
import type { ApplicationStatusUpdate, ApplicationWithDetails } from "@/types/api";
import { selectCls, textareaCls } from "@/styles/forms";

const ALL_STATUSES = [
  ApplicationStatus.NEW,
  ApplicationStatus.APPROVED_BY_ADMIN,
  ApplicationStatus.REJECTED,
  ApplicationStatus.HIRED,
];

const TERMINAL_STATUSES = new Set<string>([
  ApplicationStatus.REJECTED,
  ApplicationStatus.HIRED,
]);

export interface ApplicationStatusDialogProps {
  app: ApplicationWithDetails | null;
  onClose: () => void;
  onSaved: (next: {
    id: number;
    status: ApplicationStatus;
    admin_notes: string | null;
    updated_at: string;
  }) => void;
  onError: () => void;
}

export function ApplicationStatusDialog({
  app,
  onClose,
  onSaved,
  onError,
}: ApplicationStatusDialogProps) {
  const { t } = useTranslation();
  const [newStatus, setNewStatus] = useState<string>(
    app?.status ?? ApplicationStatus.NEW,
  );
  const [notes, setNotes] = useState<string>(app?.admin_notes ?? "");
  const [saving, setSaving] = useState(false);

  // Re-seed form fields whenever the target application changes (e.g. user
  // closes one row's dialog and opens another).
  const lastAppId = useRef<number | null>(null);
  useEffect(() => {
    if (!app) {
      lastAppId.current = null;
      return;
    }
    if (lastAppId.current === app.id) return;
    lastAppId.current = app.id;
    setNewStatus(app.status);
    setNotes(app.admin_notes ?? "");
  }, [app]);

  async function handleSave() {
    if (!app) return;
    setSaving(true);
    const body: ApplicationStatusUpdate = {
      status: newStatus as ApplicationStatusUpdate["status"],
      admin_notes: notes.trim() || null,
    };
    try {
      const updated = await updateApplicationStatus(app.id, body);
      onSaved(updated);
    } catch {
      onError();
    } finally {
      setSaving(false);
    }
  }

  const isRevert =
    app != null && TERMINAL_STATUSES.has(app.status) && newStatus !== app.status;

  if (!app) return null;

  const STATUS_LABELS: Record<string, string> = {
    NEW: t("admin.applications.statusLabels.NEW"),
    APPROVED_BY_ADMIN: t("admin.applications.statusLabels.APPROVED_BY_ADMIN"),
    REJECTED: t("admin.applications.statusLabels.REJECTED"),
    HIRED: t("admin.applications.statusLabels.HIRED"),
  };

  return (
    <Dialog
      open={app != null}
      onOpenChange={(o) => !o && onClose()}
      title={t("admin.applications.modal.title")}
      size="md"
      footer={
        <>
          <button
            onClick={onClose}
            disabled={saving}
            className="rounded-sm border border-white/20 px-4 py-2 text-sm text-white/60 hover:border-white/40 hover:text-white/90 disabled:opacity-60"
          >
            {t("common.cancel")}
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="rounded-sm bg-copper px-4 py-2 text-sm font-medium text-white hover:bg-gold disabled:opacity-60"
          >
            {saving ? t("common.saving") : t("common.save")}
          </button>
        </>
      }
    >
      <div className="space-y-3 text-sm text-white/70">
        <p>
          <span className="text-white/40">
            {t("admin.applications.modal.candidateLabel")}:
          </span>{" "}
          {app.candidate.full_name}
        </p>
        <p>
          <span className="text-white/40">
            {t("admin.applications.modal.jobLabel")}:
          </span>{" "}
          {app.job.title}
        </p>
        <div>
          <label className="block text-white/50">
            {t("admin.applications.modal.newStatusLabel")}
          </label>
          <select
            value={newStatus}
            onChange={(e) => setNewStatus(e.target.value)}
            className={`mt-1 ${selectCls}`}
          >
            {ALL_STATUSES.map((s) => (
              <option key={s} value={s} className="bg-well">
                {STATUS_LABELS[s]}
              </option>
            ))}
          </select>
          {isRevert && (
            <p className="mt-2 text-xs text-warning">
              {t("admin.applications.revertConfirm")}
            </p>
          )}
        </div>
        <div>
          <label className="block text-white/50">
            {t("admin.applications.modal.adminNotes")}{" "}
            <span className="text-white/25">({t("common.optional")})</span>
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className={`mt-1 ${textareaCls}`}
            placeholder={t("admin.applications.modal.notesPlaceholder")}
          />
        </div>
      </div>
    </Dialog>
  );
}
