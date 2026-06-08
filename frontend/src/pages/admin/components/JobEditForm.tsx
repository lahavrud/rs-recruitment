import { useTranslation } from "react-i18next";
import { JobStatus } from "@/types/api";
import type { JobAdminUpdate, JobRead } from "@/types/api";
import { FormSection } from "@/components/admin/AnimatedAccordion";
import { inputCls } from "@/styles/forms";
import {
  FeaturedStarButton,
  Field,
  SalaryRangeField,
  StatusPills,
} from "./JobFormHelpers";
import JobContentLists from "./JobContentLists";

interface JobEditFormProps {
  job: JobRead;
  form: JobAdminUpdate;
  errors: Record<string, string>;
  set: <K extends keyof JobAdminUpdate>(key: K, value: JobAdminUpdate[K]) => void;
  onFeaturedToggle: () => void;
  onStatusChange: (status: JobStatus) => void;
}

export default function JobEditForm({
  job,
  form,
  errors,
  set,
  onFeaturedToggle,
  onStatusChange,
}: JobEditFormProps) {
  const { t } = useTranslation(['admin', 'common']);
  const currentStatus = (form.status ?? job.status) as JobStatus;
  return (
    <div className="space-y-2 text-sm">
      <FormSection title={t("admin:jobs.formSections.basics")} defaultOpen>
        <div className="space-y-3">
          <Field label={t("admin:jobs.fields.title")} full name="title" error={errors.title}>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={form.title ?? ""}
                onChange={(e) => set("title", e.target.value)}
                className={`${inputCls} flex-1`}
              />
              <FeaturedStarButton
                active={form.is_featured ?? false}
                onToggleRequest={onFeaturedToggle}
              />
            </div>
          </Field>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label={t("admin:jobs.fields.location")} name="location" error={errors.location}>
              <input
                type="text"
                value={form.location ?? ""}
                onChange={(e) => set("location", e.target.value)}
                className={inputCls}
              />
            </Field>
            <Field label={t("admin:jobs.fields.status")} id="edit-job-status">
              <StatusPills
                value={currentStatus}
                onChange={(s) => {
                  if (s === currentStatus) return;
                  onStatusChange(s);
                }}
              />
              {currentStatus === JobStatus.CLOSED && job.status === JobStatus.PUBLISHED && (
                <p className="mt-1.5 rounded-sm bg-warning/8 px-2 py-1 text-[11px] leading-relaxed text-warning/80">
                  {t("admin:jobs.notifyClosingWarning")}
                </p>
              )}
            </Field>
          </div>
          <Field
            label={t("admin:jobs.fields.salaryRange")}
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
          {job.status === JobStatus.PUBLISHED && (
            <p className="text-[11px] text-white/30">
              {t("admin:jobs.notifyPublishedHint")}
            </p>
          )}
        </div>
      </FormSection>
      <JobContentLists
        form={form}
        errors={errors}
        onShortDescriptionChange={(v) => set("short_description", v)}
        onDescriptionChange={(v) => set("description", v)}
        onRequirementsChange={(reqs) => set("requirements", reqs)}
        onTagsChange={(tags) => set("tags", tags)}
      />
    </div>
  );
}
