import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import axios from "axios";
import { createJob } from "@/services/adminJobs";
import { getActiveCompanies } from "@/services/adminCompanies";
import { useResetOnTrigger } from "@/hooks/useResetOnTrigger";
import { JOB_CREATE_FIELD_ORDER, validateJob } from "@/utils/validators";
import {
  JOB_REQ_MIN_COUNT,
  JobStatus,
} from "@/types/api";
import type {
  ActiveCompanyRead,
  JobAdminCreate,
  JobRead,
  JobRequirementItem,
} from "@/types/api";
import Dialog from "@/components/ui/Dialog";
import Button from "@/components/ui/Button";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { FormSection } from "@/components/admin/AnimatedAccordion";
import { focusFirstError } from "@/utils/focusFirstError";
import { inputCls, selectCls } from "@/styles/forms";
import {
  FeaturedConfirmDialog,
  FeaturedStarButton,
  Field,
  SalaryRangeField,
  StatusPills,
} from "./JobFormHelpers";
import JobContentLists from "./JobContentLists";

const emptyRequirements = (): JobRequirementItem[] =>
  Array.from({ length: JOB_REQ_MIN_COUNT }, () => ({ text: "" }));

interface CreateProps {
  open: boolean;
  onClose: () => void;
  onCreated: (job: JobRead) => void;
  onError: () => void;
}

export default function JobCreateDialog({ open, onClose, onCreated, onError }: CreateProps) {
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

  useResetOnTrigger(open, () => {
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
  });

  useEffect(() => {
    if (!open) return;
    const ctrl = new AbortController();
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
    const e = validateJob(form, t);
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
          <Button
            variant="ghost"
            onClick={onClose}
            disabled={saving}
          >
            {t("common.cancel")}
          </Button>
          <Button
            onClick={requestSave}
            disabled={saving}
          >
            {saving ? t("common.saving") : t("common.save")}
          </Button>
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
              <Field label={t("admin.jobs.fields.status")} id="create-job-status">
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
        <JobContentLists
          form={form}
          errors={errors}
          onShortDescriptionChange={(v) => set("short_description", v)}
          onDescriptionChange={(v) => set("description", v)}
          onRequirementsChange={(reqs) => set("requirements", reqs)}
          onTagsChange={(tags) => set("tags", tags)}
        />
      </div>
    </Dialog>
    <FeaturedConfirmDialog
      open={confirmFeatured}
      active={form.is_featured ?? false}
      onClose={() => setConfirmFeatured(false)}
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
