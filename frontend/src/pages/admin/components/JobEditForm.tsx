import { useTranslation } from "react-i18next";
import { JobStatus, JOB_SHORT_DESC_MAX } from "@/types/api";
import type { JobAdminUpdate, JobRead, JobRequirementItem } from "@/types/api";
import AutoGrowTextarea from "@/components/ui/AutoGrowTextarea";
import JobRequirementsInput from "@/components/ui/JobRequirementsInput";
import JobTagsInput from "@/components/ui/JobTagsInput";
import { ghostInputCls, ghostTitleCls } from "@/styles/forms";
import { FeaturedStarButton, SalaryRangeField, StatusPills } from "./JobFormHelpers";

interface JobEditFormProps {
  job: JobRead;
  form: JobAdminUpdate;
  errors: Record<string, string>;
  set: <K extends keyof JobAdminUpdate>(key: K, value: JobAdminUpdate[K]) => void;
  onFeaturedToggle: () => void;
  onStatusChange: (status: JobStatus) => void;
}

const eyebrowCls =
  "mb-1.5 block text-[10px] font-semibold uppercase tracking-widest text-copper/60";

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
    <div className="space-y-5 text-sm">
      {/* ── Document header ─────────────────────────────────── */}
      <div className="space-y-3">
        <div className="flex items-start gap-2">
          <input
            id="title"
            name="title"
            type="text"
            value={form.title ?? ""}
            onChange={(e) => set("title", e.target.value)}
            placeholder={t("admin:jobs.fields.title")}
            className={`${ghostTitleCls} flex-1`}
          />
          <FeaturedStarButton
            active={form.is_featured ?? false}
            onToggleRequest={onFeaturedToggle}
          />
        </div>
        {errors.title && <p className="-mt-2 text-xs text-danger">{errors.title}</p>}

        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <input
            id="location"
            name="location"
            type="text"
            value={form.location ?? ""}
            onChange={(e) => set("location", e.target.value)}
            placeholder={t("admin:jobs.fields.location")}
            className="-mx-1.5 min-w-[8rem] rounded-md border border-transparent bg-transparent px-1.5 py-0.5 text-sm text-white/55 placeholder:text-white/25 outline-none transition hover:border-white/10 hover:bg-white/3 focus:border-copper/30 focus:text-white/80"
          />
          <StatusPills
            value={currentStatus}
            onChange={(s) => { if (s !== currentStatus) onStatusChange(s); }}
          />
        </div>
        {errors.location && <p className="text-xs text-danger">{errors.location}</p>}

        {currentStatus === JobStatus.CLOSED && job.status === JobStatus.PUBLISHED && (
          <p className="rounded-sm bg-warning/8 px-2 py-1 text-[11px] leading-relaxed text-warning/80">
            {t("admin:jobs.notifyClosingWarning")}
          </p>
        )}

        <div>
          <label className={eyebrowCls} htmlFor="salary_min">
            {t("admin:jobs.fields.salaryRange")}
          </label>
          <SalaryRangeField
            min={form.salary_min}
            max={form.salary_max}
            onChange={(lo, hi) => { set("salary_min", lo); set("salary_max", hi); }}
            error={errors.salary_min ?? errors.salary_max}
          />
        </div>

        {job.status === JobStatus.PUBLISHED && (
          <p className="text-[11px] text-white/30">
            {t("admin:jobs.notifyPublishedHint")}
          </p>
        )}
      </div>

      <hr className="border-white/8" />

      {/* ── Content ─────────────────────────────────────────── */}
      <div>
        <label className={eyebrowCls} htmlFor="short_description">
          {t("admin:jobs.fields.shortDescription")}
        </label>
        <input
          id="short_description"
          name="short_description"
          type="text"
          maxLength={JOB_SHORT_DESC_MAX}
          value={form.short_description ?? ""}
          onChange={(e) => set("short_description", e.target.value)}
          className={ghostInputCls}
        />
        <p className="mt-1 text-[11px] text-white/35">
          {t("admin:jobs.fields.shortDescriptionHint", {
            count: (form.short_description ?? "").length,
            max: JOB_SHORT_DESC_MAX,
          })}
        </p>
        {errors.short_description && (
          <p className="mt-1 text-xs text-danger">{errors.short_description}</p>
        )}
      </div>

      <div>
        <label className={eyebrowCls} htmlFor="description">
          {t("admin:jobs.fields.description")}
        </label>
        <AutoGrowTextarea
          value={form.description ?? ""}
          onChange={(v) => set("description", v)}
          minRows={5}
          className="-mx-1.5 block w-full rounded-md border border-transparent bg-transparent px-1.5 py-1 text-sm text-white/80 placeholder:text-white/25 outline-none transition hover:border-white/10 hover:bg-white/3 focus:border-copper/30 focus:bg-white/4"
        />
        {errors.description && (
          <p className="mt-1 text-xs text-danger">{errors.description}</p>
        )}
      </div>

      <hr className="border-white/8" />

      {/* ── Lists ───────────────────────────────────────────── */}
      <div>
        <p className={eyebrowCls}>{t("admin:jobs.fields.requirements")}</p>
        <JobRequirementsInput
          value={form.requirements ?? []}
          onChange={(reqs: JobRequirementItem[]) => set("requirements", reqs)}
          error={errors.requirements}
        />
      </div>

      <div>
        <p className={eyebrowCls}>{t("admin:jobs.fields.tags")}</p>
        <JobTagsInput
          value={form.tags ?? []}
          onChange={(tags: string[]) => set("tags", tags)}
          error={errors.tags}
        />
      </div>
    </div>
  );
}
