import { useState } from "react";
import { useTranslation } from "react-i18next";
import { updateJob } from "@/services/adminJobs";
import { JOB_REQ_MIN_COUNT, JobStatus } from "@/types/api";
import type { JobAdminUpdate, JobRead } from "@/types/api";
import Dialog from "@/components/ui/Dialog";
import Button from "@/components/ui/Button";
import { focusFirstError } from "@/utils/focusFirstError";
import { isDirtyByJSON } from "@/utils/isDirty";
import { JOB_EDIT_FIELD_ORDER, validateJob } from "@/utils/validators";
import { useResetOnTrigger } from "@/hooks/useResetOnTrigger";
import { useConfirmableClose } from "@/hooks/useConfirmableClose";
import JobEditForm from "./JobEditForm";

interface JobDialogProps {
  job: JobRead | null;
  companyName?: string;
  onClose: () => void;
  onSaved: (next: JobRead) => void;
  onError: () => void;
  onDelete: () => void;
  onApprove?: () => void;
  onReject?: () => void;
}

function seedFromJob(job: JobRead): JobAdminUpdate {
  return {
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
}

export default function JobDialog({
  job,
  companyName,
  onClose,
  onSaved,
  onError,
  onDelete,
  onApprove,
  onReject,
}: JobDialogProps) {
  const { t } = useTranslation(['admin', 'common']);

  const [form, setForm] = useState<JobAdminUpdate>({});
  const [initialForm, setInitialForm] = useState<JobAdminUpdate>({});
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Seed form whenever a new job session starts (new job opened, or job updated after save).
  useResetOnTrigger(job, () => {
    const seed = seedFromJob(job!);
    setForm(seed);
    setInitialForm(seed);
    setErrors({});
  });

  function set<K extends keyof JobAdminUpdate>(key: K, value: JobAdminUpdate[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: "" }));
  }

  function revert() {
    if (!job) return;
    const seed = seedFromJob(job);
    setForm(seed);
    setInitialForm(seed);
    setErrors({});
  }

  const isDirty = isDirtyByJSON(form, initialForm);

  const { handleClose, discardConfirm } = useConfirmableClose({ isDirty, onClose });

  function validate(): boolean {
    const e = validateJob(form, t);
    setErrors(e);
    if (Object.keys(e).length > 0) {
      focusFirstError(e, JOB_EDIT_FIELD_ORDER);
      return false;
    }
    return true;
  }

  async function save() {
    if (!job || !validate()) return;
    setSaving(true);
    try {
      const payload: JobAdminUpdate = {
        ...form,
        requirements: (form.requirements ?? [])
          .map((r) => ({ text: r.text.trim() }))
          .filter((r) => r.text.length > 0),
      };
      const updated = await updateJob(job.id, payload);
      // Immediately clear dirty state so the form reflects the saved values.
      const newSeed = seedFromJob(updated);
      setForm(newSeed);
      setInitialForm(newSeed);
      onSaved(updated);
    } catch {
      onError();
    } finally {
      setSaving(false);
    }
  }

  const isPending = job?.status === JobStatus.PENDING_APPROVAL;

  const footer = (
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
      {isDirty && (
        <Button variant="ghost" onClick={revert} disabled={saving}>
          {t("common:revertChanges")}
        </Button>
      )}
      <Button onClick={() => void save()} disabled={saving || !isDirty}>
        {saving ? t("common:saving") : t("common:save")}
      </Button>
    </>
  );

  if (!job) return null;
  return (
    <>
      <Dialog
        open={job != null}
        onOpenChange={(o) => !o && handleClose()}
        title={job.title}
        description={companyName ? `${companyName} · ${job.location}` : job.location}
        size="lg"
        preventOutsideClose
        footer={footer}
      >
        <div
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
              e.preventDefault();
              void save();
            }
          }}
        >
          <JobEditForm
            job={job}
            form={form}
            errors={errors}
            set={set}
            onFeaturedToggle={() => set("is_featured", !(form.is_featured ?? false))}
            onStatusChange={(s) => set("status", s)}
          />
        </div>
      </Dialog>

      {discardConfirm}
    </>
  );
}
