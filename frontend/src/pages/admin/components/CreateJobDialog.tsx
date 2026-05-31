import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import axios from "axios";
import type { ActiveCompanyRead, JobAdminCreate, JobRequirementItem } from "@/types/api";
import { JobStatus, JOB_SHORT_DESC_MAX, JOB_REQ_MIN_COUNT, JOB_TITLE_MAX, JOB_LOCATION_MAX, JOB_DESC_MAX } from "@/types/api";
import Dialog from "@/components/ui/Dialog";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import JobRequirementsInput from "@/components/ui/JobRequirementsInput";
import JobTagsInput from "@/components/ui/JobTagsInput";
import { inputCls, selectCls, textareaCls } from "@/styles/forms";
import { focusFirstError } from "@/utils/focusFirstError";
import { createJob } from "@/services/adminJobs";
import { getActiveCompanies } from "@/services/adminCompanies";
import type { JobRead } from "@/types/api";
import { FormSection } from "./AnimatedAccordion";
import AutoGrowTextarea from "./AutoGrowTextarea";
import FeaturedStarButton from "./FeaturedStarButton";
import Field from "./JobFormField";
import SalaryRangeField from "./SalaryRangeField";
import StatusPills from "./StatusPills";

// Order in which fields are scanned when auto-focusing the first invalid
// field on submit. Mirrors the visual order in the dialog so users see the
// scroll/focus move through the form top-to-bottom.
const JOB_CREATE_FIELD_ORDER = [
  "company_id",
  "title",
  "location",
  "salary_min",
  "salary_max",
  "short_description",
  "description",
  "requirements",
  "tags",
] as const;

// ── Create dialog ──────────────────────────────────────────────────────────

interface CreateProps {
  open: boolean;
  onClose: () => void;
  onCreated: (job: JobRead) => void;
  onError: () => void;
}

const emptyRequirements = (): JobRequirementItem[] =>
  Array.from({ length: JOB_REQ_MIN_COUNT }, () => ({ text: "" }));

export default function CreateJobDialog({ open, onClose, onCreated, onError }: CreateProps) {
  const { t } = useTranslation();
  const [companies, setCompanies] = useState<ActiveCompanyRead[] | null>(null);
  const [companiesError, setCompaniesError] = useState(false);
  const [form, setForm] = useState<Partial<JobAdminCreate>>({
    title: "",
    short_description: "",
    description: "",
    requirements: emptyRequirements(),
    tags: [],
    is_featured: false,
    location: "",
    status: JobStatus.PUBLISHED,
    salary_min: undefined,
    salary_max: undefined,
  });
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [confirmFeatured, setConfirmFeatured] = useState(false);
  const [confirmSaveOpen, setConfirmSaveOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const ctrl = new AbortController();
    /* eslint-disable react-hooks/set-state-in-effect */
    setCompanies(null);
    setCompaniesError(false);
    setErrors({});
    setForm({
      title: "",
      short_description: "",
      description: "",
      requirements: emptyRequirements(),
      tags: [],
      is_featured: false,
      location: "",
      status: JobStatus.PUBLISHED,
      salary_min: undefined,
      salary_max: undefined,
    });
    /* eslint-enable react-hooks/set-state-in-effect */
    getActiveCompanies({ limit: 100 }, ctrl.signal)
      .then((page) => {
        setCompanies(page.items);
        if (page.items.length > 0) {
          setForm((prev) => ({
            ...prev,
            company_id: page.items[0].company_profile.id,
          }));
        }
      })
      .catch((e) => {
        if (axios.isCancel(e)) return;
        setCompaniesError(true);
      });
    return () => ctrl.abort();
  }, [open]);

  function set<K extends keyof JobAdminCreate>(key: K, value: JobAdminCreate[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[String(key)]) setErrors((prev) => ({ ...prev, [String(key)]: "" }));
  }

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
    const filledReqs = (form.requirements ?? []).filter((r) => r.text.trim().length > 0);
    if (filledReqs.length < JOB_REQ_MIN_COUNT)
      e.requirements = t("common.validation.requirementsMin", { min: JOB_REQ_MIN_COUNT });
    if (form.salary_min == null || form.salary_min < 0) e.salary_min = t("common.validation.required");
    if (form.salary_max == null || form.salary_max < 0) e.salary_max = t("common.validation.required");
    else if (form.salary_min != null && form.salary_max < form.salary_min) e.salary_max = t("common.validation.salaryMaxBelowMin");
    setErrors(e);
    if (Object.keys(e).length > 0) {
      focusFirstError(e, JOB_CREATE_FIELD_ORDER);
      return false;
    }
    return true;
  }

  function requestSave() {
    if (!form.company_id || !validate()) return;
    setConfirmSaveOpen(true);
  }

  async function executeSave() {
    if (!form.company_id) return;
    setConfirmSaveOpen(false);
    setSaving(true);
    try {
      const created = await createJob({
        company_id: form.company_id,
        title: form.title!,
        short_description: form.short_description!,
        description: form.description!,
        requirements: (form.requirements ?? [])
          .map((r) => ({ text: r.text.trim() }))
          .filter((r) => r.text.length > 0),
        tags: form.tags ?? [],
        is_featured: form.is_featured ?? false,
        location: form.location!,
        salary_min: form.salary_min!,
        salary_max: form.salary_max!,
        status: form.status,
      });
      onCreated(created);
    } catch {
      onError();
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
    <Dialog
      open={open}
      onOpenChange={(o) => !o && onClose()}
      title={t("admin.jobs.newJobModalTitle")}
      size="lg"
      preventOutsideClose
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
            onClick={requestSave}
            disabled={saving}
            className="rounded-sm bg-copper px-4 py-2 text-sm font-medium text-white hover:bg-gold disabled:opacity-60"
          >
            {saving ? t("common.saving") : t("common.save")}
          </button>
        </>
      }
    >
      <div className="space-y-2 text-sm">
        <FormSection title={t("admin.jobs.formSections.basics")} defaultOpen>
          <div className="space-y-3">
            <Field label={t("admin.jobs.fields.company")} full name="company_id">
              {companiesError ? (
                <p className="text-xs text-danger">
                  {t("admin.jobs.errors.companiesLoadFailed")}
                </p>
              ) : companies == null ? (
                <p className="text-xs text-white/35">{t("common.loading")}</p>
              ) : (
                <select
                  value={form.company_id ?? ""}
                  onChange={(e) => set("company_id", Number(e.target.value))}
                  className={selectCls}
                >
                  {companies.map((row) => (
                    <option
                      key={row.company_profile.id}
                      value={row.company_profile.id}
                      className="bg-well"
                    >
                      {row.company_profile.name}
                    </option>
                  ))}
                </select>
              )}
            </Field>
            <Field label={t("admin.jobs.fields.title")} full name="title">
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
              {errors.title && <p className="mt-1 text-xs text-danger">{errors.title}</p>}
            </Field>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label={t("admin.jobs.fields.location")} name="location">
                <input
                  type="text"
                  value={form.location ?? ""}
                  onChange={(e) => set("location", e.target.value)}
                  className={inputCls}
                />
                {errors.location && <p className="mt-1 text-xs text-danger">{errors.location}</p>}
              </Field>
              <Field label={t("admin.jobs.fields.status")}>
                <StatusPills
                  value={(form.status ?? JobStatus.PUBLISHED) as JobStatus}
                  onChange={(s) => set("status", s)}
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
                  setForm((prev) => ({ ...prev, salary_min: lo, salary_max: hi }));
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
              {errors.short_description && <p className="mt-1 text-xs text-danger">{errors.short_description}</p>}
            </Field>
            <Field
              label={t("admin.jobs.fields.description")}
              full
              name="description"
            >
              <AutoGrowTextarea
                value={form.description ?? ""}
                onChange={(v) => set("description", v)}
                minRows={6}
                className={`${textareaCls} min-h-40`}
              />
              {errors.description && <p className="mt-1 text-xs text-danger">{errors.description}</p>}
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
                onChange={(reqs) => set("requirements", reqs)}
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
        setForm((prev) => ({ ...prev, is_featured: !(prev.is_featured ?? false) }));
        setConfirmFeatured(false);
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
