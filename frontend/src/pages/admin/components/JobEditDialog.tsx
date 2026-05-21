import { useState } from "react";
import { useTranslation } from "react-i18next";
import { updateJob } from "@/services/adminJobs";
import {
  JOB_DESC_MAX,
  JOB_LOCATION_MAX,
  JOB_REQ_MIN_COUNT,
  JOB_SHORT_DESC_MAX,
  JOB_TITLE_MAX,
  JobStatus,
} from "@/types/api";
import type { JobAdminUpdate, JobRead, JobRequirementItem } from "@/types/api";
import Dialog from "@/components/ui/Dialog";
import Button from "@/components/ui/Button";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { FormSection } from "@/components/admin/AnimatedAccordion";
import JobRequirementsInput from "@/components/ui/JobRequirementsInput";
import JobTagsInput from "@/components/ui/JobTagsInput";
import { focusFirstError } from "@/utils/focusFirstError";
import { useResetOnTrigger } from "@/hooks/useResetOnTrigger";
import { useConfirmableClose } from "@/hooks/useConfirmableClose";
import { inputCls, textareaCls } from "@/styles/forms";
import {
  AutoGrowTextarea,
  FeaturedStarButton,
  Field,
  SalaryRangeField,
  StatusPills,
} from "./JobFormHelpers";

const JOB_EDIT_FIELD_ORDER = [
  "title",
  "location",
  "salary_min",
  "salary_max",
  "short_description",
  "description",
  "requirements",
  "tags",
] as const;

interface EditProps {
  job: JobRead | null;
  onClose: () => void;
  onSaved: (next: JobRead) => void;
  onError: () => void;
}

export default function JobEditDialog({ job, onClose, onSaved, onError }: EditProps) {
  const { t } = useTranslation();
  const [form, setForm] = useState<JobAdminUpdate>({});
  const [initialForm, setInitialForm] = useState<JobAdminUpdate>({});
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [confirmFeatured, setConfirmFeatured] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<JobStatus | null>(null);
  const [confirmSaveOpen, setConfirmSaveOpen] = useState(false);

  useResetOnTrigger(job, () => {
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
  });

  function set<K extends keyof JobAdminUpdate>(key: K, value: JobAdminUpdate[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: "" }));
  }

  const isDirty = JSON.stringify(form) !== JSON.stringify(initialForm);
  const { handleClose, discardConfirm } = useConfirmableClose({ isDirty, onClose });

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!form.title?.trim()) e.title = t("common.validation.required");
    else if (form.title.length > JOB_TITLE_MAX) e.title = t("common.validation.tooLong", { max: JOB_TITLE_MAX });
    if (!form.short_description?.trim()) e.short_description = t("common.validation.required");
    else if (form.short_description.length > JOB_SHORT_DESC_MAX)
      e.short_description = t("common.validation.tooLong", { max: JOB_SHORT_DESC_MAX });
    if (!form.location?.trim()) e.location = t("common.validation.required");
    else if (form.location.length > JOB_LOCATION_MAX) e.location = t("common.validation.tooLong", { max: JOB_LOCATION_MAX });
    if (!form.description?.trim()) e.description = t("common.validation.required");
    else if (form.description.length > JOB_DESC_MAX) e.description = t("common.validation.tooLong", { max: JOB_DESC_MAX });
    const reqs = form.requirements ?? [];
    const filledReqs = reqs.filter((r) => r.text.trim().length > 0);
    if (filledReqs.length < JOB_REQ_MIN_COUNT)
      e.requirements = t("common.validation.requirementsMin", { min: JOB_REQ_MIN_COUNT });
    if (form.salary_min == null || form.salary_min < 0) e.salary_min = t("common.validation.required");
    if (form.salary_max == null || form.salary_max < 0) e.salary_max = t("common.validation.required");
    else if (form.salary_min != null && form.salary_max < form.salary_min) e.salary_max = t("common.validation.salaryMaxBelowMin");
    setErrors(e);
    if (Object.keys(e).length > 0) {
      focusFirstError(e, JOB_EDIT_FIELD_ORDER);
      return false;
    }
    return true;
  }

  function requestSave() {
    if (!job || !validate()) return;
    // Nothing actually changed — skip the confirm + API call and just close.
    if (!isDirty) {
      onClose();
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
      onSaved(updated);
    } catch {
      onError();
    } finally {
      setSaving(false);
    }
  }

  if (!job) return null;
  return (
    <>
      <Dialog
        open={job != null}
        onOpenChange={(o) => !o && handleClose()}
        title={t("admin.jobs.editModalTitle")}
        description={job.title}
        size="lg"
        preventOutsideClose
        footer={
          <>
            <Button
              variant="ghost"
              onClick={handleClose}
              disabled={saving}
            >
              {t("common.cancel")}
            </Button>
            <Button
              onClick={requestSave}
              disabled={saving || !isDirty}
            >
              {saving ? t("common.saving") : t("common.save")}
            </Button>
          </>
        }
      >
        <div className="space-y-2 text-sm">
          <FormSection title={t("admin.jobs.formSections.basics")} defaultOpen>
            <div className="space-y-3">
              <Field label={t("admin.jobs.fields.title")} full name="title" error={errors.title}>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={form.title ?? ""}
                    onChange={(e) => set("title", e.target.value)}
                    className={`${inputCls} flex-1`}
                  />
                  <FeaturedStarButton
                    active={form.is_featured ?? false}
                    onToggleRequest={() => setConfirmFeatured(true)}
                  />
                </div>
              </Field>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field label={t("admin.jobs.fields.location")} name="location" error={errors.location}>
                  <input
                    type="text"
                    value={form.location ?? ""}
                    onChange={(e) => set("location", e.target.value)}
                    className={inputCls}
                  />
                </Field>
                <Field label={t("admin.jobs.fields.status")}>
                  <StatusPills
                    value={(form.status ?? job.status) as JobStatus}
                    onChange={(s) => {
                      if (s === (form.status ?? job.status)) return;
                      setPendingStatus(s);
                    }}
                  />
                </Field>
              </div>
              <Field
                label={t("admin.jobs.fields.salaryRange")}
                full
                name="salary_min"
              >
                <SalaryRangeField
                  min={form.salary_min}
                  max={form.salary_max}
                  onChange={(lo, hi) => {
                    set("salary_min", lo);
                    set("salary_max", hi);
                  }}
                  error={errors.salary_min || errors.salary_max}
                />
              </Field>
            </div>
          </FormSection>
          <FormSection title={t("admin.jobs.formSections.content")}>
            <div className="space-y-3">
              <Field
                label={t("admin.jobs.fields.shortDescription")}
                full
                name="short_description"
                error={errors.short_description}
              >
                <input
                  type="text"
                  maxLength={JOB_SHORT_DESC_MAX}
                  value={form.short_description ?? ""}
                  onChange={(e) => set("short_description", e.target.value)}
                  className={inputCls}
                />
                <p className="mt-1 text-[11px] text-white/35">
                  {t("admin.jobs.fields.shortDescriptionHint", {
                    count: (form.short_description ?? "").length,
                    max: JOB_SHORT_DESC_MAX,
                  })}
                </p>
              </Field>
              <Field
                label={t("admin.jobs.fields.description")}
                full
                name="description"
                error={errors.description}
              >
                <AutoGrowTextarea
                  value={form.description ?? ""}
                  onChange={(v) => set("description", v)}
                  minRows={6}
                  className={`${textareaCls} min-h-40`}
                />
              </Field>
            </div>
          </FormSection>
          <FormSection title={t("admin.jobs.formSections.lists")}>
            <div className="space-y-3">
              <Field
                label={t("admin.jobs.fields.requirements")}
                full
                name="requirements"
              >
                <JobRequirementsInput
                  value={form.requirements ?? []}
                  onChange={(reqs: JobRequirementItem[]) => set("requirements", reqs)}
                  error={errors.requirements}
                />
              </Field>
              <Field label={t("admin.jobs.fields.tags")} full>
                <JobTagsInput
                  value={form.tags ?? []}
                  onChange={(tags) => set("tags", tags)}
                  error={errors.tags}
                />
              </Field>
            </div>
          </FormSection>
        </div>
      </Dialog>
      {discardConfirm}
      <ConfirmDialog
        open={confirmFeatured}
        onOpenChange={(o) => !o && setConfirmFeatured(false)}
        title={
          form.is_featured
            ? t("admin.jobs.featuredUnsetTitle")
            : t("admin.jobs.featuredSetTitle")
        }
        message={
          form.is_featured
            ? t("admin.jobs.featuredUnsetMessage")
            : t("admin.jobs.featuredSetMessage")
        }
        confirmLabel={t("common.confirm")}
        onConfirm={() => {
          set("is_featured", !(form.is_featured ?? false));
          setConfirmFeatured(false);
        }}
      />
      <ConfirmDialog
        open={pendingStatus !== null}
        onOpenChange={(o) => !o && setPendingStatus(null)}
        title={t("admin.jobs.statusChangeConfirmTitle")}
        message={t("admin.jobs.statusChangeConfirmMessage")}
        confirmLabel={t("common.confirm")}
        onConfirm={() => {
          if (pendingStatus) set("status", pendingStatus);
          setPendingStatus(null);
        }}
      />
      <ConfirmDialog
        open={confirmSaveOpen}
        onOpenChange={(o) => !o && setConfirmSaveOpen(false)}
        title={t("admin.jobs.saveConfirmTitle")}
        message={t("admin.jobs.saveConfirmMessage")}
        confirmLabel={t("common.save")}
        onConfirm={executeSave}
      />
    </>
  );
}
