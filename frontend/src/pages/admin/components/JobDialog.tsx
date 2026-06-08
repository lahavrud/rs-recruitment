import { useState } from "react";
import { useTranslation } from "react-i18next";
import { updateJob } from "@/services/adminJobs";
import { JOB_REQ_MIN_COUNT, JobStatus } from "@/types/api";
import type { JobAdminUpdate, JobRead } from "@/types/api";
import Dialog from "@/components/ui/Dialog";
import Button from "@/components/ui/Button";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { focusFirstError } from "@/utils/focusFirstError";
import { isDirtyByJSON } from "@/utils/isDirty";
import { JOB_EDIT_FIELD_ORDER, validateJob } from "@/utils/validators";
import { useResetOnTrigger } from "@/hooks/useResetOnTrigger";
import { useConfirmableClose } from "@/hooks/useConfirmableClose";
import { FeaturedConfirmDialog } from "./JobFormHelpers";
import { JobDetailBody } from "./JobViewBody";
import JobEditForm from "./JobEditForm";

interface JobDialogProps {
  job: JobRead | null;
  statusLabels: Record<string, string>;
  statusColors: Record<string, string>;
  companyName?: string;
  onClose: () => void;
  onSaved: (next: JobRead) => void;
  onError: () => void;
  onDelete: () => void;
  onApprove?: () => void;
  onReject?: () => void;
}

export default function JobDialog({
  job,
  statusLabels,
  statusColors,
  companyName,
  onClose,
  onSaved,
  onError,
  onDelete,
  onApprove,
  onReject,
}: JobDialogProps) {
  const { t } = useTranslation(['admin', 'common']);

  const [mode, setMode] = useState<"view" | "edit">("view");
  const [form, setForm] = useState<JobAdminUpdate>({});
  const [initialForm, setInitialForm] = useState<JobAdminUpdate>({});
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [confirmFeatured, setConfirmFeatured] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<JobStatus | null>(null);
  const [confirmSaveOpen, setConfirmSaveOpen] = useState(false);

  // Reset to view mode (and clear transient state) whenever a different dialog
  // session starts — i.e. a new `job` object arrives after the previous one
  // was null. Passing through null between opens means even reopening the same
  // job id correctly resets mode.
  useResetOnTrigger(job, () => {
    setMode("view");
    setErrors({});
    setConfirmFeatured(false);
    setPendingStatus(null);
    setConfirmSaveOpen(false);
  });

  function set<K extends keyof JobAdminUpdate>(key: K, value: JobAdminUpdate[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: "" }));
  }

  function enterEditMode() {
    if (!job) return;
    const seed: JobAdminUpdate = {
      title: job.title,
      short_description: job.short_description,
      description: job.description,
      requirements:
        job.requirements.length > 0
          ? job.requirements.map((r) => ({ text: r.text }))
          : Array.from({ length: JOB_REQ_MIN_COUNT }, () => ({ text: "" })),
      tags: [...job.tags],
      is_featured: job.is_featured,
      location: job.location,
      salary_min: job.salary_min ?? undefined,
      salary_max: job.salary_max ?? undefined,
      status: job.status,
    };
    setForm(seed);
    setInitialForm(seed);
    setErrors({});
    setMode("edit");
  }

  const isDirty = isDirtyByJSON(form, initialForm);

  // X / Esc / overlay: if dirty while editing, confirm discard → fully close.
  const { handleClose: handleFullClose, discardConfirm: discardAndCloseConfirm } =
    useConfirmableClose({
      isDirty: mode === "edit" ? isDirty : false,
      onClose,
    });

  // "Cancel" in the edit footer: if dirty, confirm discard → return to view.
  const { handleClose: handleCancelEdit, discardConfirm: discardAndViewConfirm } =
    useConfirmableClose({
      isDirty: mode === "edit" ? isDirty : false,
      onClose: () => setMode("view"),
    });

  function validate(): boolean {
    const e = validateJob(form, t);
    setErrors(e);
    if (Object.keys(e).length > 0) {
      focusFirstError(e, JOB_EDIT_FIELD_ORDER);
      return false;
    }
    return true;
  }

  function requestSave() {
    if (!job || !validate()) return;
    if (!isDirty) {
      setMode("view");
      return;
    }
    setConfirmSaveOpen(true);
  }

  async function executeSave() {
    if (!job) return;
    setConfirmSaveOpen(false);
    setSaving(true);
    try {
      const payload: JobAdminUpdate = {
        ...form,
        requirements: (form.requirements ?? [])
          .map((r) => ({ text: r.text.trim() }))
          .filter((r) => r.text.length > 0),
      };
      const updated = await updateJob(job.id, payload);
      // Parent updates its list; we stay open and return to the view.
      onSaved(updated);
      setMode("view");
    } catch {
      onError();
    } finally {
      setSaving(false);
    }
  }

  const isPending = job?.status === JobStatus.PENDING_APPROVAL;

  const viewFooter = (
    <>
      <Button variant="danger" onClick={onDelete}>
        {t("admin:jobs.deleteAction")}
      </Button>
      {isPending && onReject && (
        <Button variant="ghost" onClick={onReject}>
          {t("admin:jobs.reject")}
        </Button>
      )}
      {isPending && onApprove && (
        <Button variant="success" onClick={onApprove}>
          {t("admin:jobs.approve")}
        </Button>
      )}
      <Button onClick={enterEditMode}>
        {t("admin:jobs.editAction")}
      </Button>
    </>
  );

  const editFooter = (
    <>
      <Button variant="ghost" onClick={handleCancelEdit} disabled={saving}>
        {t("common:cancel")}
      </Button>
      <Button onClick={requestSave} disabled={saving || !isDirty}>
        {saving ? t("common:saving") : t("common:save")}
      </Button>
    </>
  );

  if (!job) return null;
  return (
    <>
      <Dialog
        open={job != null}
        onOpenChange={(o) => !o && handleFullClose()}
        title={job.title}
        description={job.location}
        size="lg"
        preventOutsideClose={mode === "edit"}
        footer={mode === "view" ? viewFooter : editFooter}
      >
        {/* Keyed by mode so the settle-in animation replays on each mode switch. */}
        <div
          key={mode}
          style={{ animation: "job-mode-in 200ms ease-out" }}
        >
          {mode === "view" ? (
            <JobDetailBody
              job={job}
              statusLabels={statusLabels}
              statusColors={statusColors}
              companyName={companyName}
              onLeavePage={onClose}
            />
          ) : (
            <div
              onKeyDown={(e) => {
                if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                  e.preventDefault();
                  requestSave();
                }
              }}
            >
              <JobEditForm
                job={job}
                form={form}
                errors={errors}
                set={set}
                onFeaturedToggleRequest={() => setConfirmFeatured(true)}
                onStatusChangeRequest={(s) => setPendingStatus(s)}
              />
            </div>
          )}
        </div>
      </Dialog>

      {discardAndCloseConfirm}
      {discardAndViewConfirm}

      <FeaturedConfirmDialog
        open={confirmFeatured}
        active={form.is_featured ?? false}
        onClose={() => setConfirmFeatured(false)}
        onConfirm={() => {
          set("is_featured", !(form.is_featured ?? false));
          setConfirmFeatured(false);
        }}
      />
      <ConfirmDialog
        open={pendingStatus !== null}
        onOpenChange={(o) => !o && setPendingStatus(null)}
        title={t("admin:jobs.statusChangeConfirmTitle")}
        message={pendingStatus ? t(`admin:jobs.statusChangeConfirm.${pendingStatus}`) : ""}
        confirmLabel={t("common:confirm")}
        onConfirm={() => {
          if (pendingStatus) set("status", pendingStatus);
          setPendingStatus(null);
        }}
      />
      <ConfirmDialog
        open={confirmSaveOpen}
        onOpenChange={(o) => !o && setConfirmSaveOpen(false)}
        title={t("admin:jobs.saveConfirmTitle")}
        message={t("admin:jobs.saveConfirmMessage")}
        confirmLabel={t("common:save")}
        onConfirm={executeSave}
      />
    </>
  );
}
